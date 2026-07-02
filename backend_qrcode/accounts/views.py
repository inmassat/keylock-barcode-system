from django.contrib.auth import get_user_model
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.serializers import RegisterSerializer, UserSerializer

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """Register a new user. Only admins can create device accounts."""

    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        role = serializer.validated_data.get("role", User.Role.OPERATOR)
        if role in (User.Role.ADMIN, User.Role.DEVICE):
            if not (self.request.user.is_authenticated and self.request.user.is_admin):
                from rest_framework.exceptions import PermissionDenied

                raise PermissionDenied("Only admins can create admin/device accounts.")
        serializer.save()


class MeView(APIView):
    """Return the current authenticated user's profile."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
