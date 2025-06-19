from django.contrib import admin

from .models import Story, StoryAudio, StoryImage, StoryTranslation


@admin.register(Story)
class StoryAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "author",
        "original_language",
        "is_published",
        "created_at",
    ]


@admin.register(StoryTranslation)
class StoryTranslationAdmin(admin.ModelAdmin):
    list_display = [
        "story",
        "language",
        "is_auto",
    ]


@admin.register(StoryImage)
class StoryImageAdmin(admin.ModelAdmin):
    list_display = [
        "story",
        "cover",
        "created_at",
    ]


@admin.register(StoryAudio)
class StoryAudioAdmin(admin.ModelAdmin):
    list_display = [
        "translation",
        "created_at",
    ]
