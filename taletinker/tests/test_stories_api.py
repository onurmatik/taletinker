from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from taletinker.stories.models import Story, Line
import json

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
        self.assertEqual(data["lines"], lines)
        self.assertEqual(data["length"], 2)
        
        # Verify DB
        story = Story.objects.get(uuid=story_uuid)
        self.assertEqual(story.end.text, "There was a coder")
        self.assertEqual(story.end.previous.text, "Once upon a time")

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
        line_a = orig_story.end.previous
        line_b = orig_story.end

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
        self.assertEqual(ext_story.end.previous.id, line_b.id) # C -> B (Same B)
        self.assertEqual(ext_story.end.previous.previous.id, line_a.id) # B -> A (Same A)

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
        self.assertEqual(branch_story.end.text, "X")
        self.assertEqual(branch_story.end.previous.id, line_a.id) # X -> A (Same A)
        
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
