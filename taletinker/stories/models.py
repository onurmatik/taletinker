from django.conf import settings
from django.db import models


class Story(models.Model):
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="stories",
    )
    title = models.CharField(max_length=255)
    text = models.TextField()
    audio_file = models.FileField(upload_to="audio/", blank=True)
    cover_image = models.ImageField(upload_to="covers/", blank=True)
    language = models.CharField(max_length=32, default="en")
    target_age = models.PositiveSmallIntegerField()
    themes = models.CharField(max_length=255, blank=True)
    is_published = models.BooleanField(default=False)
    is_anonymous = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:  # pragma: no cover - trivial
        return self.title
