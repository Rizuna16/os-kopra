from apps.audit.models import AuditLog


def record_audit_event(
    actor=None,
    action="",
    business=None,
    location=None,
    target="",
    resource="",
    event_type="",
    outcome="",
):
    """Approved internal mechanism for creating append-only audit records."""
    return AuditLog.objects.create(
        actor=actor,
        action=action or "",
        business=business,
        location=location,
        target=target or "",
        resource=resource or "",
        event_type=event_type or "",
        outcome=outcome or "",
    )
