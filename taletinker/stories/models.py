from django.conf import settings
from django.db import models


class Story(models.Model):
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="stories",
    )

    parameters = models.JSONField(default=dict, blank=True)
    prompt = models.TextField(blank=True)
    original_language = models.CharField(max_length=10, default="en")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    is_published = models.BooleanField(default=False)
    is_anonymous = models.BooleanField(default=False)

    liked_by = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="liked_stories",
        blank=True,
    )

    class Meta:
        verbose_name_plural = "stories"

    def __str__(self):
        return f"Story by {self.author} @{self.created_at} in {self.original_language}"

    @property
    def languages(self) -> list[str]:
        """Return list of language codes available for this story."""
        return list(self.texts.values_list("language", flat=True))


class StoryText(models.Model):
    story = models.ForeignKey(Story, on_delete=models.CASCADE, related_name="texts")
    language = models.CharField(max_length=10)

    title = models.CharField(max_length=255)
    text = models.TextField()

    class Meta:
        unique_together = ("story", "language")

    def __str__(self):
        return self.title


class StoryImage(models.Model):
    story = models.ForeignKey(Story, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="images/", blank=True)
    thumbnail = models.ImageField(upload_to="thumbs/", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Cover photo for story {self.story.pk}"


class StoryAudio(models.Model):
    story = models.ForeignKey(Story, on_delete=models.CASCADE, related_name="audios")
    language = models.CharField(max_length=10)

    mp3 = models.FileField(upload_to="audio/", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("story", "language")

    def __str__(self):
        return f"Naration of story {self.story.pk} in {self.language}"


class Playlist(models.Model):
    """Simple per-user playlist of stories."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="playlist",
    )
    stories = models.ManyToManyField(Story, related_name="playlists", blank=True)

    def __str__(self):  # pragma: no cover - trivial
        return f"{self.user}'s playlist"
