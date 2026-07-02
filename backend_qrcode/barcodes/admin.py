from django.contrib import admin

from .models import AuditLog, Barcode


@admin.register(Barcode)
class BarcodeAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "label",
        "code_type",
        "status",
        "created_by",
        "created_at",
        "expires_at",
    )
    list_filter = ("status", "code_type")
    search_fields = ("label", "id")
    readonly_fields = ("id", "payload_hash", "created_at")


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("id", "barcode", "device_id", "result", "timestamp")
    list_filter = ("result",)
    search_fields = ("device_id", "barcode__id")
    readonly_fields = (
        "id",
        "barcode",
        "device_id",
        "scanned_payload",
        "result",
        "reason",
        "timestamp",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
