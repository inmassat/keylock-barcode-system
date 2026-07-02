from django.urls import re_path

from barcodes.websocket.consumers import LockConsumer

websocket_urlpatterns = [
    re_path(r"ws/lock/(?P<device_id>[\w-]+)/$", LockConsumer.as_asgi()),
]
