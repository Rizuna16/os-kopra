import uuid

import pytest
from django.contrib.auth import get_user_model

from apps.business.models import Business
from apps.customer.models import Customer

User = get_user_model()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email="owner@example.com",
        password="SecurePass123!",
    )


@pytest.fixture
def other_user(db):
    return User.objects.create_user(
        email="other@example.com",
        password="SecurePass123!",
    )


@pytest.fixture
def auth_tokens(user):
    from rest_framework_simplejwt.tokens import RefreshToken

    refresh = RefreshToken.for_user(user)
    return {"access": str(refresh.access_token)}


@pytest.fixture
def other_tokens(other_user):
    from rest_framework_simplejwt.tokens import RefreshToken

    refresh = RefreshToken.for_user(other_user)
    return {"access": str(refresh.access_token)}


@pytest.fixture
def auth_client(client, auth_tokens):
    client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {auth_tokens['access']}"
    return client


@pytest.fixture
def other_auth_client(client, other_tokens):
    client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {other_tokens['access']}"
    return client


@pytest.fixture
def business(db, user):
    return Business.objects.create(name="Toko Budi", owner=user)


@pytest.fixture
def other_business(db, other_user):
    return Business.objects.create(name="Toko Lain", owner=other_user)


def _url(business_id, suffix=""):
    return f"/api/v1/businesses/{business_id}/customers/{suffix}"


@pytest.mark.django_db
class TestCustomerCreate:
    def test_owner_can_create(self, auth_client, business):
        response = auth_client.post(
            _url(business.id),
            {"name": "Budi Santoso"},
            content_type="application/json",
        )
        assert response.status_code == 201
        assert response.data["name"] == "Budi Santoso"
        assert response.data["business"] == str(business.id)
        assert Customer.objects.filter(business=business, name="Budi Santoso").exists()

    def test_create_without_name(self, auth_client, business):
        response = auth_client.post(
            _url(business.id),
            {},
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_create_whitespace_only_name(self, auth_client, business):
        response = auth_client.post(
            _url(business.id),
            {"name": "   "},
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_create_optional_fields_omitted(self, auth_client, business):
        response = auth_client.post(
            _url(business.id),
            {"name": "Siti"},
            content_type="application/json",
        )
        assert response.status_code == 201
        assert response.data["phone"] in (None, "")
        assert response.data["email"] in (None, "")
        assert response.data["address"] in (None, "")

    def test_create_invalid_email(self, auth_client, business):
        response = auth_client.post(
            _url(business.id),
            {"name": "Siti", "email": "not-an-email"},
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_create_valid_email(self, auth_client, business):
        response = auth_client.post(
            _url(business.id),
            {"name": "Siti", "email": "siti@example.com"},
            content_type="application/json",
        )
        assert response.status_code == 201

    def test_cross_owner_create_blocked(self, other_auth_client, business):
        response = other_auth_client.post(
            _url(business.id),
            {"name": "Intruder"},
            content_type="application/json",
        )
        assert response.status_code == 404
        assert not Customer.objects.filter(name="Intruder").exists()

    def test_business_reassignment_on_create_blocked(
        self, auth_client, business, other_business
    ):
        response = auth_client.post(
            _url(business.id),
            {"name": "X", "business": str(other_business.id)},
            content_type="application/json",
        )
        assert response.status_code == 201
        customer = Customer.objects.get(business=business, name="X")
        assert str(customer.business_id) == str(business.id)

    def test_duplicate_name_allowed(self, auth_client, business):
        r1 = auth_client.post(
            _url(business.id), {"name": "Same"}, content_type="application/json"
        )
        r2 = auth_client.post(
            _url(business.id), {"name": "Same"}, content_type="application/json"
        )
        assert r1.status_code == 201
        assert r2.status_code == 201
        assert Customer.objects.filter(business=business, name="Same").count() == 2

    def test_duplicate_phone_allowed(self, auth_client, business):
        r1 = auth_client.post(
            _url(business.id),
            {"name": "A", "phone": "08123"},
            content_type="application/json",
        )
        r2 = auth_client.post(
            _url(business.id),
            {"name": "B", "phone": "08123"},
            content_type="application/json",
        )
        assert r1.status_code == 201
        assert r2.status_code == 201

    def test_duplicate_email_allowed(self, auth_client, business):
        r1 = auth_client.post(
            _url(business.id),
            {"name": "A", "email": "same@example.com"},
            content_type="application/json",
        )
        r2 = auth_client.post(
            _url(business.id),
            {"name": "B", "email": "same@example.com"},
            content_type="application/json",
        )
        assert r1.status_code == 201
        assert r2.status_code == 201


@pytest.mark.django_db
class TestCustomerList:
    def test_owner_can_list(self, auth_client, business):
        Customer.objects.create(business=business, name="A")
        Customer.objects.create(business=business, name="B")
        response = auth_client.get(_url(business.id))
        assert response.status_code == 200
        names = {item["name"] for item in response.data}
        assert names == {"A", "B"}

    def test_cross_owner_list_blocked(self, other_auth_client, business):
        response = other_auth_client.get(_url(business.id))
        assert response.status_code == 404

    def test_list_only_owner_customers(
        self, auth_client, business, other_business
    ):
        Customer.objects.create(business=business, name="A")
        Customer.objects.create(business=other_business, name="Secret")
        response = auth_client.get(_url(business.id))
        assert response.status_code == 200
        names = {item["name"] for item in response.data}
        assert "Secret" not in names


@pytest.mark.django_db
class TestCustomerDetail:
    def test_owner_can_retrieve(self, auth_client, business):
        customer = Customer.objects.create(business=business, name="A")
        response = auth_client.get(_url(business.id, f"{customer.id}/"))
        assert response.status_code == 200
        assert response.data["id"] == str(customer.id)

    def test_cross_owner_detail_blocked(self, other_auth_client, business):
        customer = Customer.objects.create(business=business, name="A")
        response = other_auth_client.get(_url(business.id, f"{customer.id}/"))
        assert response.status_code == 404


@pytest.mark.django_db
class TestCustomerUpdate:
    def test_owner_can_update(self, auth_client, business):
        customer = Customer.objects.create(business=business, name="A", phone="1")
        response = auth_client.patch(
            _url(business.id, f"{customer.id}/"),
            {"name": "A Baru", "phone": "2", "email": "a@m.com"},
            content_type="application/json",
        )
        assert response.status_code == 200
        customer.refresh_from_db()
        assert customer.name == "A Baru"
        assert customer.phone == "2"
        assert customer.email == "a@m.com"

    def test_cross_owner_update_blocked(self, other_auth_client, business):
        customer = Customer.objects.create(business=business, name="A")
        response = other_auth_client.patch(
            _url(business.id, f"{customer.id}/"),
            {"name": "Hacked"},
            content_type="application/json",
        )
        assert response.status_code == 404
        customer.refresh_from_db()
        assert customer.name == "A"

    def test_patch_partial_update(self, auth_client, business):
        customer = Customer.objects.create(business=business, name="A")
        response = auth_client.patch(
            _url(business.id, f"{customer.id}/"),
            {"address": "Jl. Merdeka"},
            content_type="application/json",
        )
        assert response.status_code == 200
        customer.refresh_from_db()
        assert customer.address == "Jl. Merdeka"

    def test_business_reassignment_on_update_blocked(
        self, auth_client, business, other_business
    ):
        customer = Customer.objects.create(business=business, name="A")
        response = auth_client.patch(
            _url(business.id, f"{customer.id}/"),
            {"business": str(other_business.id)},
            content_type="application/json",
        )
        assert response.status_code == 200
        customer.refresh_from_db()
        assert str(customer.business_id) == str(business.id)

    def test_invalid_email_on_update(self, auth_client, business):
        customer = Customer.objects.create(business=business, name="A")
        response = auth_client.patch(
            _url(business.id, f"{customer.id}/"),
            {"email": "bad"},
            content_type="application/json",
        )
        assert response.status_code == 400


@pytest.mark.django_db
class TestCustomerDelete:
    def test_owner_can_delete(self, auth_client, business):
        customer = Customer.objects.create(business=business, name="A")
        response = auth_client.delete(_url(business.id, f"{customer.id}/"))
        assert response.status_code == 204
        assert not Customer.objects.filter(pk=customer.id).exists()

    def test_cross_owner_delete_blocked(self, other_auth_client, business):
        customer = Customer.objects.create(business=business, name="A")
        response = other_auth_client.delete(_url(business.id, f"{customer.id}/"))
        assert response.status_code == 404
        assert Customer.objects.filter(pk=customer.id).exists()

    def test_hard_delete_removes_record(self, auth_client, business):
        customer = Customer.objects.create(business=business, name="A")
        auth_client.delete(_url(business.id, f"{customer.id}/"))
        assert not Customer.objects.filter(pk=customer.id).exists()
        response = auth_client.get(_url(business.id, f"{customer.id}/"))
        assert response.status_code == 404


@pytest.mark.django_db
class TestCustomerSecurity:
    def test_mass_assignment_blocked(
        self, auth_client, business, other_business
    ):
        response = auth_client.post(
            _url(business.id),
            {
                "name": "X",
                "business": str(other_business.id),
                "is_admin": True,
            },
            content_type="application/json",
        )
        assert response.status_code == 201
        customer = Customer.objects.get(business=business, name="X")
        assert str(customer.business_id) == str(business.id)
        assert not hasattr(customer, "is_admin")

    def test_uuid_in_response(self, auth_client, business):
        response = auth_client.post(
            _url(business.id), {"name": "X"}, content_type="application/json"
        )
        assert response.status_code == 201
        cid = uuid.UUID(response.data["id"])
        assert str(cid) == response.data["id"]

    def test_response_exposure(self, auth_client, business, other_business):
        response = auth_client.post(
            _url(business.id), {"name": "X"}, content_type="application/json"
        )
        assert response.status_code == 201
        assert "status" not in response.data
        assert str(other_business.id) not in str(response.data)

    def test_unauthenticated_create(self, client, business):
        response = client.post(
            _url(business.id), {"name": "X"}, content_type="application/json"
        )
        assert response.status_code == 401

    def test_unauthenticated_list(self, client, business):
        response = client.get(_url(business.id))
        assert response.status_code == 401

    def test_unauthenticated_detail(self, client, business):
        response = client.get(_url(business.id, f"{uuid.uuid4()}/"))
        assert response.status_code == 401

    def test_unauthenticated_update(self, client, business):
        response = client.patch(
            _url(business.id, f"{uuid.uuid4()}/"),
            {"name": "X"},
            content_type="application/json",
        )
        assert response.status_code == 401

    def test_unauthenticated_delete(self, client, business):
        response = client.delete(_url(business.id, f"{uuid.uuid4()}/"))
        assert response.status_code == 401


@pytest.mark.django_db
class TestCustomerNoDependency:
    def test_no_location_dependency(self, auth_client, business):
        response = auth_client.post(
            _url(business.id), {"name": "X"}, content_type="application/json"
        )
        assert response.status_code == 201
        assert "location" not in response.data

    def test_no_status_field(self, auth_client, business):
        response = auth_client.post(
            _url(business.id), {"name": "X"}, content_type="application/json"
        )
        assert response.status_code == 201
        assert "status" not in response.data

    def test_no_uniqueness_name(
        self, auth_client, business
    ):
        r1 = auth_client.post(
            _url(business.id), {"name": "Same"}, content_type="application/json"
        )
        r2 = auth_client.post(
            _url(business.id), {"name": "Same"}, content_type="application/json"
        )
        assert r1.status_code == 201
        assert r2.status_code == 201

    def test_no_uniqueness_phone(self, auth_client, business):
        r1 = auth_client.post(
            _url(business.id),
            {"name": "A", "phone": "999"},
            content_type="application/json",
        )
        r2 = auth_client.post(
            _url(business.id),
            {"name": "B", "phone": "999"},
            content_type="application/json",
        )
        assert r1.status_code == 201
        assert r2.status_code == 201

    def test_no_uniqueness_email(self, auth_client, business):
        r1 = auth_client.post(
            _url(business.id),
            {"name": "A", "email": "dup@example.com"},
            content_type="application/json",
        )
        r2 = auth_client.post(
            _url(business.id),
            {"name": "B", "email": "dup@example.com"},
            content_type="application/json",
        )
        assert r1.status_code == 201
        assert r2.status_code == 201
