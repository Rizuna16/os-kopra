"""
GAP-02: Receivable signals for Sale VOIDED propagation.
Does NOT modify apps/sales/ — uses Django signal to react to Sale post_save.
Only connects to Sale model (not sender=None) to avoid sweeping side effects.
"""
from decimal import Decimal
from django.db.models.signals import post_save
from django.dispatch import receiver


def _on_sale_status_changed(sender, instance, **kwargs):
    """
    When a Sale transitions to VOIDED, propagate to its Receivable if present.
    Primary void guard: existing SaleUpdateSerializer blocks COMPLETED->VOIDED.
    This signal handles UNPAID credit sale voiding only (defense-in-depth).
    """
    # Only act on COMPLETED sales (credit sales produce COMPLETED status)
    if instance.status != "VOIDED":
        return

    # Check if a Receivable exists for this Sale (via OneToOne reverse relation)
    try:
        receivable = instance.receivable
    except Exception:
        return

    # Already voided or closed — skip
    if receivable.status in ["VOIDED", "CLOSED"]:
        return

    # PARTIAL/PAID should have been blocked by SaleUpdateSerializer before reaching here.
    # If somehow reached, protect against voiding a partially/paid receivable.
    if receivable.status in ["PARTIAL", "PAID"]:
        return

    # Only process UNPAID receivables
    if receivable.status == "UNPAID":
        receivable.status = "VOIDED"
        receivable.outstanding_amount = Decimal("0.00")
        receivable.save(update_fields=["status", "outstanding_amount", "updated_at"])


# Connected in AppConfig.ready() to avoid import cycles
def connect_signals(Sale):
    post_save.connect(_on_sale_status_changed, sender=Sale)
