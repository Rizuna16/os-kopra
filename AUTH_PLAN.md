# KOPERA OS - Authentication Module Plan

## 1. Folder Structure

```
os_kopraretail/
├── .github/
│   └── workflows/
├── config/
│   ├── __init__.py
│   ├── settings/
│   │   ├── __init__.py
│   │   ├── base.py
│   │   ├── development.py
│   │   ├── production.py
│   │   └── testing.py
│   ├── urls.py
│   ├── wsgi.py
│   └── asgi.py
├── apps/
│   ├── __init__.py
│   ├── authentication/
│   │   ├── __init__.py
│   │   ├── apps.py
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── session.py
│   │   │   ├── email_verification.py
│   │   │   └── password_reset.py
│   │   ├── views/
│   │   │   ├── __init__.py
│   │   │   ├── auth_views.py
│   │   │   ├── registration.py
│   │   │   ├── login.py
│   │   │   ├── logout.py
│   │   │   ├── email_verification.py
│   │   │   ├── password_reset.py
│   │   │   └── session.py
│   │   ├── serializers/
│   │   │   ├── __init__.py
│   │   │   ├── auth_serializers.py
│   │   │   ├── registration.py
│   │   │   ├── login.py
│   │   │   ├── email_verification.py
│   │   │   └── password_reset.py
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── auth_service.py
│   │   │   ├── token_service.py
│   │   │   ├── email_service.py
│   │   │   └── session_service.py
│   │   ├── permissions/
│   │   │   ├── __init__.py
│   │   │   └── auth_permissions.py
│   │   ├── utils/
│   │   │   ├── __init__.py
│   │   │   ├── tokens.py
│   │   │   ├── validators.py
│   │   │   └── security.py
│   │   ├── urls.py
│   │   └── tests/
│   │       ├── __init__.py
│   │       ├── test_registration.py
│   │       ├── test_login.py
│   │       ├── test_logout.py
│   │       ├── test_email_verification.py
│   │       ├── test_password_reset.py
│   │       └── test_session.py
│   └── core/
│       ├── __init__.py
│       ├── apps.py
│       ├── models/
│       │   ├── __init__.py
│       │   └── base.py
│       └── managers/
│           ├── __init__.py
│           └── base.py
├── requirements/
│   ├── base.txt
│   ├── development.txt
│   ├── production.txt
│   └── testing.txt
├── docker/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── docker-compose.prod.yml
├── scripts/
│   ├── entrypoint.sh
│   └── migrate.sh
├── static/
├── media/
├── locale/
├── manage.py
├── .env.example
├── .gitignore
├── README.md
└── pyproject.toml
```

## 2. Dependencies (requirements/base.txt)

```txt
# Core
Django>=5.0,<6.0
djangorestframework>=3.15,<4.0
psycopg2-binary>=2.9,<3.0

# Authentication & JWT
djangorestframework-simplejwt>=5.3,<6.0
django-allauth>=0.64,<1.0
django-rest-auth>=2.0,<3.0

# Security
django-axes>=6.0,<7.0
django-cors-headers>=4.3,<5.0
django-ratelimit>=4.1,<5.0

# Email
django-anymail>=10.0,<11.0

# Utilities
python-dotenv>=1.0,<2.0
django-filter>=23.0,<24.0
drf-spectacular>=0.27,<1.0

# Testing
pytest>=8.0,<9.0
pytest-django>=4.8,<5.0
pytest-cov>=4.1,<5.0
factory-boy>=3.3,<4.0
faker>=24.0,<25.0

# Development
black>=24.0,<25.0
ruff>=0.3,<1.0
mypy>=1.9,<2.0
pre-commit>=3.6,<4.0
```

## 3. Django Apps

| App | Purpose |
|-----|---------|
| `config` | Project settings, root URLs, WSGI/ASGI |
| `apps.core` | Base models, managers, utilities |
| `apps.authentication` | All auth functionality (register, login, logout, email verification, password reset, JWT, sessions) |

## 4. Database Design - Authentication Models

### 4.1 User Model (`apps.authentication.models.user.User`)
```python
# Custom User Model (AbstractUser)
- id: UUID (PK)
- email: EmailField (unique, USERNAME_FIELD)
- username: CharField (unique, max_length=150)
- first_name: CharField
- last_name: CharField
- phone: CharField (nullable)
- avatar: ImageField (nullable)
- is_active: BooleanField (default=True)
- is_staff: BooleanField (default=False)
- is_superuser: BooleanField (default=False)
- is_verified: BooleanField (default=False)
- last_login_ip: GenericIPAddressField (nullable)
- failed_login_attempts: PositiveIntegerField (default=0)
- locked_until: DateTimeField (nullable)
- password_changed_at: DateTimeField (auto_now_add)
- created_at: DateTimeField (auto_now_add)
- updated_at: DateTimeField (auto_now)
- deleted_at: DateTimeField (nullable, soft delete)

# Managers: UserManager (create_user, create_superuser)
```

### 4.2 UserSession Model (`apps.authentication.models.session.UserSession`)
```python
- id: UUID (PK)
- user: ForeignKey(User, CASCADE)
- session_key: CharField (unique, max_length=40)
- device_info: JSONField (browser, os, device_type)
- ip_address: GenericIPAddressField
- user_agent: TextField
- location: JSONField (country, city, lat, lng - nullable)
- is_current: BooleanField (default=False)
- expires_at: DateTimeField
- last_activity: DateTimeField (auto_now)
- created_at: DateTimeField (auto_now_add)
- revoked_at: DateTimeField (nullable)

# Indexes: user, session_key, expires_at
```

### 4.3 EmailVerification Model (`apps.authentication.models.email_verification.EmailVerification`)
```python
- id: UUID (PK)
- user: ForeignKey(User, CASCADE)
- email: EmailField
- token: CharField (unique, max_length=100)
- token_hash: CharField (max_length=128)  # Hashed token
- purpose: CharField (choices: REGISTER, EMAIL_CHANGE)
- attempts: PositiveIntegerField (default=0)
- max_attempts: PositiveIntegerField (default=5)
- expires_at: DateTimeField
- verified_at: DateTimeField (nullable)
- created_at: DateTimeField (auto_now_add)

# Indexes: user, token_hash, expires_at
```

### 4.4 PasswordReset Model (`apps.authentication.models.password_reset.PasswordReset`)
```python
- id: UUID (PK)
- user: ForeignKey(User, CASCADE)
- email: EmailField
- token: CharField (unique, max_length=100)
- token_hash: CharField (max_length=128)  # Hashed token
- attempts: PositiveIntegerField (default=0)
- max_attempts: PositiveIntegerField (default=3)
- expires_at: DateTimeField
- used_at: DateTimeField (nullable)
- ip_address: GenericIPAddressField
- user_agent: TextField
- created_at: DateTimeField (auto_now_add)

# Indexes: user, token_hash, expires_at
```

### 4.5 LoginAttempt Model (`apps.authentication.models.session.LoginAttempt`) - for security/audit
```python
- id: UUID (PK)
- email: EmailField (indexed)
- ip_address: GenericIPAddressField
- user_agent: TextField
- success: BooleanField
- failure_reason: CharField (choices: INVALID_CREDENTIALS, ACCOUNT_LOCKED, ACCOUNT_INACTIVE, EMAIL_NOT_VERIFIED, TOO_MANY_ATTEMPTS)
- created_at: DateTimeField (auto_now_add)

# Indexes: email, ip_address, created_at
```

## 5. API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/auth/register/` | Register new user | Public |
| POST | `/api/v1/auth/login/` | Login (email/password) | Public |
| POST | `/api/v1/auth/logout/` | Logout (revoke current session) | Private |
| POST | `/api/v1/auth/logout-all/` | Logout from all devices | Private |
| GET | `/api/v1/auth/me/` | Get current user profile | Private |
| PATCH | `/api/v1/auth/me/` | Update current user profile | Private |
| POST | `/api/v1/auth/email/verify/` | Verify email with token | Public |
| POST | `/api/v1/auth/email/resend/` | Resend verification email | Private |
| POST | `/api/v1/auth/password/forgot/` | Request password reset | Public |
| POST | `/api/v1/auth/password/reset/` | Reset password with token | Public |
| POST | `/api/v1/auth/password/change/` | Change password (authenticated) | Private |
| GET | `/api/v1/auth/sessions/` | List active sessions | Private |
| DELETE | `/api/v1/auth/sessions/{id}/` | Revoke specific session | Private |
| POST | `/api/v1/auth/token/refresh/` | Refresh access token | Public (refresh token) |
| POST | `/api/v1/auth/token/verify/` | Verify token validity | Public |

## 6. Implementation Steps

### Phase 1: Project Setup & Core
1. Create project structure & config files
2. Configure Django settings (base, dev, prod, test)
3. Set up Docker configuration
4. Create core app with base models/managers
5. Configure custom User model
6. Run initial migrations

### Phase 2: Authentication Models & Migrations
1. Create User model with custom manager
2. Create UserSession model
3. Create EmailVerification model
4. Create PasswordReset model
4. Create LoginAttempt model
5. Generate and run migrations

### Phase 3: Serializers
1. Registration serializer (with validation)
2. Login serializer
3. Email verification serializer
4. Password forgot/reset/change serializers
5. User profile serializer
5. Session serializer
6. Token serializers

### Phase 4: Services
1. TokenService (JWT generation, validation, blacklisting)
2. EmailService (templated emails, providers)
3. AuthService (business logic: register, login, logout, password reset)
4. SessionService (session management, device tracking)

### Phase 5: Views & Endpoints
1. RegisterView
2. LoginView (with rate limiting, device tracking)
3. LogoutView / LogoutAllView
4. EmailVerificationView / ResendVerificationView
5. PasswordForgotView / PasswordResetView / PasswordChangeView
6. UserProfileView (me)
7. SessionListView / SessionRevokeView
8. TokenRefreshView / TokenVerifyView

### Phase 6: Permissions & Security
1. Custom permissions (IsOwner, IsVerified, etc.)
2. Rate limiting (axes, ratelimit)
3. Account locking after failed attempts
4. Password validation & history
5. Secure token handling (hashing, expiration)
6. CORS & CSRF configuration

### Phase 7: URLs & Integration
1. Authentication URL routing
2. Include in root URLs
3. Configure DRF & SimpleJWT settings
4. Configure Allauth for social auth (future)

### Phase 8: Testing
1. Unit tests for models
2. Unit tests for services
3. Integration tests for all endpoints
4. Security tests (rate limiting, locking, token expiry)
5. Coverage reporting

### Phase 9: Documentation & Polish
1. API documentation (drf-spectacular/OpenAPI)
2. Postman collection
3. README with setup instructions
4. Environment configuration
5. Pre-commit hooks
6. CI/CD pipeline config