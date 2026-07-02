import uuid

from django.conf import settings
from django.db import models


class Barcode(models.Model):
    """Barcode entity for key-lock access control."""

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        EXPIRED = "expired", "Expired"
        REVOKED = "revoked", "Revoked"

    class CodeType(models.TextChoices):
        BARCODE = "barcode", "Barcode (Code128)"
        QRCODE = "qrcode", "QR Code"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    label = models.CharField(max_length=255, blank=True, default="")
    code_type = models.CharField(
        max_length=10, choices=CodeType.choices, default=CodeType.BARCODE
    )
    payload_hash = models.CharField(
        max_length=128,
        unique=True,
        help_text="SHA-256 hash of the signed payload. Raw secret is never stored.",
    )
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.ACTIVE
    )
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="barcodes",
    )
    image = models.ImageField(upload_to="barcodes/", blank=True)

    class Meta:
        db_table = "barcodes"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Barcode {self.id} [{self.status}]"

    @property
    def is_valid(self):
        from django.utils import timezone

        return self.status == self.Status.ACTIVE and self.expires_at > timezone.now()


class AuditLog(models.Model):
    """Immutable log of every scan attempt."""

    class Result(models.TextChoices):
        ALLOW = "allow", "Allow"
        DENY = "deny", "Deny"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    barcode = models.ForeignKey(
        Barcode,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    device_id = models.CharField(max_length=255)
    scanned_payload = models.TextField(help_text="The raw payload that was scanned.")
    result = models.CharField(max_length=5, choices=Result.choices)
    reason = models.CharField(max_length=255, default="")
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "audit_logs"
        ordering = ["-timestamp"]

    def __str__(self):
        return f"Scan {self.id} -> {self.result} @ {self.timestamp}"

    def save(self, *args, **kwargs):
        # Prevent updates — only allow inserts
        if self.pk and AuditLog.objects.filter(pk=self.pk).exists():
            raise ValueError("Audit logs are immutable and cannot be updated.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValueError("Audit logs are immutable and cannot be deleted.")
