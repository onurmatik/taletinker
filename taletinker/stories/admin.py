from django.contrib import admin

from .models import Line, Story


@admin.register(Line)
class LineAdmin(admin.ModelAdmin):
    list_display = ("uuid", "short_text", "is_last", "is_manual", "author", "created_at")
    list_filter = ("is_last", "is_manual", "created_at")
    search_fields = ("text", "author__email", "author__username")
    readonly_fields = ("uuid", "created_at")

    @admin.display(description="text")
    def short_text(self, obj):
        return (obj.text[:75] + "…") if len(obj.text) > 75 else obj.text


@admin.register(Story)
class StoryAdmin(admin.ModelAdmin):
    list_display = ("uuid", "title", "tagline", "last_line", "created_at")
    search_fields = ("title", "tagline", "last_line__text")
    list_filter = ("created_at",)
    readonly_fields = ("uuid", "created_at")
