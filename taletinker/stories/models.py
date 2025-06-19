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


class StoryTranslation(models.Model):
    story = models.ForeignKey(Story, on_delete=models.CASCADE, related_name="translations")
    language = models.CharField(max_length=10)
    is_auto = models.BooleanField(default=True)

    title = models.CharField(max_length=255)
    text = models.TextField()

    class Meta:
        unique_together = ("story", "language")


class StoryImage(models.Model):
    story = models.ForeignKey(Story, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="images/", blank=True)
    cover = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)


class StoryAudio(models.Model):
    translation = models.ForeignKey(StoryTranslation, on_delete=models.CASCADE, related_name="audio")
    mp3 = models.FileField(upload_to="audio/", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
