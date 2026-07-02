from django.urls import path

from barcodes.views import (
    AuditLogListView,
    BarcodeCreateView,
    BarcodeDetailView,
    BarcodeListView,
    BarcodeReissueView,
    BarcodeRevokeView,
    BarcodeScanView,
)

urlpatterns = [
    path("", BarcodeListView.as_view(), name="barcode-list"),
    path("create/", BarcodeCreateView.as_view(), name="barcode-create"),
    path("<uuid:pk>/", BarcodeDetailView.as_view(), name="barcode-detail"),
    path("<uuid:pk>/revoke/", BarcodeRevokeView.as_view(), name="barcode-revoke"),
    path("<uuid:pk>/reissue/", BarcodeReissueView.as_view(), name="barcode-reissue"),
    path("scan/", BarcodeScanView.as_view(), name="barcode-scan"),
    path("audit-logs/", AuditLogListView.as_view(), name="audit-logs"),
]
