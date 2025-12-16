from django.contrib.auth import get_user_model, logout
from django.conf import settings
from django.core.mail import send_mail
from django.urls import reverse
from django.template.loader import render_to_string
from ninja import Router, Schema
from ninja.errors import HttpError
from sesame.utils import get_token
import logging

logger = logging.getLogger(__name__)
router = Router()
User = get_user_model()

class LoginSchema(Schema):
    email: str

class UserSchema(Schema):
    email: str | None = None
    is_authenticated: bool

class LoginResponse(Schema):
    success: bool
    message: str

@router.post("/login", response=LoginResponse)
def login(request, data: LoginSchema):
    email = data.email.lower().strip()
    if not email:
        raise HttpError(400, "Email is required")

    # Get or create user - simpler flow for this app
    user, created = User.objects.get_or_create(username=email, defaults={'email': email})
    if not user.is_active:
         raise HttpError(403, "Account is disabled")

    # Generate magic link
    token = get_token(user)
    
    # Construct the full login URL
    # We point to the existing Django view that handles the token
    # e.g. /auth/login/?sesame=...
    login_path = reverse("email_auth")
    host = settings.ALLOWED_HOSTS[0] if settings.ALLOWED_HOSTS else "localhost:8000"
    # Basic flexible protocol check
    protocol = "https" if "production" in settings.SECRET_KEY else "http" 
    # Use request.build_absolute_uri for better accuracy
    magic_link = request.build_absolute_uri(f"{login_path}?sesame={token}")

    # Send email
    try:
        send_mail(
            subject="Log in to TaleTinker",
            message=f"Click here to log in: {magic_link}",
            from_email=None, # Uses DEFAULT_FROM_EMAIL
            recipient_list=[email],
            fail_silently=False,
        )
    except Exception as e:
        logger.error(f"Failed to send login email: {e}")
        # In prod we might not want to expose this, but acceptable for now
        raise HttpError(500, "Failed to send email")

    return {
        "success": True, 
        "message": "Magic link sent. Check your email."
    }

@router.post("/logout", response={200: dict})
def logout_view(request):
    logout(request)
    return {"success": True}

@router.get("/me", response=UserSchema)
def me(request):
    if request.user.is_authenticated:
        return {
            "email": request.user.email,
            "is_authenticated": True
        }
    return {
        "email": None,
        "is_authenticated": False
    }
