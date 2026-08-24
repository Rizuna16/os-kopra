from django.conf import settings
from django.core.cache import cache
from rest_framework.throttling import SimpleRateThrottle
import time


class BaseIPThrottle(SimpleRateThrottle):
    """Base throttle that identifies requests by client IP using Django settings for rates."""

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ident}


class LoginRateThrottle(SimpleRateThrottle):
    """Login throttle with 15-minute sliding window."""
    scope = "login"

    def get_rate(self):
        # Return a rate format DRF understands for the base class
        return f"{settings.AUTHENTICATION['LOGIN_RATE_LIMIT_ATTEMPTS']}/m"

    def allow_request(self, request, view):
        """
        Implement 15-minute sliding window rate limiting for login.
        Uses cache-based sliding window: 5 requests per 15 minutes.
        """
        ident = self.get_ident(request)
        window = int(time.time() // (settings.AUTHENTICATION["LOGIN_RATE_LIMIT_WINDOW_MINUTES"] * 60))
        key = f"throttle_{self.scope}_{ident}_{window}"

        current = cache.get(key, 0)
        attempts = settings.AUTHENTICATION["LOGIN_RATE_LIMIT_ATTEMPTS"]

        if current >= attempts:
            return False

        cache.set(key, current + 1, timeout=settings.AUTHENTICATION["LOGIN_RATE_LIMIT_WINDOW_MINUTES"] * 60 + 60)
        return True

    def wait(self):
        """Return seconds until next request allowed."""
        window_minutes = settings.AUTHENTICATION["LOGIN_RATE_LIMIT_WINDOW_MINUTES"]
        return int(window_minutes * 60 - (time.time() % (settings.AUTHENTICATION["LOGIN_RATE_LIMIT_WINDOW_MINUTES"] * 60))) + 1


class PasswordForgotRateThrottle(SimpleRateThrottle):
    scope = "password_forgot"

    def get_rate(self):
        return f"{settings.AUTHENTICATION['PASSWORD_RESET_RATE_LIMIT_ATTEMPTS']}/h"

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ident}


class EmailResendRateThrottle(SimpleRateThrottle):
    scope = "email_resend"

    def get_rate(self):
        return f"{settings.AUTHENTICATION['EMAIL_RESEND_RATE_LIMIT_ATTEMPTS']}/h"

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ident}