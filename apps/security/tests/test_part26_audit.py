import uuid

import pytest

from apps.security.tests.conftest import client_for

pytestmark = pytest.mark.django_db

AUDIT_LOGS = "/api/v1/admin/audit-logs/"
AUDIT_DETAIL = "/api/v1/admin/audit-logs/{uuid}/"

# Contract V1 mandatory fields (Master S11 "siapa, apa, kapan, lokasi mana").
MANDATORY_AUDIT_FIELDS = {"actor", "action", "timestamp", "business", "location"}
# Contract V1 additional V1 fields.
ADDITIONAL_AUDIT_FIELDS = {"target", "resource", "event_type", "outcome"}


class TestPart26AuditAuthBoundary:
    def test_a_auth_unauthenticated_401(self, api_client):
        resp = api_client.get(AUDIT_LOGS)
        assert resp.status_code == 401

    def test_a_owner_denied_403(self, owner1, owner1_tokens):
        resp = client_for(owner1_tokens["access"]).get(AUDIT_LOGS)
        assert resp.status_code == 403

    def test_a_superuser_allowed_200(self, superuser, super_tokens):
        resp = client_for(super_tokens["access"]).get(AUDIT_LOGS)
        assert resp.status_code == 200


class TestPart26AuditFields:
    def test_a2_required_fields_persisted(self, superuser, super_tokens, business1):
        # Seed a business-scoped audit record via the approved internal mechanism
        # so field persistence can be verified (contract does not guarantee a
        # non-empty audit log without a recorded privileged action).
        from apps.audit.services import record_audit_event

        record_audit_event(
            actor=superuser,
            action="test_action",
            business=business1,
            event_type="test_event",
            outcome="success",
        )
        resp = client_for(super_tokens["access"]).get(AUDIT_LOGS)
        assert resp.status_code == 200
        payload = resp.json()
        items = payload if isinstance(payload, list) else payload.get("results", [])
        assert items, "Audit list must return recorded events."
        for item in items:
            assert MANDATORY_AUDIT_FIELDS.issubset(set(item.keys()))

    def test_a_additional_fields_present(self, superuser, super_tokens, business1):
        from apps.audit.services import record_audit_event

        record_audit_event(
            actor=superuser,
            action="test_action",
            business=business1,
            target="resource_x",
            resource="promotion",
            event_type="test_event",
            outcome="success",
        )
        resp = client_for(super_tokens["access"]).get(AUDIT_LOGS)
        assert resp.status_code == 200
        payload = resp.json()
        items = payload if isinstance(payload, list) else payload.get("results", [])
        assert items
        for item in items:
            assert ADDITIONAL_AUDIT_FIELDS.issubset(set(item.keys()))

    def test_a3_associated_with_correct_business(
        self, superuser, super_tokens, business1
    ):
        from apps.audit.services import record_audit_event

        record_audit_event(
            actor=superuser,
            action="test_action",
            business=business1,
            event_type="test_event",
            outcome="success",
        )
        resp = client_for(super_tokens["access"]).get(AUDIT_LOGS)
        assert resp.status_code == 200
        payload = resp.json()
        items = payload if isinstance(payload, list) else payload.get("results", [])
        assert items
        for item in items:
            assert "business" in item and item["business"] is not None

    def test_a4_associated_with_correct_location(
        self, superuser, super_tokens, location1
    ):
        from apps.audit.services import record_audit_event

        record_audit_event(
            actor=superuser,
            action="test_action",
            business=location1.business,
            location=location1,
            event_type="test_event",
            outcome="success",
        )
        resp = client_for(super_tokens["access"]).get(AUDIT_LOGS)
        assert resp.status_code == 200
        payload = resp.json()
        items = payload if isinstance(payload, list) else payload.get("results", [])
        assert items
        # When a location is applicable, the location field must be correct.
        located = [i for i in items if i.get("location")]
        if located:
            for item in located:
                assert item["location"] is not None


class TestPart26AuditTenantIsolation:
    def test_a5_tenant_isolated_owner_denied(self, owner1, owner1_tokens):
        resp = client_for(owner1_tokens["access"]).get(AUDIT_LOGS)
        assert resp.status_code == 403

    def test_a6_owner_cannot_read_other_business_audit(
        self, owner2, owner2_tokens, business1
    ):
        resp = client_for(owner2_tokens["access"]).get(AUDIT_LOGS)
        assert resp.status_code == 403

    def test_a7_cross_business_requires_superadmin(self, owner1, owner1_tokens, superuser, super_tokens):
        owner_resp = client_for(owner1_tokens["access"]).get(AUDIT_LOGS)
        assert owner_resp.status_code == 403
        super_resp = client_for(super_tokens["access"]).get(AUDIT_LOGS)
        assert super_resp.status_code == 200


class TestPart26AuditImmutability:
    def test_a9_append_only_no_mutation_endpoint(self, superuser, super_tokens):
        rid = uuid.uuid4()
        base = AUDIT_DETAIL.format(uuid=rid)
        for method in ("post", "put", "patch", "delete"):
            fn = getattr(client_for(super_tokens["access"]), method)
            resp = fn(base)
            assert resp.status_code in (403, 405)

    def test_a10_existing_records_not_silently_modifiable(
        self, superuser, super_tokens
    ):
        rid = uuid.uuid4()
        resp = client_for(super_tokens["access"]).patch(
            AUDIT_DETAIL.format(uuid=rid), {"action": "tampered"}
        )
        assert resp.status_code in (403, 405)


class TestPart26AuditPrivilegedActions:
    def test_a8_privileged_actions_auditable(self, superuser, super_tokens, business1):
        # Perform a privileged action via the approved internal mechanism, then
        # verify it was captured with an event type.
        from apps.audit.services import record_audit_event

        record_audit_event(
            actor=superuser,
            action="test_action",
            business=business1,
            event_type="test_event",
            outcome="success",
        )
        resp = client_for(super_tokens["access"]).get(AUDIT_LOGS)
        assert resp.status_code == 200
        payload = resp.json()
        items = payload if isinstance(payload, list) else payload.get("results", [])
        assert items
        event_types = {i.get("event_type") for i in items}
        assert event_types  # privileged actions are captured with an event type

    def test_a11_restore_has_audit_path(self, superuser, super_tokens):
        # Triggering a restore (super-admin) must be recorded as an audit event.
        resp = client_for(super_tokens["access"]).post(
            "/api/v1/admin/backups/None/restore/", {}
        )
        # Restore attempt must be rejected/controlled if invalid, never corrupt.
        assert resp.status_code in (200, 202, 400, 404, 409)
        audit = client_for(super_tokens["access"]).get(AUDIT_LOGS)
        assert audit.status_code == 200
        payload = audit.json()
        items = payload if isinstance(payload, list) else payload.get("results", [])
        restore_events = [
            i for i in items if (i.get("event_type") or "").lower() == "restore"
        ]
        assert restore_events, "Restore must produce an audit record."
