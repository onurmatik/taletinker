from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from taletinker.stories.models import Story, Line
import json
from types import SimpleNamespace
from unittest.mock import patch

User = get_user_model()

class StoryApiTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(username="test", email="test@example.com", password="pw")
        self.client.force_login(self.user)
        self.stories_url = "/api/stories/"

    def test_create_and_get_story(self):
        # Create
        lines = ["Once upon a time", "There was a coder"]
        response = self.client.post(
            self.stories_url,
            data=json.dumps({
                "title": "My Story",
                "lines": lines
            }),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        story_uuid = data["id"]

        # Get
        response = self.client.get(f"{self.stories_url}{story_uuid}")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["title"], "My Story")
        
        # Verify lines are objects
        self.assertEqual(len(data["lines"]), 2)
        self.assertEqual(data["lines"][0]["text"], lines[0])
        self.assertEqual(data["lines"][1]["text"], lines[1])
        
        self.assertEqual(data["length"], 2)
        
        # Verify DB
        story = Story.objects.get(uuid=story_uuid)
        self.assertEqual(story.last_line.text, "There was a coder")
        self.assertEqual(story.last_line.previous.text, "Once upon a time")

    def test_fork_story_immutable_lines(self):
        # Create Original: A -> B
        lines = ["A", "B"]
        resp1 = self.client.post(
            self.stories_url,
            data=json.dumps({"title": "Orig", "lines": lines}),
            content_type="application/json"
        )
        orig_id = resp1.json()["id"]
        orig_story = Story.objects.get(uuid=orig_id)
        line_a = orig_story.last_line.previous
        line_b = orig_story.last_line

        # Fork (Extend): A -> B -> C
        # Should REUSE A and B, CREATE C
        lines_extended = ["A", "B", "C"] 
        resp2 = self.client.post(
            self.stories_url,
            data=json.dumps({
                "title": "Extended",
                "lines": lines_extended,
            }),
            content_type="application/json"
        )
        self.assertEqual(resp2.status_code, 200)
        ext_id = resp2.json()["id"]
        ext_story = Story.objects.get(uuid=ext_id)
        
        # Verify Reuse
        self.assertEqual(ext_story.last_line.previous.id, line_b.id) # C -> B (Same B)
        self.assertEqual(ext_story.last_line.previous.previous.id, line_a.id) # B -> A (Same A)

        # Fork (Branch): A -> X
        # Should REUSE A, CREATE X
        lines_branch = ["A", "X"]
        resp3 = self.client.post(
            self.stories_url,
            data=json.dumps({
                "title": "Branched",
                "lines": lines_branch,
            }),
            content_type="application/json"
        )
        branch_id = resp3.json()["id"]
        branch_story = Story.objects.get(uuid=branch_id)
        
        # Verify Branching
        self.assertEqual(branch_story.last_line.text, "X")
        self.assertEqual(branch_story.last_line.previous.id, line_a.id) # X -> A (Same A)
        
        # Verify Tree Structure
        # A should have two next lines: B and X
        self.assertEqual(line_a.next.count(), 2)

    def test_list_stories(self):
        self.client.post(self.stories_url, data=json.dumps({"title": "S1", "lines": ["1"]}), content_type="application/json")
        self.client.post(self.stories_url, data=json.dumps({"title": "S2", "lines": ["2"]}), content_type="application/json")
        
        response = self.client.get(self.stories_url)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 2)
        # Ordered by created_at desc
        self.assertEqual(data[0]["title"], "S2")
        # Ensure likes fields are present
        self.assertIn("like_count", data[0])
        self.assertIn("is_liked", data[0])

    def test_like_story(self):
        # Create story
        resp = self.client.post(
            self.stories_url,
            data=json.dumps({"title": "Likeable", "lines": ["Like me"]}),
            content_type="application/json"
        )
        story_id = resp.json()["id"]
        
        # Like
        url = f"{self.stories_url}{story_id}/like"
        resp = self.client.post(url)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["like_count"], 1)
        self.assertEqual(resp.json()["is_liked"], True)
        
        # Unlike
        resp = self.client.post(url)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["like_count"], 0)
        self.assertEqual(resp.json()["is_liked"], False)

    def test_like_line(self):
        # Create story
        resp = self.client.post(
            self.stories_url,
            data=json.dumps({"title": "Line Like", "lines": ["Line 1"]}),
            content_type="application/json"
        )
        story_id = resp.json()["id"]
        
        # Get Line ID
        resp_get = self.client.get(f"{self.stories_url}{story_id}")
        line_id = resp_get.json()["lines"][0]["id"]
        
        # Like Line
        url = f"{self.stories_url}lines/{line_id}/like"
        resp = self.client.post(url)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["like_count"], 1)
        self.assertEqual(resp.json()["is_liked"], True)
        
        # Check story view reflects line like
        resp_get = self.client.get(f"{self.stories_url}{story_id}")
        self.assertEqual(resp_get.json()["lines"][0]["like_count"], 1)
        self.assertEqual(resp_get.json()["lines"][0]["is_liked"], True)

    @patch.dict("os.environ", {"OPENAI_API_KEY": "test-key"})
    @patch("taletinker.api_stories.openai.OpenAI")
    def test_suggest_returns_two_options_with_single_openai_call(self, mock_openai):
        mock_client = mock_openai.return_value
        mock_client.responses.parse.return_value = SimpleNamespace(
            output_parsed=SimpleNamespace(options=["Option 1", "Option 2"])
        )

        response = self.client.post(
            f"{self.stories_url}suggest",
            data=json.dumps({"context": ["A beginning line"]}),
            content_type="application/json"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), ["Option 1", "Option 2"])
        mock_client.responses.parse.assert_called_once()
