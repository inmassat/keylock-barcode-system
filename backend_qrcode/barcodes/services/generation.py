"""
Barcode / QR code image generation service.

Generates Code128 barcode or QR code images server-side and returns them as
in-memory files ready for storage or base64 encoding.
"""

import base64
import io

import barcode
from barcode.writer import ImageWriter


def generate_barcode_image(payload: str) -> tuple[io.BytesIO, str]:
    """
    Generate a Code128 barcode image from the given payload.

    Returns:
        (image_buffer, base64_string)
    """
    code128 = barcode.get_barcode_class("code128")
    writer = ImageWriter()
    writer.set_options(
        {
            "module_width": 0.5,
            "module_height": 10.0,
            "quiet_zone": 1.5,
            "font_size": 14,
            "text_distance": 3.0,
            "write_text": True,
            "dpi": 200,
        }
    )

    barcode_instance = code128(payload, writer=writer)

    buffer = io.BytesIO()
    barcode_instance.write(buffer)
    buffer.seek(0)

    b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
    buffer.seek(0)

    return buffer, b64


def generate_qrcode_image(payload: str) -> tuple[io.BytesIO, str]:
    """
    Generate a QR code image from the given payload.

    Returns:
        (image_buffer, base64_string)
    """
    import qrcode
    from qrcode.constants import ERROR_CORRECT_H

    qr = qrcode.QRCode(
        version=None,  # auto-size
        error_correction=ERROR_CORRECT_H,
        box_size=3,
        border=1,
    )
    qr.add_data(payload)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")

    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)

    b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
    buffer.seek(0)

    return buffer, b64


def generate_code_image(
    payload: str, code_type: str = "barcode"
) -> tuple[io.BytesIO, str]:
    """
    Generate either a barcode or QR code image based on code_type.

    Returns:
        (image_buffer, base64_string)
    """
    if code_type == "qrcode":
        return generate_qrcode_image(payload)
    return generate_barcode_image(payload)
