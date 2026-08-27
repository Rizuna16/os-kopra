import pytest
from django.contrib.auth import get_user_model

from apps.business.models import Business
from apps.employee.models import Employee

User = get_user_model()

pytestmark = pytest.mark.django_db


@pytest.fixture
def owner(db):
    return User.objects.create_user(
        email="owner-account@example.com",
        password="SecurePass123!",
    )


@pytest.fixture
def employee_account(db):
    return User.objects.create_user(
        email="employee-account@example.com",
        password="SecurePass123!",
    )


@pytest.fixture
def business(db, owner):
    return Business.objects.create(name="Toko Employee Link", owner=owner)


class TestEmployeeAccountLinkage:
    def test_employee_can_be_linked_to_account(self, owner, employee_account, business):
        employee = Employee.objects.create(
            business=business, name="Budi", code="EMP001", user=employee_account
        )
        employee.refresh_from_db()
        assert employee.user_id == employee_account.id
        assert employee.user == employee_account

    def test_employee_account_back_relation(self, owner, employee_account, business):
        employee = Employee.objects.create(
            business=business, name="Budi", code="EMP002", user=employee_account
        )
        assert employee_account.employee_profile == employee

    def test_existing_employee_without_account_still_valid(self, owner, business):
        employee = Employee.objects.create(business=business, name="No Account", code="EMP003")
        employee.refresh_from_db()
        assert employee.user is None

    def test_employee_account_is_not_owner(self, owner, employee_account, business):
        Employee.objects.create(
            business=business, name="Budi", code="EMP004", user=employee_account
        )
        assert employee_account != business.owner
        assert employee_account.id != business.owner_id

    def test_employee_linked_to_different_account_than_owner(self, owner, employee_account, business):
        employee = Employee.objects.create(
            business=business, name="Budi", code="EMP005", user=employee_account
        )
        assert employee.user_id != business.owner_id

    def test_deleting_account_keeps_employee(self, owner, employee_account, business):
        employee = Employee.objects.create(
            business=business, name="Budi", code="EMP006", user=employee_account
        )
        employee_account.delete()
        employee.refresh_from_db()
        assert employee.pk is not None
        assert employee.user is None
