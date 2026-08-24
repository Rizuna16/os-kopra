import uuid

import pytest

from apps.security.tests.conftest import client_for

pytestmark = pytest.mark.django_db

AUDIT_LOGS = "/api/v1/admin/audit-logs/"
BACKUPS = "/api/v1/admin/backups/"
MONITORING = "/api/v1/admin/monitoring/"
BACKUP_RESTORE = "/api/v1/admin/backups/{uuid}/restore/"


class TestPart26RolePrivilege:
    # Normal business roles must NOT obtain platform privileges.
    def test_pe1_owner_denied_all(self, owner1, owner1_tokens):
        for url in (AUDIT_LOGS, BACKUPS, MONITORING):
            resp = client_for(owner1_tokens["access"]).get(url)
            assert resp.status_code == 403

    def test_pe1_admin_staff_denied_all(self, staff_admin, staff_tokens):
        for url in (AUDIT_LOGS, BACKUPS, MONITORING):
            resp = client_for(staff_tokens["access"]).get(url)
            assert resp.status_code == 403

    def test_pe1_plain_user_denied_all(self, plain_user, plain_tokens):
        for url in (AUDIT_LOGS, BACKUPS, MONITORING):
            resp = client_for(plain_tokens["access"]).get(url)
            assert resp.status_code == 403


class TestPart26ParamManipulation:
    # Changing request parameters must NOT elevate privilege.
    def test_pe2_body_params_cannot_elevate(self, owner1, owner1_tokens):
        resp = client_for(owner1_tokens["access"]).post(
            AUDIT_LOGS,
            {"is_superuser": True, "role": "superadmin", "action": "read"},
        )
        assert resp.status_code in (401, 403, 405)

    def test_pe2_existing_admin_endpoint_no_escalation(self, plain_user, plain_tokens):
        # Existing PART 25 platform endpoint must reject mutation/escalation.
        resp = client_for(plain_tokens["access"]).post(
            "/api/v1/admin/businesses/", {"is_superuser": True}
        )
        assert resp.status_code in (403, 405)

    # Object IDs cannot elevate privilege.
    def test_pe3_arbitrary_audit_id_cannot_elevate(self, owner1, owner1_tokens):
        resp = client_for(owner1_tokens["access"]).get(
            f"/api/v1/admin/audit-logs/{uuid.uuid4()}/"
        )
        assert resp.status_code == 403

    # Cross-business access cannot be obtained via endpoint manipulation.
    def test_pe4_endpoint_manipulation_no_cross_business(
        self, owner1, owner1_tokens, business2
    ):
        # Attempting to read "other business" audit via crafted URL is denied.
        resp = client_for(owner1_tokens["access"]).get(
            f"/api/v1/admin/audit-logs/?business_id={business2.id}"
        )
        assert resp.status_code == 403


class TestPart26RestoreEscalation:
    def test_pe5_restore_not_allowed_for_normal_users(
        self, owner1, owner1_tokens, staff_admin, staff_tokens, plain_user, plain_tokens
    ):
        for tokens in (owner1_tokens, staff_tokens, plain_tokens):
            resp = client_for(tokens["access"]).post(
                BACKUP_RESTORE.format(uuid=uuid.uuid4()), {}
            )
            assert resp.status_code == 403

    def test_pe6_cross_business_audit_denied_for_normal_users(
        self, owner1, owner1_tokens, owner2, owner2_tokens
    ):
        # Neither owner can read the other's platform audit surface.
        r1 = client_for(owner1_tokens["access"]).get(AUDIT_LOGS)
        r2 = client_for(owner2_tokens["access"]).get(AUDIT_LOGS)
        assert r1.status_code == 403
        assert r2.status_code == 403

    def test_pe7_cross_business_monitoring_denied_for_normal_users(
        self, owner1, owner1_tokens, owner2, owner2_tokens
    ):
        r1 = client_for(owner1_tokens["access"]).get(MONITORING)
        r2 = client_for(owner2_tokens["access"]).get(MONITORING)
        assert r1.status_code == 403
        assert r2.status_code == 403
