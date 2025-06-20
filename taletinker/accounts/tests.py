from django.test import Client, TestCase
from django.urls import reverse

from taletinker.accounts.models import User


class LoginLogoutTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="tester", password="pass")
        self.client = Client()

    def test_login_page_loads(self):
        response = self.client.get(reverse("login"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Login")

    def test_login_and_logout_flow(self):
        response = self.client.post(
            reverse("login"),
            {"username": "tester", "password": "pass"},
        )
        self.assertEqual(response.status_code, 302)
        self.assertRedirects(response, reverse("create_story"))

        response = self.client.get(reverse("logout"))
        self.assertEqual(response.status_code, 302)
        self.assertRedirects(response, reverse("login"))

        response = self.client.get(reverse("create_story"))
        self.assertEqual(response.status_code, 302)
        self.assertRedirects(response, f"{reverse('login')}?next={reverse('create_story')}")
