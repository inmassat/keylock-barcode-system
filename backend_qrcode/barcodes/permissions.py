from rest_framework import permissions


class IsAdmin(permissions.BasePermission):
    """Allow access only to admin users."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "admin"


class IsAdminOrOperator(permissions.BasePermission):
    """Allow access to admin and operator users."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in (
            "admin",
            "operator",
        )


class IsDevice(permissions.BasePermission):
    """Allow access only to device accounts."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "device"


class IsAdminOrDevice(permissions.BasePermission):
    """Allow access to admin and device accounts."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in (
            "admin",
            "device",
        )
