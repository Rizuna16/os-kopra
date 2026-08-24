from django.conf import settings
from django.core.mail import send_mail
from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        message = "Request failed."
        errors = None

        if isinstance(response.data, dict):
            if "detail" in response.data:
                message = str(response.data["detail"])
            else:
                errors = response.data

        response.data = {
            "error": True,
            "message": message,
            "status_code": response.status_code,
        }

        if errors is not None:
            response.data["errors"] = errors

    return response


def send_verification_email(user, token):
    subject = "Verify your email - KOPERA OS"
    message = (
        f"Hello {user.first_name or user.email},\n\n"
        "Please verify your email address by using the following token:\n\n"
        f"{token}\n\n"
        f"This token will expire in {int(settings.AUTHENTICATION['EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS'])} hours.\n\n"
        "If you did not create this account, please ignore this email.\n\n"
        "Best regards,\nKOPERA OS Team"
    )
    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )


def send_password_reset_email(user, token, ip_address=None):
    subject = "Reset your password - KOPERA OS"
    ip_line = f" from IP address {ip_address}." if ip_address else "."
    message = (
        f"Hello {user.first_name or user.email},\n\n"
        f"We received a request to reset your password{ip_line}\n"
        "Please use the following token to reset your password:\n\n"
        f"{token}\n\n"
        f"This token will expire in {int(settings.AUTHENTICATION['PASSWORD_RESET_TOKEN_EXPIRY_HOURS'])} hour(s).\n\n"
        "If you did not request a password reset, please ignore this email.\n\n"
        "Best regards,\nKOPERA OS Team"
    )
    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )
