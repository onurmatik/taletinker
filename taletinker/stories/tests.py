from django.test import Client, TestCase
from django.urls import reverse
from unittest.mock import patch
from types import SimpleNamespace

from taletinker.accounts.models import User
from taletinker.stories.models import Story


class CreateStoryViewTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="test", password="pass")
        self.client = Client()

    def test_get_create_page(self):
        self.client.force_login(self.user)
        response = self.client.get(reverse("create_story"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Generate Story")

    def test_post_creates_story(self):
        self.client.force_login(self.user)
        data = {
            "realism": 50,
            "didactic": 50,
            "age": 5,
            "themes": ["family"],
            "purposes": ["joyful"],
            "characters": "Jane",
            "extra_instructions": "A test story.",
            "story_length": "short",
            "language": "en",
            "story_text": "Once upon a time",
            "story_title": "My Story",
        }
        response = self.client.post(reverse("create_story"), data)
        self.assertEqual(response.status_code, 302)
        self.assertEqual(Story.objects.count(), 1)
        story = Story.objects.first()
        self.assertEqual(story.author, self.user)
        self.assertEqual(story.parameters["realism"], 50)
        self.assertEqual(story.texts.first().text, "Once upon a time")
        self.assertEqual(story.texts.first().title, "My Story")

    def test_post_redirects_to_detail(self):
        self.client.force_login(self.user)
        data = {
            "realism": 50,
            "didactic": 50,
            "age": 5,
            "themes": ["family"],
            "purposes": ["joyful"],
            "characters": "Jane",
            "extra_instructions": "A test story.",
            "story_length": "short",
            "language": "en",
            "story_text": "Once upon a time",
            "story_title": "My Story",
        }
        response = self.client.post(reverse("create_story"), data)
        story = Story.objects.first()
        self.assertRedirects(response, reverse("story_detail", args=[story.id]))


class NinjaCreateApiTests(TestCase):
    def setUp(self):
        self.client = Client()

    @patch("taletinker.api.openai.OpenAI")
    def test_post_returns_story_text(self, mock_openai):
        mock_client = mock_openai.return_value
        mock_client.chat.completions.create.return_value = SimpleNamespace(
            choices=[
                SimpleNamespace(
                    message=SimpleNamespace(
                        content='{"title": "Hi", "text": "Hello"}'
                    )
                )
            ]
        )

        response = self.client.post(
            "/api/create",
            {
                "realism": 50,
                "didactic": 50,
                "age": 5,
                "story_length": "short",
            },
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["title"], "Hi")
        self.assertEqual(response.json()["text"], "Hello")

