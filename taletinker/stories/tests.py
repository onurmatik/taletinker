from django.test import Client, TestCase
from django.urls import reverse

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
        }
        response = self.client.post(reverse("create_story"), data)
        self.assertEqual(response.status_code, 302)
        self.assertEqual(Story.objects.count(), 1)
        story = Story.objects.first()
        self.assertEqual(story.author, self.user)
        self.assertEqual(story.parameters["realism"], 50)
