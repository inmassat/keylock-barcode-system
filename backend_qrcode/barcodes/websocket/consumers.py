"""WebSocket consumer for lock/device events."""

import json

from channels.generic.websocket import AsyncWebsocketConsumer


class LockConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer scoped to a specific device/lock.

    Clients connect to: ws://host/ws/lock/<device_id>/
    They receive UNLOCK or DENIED events in real-time.
    """

    async def connect(self):
        self.device_id = self.scope["url_route"]["kwargs"]["device_id"]
        self.group_name = f"lock_{self.device_id}"

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        await self.send(
            text_data=json.dumps(
                {
                    "type": "connection_established",
                    "device_id": self.device_id,
                    "message": "Connected to lock events",
                }
            )
        )

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        # Clients should not send data — this is a receive-only channel
        pass

    async def lock_event(self, event):
        """Handle lock events dispatched from the validation service."""
        await self.send(
            text_data=json.dumps(
                {
                    "type": event["event_type"],
                    "barcode_id": event.get("barcode_id"),
                    "reason": event.get("reason", ""),
                    "timestamp": event.get("timestamp", ""),
                }
            )
        )
