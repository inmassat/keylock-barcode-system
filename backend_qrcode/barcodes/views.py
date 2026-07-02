from django.core.files.base import ContentFile
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from barcodes.models import AuditLog, Barcode
from barcodes.permissions import IsAdmin, IsAdminOrDevice, IsAdminOrOperator
from barcodes.serializers import (
    AuditLogSerializer,
    BarcodeCreateSerializer,
    BarcodeReissueSerializer,
    BarcodeSerializer,
    BarcodeScanSerializer,
    BarcodeUpdateSerializer,
)
from barcodes.services.generation import generate_code_image
from barcodes.services.signing import generate_payload, hash_payload
from barcodes.services.validation import validate_scan


class BarcodeListView(generics.ListAPIView):
    """List all barcodes. Admin/Operator only."""

    serializer_class = BarcodeSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrOperator]

    def get_queryset(self):
        qs = Barcode.objects.all()
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs


class BarcodeCreateView(APIView):
    """Generate a new barcode. Admin/Operator only."""

    permission_classes = [permissions.IsAuthenticated, IsAdminOrOperator]

    def post(self, request):
        serializer = BarcodeCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        label = serializer.validated_data.get("label", "")
        expires_at = serializer.validated_data["expires_at"]
        code_type = serializer.validated_data.get("code_type", Barcode.CodeType.BARCODE)

        # Create the barcode record first to get the ID
        barcode = Barcode(
            label=label,
            expires_at=expires_at,
            code_type=code_type,
            created_by=request.user,
            payload_hash="pending",  # temporary
        )
        barcode.save()

        # Generate signed payload
        payload = generate_payload(str(barcode.id), expires_at.timestamp())

        # Hash and store
        barcode.payload_hash = hash_payload(payload)

        # Generate barcode/QR code image
        image_buffer, image_b64 = generate_code_image(payload, code_type)
        barcode.image.save(
            f"{barcode.id}.png",
            ContentFile(image_buffer.read()),
            save=False,
        )
        barcode.save()

        return Response(
            {
                "id": str(barcode.id),
                "label": barcode.label,
                "status": barcode.status,
                "code_type": barcode.code_type,
                "expires_at": barcode.expires_at.isoformat(),
                "created_at": barcode.created_at.isoformat(),
                "payload": payload,
                "image_base64": image_b64,
            },
            status=status.HTTP_201_CREATED,
        )


class BarcodeDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, edit (label only), or delete a single barcode.

    - GET / PATCH: Admin or Operator
    - DELETE: Admin only (destructive, like revoke)
    """

    queryset = Barcode.objects.all()
    lookup_field = "pk"
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def get_serializer_class(self):
        if self.request.method == "PATCH":
            return BarcodeUpdateSerializer
        return BarcodeSerializer

    def get_permissions(self):
        if self.request.method == "DELETE":
            return [permissions.IsAuthenticated(), IsAdmin()]
        return [permissions.IsAuthenticated(), IsAdminOrOperator()]


class BarcodeRevokeView(APIView):
    """Revoke a barcode. Admin only."""

    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        try:
            barcode = Barcode.objects.get(pk=pk)
        except Barcode.DoesNotExist:
            return Response(
                {"error": "Barcode not found"}, status=status.HTTP_404_NOT_FOUND
            )

        if barcode.status == Barcode.Status.REVOKED:
            return Response(
                {"error": "Barcode is already revoked"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        barcode.status = Barcode.Status.REVOKED
        barcode.save(update_fields=["status"])
        return Response({"id": str(barcode.id), "status": barcode.status})


class BarcodeReissueView(APIView):
    """Reissue a barcode with a new expiry. Admin/Operator only.

    Regenerates the HMAC-signed payload and the code image, updates the stored
    hash, and resets the status to ACTIVE. The previously distributed code stops
    working, so the freshly signed payload/image must be redistributed.
    """

    permission_classes = [permissions.IsAuthenticated, IsAdminOrOperator]

    def post(self, request, pk):
        try:
            barcode = Barcode.objects.get(pk=pk)
        except Barcode.DoesNotExist:
            return Response(
                {"error": "Barcode not found"}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = BarcodeReissueSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        expires_at = serializer.validated_data["expires_at"]

        # New signed payload for the new expiry (iat also changes, so the hash
        # is always distinct from the previous issue).
        barcode.expires_at = expires_at
        payload = generate_payload(str(barcode.id), expires_at.timestamp())
        barcode.payload_hash = hash_payload(payload)

        image_buffer, image_b64 = generate_code_image(payload, barcode.code_type)
        barcode.image.save(
            f"{barcode.id}.png",
            ContentFile(image_buffer.read()),
            save=False,
        )
        barcode.status = Barcode.Status.ACTIVE
        barcode.save()

        return Response(
            {
                "id": str(barcode.id),
                "label": barcode.label,
                "status": barcode.status,
                "code_type": barcode.code_type,
                "expires_at": barcode.expires_at.isoformat(),
                "created_at": barcode.created_at.isoformat(),
                "payload": payload,
                "image_base64": image_b64,
            }
        )


class BarcodeScanView(APIView):
    """
    Validate a scanned barcode.
    Accepts payload + device_id, returns ALLOW/DENY.
    Accessible by device and admin accounts.
    """

    permission_classes = [permissions.IsAuthenticated, IsAdminOrDevice]

    def post(self, request):
        serializer = BarcodeScanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        result = validate_scan(
            scanned_payload=serializer.validated_data["payload"],
            device_id=serializer.validated_data["device_id"],
        )

        # Dispatch WebSocket event
        try:
            from barcodes.websocket.events import send_lock_event

            send_lock_event(
                device_id=serializer.validated_data["device_id"],
                event_type="UNLOCK" if result["access"] == "ALLOW" else "DENIED",
                barcode_id=result.get("barcode_id"),
                reason=result["reason"],
            )
        except Exception:
            pass  # WebSocket failure must not block the API response

        http_status = (
            status.HTTP_200_OK
            if result["access"] == "ALLOW"
            else status.HTTP_403_FORBIDDEN
        )
        return Response(result, status=http_status)


class AuditLogListView(generics.ListAPIView):
    """List audit logs. Admin only."""

    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get_queryset(self):
        qs = AuditLog.objects.all()
        device_id = self.request.query_params.get("device_id")
        result_filter = self.request.query_params.get("result")
        barcode_id = self.request.query_params.get("barcode_id")
        if device_id:
            qs = qs.filter(device_id=device_id)
        if result_filter:
            qs = qs.filter(result=result_filter)
        if barcode_id:
            qs = qs.filter(barcode_id=barcode_id)
        return qs
