from django.contrib import admin

from .models import Story, StoryAudio, StoryImage, StoryText


@admin.register(Story)
class StoryAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "author",
        "original_language",
        "is_published",
        "created_at",
    ]
    list_editable = ["is_published"]


@admin.register(StoryText)
class StoryTranslationAdmin(admin.ModelAdmin):
    list_display = [
        "story",
        "language",
    ]


@admin.register(StoryImage)
class StoryImageAdmin(admin.ModelAdmin):
    list_display = [
        "story",
        "image",
        "created_at",
    ]


@admin.register(StoryAudio)
class StoryAudioAdmin(admin.ModelAdmin):
    list_display = [
        "story",
        "language",
        "created_at",
    ]
