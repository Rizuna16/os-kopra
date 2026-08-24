from rest_framework.permissions import BasePermission


class IsSuperAdmin(BasePermission):
    """Dedicated PART 25 admin authorization boundary.

    Allows access only to authenticated platform super-admins
    (request.user.is_superuser == True). Intentionally NOT IsAuthenticated
    alone and NOT is_staff-gated.
    """

    def has_permission(self, request, view):
        user = request.user
        if not user or not getattr(user, "is_authenticated", False):
            return False
        return bool(getattr(user, "is_superuser", False))
