import uuid

import pytest
from django.contrib.auth import get_user_model

from apps.business.models import Business

User = get_user_model()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email="owner@example.com", password="SecurePass123!"
    )


@pytest.fixture
def other_user(db):
    return User.objects.create_user(
        email="other@example.com", password="SecurePass123!"
    )


@pytest.fixture
def auth_tokens(user):
    from rest_framework_simplejwt.tokens import RefreshToken

    return {"access": str(RefreshToken.for_user(user).access_token)}


@pytest.fixture
def other_tokens(other_user):
    from rest_framework_simplejwt.tokens import RefreshToken

    return {"access": str(RefreshToken.for_user(other_user).access_token)}


@pytest.fixture
def auth_client(client, auth_tokens):
    client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {auth_tokens['access']}"
    return client


@pytest.fixture
def other_auth_client(other_tokens):
    from django.test import Client

    client = Client()
    client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {other_tokens['access']}"
    return client


@pytest.fixture
def business(db, user):
    return Business.objects.create(name="Toko Budi", owner=user)


@pytest.fixture
def other_business(db, other_user):
    return Business.objects.create(name="Toko Lain", owner=other_user)


def _url(business_id, suffix=""):
    return f"/api/v1/businesses/{business_id}/loyalty-programs/{suffix}"


def _payload(**overrides):
    base = {"name": "Program Setia", "status": "ACTIVE"}
    base.update(overrides)
    return base


@pytest.mark.django_db
class TestLoyaltyProgramCreate:
    def test_owner_can_create(self, auth_client, business):
        r = auth_client.post(
            _url(business.id), _payload(), content_type="application/json"
        )
        assert r.status_code == 201
        assert r.data["name"] == "Program Setia"
        assert r.data["business"] == str(business.id)
        assert uuid.UUID(r.data["id"])

    def test_create_without_name(self, auth_client, business):
        r = auth_client.post(_url(business.id), {}, content_type="application/json")
        assert r.status_code == 400

    def test_create_whitespace_only_name(self, auth_client, business):
        r = auth_client.post(
            _url(business.id),
            _payload(name="   "),
            content_type="application/json",
        )
        assert r.status_code == 400

    def test_invalid_status_rejected(self, auth_client, business):
        r = auth_client.post(
            _url(business.id),
            _payload(status="SUSPENDED"),
            content_type="application/json",
        )
        assert r.status_code == 400

    def test_business_reassignment_blocked(self, auth_client, business, other_business):
        r = auth_client.post(
            _url(business.id),
            {**_payload(), "business": str(other_business.id)},
            content_type="application/json",
        )
        assert r.status_code == 201
        assert r.data["business"] == str(business.id)

    def test_unauthenticated_create(self, client, business):
        r = client.post(_url(business.id), _payload(), content_type="application/json")
        assert r.status_code == 401


@pytest.mark.django_db
class TestLoyaltyProgramList:
    def test_owner_can_list(self, auth_client, business):
        auth_client.post(_url(business.id), _payload(), content_type="application/json")
        r = auth_client.get(_url(business.id))
        assert r.status_code == 200
        assert len(r.data) == 1

    def test_cross_owner_list_blocked(self, other_auth_client, business):
        r = other_auth_client.get(_url(business.id))
        assert r.status_code == 404

    def test_unauthenticated_list(self, client, business):
        r = client.get(_url(business.id))
        assert r.status_code == 401


@pytest.mark.django_db
class TestLoyaltyProgramDetail:
    def test_owner_can_retrieve(self, auth_client, business):
        cr = auth_client.post(
            _url(business.id), _payload(), content_type="application/json"
        )
        assert cr.status_code == 201
        pid = cr.data["id"]
        r = auth_client.get(_url(business.id, f"{pid}/"))
        assert r.status_code == 200
        assert r.data["id"] == pid

    def test_cross_owner_detail_blocked(self, auth_client, other_auth_client, business):
        cr = auth_client.post(
            _url(business.id), _payload(), content_type="application/json"
        )
        assert cr.status_code == 201
        pid = cr.data["id"]
        r = other_auth_client.get(_url(business.id, f"{pid}/"))
        assert r.status_code == 404

    def test_unauthenticated_detail(self, client, business):
        r = client.get(_url(business.id, f"{uuid.uuid4()}/"))
        assert r.status_code == 401


@pytest.mark.django_db
class TestLoyaltyProgramUpdate:
    def test_owner_can_update(self, auth_client, business):
        cr = auth_client.post(
            _url(business.id), _payload(), content_type="application/json"
        )
        assert cr.status_code == 201
        pid = cr.data["id"]
        r = auth_client.patch(
            _url(business.id, f"{pid}/"),
            {"name": "Program Baru", "status": "INACTIVE"},
            content_type="application/json",
        )
        assert r.status_code == 200
        assert r.data["name"] == "Program Baru"
        assert r.data["status"] == "INACTIVE"

    def test_invalid_status_rejected(self, auth_client, business):
        cr = auth_client.post(
            _url(business.id), _payload(), content_type="application/json"
        )
        assert cr.status_code == 201
        pid = cr.data["id"]
        r = auth_client.patch(
            _url(business.id, f"{pid}/"),
            {"status": "WEIRD"},
            content_type="application/json",
        )
        assert r.status_code == 400

    def test_cross_owner_update_blocked(self, auth_client, other_auth_client, business):
        cr = auth_client.post(
            _url(business.id), _payload(), content_type="application/json"
        )
        assert cr.status_code == 201
        pid = cr.data["id"]
        r = other_auth_client.patch(
            _url(business.id, f"{pid}/"),
            {"name": "Hacked"},
            content_type="application/json",
        )
        assert r.status_code == 404

    def test_unauthenticated_update(self, client, business):
        r = client.patch(
            _url(business.id, f"{uuid.uuid4()}/"),
            {"name": "X"},
            content_type="application/json",
        )
        assert r.status_code == 401


@pytest.mark.django_db
class TestLoyaltyProgramDelete:
    def test_owner_can_delete(self, auth_client, business):
        cr = auth_client.post(
            _url(business.id), _payload(), content_type="application/json"
        )
        assert cr.status_code == 201
        pid = cr.data["id"]
        r = auth_client.delete(_url(business.id, f"{pid}/"))
        assert r.status_code == 204

    def test_cross_owner_delete_blocked(self, auth_client, other_auth_client, business):
        cr = auth_client.post(
            _url(business.id), _payload(), content_type="application/json"
        )
        assert cr.status_code == 201
        pid = cr.data["id"]
        r = other_auth_client.delete(_url(business.id, f"{pid}/"))
        assert r.status_code == 404

    def test_unauthenticated_delete(self, client, business):
        r = client.delete(_url(business.id, f"{uuid.uuid4()}/"))
        assert r.status_code == 401


@pytest.mark.django_db
class TestLoyaltyProgramSecurity:
    def test_uuid_pk(self, auth_client, business):
        r = auth_client.post(
            _url(business.id), _payload(), content_type="application/json"
        )
        assert r.status_code == 201
        assert str(uuid.UUID(r.data["id"])) == r.data["id"]

    def test_mass_assignment_blocked(self, auth_client, business, other_business):
        r = auth_client.post(
            _url(business.id),
            {**_payload(), "business": str(other_business.id)},
            content_type="application/json",
        )
        assert r.status_code == 201
        assert r.data["business"] == str(business.id)

    def test_no_location_field(self, auth_client, business):
        r = auth_client.post(
            _url(business.id), _payload(), content_type="application/json"
        )
        assert r.status_code == 201
        assert "location" not in r.data
