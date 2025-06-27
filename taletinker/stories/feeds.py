from django.contrib.syndication.views import Feed
from django.urls import reverse
from django.conf import settings
from django.http import Http404

from .models import StoryText


class LatestStoriesByLanguage(Feed):
    """RSS feed of latest published stories filtered by language."""

    def get_object(self, request, language: str) -> str:
        supported = [code for code, _ in settings.LANGUAGES]
        if language not in supported:
            raise Http404("Language not supported")
        return language

    def title(self, language: str) -> str:  # pragma: no cover - simple
        label = dict(settings.LANGUAGES).get(language, language)
        return f"Latest TaleTinker stories in {label}"

    def link(self, language: str) -> str:  # pragma: no cover - simple
        return reverse("story_list") + f"?language={language}"

    def description(self, language: str) -> str:  # pragma: no cover - simple
        label = dict(settings.LANGUAGES).get(language, language)
        return f"Recent published stories in {label}"

    def items(self, language: str):
        return (
            StoryText.objects.filter(
                language=language, story__is_published=True
            )
            .select_related("story")
            .order_by("-story__created_at")[:20]
        )

    def item_title(self, item: StoryText) -> str:
        return item.title

    def item_description(self, item: StoryText) -> str:
        return item.text

    def item_link(self, item: StoryText) -> str:  # pragma: no cover - simple
        return reverse("story_detail", args=[item.story.uuid]) + f"?lang={item.language}"
