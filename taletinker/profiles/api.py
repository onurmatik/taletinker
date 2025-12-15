from ninja import Router, Schema
from django.contrib.auth.models import User
from typing import Optional
from sesame.utils import get_query_string
from django.urls import reverse
from django.utils.translation import gettext as _

router = Router()

class UserSchema(Schema):
    email: str
    is_authenticated: bool
    credits: Optional[int] = None

class EmailLoginSchema(Schema):
    email: str

@router.post("/auth/email", response={200: dict, 400: dict})
def request_email_login(request, data: EmailLoginSchema):
    email = data.email.lower().strip()
    if not email:
        return 400, {"error": "Email is required"}

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        user = User.objects.create_user(username=email, email=email)
        user.set_unusable_password()
        user.save()
        
        try:
            from django.core.mail import mail_admins
            mail_admins(
                subject=f"New User Signup: {email}",
                message=f"A new user has signed up.\nEmail: {email}",
                fail_silently=True
            )
        except Exception:
            pass

    link = reverse("email_auth")
    link = request.build_absolute_uri(link)
    link += get_query_string(user)
    
    user.email_user(
        subject=_("Photo Forge login link"),
        message=_(
            "Hello,\n\n"
            "You requested that we send you a link to log in to PhotoForge.io:\n\n"
            "%(link)s\n\n\n"
            "Thank you!"
        ) % {'link': link}
    )

    return 200, {"message": "Login link sent. Please check your email."}

@router.post("/auth/logout", response={200: dict})
def logout_view(request):
    from django.contrib.auth import logout
    logout(request)
    return 200, {"message": "Logged out successfully"}

@router.get("/me", response={200: UserSchema, 401: None})
def get_me(request):
    if request.user.is_authenticated:
        # Ensure usercredit exists, just in case (though signal should handle it)
        if not hasattr(request.user, 'usercredit'):
            from .models import UserCredit
            UserCredit.objects.create(user=request.user)
            
        return 200, {
            "email": request.user.email,
            "is_authenticated": True,
            "credits": request.user.usercredit.available
        }
    return 401, None
