import pytest
from rest_framework import status
from rest_framework.test import APIClient
from apps.authentication.models import User
from apps.business.models import Business, Subscription
from apps.audit.models import AuditLog


@pytest.fixture
def superadmin():
    return User.objects.create_superuser(
        email="superadmin08@kopera.io",
        password="password123",
        first_name="Super",
        last_name="Admin",
    )


@pytest.fixture
def normal_user():
    return User.objects.create_user(
        email="user08@kopera.io",
        password="password123",
        first_name="Normal",
        last_name="User",
    )


@pytest.fixture
def staff_user():
    return User.objects.create_user(
        email="staff08@kopera.io",
        password="password123",
        is_staff=True,
        is_superuser=False,
    )


@pytest.fixture
def sample_ticket(superadmin):
    from apps.admin.models import SupportTicket
    return SupportTicket.objects.create(
        subject="Issue with login",
        description="Cannot login to business portal",
        status="OPEN",
        priority="HIGH",
        requester=superadmin,
    )


@pytest.mark.django_db
class TestDomain08Red:
    def test_d08_01_super_admin_support_ticket_list(self, superadmin, sample_ticket):
        client = APIClient()
        client.force_authenticate(user=superadmin)
        url = "/api/v1/admin/support/tickets/"
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list) or "results" in data
        items = data["results"] if isinstance(data, dict) else data
        assert len(items) >= 1
        assert "id" in items[0]
        assert "subject" in items[0]
        assert "status" in items[0]
        assert "priority" in items[0]
        assert AuditLog.objects.filter(actor=superadmin, action="SUPPORT_TICKET_LIST_VIEWED").exists()

    def test_d08_02_super_admin_support_ticket_detail(self, superadmin, sample_ticket):
        client = APIClient()
        client.force_authenticate(user=superadmin)
        url = f"/api/v1/admin/support/tickets/{sample_ticket.id}/"
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == str(sample_ticket.id)
        assert data["subject"] == sample_ticket.subject
        assert AuditLog.objects.filter(actor=superadmin, action="SUPPORT_TICKET_DETAIL_VIEWED").exists()

    def test_d08_03_anonymous_unauthorized(self):
        client = APIClient()
        url = "/api/v1/admin/support/tickets/"
        response = client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_d08_04_non_superuser_forbidden(self, normal_user):
        client = APIClient()
        client.force_authenticate(user=normal_user)
        url = "/api/v1/admin/support/tickets/"
        response = client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_d08_05_ticket_reply_and_mutation(self, superadmin, sample_ticket):
        client = APIClient()
        client.force_authenticate(user=superadmin)
        url = f"/api/v1/admin/support/tickets/{sample_ticket.id}/"
        response = client.patch(url, {"status": "RESOLVED", "priority": "LOW"})
        assert response.status_code == status.HTTP_200_OK
        sample_ticket.refresh_from_db()
        assert sample_ticket.status == "RESOLVED"
        assert sample_ticket.priority == "LOW"

        reply_url = f"/api/v1/admin/support/tickets/{sample_ticket.id}/replies/"
        res_reply = client.post(reply_url, {"message": "We have resolved your issue."})
        assert res_reply.status_code in [status.HTTP_201_CREATED, status.HTTP_200_OK]
