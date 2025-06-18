from django.contrib import admin

from .models import Story


@admin.register(Story)
class StoryAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "author",
        "language",
        "target_age",
        "is_published",
        "created_at",
    ]
