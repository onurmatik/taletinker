from django.views import View
from django.contrib.auth import get_user_model
from django.contrib.auth import views as auth_views
from django.core.mail import send_mail
from django.urls import reverse
from django.conf import settings
from django.shortcuts import render
from sesame.utils import get_query_string

from .forms import SignupForm, EmailLoginForm


class LogoutView(auth_views.LogoutView):
    """Allow logout via GET for simplicity."""

    http_method_names = ["get", "post", "options"]

    def get(self, request, *args, **kwargs):
        return self.post(request, *args, **kwargs)


class SignupView(View):
    def get(self, request):
        form = SignupForm()
        return render(request, "registration/signup.html", {"form": form})

    def post(self, request):
        form = SignupForm(request.POST)
        if form.is_valid():
            User = get_user_model()
            user = User.objects.create_user(
                username=form.cleaned_data["username"],
                email=form.cleaned_data["email"],
            )
            login_url = request.build_absolute_uri(
                reverse("login_token") + get_query_string(user)
            )
            send_mail(
                "Your TaleTinker login link",
                f"Click here to log in: {login_url}",
                settings.DEFAULT_FROM_EMAIL,
                [form.cleaned_data["email"]],
            )
            return render(request, "registration/signup_done.html")
        return render(request, "registration/signup.html", {"form": form})


class EmailLoginView(View):
    def get(self, request):
        form = EmailLoginForm()
        return render(request, "registration/login_email.html", {"form": form})

    def post(self, request):
        form = EmailLoginForm(request.POST)
        if form.is_valid():
            User = get_user_model()
            try:
                user = User.objects.get(email=form.cleaned_data["email"])
            except User.DoesNotExist:
                form.add_error("email", "Unknown email")
            else:
                login_url = request.build_absolute_uri(
                    reverse("login_token") + get_query_string(user)
                )
                send_mail(
                    "Your TaleTinker login link",
                    f"Click here to log in: {login_url}",
                    settings.DEFAULT_FROM_EMAIL,
                    [form.cleaned_data["email"]],
                )
                return render(request, "registration/login_email_sent.html")
        return render(request, "registration/login_email.html", {"form": form})
