from datetime import timedelta

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView as SimpleJWTTokenRefreshView

from apps.authentication.models import (
    EmailVerificationToken,
    PasswordHistory,
    PasswordResetToken,
    UserSession,
    create_token_hash,
    hash_token,
)
from apps.authentication.serializers import (
    EmailResendSerializer,
    EmailVerifySerializer,
    LoginSerializer,
    LogoutSerializer,
    PasswordChangeSerializer,
    PasswordForgotSerializer,
    PasswordResetSerializer,
    RegisterSerializer,
    TokenRefreshSerializer,
    UserSerializer,
    UserUpdateSerializer,
)
from apps.authentication.throttles import (
    EmailResendRateThrottle,
    LoginRateThrottle,
    PasswordForgotRateThrottle,
)
from apps.authentication.utils import send_password_reset_email, send_verification_email

User = get_user_model()


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                "message": "User registered successfully.",
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [LoginRateThrottle]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        password = serializer.validated_data["password"]
        client_ip = self._get_client_ip(request)

        try:
            user_obj = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"error": "Invalid email or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user_obj.is_active:
            return Response(
                {"error": "This account is inactive."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if user_obj.locked_until is not None and user_obj.locked_until > timezone.now():
            return Response(
                {"error": "Account is locked. Please try again later."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if user_obj.locked_until is not None and user_obj.locked_until <= timezone.now():
            user_obj.failed_login_attempts = 0
            user_obj.locked_until = None
            user_obj.save(update_fields=["failed_login_attempts", "locked_until", "updated_at"])

        user = authenticate(request, email=email, password=password)

        if user is None:
            self._handle_failed_login(user_obj, client_ip)
            return Response(
                {"error": "Invalid email or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.is_email_verified:
            return Response(
                {"error": "Email not verified. Please verify your email before logging in."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        self._handle_successful_login(user_obj, client_ip)

        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        user_agent = request.META.get("HTTP_USER_AGENT", "")[:500]
        ip_address = client_ip
        device_name = self._parse_device_name(user_agent)

        UserSession.objects.create(
            user=user,
            refresh_token_jti=refresh["jti"],
            device_name=device_name,
            ip_address=ip_address,
            user_agent=user_agent,
            expires_at=timezone.now() + timedelta(days=7),
        )

        return Response(
            {
                "access": access_token,
                "refresh": refresh_token,
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )

    def _handle_failed_login(self, user_obj, client_ip):
        user_obj.failed_login_attempts += 1
        user_obj.last_login_ip = client_ip
        max_attempts = settings.AUTHENTICATION["MAX_FAILED_LOGIN_ATTEMPTS"]
        if user_obj.failed_login_attempts >= max_attempts:
            user_obj.locked_until = timezone.now() + timedelta(
                minutes=settings.AUTHENTICATION["ACCOUNT_LOCKOUT_MINUTES"]
            )
        user_obj.save(
            update_fields=["failed_login_attempts", "locked_until", "last_login_ip", "updated_at"]
        )

    def _handle_successful_login(self, user_obj, client_ip):
        if user_obj.failed_login_attempts != 0 or user_obj.locked_until is not None:
            user_obj.failed_login_attempts = 0
            user_obj.locked_until = None
        user_obj.last_login_ip = client_ip
        user_obj.save(update_fields=["failed_login_attempts", "locked_until", "last_login_ip", "updated_at"])

    def _get_client_ip(self, request):
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            return x_forwarded_for.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR", "127.0.0.1")

    def _parse_device_name(self, user_agent):
        if not user_agent:
            return "Unknown"
        if "Windows" in user_agent:
            if "Chrome" in user_agent:
                return "Chrome on Windows"
            elif "Firefox" in user_agent:
                return "Firefox on Windows"
            elif "Edge" in user_agent:
                return "Edge on Windows"
            return "Windows"
        elif "Mac" in user_agent:
            if "Safari" in user_agent and "Chrome" not in user_agent:
                return "Safari on Mac"
            elif "Chrome" in user_agent:
                return "Chrome on Mac"
            return "Mac"
        elif "iPhone" in user_agent or "iPad" in user_agent:
            return "iOS"
        elif "Android" in user_agent:
            return "Android"
        elif "Linux" in user_agent:
            return "Linux"
        return "Unknown"


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        refresh_token = serializer.validated_data.get("refresh")

        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                jti = token["jti"]
                UserSession.objects.filter(refresh_token_jti=jti).update(revoked_at=timezone.now())
            except TokenError:
                pass

        return Response({"message": "Logged out successfully."}, status=status.HTTP_200_OK)


class LogoutAllView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        UserSession.objects.filter(user=request.user).update(revoked_at=timezone.now())
        return Response({"message": "Logged out from all devices successfully."}, status=status.HTTP_200_OK)


class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request):
        serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user).data, status=status.HTTP_200_OK)


class TokenRefreshView(SimpleJWTTokenRefreshView):
    def post(self, request, *args, **kwargs):
        serializer = TokenRefreshSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        refresh_token = serializer.validated_data["refresh"]

        try:
            token = RefreshToken(refresh_token)
            jti = token["jti"]
            user_id = token["user_id"]

            session = UserSession.objects.filter(
                refresh_token_jti=jti,
                user_id=user_id,
                revoked_at__isnull=True,
            ).first()

            if not session:
                return Response(
                    {"error": "Session not found or revoked."},
                    status=status.HTTP_401_UNAUTHORIZED,
                )

            if session.is_expired:
                return Response(
                    {"error": "Session has expired."},
                    status=status.HTTP_401_UNAUTHORIZED,
                )

        except TokenError:
            return Response(
                {"error": "Invalid or expired refresh token."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        response = super().post(request, *args, **kwargs)

        if response.status_code == 200 and "refresh" in response.data:
            new_refresh = RefreshToken(response.data["refresh"])
            new_jti = new_refresh["jti"]

            session.refresh_token_jti = new_jti
            session.save(update_fields=["refresh_token_jti", "last_activity"])

        return response


class EmailVerifyView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = EmailVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        raw_token = serializer.validated_data["token"]
        token_hash = hash_token(raw_token)

        try:
            token_obj = EmailVerificationToken.objects.get(token_hash=token_hash)
        except EmailVerificationToken.DoesNotExist:
            return Response({"error": "Invalid verification token."}, status=status.HTTP_400_BAD_REQUEST)

        if token_obj.is_expired:
            return Response({"error": "Verification token has expired."}, status=status.HTTP_400_BAD_REQUEST)

        if token_obj.is_verified:
            return Response({"error": "Email has already been verified."}, status=status.HTTP_400_BAD_REQUEST)

        token_obj.verified_at = timezone.now()
        token_obj.save(update_fields=["verified_at"])

        user = token_obj.user
        user.is_email_verified = True
        user.save(update_fields=["is_email_verified", "updated_at"])

        return Response({"message": "Email verified successfully."}, status=status.HTTP_200_OK)


class EmailResendView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [EmailResendRateThrottle]

    def post(self, request):
        serializer = EmailResendSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"message": "If that email exists, a verification link has been sent."},
                status=status.HTTP_200_OK,
            )

        if user.is_email_verified:
            return Response({"error": "Email is already verified."}, status=status.HTTP_400_BAD_REQUEST)

        EmailVerificationToken.objects.filter(
            user=user, verified_at__isnull=True, expires_at__lt=timezone.now()
        ).delete()

        raw_token, token_hash = create_token_hash()
        EmailVerificationToken.objects.create(
            user=user,
            token_hash=token_hash,
            expires_at=timezone.now() + timedelta(hours=settings.AUTHENTICATION["EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS"]),
        )

        send_verification_email(user, raw_token)

        return Response(
            {"message": "Verification email has been sent."},
            status=status.HTTP_200_OK,
        )


class PasswordForgotView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [PasswordForgotRateThrottle]

    def post(self, request):
        serializer = PasswordForgotSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]

        try:
            user = User.objects.get(email=email, is_active=True)
        except User.DoesNotExist:
            return Response(
                {"message": "If that email exists, a password reset link has been sent."},
                status=status.HTTP_200_OK,
            )

        # Invalidate all previous unused reset tokens for this user.
        PasswordResetToken.objects.filter(
            user=user,
            used_at__isnull=True,
        ).update(used_at=timezone.now())

        raw_token, token_hash = create_token_hash()
        ip_address = self._get_client_ip(request)

        PasswordResetToken.objects.create(
            user=user,
            token_hash=token_hash,
            ip_address=ip_address,
            expires_at=timezone.now() + timedelta(hours=settings.AUTHENTICATION["PASSWORD_RESET_TOKEN_EXPIRY_HOURS"]),
        )

        send_password_reset_email(user, raw_token, ip_address)

        return Response(
            {"message": "If that email exists, a password reset link has been sent."},
            status=status.HTTP_200_OK,
        )

    def _get_client_ip(self, request):
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            return x_forwarded_for.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR", "127.0.0.1")


class PasswordResetView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        raw_token = serializer.validated_data["token"]
        new_password = serializer.validated_data["password"]

        token_hash = hash_token(raw_token)

        try:
            token_obj = PasswordResetToken.objects.get(token_hash=token_hash)
        except PasswordResetToken.DoesNotExist:
            return Response({"error": "Invalid password reset token."}, status=status.HTTP_400_BAD_REQUEST)

        if token_obj.is_expired:
            return Response({"error": "Password reset token has expired."}, status=status.HTTP_400_BAD_REQUEST)

        if token_obj.is_used:
            return Response({"error": "Password reset token has already been used."}, status=status.HTTP_400_BAD_REQUEST)

        user = token_obj.user
        if user.check_password(new_password) or PasswordHistory.is_password_reused(user, new_password):
            return Response({"error": "You cannot reuse a recently used password."}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.password_changed_at = timezone.now()
        user.save(update_fields=["password", "password_changed_at", "updated_at"])

        PasswordHistory.record_password(user, new_password)

        token_obj.used_at = timezone.now()
        token_obj.save(update_fields=["used_at"])

        # Revoke all sessions for this user after password reset.
        UserSession.objects.filter(user=user).update(revoked_at=timezone.now())

        return Response({"message": "Password has been reset successfully."}, status=status.HTTP_200_OK)


class PasswordChangeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        new_password = serializer.validated_data["new_password"]

        user = request.user
        user.set_password(new_password)
        user.password_changed_at = timezone.now()
        user.save(update_fields=["password", "password_changed_at", "updated_at"])

        PasswordHistory.record_password(user, new_password)

        # Revoke all sessions except caller's if refresh token is valid.
        raw_refresh = serializer.validated_data.get("refresh")
        current_jti = None
        if raw_refresh:
            try:
                current_jti = RefreshToken(raw_refresh)["jti"]
            except TokenError:
                current_jti = None
        if current_jti:
            UserSession.objects.filter(user=user).exclude(refresh_token_jti=current_jti).update(revoked_at=timezone.now())
        else:
            UserSession.objects.filter(user=user).update(revoked_at=timezone.now())

        return Response({"message": "Password changed successfully."}, status=status.HTTP_200_OK)
