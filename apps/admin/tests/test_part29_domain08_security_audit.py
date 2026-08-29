import uuid

import pytest
from rest_framework import status
from rest_framework.test import APIClient
from apps.authentication.models import User
from apps.admin.models import SupportTicket, TicketReply


@pytest.fixture
def superadmin():
    return User.objects.create_superuser(
        email="secadmin08@kopera.io",
        password="password123",
        first_name="Sec",
        last_name="Admin",
    )


@pytest.fixture
def other_user():
    return User.objects.create_user(
        email="other08@kopera.io",
        password="password123",
        first_name="Other",
        last_name="User",
    )


@pytest.mark.django_db
class TestDomain08SecurityAudit:
    def test_s08_01_requester_cannot_be_spoofed(self, superadmin, other_user):
        client = APIClient()
        client.force_authenticate(user=superadmin)
        payload = {
            "subject": "Spoof attempt",
            "description": "trying to set requester",
            "requester": str(other_user.id),
        }
        resp = client.post("/api/v1/admin/support/tickets/", payload, format="json")
        assert resp.status_code == status.HTTP_201_CREATED
        data = resp.json()
        assert data["requester"]["id"] == str(superadmin.id)
        assert data["requester"]["id"] != str(other_user.id)

    def test_s08_02_reply_author_cannot_be_spoofed(self, superadmin, other_user):
        ticket = SupportTicket.objects.create(
            subject="t", description="d", status="OPEN", priority="LOW", requester=superadmin
        )
        client = APIClient()
        client.force_authenticate(user=superadmin)
        payload = {"message": "hi", "author": str(other_user.id), "ticket": str(ticket.id)}
        resp = client.post(
            f"/api/v1/admin/support/tickets/{ticket.id}/replies/", payload, format="json"
        )
        assert resp.status_code == status.HTTP_201_CREATED
        data = resp.json()
        assert data["author"]["id"] == str(superadmin.id)
        reply = TicketReply.objects.get(id=data["id"])
        assert reply.author_id == superadmin.id

    def test_s08_03_invalid_uuid_returns_404(self, superadmin):
        client = APIClient()
        client.force_authenticate(user=superadmin)
        fake = uuid.uuid4()
        resp = client.get(f"/api/v1/admin/support/tickets/{fake}/")
        assert resp.status_code == status.HTTP_404_NOT_FOUND
        resp2 = client.patch(
            f"/api/v1/admin/support/tickets/{fake}/", {"status": "CLOSED"}, format="json"
        )
        assert resp2.status_code == status.HTTP_404_NOT_FOUND

    def test_s08_04_malformed_uuid_returns_404(self, superadmin):
        client = APIClient()
        client.force_authenticate(user=superadmin)
        resp = client.get("/api/v1/admin/support/tickets/not-a-uuid/")
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_s08_05_audit_actor_is_request_user(self, superadmin):
        from apps.audit.models import AuditLog
        client = APIClient()
        client.force_authenticate(user=superadmin)
        client.get("/api/v1/admin/support/tickets/")
        assert AuditLog.objects.filter(actor=superadmin, action="SUPPORT_TICKET_LIST_VIEWED").exists()
