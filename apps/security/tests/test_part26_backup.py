import uuid

import pytest
from django.urls import Resolver404, resolve

from apps.security.tests.conftest import client_for

pytestmark = pytest.mark.django_db

BACKUPS = "/api/v1/admin/backups/"
BACKUP_TRIGGER = "/api/v1/admin/backups/trigger/"
BACKUP_DETAIL = "/api/v1/admin/backups/{uuid}/"
BACKUP_RESTORE = "/api/v1/admin/backups/{uuid}/restore/"


class TestPart26BackupAuthBoundary:
    def test_b1_backup_exists_superadmin_200(self, superuser, super_tokens):
        resp = client_for(super_tokens["access"]).get(BACKUPS)
        assert resp.status_code == 200

    def test_b2_platform_sensitive_owner_403(self, owner1, owner1_tokens):
        resp = client_for(owner1_tokens["access"]).get(BACKUPS)
        assert resp.status_code == 403

    def test_b3_owner_cannot_trigger_backup(self, owner1, owner1_tokens):
        resp = client_for(owner1_tokens["access"]).post(BACKUP_TRIGGER, {})
        assert resp.status_code == 403

    def test_b5_restore_requires_superadmin(self, owner1, owner1_tokens):
        resp = client_for(owner1_tokens["access"]).post(
            BACKUP_RESTORE.format(uuid=uuid.uuid4()), {}
        )
        assert resp.status_code == 403

    def test_b6_unauthorized_restore_rejected(self, api_client):
        resp = api_client.post(BACKUP_RESTORE.format(uuid=uuid.uuid4()), {})
        assert resp.status_code == 401

    def test_b8_backup_detail_protected_owner_403(self, owner1, owner1_tokens):
        resp = client_for(owner1_tokens["access"]).get(
            BACKUP_DETAIL.format(uuid=uuid.uuid4())
        )
        assert resp.status_code == 403

    def test_b11_no_cross_business_exposure(self, owner2, owner2_tokens, business1):
        resp = client_for(owner2_tokens["access"]).get(BACKUPS)
        assert resp.status_code == 403


class TestPart26BackupNotBusinessScoped:
    def test_b4_not_exposed_via_business_endpoint(self):
        # Backups must NOT be reachable through ordinary Business-scoped routes.
        try:
            resolve(f"/api/v1/businesses/{uuid.uuid4()}/backups/")
            pytest.fail("Backup route must not be Business-scoped.")
        except Resolver404:
            pass


class TestPart26BackupIntegrity:
    def test_b7_integrity_verification_required(self, superuser, super_tokens):
        resp = client_for(super_tokens["access"]).post(BACKUP_TRIGGER, {})
        assert resp.status_code in (200, 201, 202)
        payload = resp.json()
        # A created backup must carry integrity verification metadata.
        assert "integrity" in payload or "checksum" in payload or "verified" in payload

class TestPart26BackupRestoreAudit:
    def test_b9_restore_has_audit_path(self, superuser, super_tokens):
        resp = client_for(super_tokens["access"]).post(
            BACKUP_RESTORE.format(uuid=uuid.uuid4()), {}
        )
        assert resp.status_code in (200, 202, 400, 404, 409)
        audit = client_for(super_tokens["access"]).get("/api/v1/admin/audit-logs/")
        assert audit.status_code == 200
        payload = audit.json()
        items = payload if isinstance(payload, list) else payload.get("results", [])
        restore_events = [
            i for i in items if (i.get("event_type") or "").lower() == "restore"
        ]
        assert restore_events, "Restore must produce an audit record."

    def test_b10_restore_failure_does_not_corrupt_live_data(
        self, superuser, super_tokens, db
    ):
        from apps.business.models import Business

        before = Business.objects.count()
        # Invalid/nonexistent backup restore must fail in a controlled way.
        resp = client_for(super_tokens["access"]).post(
            BACKUP_RESTORE.format(uuid=uuid.uuid4()), {}
        )
        assert resp.status_code in (400, 404, 409)
        after = Business.objects.count()
        assert before == after, "Failed restore must not alter live business data."
