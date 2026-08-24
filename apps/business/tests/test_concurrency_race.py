import threading
from uuid import uuid4

import pytest
from django.contrib.auth import get_user_model
from django.db import connections
from django.test import Client
from rest_framework_simplejwt.tokens import RefreshToken

from apps.business.models import Business, BusinessMembership, Subscription

User = get_user_model()


def _make_execute_wrapper(barrier, kind):
    def wrapper(execute, sql, params, many, context):
        lowered = sql.lower()
        if lowered.strip().startswith("select"):
            if (
                kind == "subscription"
                and "business_subscription" in lowered
                and "status" in lowered
                and "limit 1" in lowered
            ):
                barrier.wait()
            elif (
                kind == "membership"
                and "business_businessmembership" in lowered
                and "business_id" in lowered
                and "user_id" in lowered
                and "limit 1" in lowered
            ):
                barrier.wait()
        return execute(sql, params, many, context)

    return wrapper


def _token(user):
    return str(RefreshToken.for_user(user).access_token)


def _race(kind, path, payload, token):
    results = []
    barrier = threading.Barrier(2)
    lock = threading.Lock()

    def worker():
        c = Client(raise_request_exception=False)
        c.defaults["HTTP_AUTHORIZATION"] = f"Bearer {token}"
        conn = connections["default"]
        with conn.execute_wrapper(_make_execute_wrapper(barrier, kind)):
            resp = c.post(path, payload, content_type="application/json")
        with lock:
            results.append(resp.status_code)

    threads = [threading.Thread(target=worker) for _ in range(2)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    return results


@pytest.mark.django_db(transaction=True)
def test_subscription_concurrent_race():
    suffix = uuid4().hex
    owner = User.objects.create_user(
        email=f"race-sub-owner-{suffix}@example.com", password="Xy7!pass123"
    )
    biz = Business.objects.create(name=f"RaceSub{suffix}", owner=owner)
    token = _token(owner)
    path = f"/api/v1/businesses/{biz.id}/subscription/"
    codes = _race("subscription", path, {}, token)
    count = Subscription.objects.filter(business=biz).count()
    print("\n[SUBSCRIPTION RACE] codes=", codes, "count=", count)
    assert 201 in codes
    assert 400 in codes
    assert count == 1


@pytest.mark.django_db(transaction=True)
def test_membership_concurrent_race():
    suffix = uuid4().hex
    owner = User.objects.create_user(
        email=f"race-mem-owner-{suffix}@example.com", password="Xy7!pass123"
    )
    target = User.objects.create_user(
        email=f"race-mem-target-{suffix}@example.com", password="Xy7!pass123"
    )
    biz = Business.objects.create(name=f"RaceMem{suffix}", owner=owner)
    token = _token(owner)
    path = f"/api/v1/businesses/{biz.id}/members/"
    payload = {"user_id": str(target.id)}
    codes = _race("membership", path, payload, token)
    count = BusinessMembership.objects.filter(business=biz).count()
    print("\n[MEMBERSHIP RACE] codes=", codes, "count=", count)
    assert 201 in codes
    assert 400 in codes
    assert count == 1
