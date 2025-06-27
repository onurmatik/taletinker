from django.test import Client, TestCase
from django.urls import reverse
from unittest.mock import patch, MagicMock
from types import SimpleNamespace
from django.core.files.base import ContentFile
from django.conf import settings
import base64

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
            "realism": 3,
            "didactic": 3,
            "age": 5,
            "themes": ["family", "joyful"],
            "characters": "Jane",
            "extra_instructions": "A test story.",
            "story_length": "1",
            "story_text": "Once upon a time",
            "story_title": "My Story",
        }
        response = self.client.post(reverse("create_story"), data)
        self.assertEqual(response.status_code, 302)
        self.assertEqual(Story.objects.count(), 1)
        story = Story.objects.first()
        self.assertEqual(story.author, self.user)
        self.assertEqual(story.parameters["realism"], 3)
        self.assertEqual(story.texts.first().text, "Once upon a time")
        self.assertEqual(story.texts.first().title, "My Story")

    def test_post_redirects_to_detail(self):
        self.client.force_login(self.user)
        data = {
            "realism": 3,
            "didactic": 3,
            "age": 5,
            "themes": ["family", "joyful"],
            "characters": "Jane",
            "extra_instructions": "A test story.",
            "story_length": "1",
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
                    message=SimpleNamespace(content='{"title": "Hi", "text": "Hello"}')
                )
            ]
        )

        response = self.client.post(
            "/api/create",
            {
                "realism": 3,
                "didactic": 3,
                "age": 5,
                "story_length": 1,
            },
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["title"], "Hi")
        self.assertEqual(response.json()["text"], "Hello")


class StoryListAndDetailTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="alice", password="pass")
        self.client = Client()

    def _create_story(
        self,
        title="Title",
        published=True,
        parameters=None,
        languages=None,
    ):
        story = Story.objects.create(
            author=self.user,
            is_published=published,
            parameters=parameters or {"age": 5, "themes": []},
        )
        for lang in languages or ["en"]:
            story.texts.create(language=lang, title=title, text="Once")
        return story

    def test_homepage_lists_published_stories(self):
        self._create_story(title="Visible", published=True)
        self._create_story(title="Hidden", published=False)

        response = self.client.get(reverse("story_list"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Visible")
        self.assertNotContains(response, "Hidden")

    def test_story_detail_accessible_anonymously(self):
        story = self._create_story()
        response = self.client.get(reverse("story_detail", args=[story.id]))
        self.assertEqual(response.status_code, 200)

    def test_like_button_present(self):
        story = self._create_story()
        self.client.force_login(self.user)
        response = self.client.get(reverse("story_list"))
        self.assertContains(response, 'class="like-btn')
        response = self.client.get(reverse("story_detail", args=[story.id]))
        self.assertContains(response, 'class="like-btn')

    def test_filter_my_stories(self):
        my_story = self._create_story(title="Mine", published=True)
        other = User.objects.create_user(username="bob", password="pass")
        other_story = Story.objects.create(author=other, is_published=True)
        other_story.texts.create(language="en", title="Other", text="X")

        self.client.force_login(self.user)
        resp = self.client.get(reverse("story_list") + "?filter=mine")
        self.assertContains(resp, "Mine")
        self.assertNotContains(resp, "Other")

    def test_filter_my_favorites(self):
        fav = self._create_story(title="Fav", published=True)
        not_fav = self._create_story(title="Not", published=True)
        fav.liked_by.add(self.user)

        self.client.force_login(self.user)
        resp = self.client.get(reverse("story_list") + "?filter=favorites")
        self.assertContains(resp, "Fav")
        self.assertNotContains(resp, "Not")

    def test_filter_by_age(self):
        self._create_story(title="A5", published=True, parameters={"age": 5, "themes": []})
        self._create_story(title="A7", published=True, parameters={"age": 7, "themes": []})

        resp = self.client.get(reverse("story_list") + "?age=5")
        self.assertContains(resp, "A5")
        self.assertNotContains(resp, "A7")

    def test_filter_by_theme(self):
        self._create_story(
            title="Fam",
            published=True,
            parameters={"age": 5, "themes": ["family"]},
        )
        self._create_story(
            title="Ani",
            published=True,
            parameters={"age": 5, "themes": ["animals"]},
        )

        resp = self.client.get(reverse("story_list") + "?theme=family")
        stories = resp.context["stories"]
        titles = [s.texts.first().title for s in stories]
        self.assertIn("Fam", titles)
        self.assertNotIn("Ani", titles)

    def test_filter_by_language(self):
        self._create_story(title="EN", published=True, languages=["en"])
        self._create_story(title="ES", published=True, languages=["es"])

        resp = self.client.get(reverse("story_list") + "?language=es")
        self.assertContains(resp, "ES")
        self.assertNotContains(resp, "EN")

    def test_titles_use_selected_language(self):
        story = Story.objects.create(
            author=self.user,
            is_published=True,
            parameters={"age": 5, "themes": []},
        )
        story.texts.create(language="en", title="Hello", text="x")
        story.texts.create(language="es", title="Hola", text="x")

        resp = self.client.get(reverse("story_list") + "?lang=es")
        self.assertContains(resp, "Hola")
        self.assertNotContains(resp, "Hello")

    def test_search_by_title(self):
        self._create_story(title="Red Apple", published=True)
        self._create_story(title="Blue Banana", published=True)

        resp = self.client.get(reverse("story_list") + "?search=red")
        self.assertContains(resp, "Red Apple")
        self.assertNotContains(resp, "Blue Banana")

    def test_sort_by_popularity(self):
        s1 = self._create_story(title="One", published=True)
        s2 = self._create_story(title="Two", published=True)
        s1.liked_by.add(self.user)

        resp = self.client.get(reverse("story_list") + "?sort=popular")
        stories = resp.context["stories"]
        self.assertEqual(stories[0].id, s1.id)


class LikeApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="john", password="pass")
        self.client = Client()
        self.story = Story.objects.create(author=self.user)
        self.story.texts.create(language="en", title="T", text="x")

    def test_like_and_unlike(self):
        self.client.force_login(self.user)
        url = "/api/like"
        resp = self.client.post(
            url, {"story_id": self.story.id}, content_type="application/json"
        )
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.json()["liked"])
        resp = self.client.post(
            url, {"story_id": self.story.id}, content_type="application/json"
        )
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(resp.json()["liked"])


class CreateImageApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="pic", password="pass")
        self.client = Client()
        self.story = Story.objects.create(author=self.user)
        self.story.texts.create(language="en", title="Cover", text="t")

    @patch("taletinker.api.openai.OpenAI")
    def test_generate_image(self, mock_openai):
        img_data = (
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4//8/AAX+Av4N70a4AAAAAElFTkSuQmCC"
        )
        mock_client = mock_openai.return_value
        mock_client.images.generate.return_value = SimpleNamespace(
            data=[SimpleNamespace(b64_json=img_data)]
        )

        self.client.force_login(self.user)
        resp = self.client.post(
            "/api/create_image",
            {"story_id": self.story.id},
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(self.story.images.count(), 1)
        self.story.refresh_from_db()
        self.assertTrue(self.story.is_published)


class CreateAudioApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="snd", password="pass")
        self.client = Client()
        self.story = Story.objects.create(author=self.user)
        self.story.texts.create(language="en", title="S", text="hello")

    @patch("taletinker.api.openai.OpenAI")
    def test_generate_audio(self, mock_openai):
        class DummyResp:
            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc, tb):
                pass

            def iter_bytes(self, chunk_size=None):
                return [b"mp3"]

        dummy = DummyResp()
        mock_client = mock_openai.return_value
        create_mock = MagicMock(return_value=dummy)
        mock_client.audio = SimpleNamespace(
            speech=SimpleNamespace(
                with_streaming_response=SimpleNamespace(create=create_mock)
            )
        )

        self.client.force_login(self.user)
        resp = self.client.post(
            "/api/create_audio",
            {"story_id": self.story.id},
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(self.story.audios.count(), 1)
        data = resp.json()
        self.assertIn("audio_id", data)
        self.assertIn("file", data)
        self.assertIn(f"speech{self.story.id}_en", data["file"])
        self.assertIn(f"speech{self.story.id}_en", self.story.audios.first().mp3.name)

    @patch("taletinker.api.openai.OpenAI")
    def test_generate_audio_specific_language(self, mock_openai):
        self.story.texts.create(language="es", title="S", text="hola")

        class DummyResp:
            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc, tb):
                pass

            def iter_bytes(self, chunk_size=None):
                return [b"mp3"]

        dummy = DummyResp()
        mock_client = mock_openai.return_value
        create_mock = MagicMock(return_value=dummy)
        mock_client.audio = SimpleNamespace(
            speech=SimpleNamespace(
                with_streaming_response=SimpleNamespace(create=create_mock)
            )
        )

        self.client.force_login(self.user)
        resp = self.client.post(
            "/api/create_audio",
            {"story_id": self.story.id, "language": "es"},
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(self.story.audios.count(), 1)
        self.assertEqual(self.story.audios.first().language, "es")
        data = resp.json()
        self.assertIn("file", data)
        self.assertIn(f"speech{self.story.id}_es", data["file"])
        self.assertIn(f"speech{self.story.id}_es", self.story.audios.first().mp3.name)
        create_mock.assert_called_with(
            model="tts-1",
            voice="shimmer",
            input="S\n...\nhola",
        )

    @patch("taletinker.api.openai.OpenAI")
    def test_generate_audio_with_auto_translation(self, mock_openai):
        """Audio creation should translate text when missing."""

        class DummyResp:
            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc, tb):
                pass

            def iter_bytes(self, chunk_size=None):
                return [b"mp3"]

        dummy = DummyResp()
        mock_client = mock_openai.return_value
        # mock audio generation
        create_mock = MagicMock(return_value=dummy)
        mock_client.audio = SimpleNamespace(
            speech=SimpleNamespace(
                with_streaming_response=SimpleNamespace(create=create_mock)
            )
        )
        # mock translation
        mock_client.chat = SimpleNamespace(
            completions=SimpleNamespace(
                create=MagicMock(
                    return_value=SimpleNamespace(
                        choices=[
                            SimpleNamespace(
                                message=SimpleNamespace(
                                    content='{"title": "Hola", "text": "hola"}'
                                )
                            )
                        ]
                    )
                )
            )
        )

        self.client.force_login(self.user)
        resp = self.client.post(
            "/api/create_audio",
            {"story_id": self.story.id, "language": "es"},
            content_type="application/json",
        )

        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("file", data)
        self.assertIn(f"speech{self.story.id}_es", data["file"])
        self.assertIn(f"speech{self.story.id}_es", self.story.audios.first().mp3.name)
        # translation should have been saved
        self.assertEqual(self.story.texts.filter(language="es").count(), 1)
        self.assertEqual(self.story.audios.filter(language="es").count(), 1)

    def test_audio_already_exists(self):
        self.story.audios.create(mp3=ContentFile(b"mp3", name="a.mp3"), language="en")
        self.client.force_login(self.user)
        resp = self.client.post(
            "/api/create_audio",
            {"story_id": self.story.id},
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertJSONEqual(resp.content, {"detail": "exists"})


class StoryImageDisplayTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="img", password="pass")
        self.client = Client()

    def test_detail_shows_image(self):
        story = Story.objects.create(author=self.user, is_published=True)
        story.texts.create(language="en", title="T", text="x")
        story.images.create(image=ContentFile(b"im", "c.png"), thumbnail=ContentFile(b"im", "c.png"))

        resp = self.client.get(reverse("story_detail", args=[story.id]))
        self.assertContains(resp, "<img")

    def test_list_shows_image(self):
        story = Story.objects.create(author=self.user, is_published=True)
        story.texts.create(language="en", title="T", text="x")
        story.images.create(image=ContentFile(b"im", "c.png"), thumbnail=ContentFile(b"im", "c.png"))

        resp = self.client.get(reverse("story_list"))
        self.assertContains(resp, "<img")


class ImageCreationFlowTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="flow", password="pass")
        self.client = Client()

    def test_detail_shows_creation_message_after_story_post(self):
        self.client.force_login(self.user)
        data = {
            "realism": 3,
            "didactic": 3,
            "age": 5,
            "themes": ["family", "joyful"],
            "characters": "Jane",
            "extra_instructions": "A test story.",
            "story_length": "1",
            "story_text": "Once",
            "story_title": "T",
        }
        resp = self.client.post(reverse("create_story"), data, follow=True)
        self.assertContains(resp, "Creating image...")
        self.assertContains(resp, "Creating audio...")


class StoryAudioDisplayTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="aud", password="pass")
        self.client = Client()

    def test_detail_shows_audio(self):
        story = Story.objects.create(author=self.user, is_published=True)
        story.texts.create(language="en", title="T", text="x")
        story.audios.create(mp3=ContentFile(b"mp3", name="a.mp3"), language="en")

        resp = self.client.get(reverse("story_detail", args=[story.id]))
        self.assertContains(resp, "<audio")

    def test_list_shows_audio_and_languages(self):
        story = Story.objects.create(author=self.user, is_published=True)
        story.texts.create(language="en", title="T", text="x")
        story.texts.create(language="es", title="T", text="y")
        story.audios.create(mp3=ContentFile(b"mp3", name="a.mp3"), language="en")

        resp = self.client.get(reverse("story_detail", args=[story.id]))
        self.assertContains(resp, "<audio")
        self.assertContains(resp, "?lang=en")
        self.assertContains(resp, "?lang=es")


class StoryLanguageOnDemandTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="lang", password="pass")
        self.client = Client()

    def test_detail_lists_all_supported_languages(self):
        story = Story.objects.create(author=self.user, is_published=True)
        story.texts.create(language="en", title="T", text="x")

        resp = self.client.get(reverse("story_detail", args=[story.id]))
        for code, _ in settings.LANGUAGES:
            self.assertContains(resp, f"?lang={code}")

    def test_missing_translation_shows_creation_message(self):
        story = Story.objects.create(author=self.user, is_published=True)
        story.texts.create(language="en", title="T", text="x")

        resp = self.client.get(reverse("story_detail", args=[story.id]) + "?lang=fr")
        self.assertContains(resp, "Creating text...")


class PlaylistTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="plist", password="pass")
        self.client = Client()
        self.client.force_login(self.user)

    def _create_story(self, title="T"):
        story = Story.objects.create(
            author=self.user,
            is_published=True,
            parameters={"age": 5, "themes": []},
        )
        story.texts.create(language="en", title=title, text="x")
        return story

    def test_add_single_story(self):
        story = self._create_story()
        resp = self.client.post(reverse("add_to_playlist", args=[story.id]))
        self.assertRedirects(resp, reverse("story_list"))
        self.assertIn(story, self.user.playlist.stories.all())

    def test_bulk_add_filtered(self):
        s1 = self._create_story("A")
        s2 = self._create_story("B")
        resp = self.client.post(reverse("add_filtered_to_playlist") + "?age=5")
        self.assertRedirects(resp, reverse("story_list"))
        playlist_stories = set(self.user.playlist.stories.all())
        self.assertEqual(playlist_stories, {s1, s2})

    def test_remove_story(self):
        story = self._create_story()
        self.client.post(reverse("add_to_playlist", args=[story.id]))
        resp = self.client.post(reverse("remove_from_playlist", args=[story.id]))
        self.assertRedirects(resp, reverse("story_list"))
        self.assertNotIn(story, self.user.playlist.stories.all())

    def test_play_playlist_page(self):
        story = self._create_story()
        story.audios.create(mp3=ContentFile(b"mp3", name="a.mp3"), language="en")
        self.client.post(reverse("add_to_playlist", args=[story.id]))
        resp = self.client.get(reverse("play_playlist"))
        self.assertEqual(resp.status_code, 200)
        self.assertContains(resp, "<audio")

    def test_playlist_player_on_list_page(self):
        story = self._create_story()
        story.audios.create(mp3=ContentFile(b"mp3", name="a.mp3"), language="en")
        self.client.post(reverse("add_to_playlist", args=[story.id]))
        resp = self.client.get(reverse("story_list"))
        self.assertContains(resp, "playlist-player")

    def test_reorder_playlist(self):
        s1 = self._create_story("A")
        s2 = self._create_story("B")
        s3 = self._create_story("C")
        for s in (s1, s2, s3):
            self.client.post(reverse("add_to_playlist", args=[s.id]))
        resp = self.client.post(reverse("reorder_playlist"), {"order": [s3.id, s1.id, s2.id]})
        self.assertEqual(resp.status_code, 200)
        playlist_stories = list(self.user.playlist.ordered_stories())
        self.assertEqual(playlist_stories, [s3, s1, s2])


class RSSFeedTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="feed", password="pass")
        self.client = Client()
        self.story = Story.objects.create(author=self.user, is_published=True)
        self.story.texts.create(language="en", title="Hello", text="x")
        self.story.texts.create(language="es", title="Hola", text="y")

    def test_feed_filters_by_language(self):
        resp = self.client.get(reverse("story_feed", args=["es"]))
        self.assertEqual(resp.status_code, 200)
        content = resp.content.decode()
        self.assertIn("Hola", content)
        self.assertNotIn("Hello", content)

    def test_unknown_language_returns_404(self):
        resp = self.client.get(reverse("story_feed", args=["xx"]))
        self.assertEqual(resp.status_code, 404)

