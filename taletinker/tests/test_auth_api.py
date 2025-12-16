from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from django.core import mail
from django.urls import reverse
import json

User = get_user_model()

class AuthApiTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.login_url = "/api/auth/login"
        self.logout_url = "/api/auth/logout"
        self.me_url = "/api/auth/me"
        self.email = "test@example.com"

    def test_login_creates_user_and_sends_email(self):
        response = self.client.post(
            self.login_url,
            data=json.dumps({"email": self.email}),
            content_type="application/json"
        )
        
        self.assertEqual(response.status_code, 200)
        self.assertTrue(User.objects.filter(email=self.email).exists())
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("Click here to log in", mail.outbox[0].body)
        self.assertIn("?sesame=", mail.outbox[0].body)

    def test_login_requires_email(self):
        response = self.client.post(
            self.login_url,
            data=json.dumps({"email": ""}),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 400)

    def test_me_anonymous(self):
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertFalse(data["is_authenticated"])
        self.assertIsNone(data["email"])

    def test_me_authenticated(self):
        user = User.objects.create_user(username=self.email, email=self.email)
        self.client.force_login(user)
        
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["is_authenticated"])
        self.assertEqual(data["email"], self.email)

    def test_logout(self):
        user = User.objects.create_user(username=self.email, email=self.email)
        self.client.force_login(user)
        
        response = self.client.post(self.logout_url)
        self.assertEqual(response.status_code, 200)
        
        # Verify session is cleared (or at least user is logged out)
        # Re-check /me
        response = self.client.get(self.me_url)
        self.assertFalse(response.json()["is_authenticated"])
