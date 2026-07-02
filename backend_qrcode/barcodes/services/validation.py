"""
Barcode validation orchestrator.

Ties together payload validation, database checks, audit logging,
and WebSocket event dispatch.
"""

from django.utils import timezone

from barcodes.models import AuditLog, Barcode
from barcodes.services.signing import hash_payload, validate_payload


def validate_scan(scanned_payload: str, device_id: str) -> dict:
    """
    Full validation pipeline for a scanned barcode.

    1. Validate cryptographic signature & expiry
    2. Look up barcode in DB by payload hash
    3. Check barcode status
    4. Log the attempt
    5. Return result dict

    Returns:
        {
            "access": "ALLOW" | "DENY",
            "reason": str,
            "barcode_id": str | None,
        }
    """
    # Step 1 — Cryptographic validation
    crypto_result = validate_payload(scanned_payload)
    barcode_id = crypto_result.get("barcode_id")

    if not crypto_result["valid"]:
        _log_attempt(
            barcode=None,
            device_id=device_id,
            scanned_payload=scanned_payload,
            result=AuditLog.Result.DENY,
            reason=crypto_result["reason"],
        )
        return {
            "access": "DENY",
            "reason": crypto_result["reason"],
            "barcode_id": barcode_id,
        }

    # Step 2 — Database lookup
    payload_h = hash_payload(scanned_payload)
    try:
        barcode_obj = Barcode.objects.get(payload_hash=payload_h)
    except Barcode.DoesNotExist:
        _log_attempt(
            barcode=None,
            device_id=device_id,
            scanned_payload=scanned_payload,
            result=AuditLog.Result.DENY,
            reason="Barcode not found in system",
        )
        return {
            "access": "DENY",
            "reason": "Barcode not found in system",
            "barcode_id": barcode_id,
        }

    # Step 3 — Status checks
    if barcode_obj.status == Barcode.Status.REVOKED:
        reason = "Barcode has been revoked"
        _log_attempt(
            barcode_obj, device_id, scanned_payload, AuditLog.Result.DENY, reason
        )
        return {"access": "DENY", "reason": reason, "barcode_id": str(barcode_obj.id)}

    if barcode_obj.expires_at < timezone.now():
        # Auto-expire
        barcode_obj.status = Barcode.Status.EXPIRED
        barcode_obj.save(update_fields=["status"])
        reason = "Barcode has expired"
        _log_attempt(
            barcode_obj, device_id, scanned_payload, AuditLog.Result.DENY, reason
        )
        return {"access": "DENY", "reason": reason, "barcode_id": str(barcode_obj.id)}

    if barcode_obj.status != Barcode.Status.ACTIVE:
        reason = f"Barcode status is {barcode_obj.status}"
        _log_attempt(
            barcode_obj, device_id, scanned_payload, AuditLog.Result.DENY, reason
        )
        return {"access": "DENY", "reason": reason, "barcode_id": str(barcode_obj.id)}

    # Step 4 — ALLOW
    _log_attempt(
        barcode_obj, device_id, scanned_payload, AuditLog.Result.ALLOW, "Access granted"
    )
    return {
        "access": "ALLOW",
        "reason": "Access granted",
        "barcode_id": str(barcode_obj.id),
    }


def _log_attempt(barcode, device_id, scanned_payload, result, reason):
    """Create an immutable audit log entry."""
    AuditLog.objects.create(
        barcode=barcode,
        device_id=device_id,
        scanned_payload=scanned_payload,
        result=result,
        reason=reason,
    )
