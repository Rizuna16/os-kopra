import uuid

import pytest
from django.contrib.auth import get_user_model

from apps.business.models import Business
from apps.customer.models import Customer

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


@pytest.fixture
def customer(db, business):
    return Customer.objects.create(business=business, name="Budi")


@pytest.fixture
def other_customer(db, other_business):
    return Customer.objects.create(business=other_business, name="Orang Lain")


def _prog_url(business_id, suffix=""):
    return f"/api/v1/businesses/{business_id}/loyalty-programs/{suffix}"


def _url(business_id, program_id, suffix=""):
    return (
        f"/api/v1/businesses/{business_id}/loyalty-programs/"
        f"{program_id}/customers/{suffix}"
    )


def _program_payload(**overrides):
    base = {"name": "Program Setia", "status": "ACTIVE"}
    base.update(overrides)
    return base


def _record_payload(customer, **overrides):
    base = {"customer": str(customer.id), "points_balance": "0"}
    base.update(overrides)
    return base


@pytest.mark.django_db
class TestCustomerLoyaltyRecordCreate:
    def test_owner_can_create(self, auth_client, business, customer):
        pr = auth_client.post(
            _prog_url(business.id), _program_payload(), content_type="application/json"
        )
        assert pr.status_code == 201
        program_id = pr.data["id"]
        r = auth_client.post(
            _url(business.id, program_id),
            _record_payload(customer),
            content_type="application/json",
        )
        assert r.status_code == 201
        assert r.data["customer"] == str(customer.id)
        assert r.data["program"] == str(program_id)
        assert uuid.UUID(r.data["id"])

    def test_create_without_customer(self, auth_client, business, customer):
        pr = auth_client.post(
            _prog_url(business.id), _program_payload(), content_type="application/json"
        )
        assert pr.status_code == 201
        program_id = pr.data["id"]
        r = auth_client.post(
            _url(business.id, program_id), {"points_balance": "0"},
            content_type="application/json",
        )
        assert r.status_code == 400

    def test_customer_other_business_rejected(self, auth_client, business, other_customer):
        pr = auth_client.post(
            _prog_url(business.id), _program_payload(), content_type="application/json"
        )
        assert pr.status_code == 201
        program_id = pr.data["id"]
        r = auth_client.post(
            _url(business.id, program_id),
            _record_payload(other_customer),
            content_type="application/json",
        )
        assert r.status_code == 400

    def test_negative_points_rejected(self, auth_client, business, customer):
        pr = auth_client.post(
            _prog_url(business.id), _program_payload(), content_type="application/json"
        )
        assert pr.status_code == 201
        program_id = pr.data["id"]
        r = auth_client.post(
            _url(business.id, program_id),
            _record_payload(customer, points_balance="-5"),
            content_type="application/json",
        )
        assert r.status_code == 400

    def test_business_mass_assignment_blocked(
        self, auth_client, business, other_business, customer
    ):
        pr = auth_client.post(
            _prog_url(business.id), _program_payload(), content_type="application/json"
        )
        assert pr.status_code == 201
        program_id = pr.data["id"]
        r = auth_client.post(
            _url(business.id, program_id),
            {**_record_payload(customer), "business": str(other_business.id)},
            content_type="application/json",
        )
        assert r.status_code == 201
        assert r.data["business"] == str(business.id)

    def test_unauthenticated_create(self, client, business, customer):
        r = client.post(
            _url(business.id, uuid.uuid4()),
            _record_payload(customer),
            content_type="application/json",
        )
        assert r.status_code == 401


@pytest.mark.django_db
class TestCustomerLoyaltyRecordList:
    def test_owner_can_list(self, auth_client, business, customer):
        pr = auth_client.post(
            _prog_url(business.id), _program_payload(), content_type="application/json"
        )
        assert pr.status_code == 201
        program_id = pr.data["id"]
        auth_client.post(
            _url(business.id, program_id),
            _record_payload(customer),
            content_type="application/json",
        )
        r = auth_client.get(_url(business.id, program_id))
        assert r.status_code == 200
        assert len(r.data) == 1

    def test_cross_owner_list_blocked(self, auth_client, other_auth_client, business, customer):
        pr = auth_client.post(
            _prog_url(business.id), _program_payload(), content_type="application/json"
        )
        assert pr.status_code == 201
        program_id = pr.data["id"]
        r = other_auth_client.get(_url(business.id, program_id))
        assert r.status_code == 404

    def test_unauthenticated_list(self, client, business):
        r = client.get(_url(business.id, uuid.uuid4()))
        assert r.status_code == 401


@pytest.mark.django_db
class TestCustomerLoyaltyRecordDetail:
    def test_owner_can_retrieve(self, auth_client, business, customer):
        pr = auth_client.post(
            _prog_url(business.id), _program_payload(), content_type="application/json"
        )
        assert pr.status_code == 201
        program_id = pr.data["id"]
        cr = auth_client.post(
            _url(business.id, program_id),
            _record_payload(customer),
            content_type="application/json",
        )
        assert cr.status_code == 201
        rid = cr.data["id"]
        r = auth_client.get(_url(business.id, program_id, f"{rid}/"))
        assert r.status_code == 200
        assert r.data["id"] == rid

    def test_points_balance_default_zero(self, auth_client, business, customer):
        pr = auth_client.post(
            _prog_url(business.id), _program_payload(), content_type="application/json"
        )
        assert pr.status_code == 201
        program_id = pr.data["id"]
        cr = auth_client.post(
            _url(business.id, program_id),
            _record_payload(customer),
            content_type="application/json",
        )
        assert cr.status_code == 201
        assert str(cr.data["points_balance"]) in ("0", "0.00")

    def test_cross_owner_detail_blocked(self, auth_client, other_auth_client, business, customer):
        pr = auth_client.post(
            _prog_url(business.id), _program_payload(), content_type="application/json"
        )
        assert pr.status_code == 201
        program_id = pr.data["id"]
        cr = auth_client.post(
            _url(business.id, program_id),
            _record_payload(customer),
            content_type="application/json",
        )
        assert cr.status_code == 201
        rid = cr.data["id"]
        r = other_auth_client.get(_url(business.id, program_id, f"{rid}/"))
        assert r.status_code == 404

    def test_unauthenticated_detail(self, client, business):
        r = client.get(_url(business.id, uuid.uuid4(), f"{uuid.uuid4()}/"))
        assert r.status_code == 401


@pytest.mark.django_db
class TestCustomerLoyaltyRecordUpdate:
    def test_owner_can_update(self, auth_client, business, customer):
        pr = auth_client.post(
            _prog_url(business.id), _program_payload(), content_type="application/json"
        )
        assert pr.status_code == 201
        program_id = pr.data["id"]
        cr = auth_client.post(
            _url(business.id, program_id),
            _record_payload(customer),
            content_type="application/json",
        )
        assert cr.status_code == 201
        rid = cr.data["id"]
        r = auth_client.patch(
            _url(business.id, program_id, f"{rid}/"),
            {"points_balance": "50"},
            content_type="application/json",
        )
        assert r.status_code == 200
        assert str(r.data["points_balance"]) in ("50", "50.00")

    def test_negative_points_rejected_on_update(self, auth_client, business, customer):
        pr = auth_client.post(
            _prog_url(business.id), _program_payload(), content_type="application/json"
        )
        assert pr.status_code == 201
        program_id = pr.data["id"]
        cr = auth_client.post(
            _url(business.id, program_id),
            _record_payload(customer),
            content_type="application/json",
        )
        assert cr.status_code == 201
        rid = cr.data["id"]
        r = auth_client.patch(
            _url(business.id, program_id, f"{rid}/"),
            {"points_balance": "-1"},
            content_type="application/json",
        )
        assert r.status_code == 400

    def test_cross_owner_update_blocked(self, auth_client, other_auth_client, business, customer):
        pr = auth_client.post(
            _prog_url(business.id), _program_payload(), content_type="application/json"
        )
        assert pr.status_code == 201
        program_id = pr.data["id"]
        cr = auth_client.post(
            _url(business.id, program_id),
            _record_payload(customer),
            content_type="application/json",
        )
        assert cr.status_code == 201
        rid = cr.data["id"]
        r = other_auth_client.patch(
            _url(business.id, program_id, f"{rid}/"),
            {"points_balance": "10"},
            content_type="application/json",
        )
        assert r.status_code == 404

    def test_unauthenticated_update(self, client, business):
        r = client.patch(
            _url(business.id, uuid.uuid4(), f"{uuid.uuid4()}/"),
            {"points_balance": "10"},
            content_type="application/json",
        )
        assert r.status_code == 401


@pytest.mark.django_db
class TestCustomerLoyaltyRecordDelete:
    def test_owner_can_delete(self, auth_client, business, customer):
        pr = auth_client.post(
            _prog_url(business.id), _program_payload(), content_type="application/json"
        )
        assert pr.status_code == 201
        program_id = pr.data["id"]
        cr = auth_client.post(
            _url(business.id, program_id),
            _record_payload(customer),
            content_type="application/json",
        )
        assert cr.status_code == 201
        rid = cr.data["id"]
        r = auth_client.delete(_url(business.id, program_id, f"{rid}/"))
        assert r.status_code == 204

    def test_cross_owner_delete_blocked(self, auth_client, other_auth_client, business, customer):
        pr = auth_client.post(
            _prog_url(business.id), _program_payload(), content_type="application/json"
        )
        assert pr.status_code == 201
        program_id = pr.data["id"]
        cr = auth_client.post(
            _url(business.id, program_id),
            _record_payload(customer),
            content_type="application/json",
        )
        assert cr.status_code == 201
        rid = cr.data["id"]
        r = other_auth_client.delete(_url(business.id, program_id, f"{rid}/"))
        assert r.status_code == 404

    def test_unauthenticated_delete(self, client, business):
        r = client.delete(_url(business.id, uuid.uuid4(), f"{uuid.uuid4()}/"))
        assert r.status_code == 401


@pytest.mark.django_db
class TestCustomerLoyaltyRecordSecurity:
    def test_uuid_pk(self, auth_client, business, customer):
        pr = auth_client.post(
            _prog_url(business.id), _program_payload(), content_type="application/json"
        )
        assert pr.status_code == 201
        program_id = pr.data["id"]
        cr = auth_client.post(
            _url(business.id, program_id),
            _record_payload(customer),
            content_type="application/json",
        )
        assert cr.status_code == 201
        assert str(uuid.UUID(cr.data["id"])) == cr.data["id"]

    def test_customer_part14_untouched(self, auth_client, business, customer):
        # Customer model must remain unchanged; record references it only.
        assert hasattr(customer, "name")
        assert not hasattr(customer, "loyalty_points")
