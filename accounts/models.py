from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class SubscriptionTier(models.TextChoices):
        FREE = "FREE", "Free"
        PREMIUM = "PREMIUM", "Premium"

    subscription_tier = models.CharField(
        max_length=20,
        choices=SubscriptionTier.choices,
        default=SubscriptionTier.FREE,
    )

    def __str__(self) -> str:  # pragma: no cover - trivial
        return self.username
