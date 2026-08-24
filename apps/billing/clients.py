"""Midtrans Snap API client for payment creation and webhook signature verification."""

import base64
import hashlib
import json
import logging
import urllib.error
import urllib.request

from django.conf import settings

logger = logging.getLogger("apps.billing")


def _get_base_url():
    return (
        "https://app.midtrans.com"
        if settings.MIDTRANS_IS_PRODUCTION
        else "https://app.sandbox.midtrans.com"
    )


def create_snap_transaction(order_id, gross_amount, item_details=None, customer_details=None):
    """
    Create a Midtrans Snap transaction and return the response dict.
    Returns: {"token": str, "redirect_url": str}  (and possibly transaction_id).
    Raises: RuntimeError on network/API error.
    """
    server_key = settings.MIDTRANS_SERVER_KEY
    if not server_key:
        raise RuntimeError("MIDTRANS_SERVER_KEY is not configured.")

    url = f"{_get_base_url()}/snap/v1/transactions"

    payload = {
        "transaction_details": {
            "order_id": str(order_id),
            "gross_amount": float(gross_amount),
        },
    }
    if item_details:
        payload["item_details"] = item_details
    if customer_details:
        payload["customer_details"] = customer_details

    body = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(url, data=body, method="POST")
    request.add_header("Content-Type", "application/json")
    request.add_header("Accept", "application/json")

    cred = base64.b64encode(f"{server_key}:".encode()).decode()
    request.add_header("Authorization", f"Basic {cred}")

    try:
        with urllib.request.urlopen(request, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            logger.info("Midtrans transaction created: order_id=%s", order_id)
            return data
    except urllib.error.HTTPError as e:
        body_text = e.read().decode("utf-8", errors="replace")
        logger.error("Midtrans HTTP error %s: %s", e.code, body_text)
        raise RuntimeError(f"Midtrans API error: {e.code} {body_text}") from e
    except urllib.error.URLError as e:
        logger.error("Midtrans connection error: %s", e)
        raise RuntimeError(f"Midtrans connection error: {e}") from e


def verify_midtrans_signature(payload, server_key=None):
    """
    Verify the notification signature per Midtrans documentation.

    signature = SHA512(order_id + status_code + gross_amount + server_key)
    """
    if server_key is None:
        server_key = settings.MIDTRANS_SERVER_KEY

    order_id = str(payload.get("order_id", ""))
    status_code = str(payload.get("status_code", ""))
    gross_amount = str(payload.get("gross_amount", ""))
    signature_key = payload.get("signature_key", "")

    if not signature_key:
        return False

    raw = f"{order_id}{status_code}{gross_amount}{server_key}"
    computed = hashlib.sha512(raw.encode()).hexdigest()
    return computed == signature_key
