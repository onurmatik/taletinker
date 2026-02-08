import logging
import os
from pathlib import Path
from django.utils.translation import gettext_lazy as _
from dotenv import load_dotenv


load_dotenv()


logger = logging.getLogger("taletinker.settings")


# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Story creation defaults
AI_DEFAULT_MODEL = os.getenv("AI_DEFAULT_MODEL", "gpt-5-nano")
STORY_MIN_LINES = int(os.getenv("STORY_MIN_LINES", "5"))
STORY_ANON_SIGNIN_LINE = int(os.getenv("STORY_ANON_SIGNIN_LINE", "3"))
STORY_LINE_MIN_CHARS = int(os.getenv("STORY_LINE_MIN_CHARS", "8"))
STORY_LINE_MIN_WORDS = int(os.getenv("STORY_LINE_MIN_WORDS", "2"))

NOTIFY_ON_SIGNUP = os.getenv("NOTIFY_ON_SIGNUP", "true").lower() == "true"


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'django-insecure-key-$$**')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv("DEBUG", "").lower() == "true"

ALLOWED_HOSTS = [
    "127.0.0.1",
    os.getenv("DJANGO_ALLOWED_HOSTS", "localhost"),
]


# Application definition

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.syndication",

    "storages",
    "django_ses",

    # Project apps
    "taletinker.stories",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "taletinker.middleware.ApiPrefixCompatMiddleware",
    "django.middleware.locale.LocaleMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "taletinker.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "taletinker" / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
                "django.template.context_processors.i18n",
                "django.template.context_processors.media",
            ],
        },
    },
]

WSGI_APPLICATION = "taletinker.wsgi.application"


# Database
# https://docs.djangoproject.com/en/5.2/ref/settings/#databases

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}


# Password validation
# https://docs.djangoproject.com/en/5.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.2/topics/i18n/

LANGUAGE_CODE = "en-us"

LANGUAGES = [
    ("en", _("English")),
    ("de", _("German")),
    ("fr", _("French")),
    ("es", _("Spanish")),
    ("tr", _("Turkish")),
]

LOCALE_PATHS = (
    os.path.join(BASE_DIR, 'locale'),
)

TIME_ZONE = "UTC"

USE_I18N = True

USE_TZ = True


# Storage & Static Files
# Decouple configuration from logic using environment variables

AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
AWS_STORAGE_BUCKET_NAME = os.getenv('AWS_STORAGE_BUCKET_NAME')
AWS_REGION_NAME = os.getenv('AWS_DEFAULT_REGION')

AWS_S3_REGION_NAME = AWS_REGION_NAME

if AWS_STORAGE_BUCKET_NAME:
    # Production / Staging (S3)
    STORAGES = {
        "default": {
            "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
            "OPTIONS": {
                "location": "media",
                "file_overwrite": False,
            },
        },
        "staticfiles": {
            "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
            "OPTIONS": {
                "location": "static",
                "file_overwrite": True,
                "querystring_auth": False,
            },
        },
    }

    AWS_S3_CUSTOM_DOMAIN = f"{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com"
    STATIC_URL = f"https://{AWS_S3_CUSTOM_DOMAIN}/static/"
    MEDIA_URL = f"https://{AWS_S3_CUSTOM_DOMAIN}/media/"

    AWS_QUERYSTRING_AUTH = False  # so URLs are public
    AWS_DEFAULT_ACL = None  # needed to avoid ACL errors

else:
    # Local Development (Filesystem)
    STORAGES = {
        "default": {
            "BACKEND": "django.core.files.storage.FileSystemStorage",
        },
        "staticfiles": {
            "BACKEND": "whitenoise.storage.CompressedStaticFilesStorage",
        },
    }

    STATIC_URL = "/static/"
    STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")

    MEDIA_URL = "/media/"
    MEDIA_ROOT = os.path.join(BASE_DIR, "media")


STATIC_SERVING_MODE = "s3" if AWS_STORAGE_BUCKET_NAME else "filesystem"
logger.warning(
    "Static config -> mode=%s DEBUG=%s STATIC_URL=%s AWS_STORAGE_BUCKET_NAME=%s",
    STATIC_SERVING_MODE,
    DEBUG,
    STATIC_URL,
    AWS_STORAGE_BUCKET_NAME,
)

if not DEBUG and not AWS_STORAGE_BUCKET_NAME:
    logger.warning(
        "DEBUG is False without cloud storage; ensure collectstatic has been run so WhiteNoise can serve assets from STATIC_ROOT (%s).",
        STATIC_ROOT,
    )


# Static files (CSS, JavaScript, Images)
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'static'),
]



LOGIN_URL = '/'
LOGIN_REDIRECT_URL = '/'
LOGOUT_REDIRECT_URL = '/'


SESSION_COOKIE_AGE = 315360000  # 10 years
SESSION_EXPIRE_AT_BROWSER_CLOSE = False


# Default primary key field type
# https://docs.djangoproject.com/en/5.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# Email & Authentication
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'hello@taletinker.org')
SERVER_EMAIL = DEFAULT_FROM_EMAIL
EMAIL_BACKEND = os.getenv('EMAIL_BACKEND')

ADMINS = [('Admin', 'onurmatik@gmail.com')]
EMAIL_SUBJECT_PREFIX = '[TaleTinker] '

if EMAIL_BACKEND:
    AWS_SES_REGION_NAME = AWS_REGION_NAME
    AWS_SES_ACCESS_KEY_ID = AWS_ACCESS_KEY_ID
    AWS_SES_SECRET_ACCESS_KEY = AWS_SECRET_ACCESS_KEY
else:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",
    "sesame.backends.ModelBackend",
]

SESAME_MAX_AGE = 300

if not DEBUG:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.filebased.FileBasedCache',
            'LOCATION': BASE_DIR / 'cache',
        }
    }
