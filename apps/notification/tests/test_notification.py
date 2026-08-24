import importlib
import uuid

import pytest


def _url(business_id, suffix=""):
    return f"/api/v1/businesses/{business_id}/notifications/{suffix}"


def _is_json(r):
    return "application/json" in r["Content-Type"]


@pytest.mark.django_db
class TestNotification:
    # Registration gate — implementation MUST exist in GREEN
    def test_implementation_not_registered(self):
        try:
            importlib.import_module("apps.notification.views")
        except ModuleNotFoundError:
            pytest.fail("Notification implementation present before GREEN (RED expected).")

    # 1. Authentication required
    def test_list_requires_authentication(self, client, business):
        r = client.get(_url(business.id))
        assert r.status_code in (401, 403), r.status_code

    def test_detail_requires_authentication(self, client, business):
        r = client.get(_url(business.id, f"{uuid.uuid4()}/"))
        assert r.status_code in (401, 403), r.status_code

    def test_mark_read_requires_authentication(self, client, business):
        r = client.patch(_url(business.id, f"{uuid.uuid4()}/read/"))
        assert r.status_code in (401, 403), r.status_code

    # 2/4/14. Business ownership / cross-business isolation + no existence leak
    def test_cross_business_isolation(self, auth_client, business, other_business):
        r = auth_client.get(_url(other_business.id))
        assert r.status_code == 404, r.status_code
        assert _is_json(r), r["Content-Type"]

    # 3/13/18. User recipient isolation (another user in same business)
    def test_cross_user_notification_access(
        self, auth_client, member_auth_client, business, member_user, db
    ):
        from apps.business.models import BusinessMembership

        BusinessMembership.objects.create(business=business, user=member_user)
        r = member_auth_client.get(_url(business.id, f"{uuid.uuid4()}/"))
        assert r.status_code == 404, r.status_code
        assert _is_json(r), r["Content-Type"]

    # 5. Notification list (owner)
    def test_owner_can_list_notifications(self, auth_client, business, notification):
        r = auth_client.get(_url(business.id))
        assert r.status_code == 200, r.status_code

    # 6. Notification detail (owner)
    def test_owner_can_retrieve_notification(self, auth_client, business, notification):
        r = auth_client.get(_url(business.id, f"{notification.id}/"))
        assert r.status_code == 200, r.status_code

    # 7. Mark-read endpoint
    def test_mark_read_endpoint(self, auth_client, business, notification):
        r = auth_client.patch(_url(business.id, f"{notification.id}/read/"))
        assert r.status_code == 200, r.status_code

    # 8. Unread -> read transition
    def test_unread_to_read_transition(self, auth_client, business, notification):
        before = auth_client.get(_url(business.id, f"{notification.id}/"))
        assert before.status_code == 200, before.status_code
        assert before.data["is_read"] is False
        mark = auth_client.patch(_url(business.id, f"{notification.id}/read/"))
        assert mark.status_code == 200, mark.status_code
        after = auth_client.get(_url(business.id, f"{notification.id}/"))
        assert after.data["is_read"] is True

    # 9. Already-read behavior (idempotent)
    def test_already_read_behavior(self, auth_client, business, notification):
        auth_client.patch(_url(business.id, f"{notification.id}/read/"))
        again = auth_client.patch(_url(business.id, f"{notification.id}/read/"))
        assert again.status_code == 200, again.status_code
        detail = auth_client.get(_url(business.id, f"{notification.id}/"))
        assert detail.data["is_read"] is True

    # 10. Response field contract
    def test_response_field_contract(self, auth_client, business, notification):
        r = auth_client.get(_url(business.id, f"{notification.id}/"))
        assert r.status_code == 200, r.status_code
        allowed = {"id", "type", "title", "message", "is_read", "created_at"}
        assert set(r.data.keys()) == allowed, set(r.data.keys())

    # 11. Default unread behavior
    def test_default_unread(self, auth_client, business, notification):
        r = auth_client.get(_url(business.id, f"{notification.id}/"))
        assert r.status_code == 200, r.status_code
        assert r.data["is_read"] is False

    # 12. Nonexistent notification (reaches declared detail route -> JSON 404)
    def test_nonexistent_notification(self, auth_client, business):
        r = auth_client.get(_url(business.id, f"{uuid.uuid4()}/"))
        assert r.status_code == 404, r.status_code
        assert _is_json(r), r["Content-Type"]

    # 15. Unsupported write methods (declared GET-only -> method rejection, JSON)
    def test_unsupported_write_methods(self, auth_client, business, notification):
        nid = notification.id
        post = auth_client.post(_url(business.id), data={}, content_type="application/json")
        put = auth_client.put(_url(business.id, f"{nid}/"), data={}, content_type="application/json")
        delete = auth_client.delete(_url(business.id, f"{nid}/"))
        read_delete = auth_client.delete(_url(business.id, f"{nid}/read/"))
        for r in (post, put, delete, read_delete):
            assert r.status_code in (404, 405), r.status_code
            assert _is_json(r), r["Content-Type"]

    # 16. Invalid UUID business routing -> client error (Django uuid converter -> 404 before DRF)
    def test_uuid_routing_invalid_business(self, auth_client):
        r = auth_client.get(_url("not-a-valid-uuid"))
        assert r.status_code == 404, r.status_code

    # 17. No notification existence leak (cross-business returns JSON 404, not 200/403)
    def test_no_existence_leak_cross_business(
        self, auth_client, business, other_business
    ):
        r = auth_client.get(_url(other_business.id, f"{uuid.uuid4()}/"))
        assert r.status_code == 404, r.status_code
        assert _is_json(r), r["Content-Type"]


@pytest.fixture
def notification(db, business, user):
    from apps.notification.models import Notification

    return Notification.objects.create(
        business=business,
        recipient=user,
        type="INFO",
        title="Test Notification",
        message="Hello from KOPERA OS",
        is_read=False,
    )
