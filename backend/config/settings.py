"""
Module: backend/config/settings.py

Work / Purpose:
    Central Django settings module configuring PostgreSQL 16 (port 5433), SimpleJWT, Celery/Redis, logging, CORS, and production security hardening.

Connected Modules (Used By / Routes):
    - Django runtime across all installed apps
    - backend/config/asgi.py
    - backend/config/celery.py
    - backend/config/wsgi.py
    - backend/manage.py

Helpful / Supporting Modules (Dependencies):
    - backend/apps/accounts/__init__.py
    - backend/apps/accounts/authentication.py
    - backend/apps/accounts/exception_handler.py
    - backend/apps/analytics/__init__.py
    - backend/apps/approvals/__init__.py
    - backend/apps/audit/__init__.py
    - backend/apps/exchange_requests/__init__.py
    - backend/apps/hostels/__init__.py
    - backend/apps/integrations/__init__.py
    - backend/apps/matching/__init__.py
    - backend/apps/notifications/__init__.py
    - backend/apps/policies/__init__.py
    - backend/apps/proposals/__init__.py
    - backend/apps/transfers/__init__.py
    - backend/config/urls.py
    - backend/config/wsgi.py
    - dotenv (external library / framework)

Original Module Notes:
    Django settings for Hostel Room Exchange Platform.

    Environment-based configuration for development, testing, and production.
"""
import os
from pathlib import Path
from datetime import timedelta

from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from .env file
load_dotenv(BASE_DIR / '.env')

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'django-insecure-dev-key-change-in-production')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv('DJANGO_DEBUG', 'True').lower() in ('true', '1', 'yes')

# Production safety: prevent accidental deployment with default insecure key
if not DEBUG and ('insecure' in SECRET_KEY.lower() or 'change-to' in SECRET_KEY.lower()):
    import sys
    if 'pytest' not in sys.modules and 'test' not in sys.argv:
        raise ValueError(
            "CRITICAL SECURITY CONFIGURATION ERROR: "
            "DJANGO_SECRET_KEY must be configured with a cryptographically secure random value when DJANGO_DEBUG=False. "
            "Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(50))\""
        )


ALLOWED_HOSTS = list(set(os.getenv('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1,testserver').split(',') + ['testserver', 'localhost', '127.0.0.1']))

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party
    'rest_framework',
    'corsheaders',
    'django_filters',
    'drf_spectacular',
    'rest_framework_simplejwt',
    'django_celery_beat',

    # Local apps
    'apps.accounts',
    'apps.hostels',
    'apps.exchange_requests',
    'apps.matching',
    'apps.proposals',
    'apps.approvals',
    'apps.transfers',
    'apps.policies',
    'apps.notifications',
    'apps.analytics',
    'apps.audit',
    'apps.integrations',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Database
if os.getenv('USE_SQLITE', 'false').lower() in ('true', '1') or os.getenv('DB_ENGINE', '').endswith('sqlite3'):
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
            'ATOMIC_REQUESTS': False,
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': os.getenv('DB_ENGINE', 'django.db.backends.postgresql'),
            'NAME': os.getenv('DATABASE_NAME') or os.getenv('DB_NAME') or 'hostel_exchange',
            'USER': os.getenv('DATABASE_USER') or os.getenv('DB_USER') or 'postgres',
            'PASSWORD': os.getenv('DATABASE_PASSWORD') or os.getenv('DB_PASSWORD') or 'postgres',
            'HOST': os.getenv('DATABASE_HOST') or os.getenv('DB_HOST') or 'localhost',
            'PORT': str(os.getenv('DATABASE_PORT') or os.getenv('DB_PORT') or '5433'),
            'CONN_MAX_AGE': int(os.getenv('DATABASE_CONN_MAX_AGE', '0' if DEBUG else '60')),
            'OPTIONS': {
                'connect_timeout': 10,
            },
            'ATOMIC_REQUESTS': False,  # We manage transactions explicitly
        }
    }

# Password validation: minimum 8 characters for students & staff
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 8}},
]

# Custom user model
AUTH_USER_MODEL = 'accounts.User'

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = True

# Static files
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [BASE_DIR / 'static'] if (BASE_DIR / 'static').exists() else []

MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'apps.accounts.authentication.RoomSwapJWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '20/minute',
        'user': '100/minute',
    },
    'EXCEPTION_HANDLER': 'apps.accounts.exception_handler.custom_exception_handler',
}

if not DEBUG:
    REST_FRAMEWORK['DEFAULT_RENDERER_CLASSES'] = [
        'rest_framework.renderers.JSONRenderer',
    ]

# JWT Settings
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
}

# CORS
CORS_ALLOWED_ORIGINS = os.getenv(
    'CORS_ALLOWED_ORIGINS',
    'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173',
).split(',')
CORS_ALLOW_CREDENTIALS = True

# Spectacular (OpenAPI/Swagger) settings
SPECTACULAR_SETTINGS = {
    'TITLE': 'Hostel Room Exchange API',
    'DESCRIPTION': 'API for the Hostel Room Exchange and Multi-Party Swap Platform',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'SCHEMA_PATH_PREFIX': '/api/v1/',
    'COMPONENT_SPLIT_REQUEST': True,
    'ENUM_NAME_OVERRIDES': {
        'RoleEnum': (
            ('SUPER_ADMIN', 'Super Administrator'),
            ('STUDENT', 'Student'),
            ('WARDEN', 'Warden'),
            ('CHIEF_WARDEN', 'Chief Warden'),
            ('HOSTEL_ADMIN', 'Hostel Administrator'),
            ('DEAN', 'Dean of Student Welfare'),
        ),
        'WardenRoleEnum': (
            ('WARDEN', 'Warden'),
            ('CHIEF_WARDEN', 'Chief Warden'),
        ),
    },
}

# Celery settings
CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/1')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'

# Email settings (switches to real SMTP whenever EMAIL_HOST_USER is configured)
if os.getenv('FORCE_CONSOLE_EMAIL', 'False').lower() in ('true', '1'):
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
elif os.getenv('EMAIL_HOST_USER'):
    EMAIL_BACKEND = os.getenv('EMAIL_BACKEND', 'django.core.mail.backends.smtp.EmailBackend')
else:
    EMAIL_BACKEND = os.getenv('EMAIL_BACKEND', 'django.core.mail.backends.console.EmailBackend')

EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', '587'))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True').lower() in ('true', '1')
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '').strip()
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '').strip()

_raw_from = os.getenv('DEFAULT_FROM_EMAIL')
if _raw_from and 'noreply@hostel.edu' not in _raw_from:
    DEFAULT_FROM_EMAIL = _raw_from
elif EMAIL_HOST_USER:
    DEFAULT_FROM_EMAIL = f"RoomSwap Security <{EMAIL_HOST_USER}>"
else:
    DEFAULT_FROM_EMAIL = 'RoomSwap Security <noreply@hostel.edu>'

# Frontend URL
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')

# Platform policy defaults
POLICY_DEFAULTS = {
    'COOLING_OFF_DAYS': int(os.getenv('DEFAULT_COOLING_OFF_DAYS', '30')),
    'REQUEST_VALIDITY_DAYS': int(os.getenv('DEFAULT_REQUEST_VALIDITY_DAYS', '14')),
    'PROPOSAL_EXPIRY_HOURS': int(os.getenv('DEFAULT_PROPOSAL_EXPIRY_HOURS', '48')),
    'MAX_CYCLE_LENGTH': int(os.getenv('DEFAULT_MAX_CYCLE_LENGTH', '5')),
}

# Integration mode & institutional endpoint configuration
INTEGRATION_MOCK_MODE = os.getenv('INTEGRATION_MOCK_MODE', 'True').lower() in ('true', '1')
P03_API_URL = (os.getenv('P03_API_URL') or os.getenv('P03_API_BASE_URL', '')).strip()
P03_API_KEY = (os.getenv('P03_API_KEY') or os.getenv('P03_API_CLIENT_SECRET', '')).strip()
ERP_API_URL = os.getenv('ERP_API_URL', '').strip()
ERP_API_KEY = os.getenv('ERP_API_KEY', '').strip()
INTEGRATION_HTTP_TIMEOUT = int(os.getenv('P03_SYNC_TIMEOUT_SECONDS', '10'))

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
        'file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': BASE_DIR / 'logs' / 'django.log',
            'maxBytes': 5 * 1024 * 1024,  # 5 MB per log file
            'backupCount': 5,
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'] if DEBUG else ['console', 'file'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'] if DEBUG else ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'apps': {
            'handlers': ['console'] if DEBUG else ['console', 'file'],
            'level': 'DEBUG' if DEBUG else 'INFO',
            'propagate': False,
        },
    },
}

# Create logs directory if it doesn't exist
(BASE_DIR / 'logs').mkdir(exist_ok=True)

# Production Security Hardening (active automatically when DJANGO_DEBUG=False)
if not DEBUG:
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'
    SESSION_COOKIE_SECURE = os.getenv('SESSION_COOKIE_SECURE', 'True').lower() in ('true', '1')
    CSRF_COOKIE_SECURE = os.getenv('CSRF_COOKIE_SECURE', 'True').lower() in ('true', '1')
    SECURE_SSL_REDIRECT = os.getenv('SECURE_SSL_REDIRECT', 'False').lower() in ('true', '1')
    SECURE_HSTS_SECONDS = int(os.getenv('SECURE_HSTS_SECONDS', '31536000'))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
