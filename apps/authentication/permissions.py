from rest_framework.permissions import BasePermission
from django.db.models import Q
from django.shortcuts import get_object_or_404


class IsOwner(BasePermission):
    """
    Object-level permission to only allow owners of an object to access it.
    Assumes the model instance has a `user` attribute.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return True

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        return hasattr(obj, "user") and obj.user == request.user


class IsVerified(BasePermission):
    """
    Permission class that only allows access to users with verified email.
    User must be authenticated and have is_email_verified=True.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_email_verified


class BusinessAccessMixin:
    """
    Mixin to authorize request user who is either:
    1. The Business.owner.
    2. A BusinessMembership member.
    """

    def get_business(self):
        from apps.business.models import Business
        business_id = self.kwargs.get("business_id")
        user = self.request.user

        # Superuser bypass
        if user.is_superuser:
            return get_object_or_404(Business, pk=business_id)

        # Retrieve business where request user is owner OR a business member
        return get_object_or_404(
            Business.objects.filter(
                Q(owner=user) | Q(memberships__user=user)
            ).distinct(),
            pk=business_id
        )

    def require_business_permission(self, domain, action):
        """
        Resolve the business from the request and verify the effective role
        permits (domain, action). Raises DRF PermissionDenied (HTTP 403) when
        the role is not permitted.
        """
        from rest_framework.exceptions import PermissionDenied

        business = self.get_business()
        if not has_business_permission(self.request.user, business, domain, action):
            raise PermissionDenied(
                "You do not have permission to perform this action."
            )
        return business

    def require_object_permission(self, business, domain, action):
        """
        Object-level authorization for a business already resolved from the
        resource graph (e.g. stock.location.business).

        - Superuser: platform bypass, always allowed.
        - Non-member / business mismatch: raises NotFound (HTTP 404).
        - Member with denied role/action: raises PermissionDenied (HTTP 403).
        - Allowed member: returns the business.
        """
        from rest_framework.exceptions import NotFound, PermissionDenied

        user = self.request.user
        if user.is_superuser:
            return business
        role = resolve_business_role(user, business)
        if role is None:
            raise NotFound()
        if not has_business_permission(user, business, domain, action):
            raise PermissionDenied(
                "You do not have permission to perform this action."
            )
        return business


def resolve_business_role(user, business):
    """
    Resolve the effective business role for a user from:
    - Business.owner (authoritative OWNER)
    - BusinessMembership.role (ADMIN/KASIR within this business)

    Returns one of: "OWNER", "ADMIN", "KASIR", None
    """
    if business.owner_id == user.id:
        return "OWNER"

    from apps.business.models import BusinessMembership
    membership = BusinessMembership.objects.filter(
        business=business, user=user
    ).first()
    if membership is None:
        return None
    return membership.role


def filter_visible_businesses(queryset, user):
    """
    Centralized business visibility filter for a Business queryset.

    Returns only businesses where the user is the owner or a
    BusinessMembership member (distinct). Superusers see all businesses.

    This is the single canonical owner-OR-membership resolver; views and
    serializers must use it instead of encoding Q(owner=user) |
    Q(memberships__user=user) inline.
    """
    if user.is_superuser:
        return queryset
    return queryset.filter(
        Q(owner=user) | Q(memberships__user=user)
    ).distinct()


# Role permission matrix.
# Keys: (role, domain, action) -> True (allow) / False (deny)
# Role "OWNER" has full access across all domains/actions.
# Domains map to business modules. Actions are coarse-grained:
# "view", "create", "update", "delete", "manage"
ROLE_PERMISSIONS = {
    # ADMIN — operational manager for one business
    ("ADMIN", "dashboard", "view"): True,
    ("ADMIN", "product", "view"): True,
    ("ADMIN", "product", "create"): True,
    ("ADMIN", "product", "update"): True,
    ("ADMIN", "product", "delete"): True,
    ("ADMIN", "inventory", "view"): True,
    ("ADMIN", "inventory", "create"): True,
    ("ADMIN", "inventory", "update"): True,
    ("ADMIN", "inventory", "delete"): True,
    ("ADMIN", "sales", "view"): True,
    ("ADMIN", "sales", "create"): True,
    ("ADMIN", "sales", "update"): True,
    ("ADMIN", "sales", "delete"): True,
    ("ADMIN", "purchasing", "view"): True,
    ("ADMIN", "purchasing", "create"): True,
    ("ADMIN", "purchasing", "update"): True,
    ("ADMIN", "purchasing", "delete"): True,
    ("ADMIN", "customer", "view"): True,
    ("ADMIN", "customer", "create"): True,
    ("ADMIN", "customer", "update"): True,
    ("ADMIN", "customer", "delete"): True,
    ("ADMIN", "supplier", "view"): True,
    ("ADMIN", "supplier", "create"): True,
    ("ADMIN", "supplier", "update"): True,
    ("ADMIN", "supplier", "delete"): True,
    ("ADMIN", "finance", "view"): True,
    ("ADMIN", "finance", "create"): False,
    ("ADMIN", "finance", "update"): False,
    ("ADMIN", "finance", "delete"): False,
    ("ADMIN", "reports", "view"): True,
    ("ADMIN", "employee", "view"): True,
    ("ADMIN", "employee", "create"): True,
    ("ADMIN", "employee", "update"): True,
    ("ADMIN", "employee", "delete"): True,
    ("ADMIN", "promotion", "view"): True,
    ("ADMIN", "promotion", "create"): True,
    ("ADMIN", "promotion", "update"): True,
    ("ADMIN", "promotion", "delete"): True,
    ("ADMIN", "notification", "view"): True,
    ("ADMIN", "onlinestore", "view"): True,
    ("ADMIN", "onlinestore", "create"): True,
    ("ADMIN", "onlinestore", "update"): True,
    ("ADMIN", "onlinestore", "delete"): True,
    # Membership management, business settings, role assignment, billing: DENY
    ("ADMIN", "membership", "view"): False,
    ("ADMIN", "membership", "create"): False,
    ("ADMIN", "membership", "update"): False,
    ("ADMIN", "membership", "delete"): False,
    ("ADMIN", "business", "view"): False,
    ("ADMIN", "business", "create"): False,
    ("ADMIN", "business", "update"): False,
    ("ADMIN", "business", "delete"): False,
    ("ADMIN", "settings", "view"): False,
    ("ADMIN", "settings", "update"): False,
    ("ADMIN", "billing", "view"): False,
    ("ADMIN", "billing", "update"): False,
    ("ADMIN", "security", "view"): False,
    ("ADMIN", "security", "update"): False,
    ("ADMIN", "backup", "view"): False,
    ("ADMIN", "location", "view"): True,
    ("ADMIN", "location", "create"): True,
    ("ADMIN", "location", "update"): True,
    ("ADMIN", "location", "delete"): True,
    ("ADMIN", "integration", "view"): False,

    # KASIR — transaction executor
    ("KASIR", "dashboard", "view"): True,
    ("KASIR", "sales", "view"): True,
    ("KASIR", "sales", "create"): True,
    ("KASIR", "sales", "update"): True,
    ("KASIR", "sales", "delete"): True,
    ("KASIR", "customer", "view"): True,
    ("KASIR", "customer", "create"): True,
    ("KASIR", "inventory", "view"): True,
    ("KASIR", "promotion", "view"): True,
    ("KASIR", "notification", "view"): True,
    ("KASIR", "onlinestore", "view"): True,
    ("KASIR", "transaction_history", "view"): True,
    ("KASIR", "location", "view"): False,
    ("KASIR", "location", "create"): False,
    ("KASIR", "location", "update"): False,
    ("KASIR", "location", "delete"): False,
    # Kasir denials
    ("KASIR", "product", "view"): False,
    ("KASIR", "product", "create"): False,
    ("KASIR", "product", "update"): False,
    ("KASIR", "product", "delete"): False,
    ("KASIR", "inventory", "create"): False,
    ("KASIR", "inventory", "update"): False,
    ("KASIR", "inventory", "delete"): False,
    ("KASIR", "purchasing", "view"): False,
    ("KASIR", "purchasing", "create"): False,
    ("KASIR", "purchasing", "update"): False,
    ("KASIR", "purchasing", "delete"): False,
    ("KASIR", "supplier", "view"): False,
    ("KASIR", "supplier", "create"): False,
    ("KASIR", "supplier", "update"): False,
    ("KASIR", "supplier", "delete"): False,
    ("KASIR", "finance", "view"): False,
    ("KASIR", "finance", "create"): False,
    ("KASIR", "finance", "update"): False,
    ("KASIR", "finance", "delete"): False,
    ("KASIR", "reports", "view"): False,
    ("KASIR", "employee", "view"): False,
    ("KASIR", "employee", "create"): False,
    ("KASIR", "employee", "update"): False,
    ("KASIR", "employee", "delete"): False,
    ("KASIR", "membership", "view"): False,
    ("KASIR", "membership", "create"): False,
    ("KASIR", "membership", "update"): False,
    ("KASIR", "membership", "delete"): False,
    ("KASIR", "business", "view"): False,
    ("KASIR", "business", "create"): False,
    ("KASIR", "business", "update"): False,
    ("KASIR", "business", "delete"): False,
    ("KASIR", "settings", "view"): False,
    ("KASIR", "settings", "update"): False,
    ("KASIR", "billing", "view"): False,
    ("KASIR", "billing", "update"): False,
    ("KASIR", "security", "view"): False,
    ("KASIR", "security", "update"): False,
    ("KASIR", "backup", "view"): False,
    ("KASIR", "integration", "view"): False,
    ("KASIR", "onlinestore", "create"): False,
    ("KASIR", "onlinestore", "update"): False,
    ("KASIR", "onlinestore", "delete"): False,
}


def has_business_permission(user, business, domain, action):
    """
    Returns True if the user is permitted the (domain, action) within the
    given business, else False.

    Owners always pass. Members are checked against ROLE_PERMISSIONS for their
    effective role (resolved from BusinessMembership within this business).
    Superusers (platform admins) are granted a platform-level bypass without
    any BusinessMembership or OWNER mutation.
    """
    if user.is_superuser:
        return True
    role = resolve_business_role(user, business)
    if role is None:
        return False
    if role == "OWNER":
        return True
    return ROLE_PERMISSIONS.get((role, domain, action), False)
