import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory
from apps.business.models import Business, BusinessMembership
from apps.business.serializers import BusinessCreateSerializer

User = get_user_model()

@pytest.mark.django_db
class TestBusinessOwnershipAutoMembershipRed:
    def test_business_creation_automatically_creates_owner_membership(self):
        user = User.objects.create_user(email="owner@example.com", password="password123")
        factory = APIRequestFactory()
        request = factory.post("/api/businesses/", {"name": "Toko Berkah", "business_type": "Fashion"})
        request.user = user

        serializer = BusinessCreateSerializer(data={"name": "Toko Berkah", "business_type": "Fashion"}, context={"request": request})
        assert serializer.is_valid(), serializer.errors
        business = serializer.save()

        # Assert Business created
        assert Business.objects.filter(id=business.id).exists()
        assert business.owner == user

        # Assert BusinessMembership automatically created with role OWNER
        memberships = BusinessMembership.objects.filter(business=business)
        assert memberships.count() == 1

        membership = memberships.first()
        assert membership.role == BusinessMembership.Role.OWNER
        assert membership.user == user

        # Assert no duplicate OWNER membership
        assert BusinessMembership.objects.filter(business=business, role=BusinessMembership.Role.OWNER).count() == 1
