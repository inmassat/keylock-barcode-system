"""Dispatch lock events to WebSocket consumers."""

from django.utils import timezone
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync


def send_lock_event(
    device_id: str, event_type: str, barcode_id: str = None, reason: str = ""
):
    """
    Send a lock event (UNLOCK / DENIED) to all WebSocket clients
    listening on the given device_id channel.
    """
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return

    group_name = f"lock_{device_id}"
    async_to_sync(channel_layer.group_send)(
        group_name,
        {
            "type": "lock_event",
            "event_type": event_type,
            "barcode_id": barcode_id,
            "reason": reason,
            "timestamp": timezone.now().isoformat(),
        },
    )
