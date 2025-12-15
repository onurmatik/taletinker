from django.conf import settings
from django.db import models
import uuid


class Sentence(models.Model):
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)

    previous = models.ForeignKey('self', blank=True, null=True, related_name='next', on_delete=models.PROTECT)
    text = models.TextField()
    is_final = models.BooleanField(default=False)
    is_manual = models.BooleanField(default=False)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        blank=True, null=True,
        on_delete=models.SET_NULL,
        related_name="sentences",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    liked_by = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="liked_stories",
        blank=True,
    )


class Story(models.Model):
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)

    title = models.TextField()
    end = models.ForeignKey(Sentence, on_delete=models.PROTECT)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        blank=True, null=True,
        on_delete=models.CASCADE,
        related_name="stories",
    )

    liked_by = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="liked_stories",
        blank=True,
    )

    class Meta:
        verbose_name_plural = "stories"

    def __str__(self):
        return self.title

    def get_story(self):
        """
        Returns the story as an ordered list of strings
        """

    def is_kids_safe(self):
        """
        Returns True if all sentences are kids safe
        """
