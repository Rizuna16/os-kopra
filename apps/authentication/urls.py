from django.urls import path

from apps.authentication.views import (
    EmailResendView,
    EmailVerifyView,
    LoginView,
    LogoutAllView,
    LogoutView,
    PasswordChangeView,
    PasswordForgotView,
    PasswordResetView,
    RegisterView,
    TokenRefreshView,
    UserProfileView,
)

urlpatterns = [
    # Phase 4 endpoints
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("logout-all/", LogoutAllView.as_view(), name="logout-all"),
    path("me/", UserProfileView.as_view(), name="user-profile"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    # Phase 5 endpoints
    path("email/verify/", EmailVerifyView.as_view(), name="email-verify"),
    path("email/resend/", EmailResendView.as_view(), name="email-resend"),
    path("password/forgot/", PasswordForgotView.as_view(), name="password-forgot"),
    path("password/reset/", PasswordResetView.as_view(), name="password-reset"),
    path("password/change/", PasswordChangeView.as_view(), name="password-change"),
]