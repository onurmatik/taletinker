from django import forms
from django_recaptcha.fields import ReCaptchaField


class SignupForm(forms.Form):
    username = forms.CharField(max_length=150)
    email = forms.EmailField()
    captcha = ReCaptchaField()


class EmailLoginForm(forms.Form):
    email = forms.EmailField()
    captcha = ReCaptchaField()
