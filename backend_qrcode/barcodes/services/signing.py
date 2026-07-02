"""
Barcode payload signing and validation service.

Generates HMAC-signed, tamper-proof payloads that encode barcode identity and expiry.
The raw secret is never stored — only a SHA-256 hash of the signed payload is persisted.
"""

import hashlib
import hmac
import json
import time

from django.conf import settings


def _get_signing_key() -> bytes:
    """Derive a stable signing key from Django SECRET_KEY."""
    return hashlib.sha256(settings.SECRET_KEY.encode()).digest()


def generate_payload(barcode_id: str, expires_at_ts: float) -> str:
    """
    Create a signed, tamper-proof payload string.

    Format: base64-like JSON with HMAC signature appended.
    Returns a compact string safe for Code128 encoding.
    """
    data = {
        "bid": str(barcode_id),
        "exp": int(expires_at_ts),
        "iat": int(time.time()),
    }
    data_json = json.dumps(data, separators=(",", ":"), sort_keys=True)
    signature = hmac.new(
        _get_signing_key(), data_json.encode(), hashlib.sha256
    ).hexdigest()
    # Payload = data|signature
    return f"{data_json}|{signature}"


def hash_payload(payload: str) -> str:
    """SHA-256 hash of a payload — this is what we store in the DB."""
    return hashlib.sha256(payload.encode()).hexdigest()


def validate_payload(payload: str) -> dict:
    """
    Validate a scanned payload.

    Returns dict with:
      - valid: bool
      - reason: str
      - barcode_id: str | None
    """
    try:
        parts = payload.rsplit("|", 1)
        if len(parts) != 2:
            return {"valid": False, "reason": "Malformed payload", "barcode_id": None}

        data_json, received_sig = parts

        # Verify signature
        expected_sig = hmac.new(
            _get_signing_key(), data_json.encode(), hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(received_sig, expected_sig):
            return {
                "valid": False,
                "reason": "Invalid signature — payload tampered",
                "barcode_id": None,
            }

        data = json.loads(data_json)
        barcode_id = data.get("bid")
        exp = data.get("exp", 0)

        # Check expiry
        if time.time() > exp:
            return {
                "valid": False,
                "reason": "Payload expired",
                "barcode_id": barcode_id,
            }

        return {
            "valid": True,
            "reason": "Signature and expiry valid",
            "barcode_id": barcode_id,
        }

    except (json.JSONDecodeError, KeyError, TypeError):
        return {"valid": False, "reason": "Corrupt payload", "barcode_id": None}
