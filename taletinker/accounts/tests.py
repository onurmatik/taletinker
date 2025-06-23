from django.test import Client, TestCase
from django.urls import reverse

from django.core import mail
from unittest.mock import patch
from taletinker.accounts.models import User


class SignupEmailLoginTests(TestCase):
    def setUp(self):
        self.client = Client()

    def _patch_captcha(self):
        return patch("django_recaptcha.fields.client.submit", return_value=type("obj", (), {"is_valid": True, "extra_data": {}, "error_codes": []})())

    def test_signup_sends_email(self):
        with self._patch_captcha():
            resp = self.client.post(
                reverse("signup"),
                {"username": "tester", "email": "test@example.com", "g-recaptcha-response": "x"},
            )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(User.objects.filter(username="tester").count(), 1)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("http", mail.outbox[0].body)

    def test_email_login_flow(self):
        user = User.objects.create_user(username="tester", email="test@example.com")
        with self._patch_captcha():
            resp = self.client.post(
                reverse("login"),
                {"email": "test@example.com", "g-recaptcha-response": "x"},
            )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)
        link = [l for l in mail.outbox[0].body.split() if l.startswith("http")][0]
        resp = self.client.get(link)
        self.assertEqual(resp.status_code, 302)
        self.assertEqual(resp["Location"], reverse("create_story"))
        resp = self.client.get(resp["Location"])  # follow manually
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.context["user"].is_authenticated)
        self.assertContains(resp, "Generate Story")
        resp = self.client.get(reverse("logout"))
        self.assertEqual(resp.status_code, 302)
        self.assertRedirects(resp, reverse("login"))
