from rest_framework import serializers

from barcodes.models import AuditLog, Barcode


class BarcodeSerializer(serializers.ModelSerializer):
    image_base64 = serializers.SerializerMethodField()

    class Meta:
        model = Barcode
        fields = [
            "id",
            "label",
            "code_type",
            "status",
            "expires_at",
            "created_at",
            "created_by",
            "image",
            "image_base64",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "created_by",
            "image",
            "image_base64",
            "status",
            "code_type",
        ]

    def get_image_base64(self, obj):
        """Return stored image as base64 if it exists."""
        if obj.image:
            try:
                import base64

                return base64.b64encode(obj.image.read()).decode("utf-8")
            except Exception:
                return None
        return None


class BarcodeUpdateSerializer(serializers.ModelSerializer):
    """Editable barcode fields.

    Only ``label`` may be changed. ``expires_at`` and ``code_type`` are baked
    into the HMAC-signed payload at creation time, so editing them here would
    desync the record from its signed payload and is therefore disallowed.
    """

    class Meta:
        model = Barcode
        fields = ["label"]


class BarcodeCreateSerializer(serializers.Serializer):
    label = serializers.CharField(max_length=255, required=False, default="")
    expires_at = serializers.DateTimeField()
    code_type = serializers.ChoiceField(
        choices=Barcode.CodeType.choices,
        default=Barcode.CodeType.BARCODE,
        required=False,
    )


class BarcodeReissueSerializer(serializers.Serializer):
    """Input for reissuing a barcode with a new expiry."""

    expires_at = serializers.DateTimeField()


class BarcodeScanSerializer(serializers.Serializer):
    payload = serializers.CharField()
    device_id = serializers.CharField(max_length=255)


class AuditLogSerializer(serializers.ModelSerializer):
    barcode_id = serializers.UUIDField(
        source="barcode.id", allow_null=True, read_only=True
    )

    class Meta:
        model = AuditLog
        fields = [
            "id",
            "barcode_id",
            "device_id",
            "result",
            "reason",
            "timestamp",
        ]
        read_only_fields = fields
