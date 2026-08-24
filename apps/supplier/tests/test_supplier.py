import pytest
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

from apps.business.models import Business
from apps.supplier.models import Supplier

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
    refresh = RefreshToken.for_user(user)
    return {"access": str(refresh.access_token)}


@pytest.fixture
def other_tokens(other_user):
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
    return f"/api/v1/businesses/{business_id}/suppliers/{suffix}"


@pytest.mark.django_db
class TestSupplierCreate:
    def test_owner_can_create_supplier(self, auth_client, business):
        response = auth_client.post(
            _url(business.id),
            {"name": "PT Sumber Makmur", "phone": "08123", "email": "a@b.com", "address": "Jl. A"},
            content_type="application/json",
        )
        assert response.status_code == 201
        assert response.data["name"] == "PT Sumber Makmur"
        assert response.data["business"] == str(business.id)
        assert Supplier.objects.filter(business=business, name="PT Sumber Makmur").exists()

    def test_unauthenticated_rejected(self, client, business):
        response = client.post(
            _url(business.id),
            {"name": "PT X"},
            content_type="application/json",
        )
        assert response.status_code == 401

    def test_required_name_validation(self, auth_client, business):
        response = auth_client.post(
            _url(business.id),
            {"phone": "08123"},
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_duplicate_name_same_business_rejected(self, auth_client, business):
        Supplier.objects.create(business=business, name="PT Sumber Makmur")
        response = auth_client.post(
            _url(business.id),
            {"name": "PT Sumber Makmur"},
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_same_name_other_business_allowed(self, auth_client, business, other_business):
        Supplier.objects.create(business=other_business, name="PT Sumber Makmur")
        response = auth_client.post(
            _url(business.id),
            {"name": "PT Sumber Makmur"},
            content_type="application/json",
        )
        assert response.status_code == 201

    def test_client_cannot_assign_other_business(self, auth_client, business, other_business):
        response = auth_client.post(
            _url(business.id),
            {"name": "PT X", "business": str(other_business.id)},
            content_type="application/json",
        )
        assert response.status_code == 201
        supplier = Supplier.objects.get(business=business, name="PT X")
        assert str(supplier.business_id) == str(business.id)

    def test_phone_email_address_accepted(self, auth_client, business):
        response = auth_client.post(
            _url(business.id),
            {"name": "PT Y", "phone": "081", "email": "y@z.com", "address": "Addr"},
            content_type="application/json",
        )
        assert response.status_code == 201
        supplier = Supplier.objects.get(business=business, name="PT Y")
        assert supplier.phone == "081"
        assert supplier.email == "y@z.com"
        assert supplier.address == "Addr"


@pytest.mark.django_db
class TestSupplierList:
    def test_owner_can_list_own_suppliers(self, auth_client, business):
        Supplier.objects.create(business=business, name="PT A")
        Supplier.objects.create(business=business, name="PT B")
        response = auth_client.get(_url(business.id))
        assert response.status_code == 200
        names = {item["name"] for item in response.data}
        assert names == {"PT A", "PT B"}

    def test_other_business_suppliers_not_exposed(self, auth_client, business, other_business):
        Supplier.objects.create(business=other_business, name="PT Secret")
        response = auth_client.get(_url(business.id))
        assert response.status_code == 200
        names = {item["name"] for item in response.data}
        assert "PT Secret" not in names

    def test_unauthenticated_rejected(self, client, business):
        response = client.get(_url(business.id))
        assert response.status_code == 401


@pytest.mark.django_db
class TestSupplierDetail:
    def test_owner_can_retrieve(self, auth_client, business):
        supplier = Supplier.objects.create(business=business, name="PT A")
        response = auth_client.get(_url(business.id, f"{supplier.id}/"))
        assert response.status_code == 200
        assert response.data["id"] == str(supplier.id)

    def test_other_business_supplier_blocked(self, auth_client, other_business):
        supplier = Supplier.objects.create(business=other_business, name="PT Secret")
        response = auth_client.get(_url(other_business.id, f"{supplier.id}/"))
        assert response.status_code == 404

    def test_unauthenticated_rejected(self, client, business):
        supplier = Supplier.objects.create(business=business, name="PT A")
        response = client.get(_url(business.id, f"{supplier.id}/"))
        assert response.status_code == 401


@pytest.mark.django_db
class TestSupplierUpdate:
    def test_owner_can_update(self, auth_client, business):
        supplier = Supplier.objects.create(business=business, name="PT A", phone="1")
        response = auth_client.patch(
            _url(business.id, f"{supplier.id}/"),
            {"name": "PT A Baru", "phone": "2", "email": "n@m.com"},
            content_type="application/json",
        )
        assert response.status_code == 200
        supplier.refresh_from_db()
        assert supplier.name == "PT A Baru"
        assert supplier.phone == "2"
        assert supplier.email == "n@m.com"

    def test_cannot_move_to_other_business(self, auth_client, business, other_business):
        supplier = Supplier.objects.create(business=business, name="PT A")
        response = auth_client.patch(
            _url(business.id, f"{supplier.id}/"),
            {"business": str(other_business.id)},
            content_type="application/json",
        )
        assert response.status_code == 200
        supplier.refresh_from_db()
        assert str(supplier.business_id) == str(business.id)

    def test_duplicate_name_same_business_rejected(self, auth_client, business):
        Supplier.objects.create(business=business, name="PT A")
        supplier = Supplier.objects.create(business=business, name="PT B")
        response = auth_client.patch(
            _url(business.id, f"{supplier.id}/"),
            {"name": "PT A"},
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_cannot_update_other_business_supplier(self, auth_client, other_business):
        supplier = Supplier.objects.create(business=other_business, name="PT Secret")
        response = auth_client.patch(
            _url(other_business.id, f"{supplier.id}/"),
            {"name": "PT Hacked"},
            content_type="application/json",
        )
        assert response.status_code == 404

    def test_unauthenticated_rejected(self, client, business):
        supplier = Supplier.objects.create(business=business, name="PT A")
        response = client.patch(
            _url(business.id, f"{supplier.id}/"),
            {"name": "PT X"},
            content_type="application/json",
        )
        assert response.status_code == 401


@pytest.mark.django_db
class TestSupplierDelete:
    def test_owner_can_delete(self, auth_client, business):
        supplier = Supplier.objects.create(business=business, name="PT A")
        response = auth_client.delete(_url(business.id, f"{supplier.id}/"))
        assert response.status_code == 204
        assert not Supplier.objects.filter(pk=supplier.id).exists()

    def test_cannot_delete_other_business_supplier(self, auth_client, other_business):
        supplier = Supplier.objects.create(business=other_business, name="PT Secret")
        response = auth_client.delete(_url(other_business.id, f"{supplier.id}/"))
        assert response.status_code == 404
        assert Supplier.objects.filter(pk=supplier.id).exists()

    def test_unauthenticated_rejected(self, client, business):
        supplier = Supplier.objects.create(business=business, name="PT A")
        response = client.delete(_url(business.id, f"{supplier.id}/"))
        assert response.status_code == 401