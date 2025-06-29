from django import forms
from django_recaptcha.fields import ReCaptchaField
from django.utils.translation import gettext_lazy as _


class SignupForm(forms.Form):
    username = forms.CharField(max_length=150, label=_("Username"))
    email = forms.EmailField(label=_("Email"))
    captcha = ReCaptchaField(label=_("CAPTCHA"))


class EmailLoginForm(forms.Form):
    email = forms.EmailField(label=_("Email"))
    captcha = ReCaptchaField(label=_("CAPTCHA"))
