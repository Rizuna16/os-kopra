import pytest
from django.apps import apps


def _url(business_id, suffix=""):
    return f"/api/v1/businesses/{business_id}/employees/{suffix}"


@pytest.mark.django_db
class TestEmployee:
    def test_model_registered(self):
        try:
            apps.get_model("employee", "Employee")
        except LookupError:
            pytest.fail("Employee model is not implemented yet (RED expected).")

    def test_create_returns_201(self, auth_client, business):
        r = auth_client.post(
            _url(business.id),
            data={"name": "Budi", "code": "EMP001"},
            content_type="application/json",
        )
        assert r.status_code == 201, r.status_code

    def test_list_returns_200(self, auth_client, business):
        r = auth_client.get(_url(business.id))
        assert r.status_code == 200, r.status_code

    def test_requires_authentication(self, client, business):
        r = client.get(_url(business.id))
        assert r.status_code in (401, 403), r.status_code

    def test_business_injection_protection(self, auth_client, business, other_business):
        r = auth_client.post(
            _url(business.id),
            data={"name": "Budi", "business": str(other_business.id)},
            content_type="application/json",
        )
        assert r.status_code == 201, r.status_code
        if r.status_code == 201:
            assert r.data.get("business") == business.id

    def test_detail_returns_200(self, auth_client, business):
        create = auth_client.post(
            _url(business.id),
            data={"name": "Budi", "code": "EMP001"},
            content_type="application/json",
        )
        assert create.status_code == 201, create.status_code
        pk = create.data["id"]
        r = auth_client.get(_url(business.id, f"{pk}/"))
        assert r.status_code == 200, r.status_code

    def test_detail_idor_blocked(self, auth_client, other_auth_client, business):
        create = auth_client.post(
            _url(business.id),
            data={"name": "Budi", "code": "EMP001"},
            content_type="application/json",
        )
        assert create.status_code == 201, create.status_code
        pk = create.data["id"]
        r = other_auth_client.get(_url(business.id, f"{pk}/"))
        assert r.status_code == 404, r.status_code

    def test_update_own_employee(self, auth_client, business):
        create = auth_client.post(
            _url(business.id),
            data={"name": "Budi", "code": "EMP001"},
            content_type="application/json",
        )
        assert create.status_code == 201, create.status_code
        pk = create.data["id"]
        r = auth_client.patch(
            _url(business.id, f"{pk}/"),
            data={"name": "Budi Baru"},
            content_type="application/json",
        )
        assert r.status_code == 200, r.status_code

    def test_delete_own_employee(self, auth_client, business):
        create = auth_client.post(
            _url(business.id),
            data={"name": "Budi", "code": "EMP001"},
            content_type="application/json",
        )
        assert create.status_code == 201, create.status_code
        pk = create.data["id"]
        r = auth_client.delete(_url(business.id, f"{pk}/"))
        assert r.status_code == 204, r.status_code

    def test_required_name_validation(self, auth_client, business):
        r = auth_client.post(
            _url(business.id),
            data={"code": "EMP001"},
            content_type="application/json",
        )
        assert r.status_code == 400, r.status_code

    def test_code_uniqueness_within_business(self, auth_client, business):
        first = auth_client.post(
            _url(business.id),
            data={"name": "Budi", "code": "EMP001"},
            content_type="application/json",
        )
        assert first.status_code == 201, first.status_code
        second = auth_client.post(
            _url(business.id),
            data={"name": "Budi Lain", "code": "EMP001"},
            content_type="application/json",
        )
        assert second.status_code == 400, second.status_code

    def test_cross_business_isolation(self, auth_client, other_auth_client, business):
        create = auth_client.post(
            _url(business.id),
            data={"name": "Budi", "code": "EMP001"},
            content_type="application/json",
        )
        assert create.status_code == 201, create.status_code
        pk = create.data["id"]
        r = other_auth_client.get(_url(business.id, f"{pk}/"))
        assert r.status_code == 404, r.status_code
