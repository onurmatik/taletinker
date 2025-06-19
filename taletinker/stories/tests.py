from django.test import Client, TestCase
from django.urls import reverse


class CreateStoryViewTests(TestCase):
    def test_get_create_page(self):
        client = Client()
        response = client.get(reverse("create_story"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Generate Story")
