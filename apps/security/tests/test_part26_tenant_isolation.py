import uuid

import pytest

from apps.security.tests.conftest import client_for

pytestmark = pytest.mark.django_db

AUDIT_LOGS = "/api/v1/admin/audit-logs/"
BACKUPS = "/api/v1/admin/backups/"
MONITORING = "/api/v1/admin/monitoring/"
BACKUP_RESTORE = "/api/v1/admin/backups/{uuid}/restore/"


class TestPart26TenantIsolationAdversarial:
    def test_ti1_business_a_cannot_read_business_b_audit(
        self, owner1, owner1_tokens, business2
    ):
        resp = client_for(owner1_tokens["access"]).get(AUDIT_LOGS)
        assert resp.status_code == 403

    def test_ti2_business_a_cannot_access_business_b_backup(
        self, owner1, owner1_tokens, business2
    ):
        resp = client_for(owner1_tokens["access"]).get(BACKUPS)
        assert resp.status_code == 403

    def test_ti3_business_a_cannot_access_platform_monitoring(
        self, owner1, owner1_tokens
    ):
        resp = client_for(owner1_tokens["access"]).get(MONITORING)
        assert resp.status_code == 403

    def test_ti4_business_a_cannot_trigger_restore(
        self, owner1, owner1_tokens, business2
    ):
        resp = client_for(owner1_tokens["access"]).post(
            BACKUP_RESTORE.format(uuid=uuid.uuid4()), {}
        )
        assert resp.status_code == 403

    def test_ti5_non_superadmin_cannot_perform_platform_ops(
        self, plain_user, plain_tokens
    ):
        for url in (AUDIT_LOGS, BACKUPS, MONITORING):
            resp = client_for(plain_tokens["access"]).get(url)
            assert resp.status_code == 403

    def test_ti6_resource_id_cannot_bypass_tenant_boundary(
        self, owner1, owner1_tokens
    ):
        # An arbitrary audit UUID must not grant cross-tenant read.
        resp = client_for(owner1_tokens["access"]).get(
            f"/api/v1/admin/audit-logs/{uuid.uuid4()}/"
        )
        assert resp.status_code == 403
