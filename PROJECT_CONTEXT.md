# KOPERA OS - Project Context

## Overview
KOPERA OS is a retail management system built with Django REST Framework, PostgreSQL, and SimpleJWT authentication.

## Tech Stack
- Python 3.13.15
- Django 5.2.17 (LTS)
- Django REST Framework 3.18.0
- SimpleJWT 5.5.1
- PostgreSQL (psycopg 3.3.4)
- pytest + pytest-django

## Project Structure
```
os_kopraretail/
├── config/
│   ├── settings/
│   │   ├── base.py
│   │   ├── development.py
│   │   ├── production.py
│   │   └── testing.py
│   ├── urls.py
│   ├── wsgi.py
│   └── asgi.py
├── apps/
│   └── authentication/
│       ├── models.py
│       ├── views.py
│       ├── serializers.py
│       ├── urls.py
│       ├── managers.py
│       ├── utils.py
│       ├── tests/
│       │   ├── test_user_model.py
│       │   ├── test_models.py
│       │   ├── test_views.py
│       │   └── test_phase5.py
│       └── migrations/
├── requirements/
│   ├── base.txt
│   ├── development.txt
│   └── production.txt
├── manage.py
├── pytest.ini
├── .env.example
└── .gitignore
```

## Authentication Module

### Models
| Model | Description |
|-------|-------------|
| User | Custom user model with UUID PK, email as USERNAME_FIELD |
| UserSession | JWT refresh token session tracking with device info |
| EmailVerificationToken | SHA-256 hashed email verification tokens |
| PasswordResetToken | SHA-256 hashed password reset tokens |
| PasswordHistory | Hashed password history per user for reuse prevention |

### API Endpoints (Phase 4 + Phase 5)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/auth/register/` | Register new user | Public |
| POST | `/api/v1/auth/login/` | Login with email/password | Public |
| POST | `/api/v1/auth/logout/` | Logout (revoke current session) | JWT |
| POST | `/api/v1/auth/logout-all/` | Logout from all devices | JWT |
| GET | `/api/v1/auth/me/` | Get current user profile | JWT |
| PATCH | `/api/v1/auth/me/` | Update current user profile | JWT |
| POST | `/api/v1/auth/token/refresh/` | Refresh access token | Public |
| POST | `/api/v1/auth/email/verify/` | Verify email with raw token | Public |
| POST | `/api/v1/auth/email/resend/` | Resend verification email | Public |
| POST | `/api/v1/auth/password/forgot/` | Request password reset | Public |
| POST | `/api/v1/auth/password/reset/` | Reset password with raw token | Public |
| POST | `/api/v1/auth/password/change/` | Change password (authenticated) | JWT |

### JWT Configuration
- Access token lifetime: 15 minutes
- Refresh token lifetime: 7 days
- Token rotation: Enabled
- Blacklist after rotation: Enabled
- Session tracking: UserSession model stores refresh token JTI

### Rate Limiting (Phase 6 Step 2)
| Endpoint | Limit | Scope |
|----------|-------|-------|
| Login | 5 / minute | per client IP |
| Password Forgot | 3 / hour | per client IP |
| Email Resend | 3 / hour | per client IP |

- Implemented via `apps/authentication/throttles.py` (DRF `SimpleRateThrottle` subclasses)
- Rates read from `settings.AUTHENTICATION` (e.g. `LOGIN_RATE_LIMIT_ATTEMPTS`, `PASSWORD_RESET_RATE_LIMIT_ATTEMPTS`, `EMAIL_RESEND_RATE_LIMIT_ATTEMPTS`)
- Throttles installed only on LoginView, PasswordForgotView, EmailResendView
- Other endpoints (Register, EmailVerify, PasswordReset, PasswordChange, Logout, LogoutAll, Me, TokenRefresh) are unthrottled

### Custom Permissions (Phase 6 Step 1)
- `IsOwner` — authenticated + object owned by user (object must have `user` attribute)
- `IsVerified` — authenticated + `is_email_verified`
- Defined in `apps/authentication/permissions.py`

### Password Validation & History (Phase 6 Step 4)
- `AUTH_PASSWORD_VALIDATORS` remains active: MinLength, CommonPassword, NumericPassword, UserAttributeSimilarity
- `PasswordHistory` model records hashed passwords on registration, change, and reset
- Reuse prevention: `validate_password()` + `PasswordHistory.is_password_reused()` + explicit current-password comparison
- `PASSWORD_HISTORY_COUNT` in `settings.AUTHENTICATION` controls retention (default: 5)
- Hashes stored via Django's `make_password()`; validated via `check_password()` — never plaintext
- Registration via `/api/v1/auth/register/` creates the initial history record

### Security
- Passwords hashed with PBKDF2-SHA256 (Django default)
- Email verification tokens: SHA-256 hash only stored
- Password reset tokens: SHA-256 hash only stored
- Raw tokens never persisted to database
- uses `secrets.token_urlsafe(32)` for token generation
- uses `hashlib.sha256` for token hashing
- Raw token never logged
- Account locking: 5 failed login attempts → lock for 15 minutes (configurable via `AUTHENTICATION['MAX_FAILED_LOGIN_ATTEMPTS']` / `ACCOUNT_LOCKOUT_MINUTES`)
- `failed_login_attempts`, `locked_until`, `last_login_ip` tracked per User

## Test Coverage
- Total tests: 167
- User model tests: 13
- Authentication model tests: 41
- Authentication view tests (Phase 4): 29
- Authentication view tests (Phase 5): 29
- Custom permission tests (Phase 6 Step 1): 9
- Rate limiting tests (Phase 6 Step 2): 12
- Account locking tests (Phase 6 Step 3): 13
- Password history/validation tests (Phase 6 Step 4): 21

## Environment Variables Required
```bash
POSTGRES_DB=kopraretail_dev
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
DJANGO_SECRET_KEY=<secure-key>
DJANGO_DEBUG=True
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

## Migration Status
- Migration files: 0001_initial.py, 0002_emailverificationtoken_passwordresettoken_and_more.py, 0003_user_failed_login_attempts_* (adds `failed_login_attempts`, `last_login_ip`, `locked_until`), 0004_passwordhistory.py (adds `PasswordHistory` model)
- PostgreSQL migration: Pending (database not available — `kopraretail_dev`/`kopraretail_test` tidak ada)

## Next Phase
Phase 6: Next authentication/business module
