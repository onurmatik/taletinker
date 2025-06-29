from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404, redirect, render
from django.conf import settings
from django.http import JsonResponse
from django.utils.translation import get_language, gettext_lazy as _
from django.db.models import Count
from django.core.paginator import Paginator
from django.core.cache import cache

from .forms import StoryCreationForm, StoryFilterForm
from .models import Story, StoryText, Playlist


def _filtered_stories(request):
    """Return stories and bound filter form applying GET parameters."""

    form = StoryFilterForm(request.GET)
    cache_key = (
        f"story_list:"
        f"{request.user.id if request.user.is_authenticated else 'anon'}:"
        f"{request.GET.urlencode()}"
    )
    stories = cache.get(cache_key)

    if stories is None:
        stories_qs = Story.objects.filter(is_published=True).prefetch_related(
            "texts", "author", "images"
        )

        filter_param = request.GET.get("filter")
        if filter_param == "mine" and request.user.is_authenticated:
            stories_qs = stories_qs.filter(author=request.user)
        elif filter_param == "favorites" and request.user.is_authenticated:
            stories_qs = stories_qs.filter(liked_by=request.user)

        if form.is_valid():
            age = form.cleaned_data.get("age")
            theme = form.cleaned_data.get("theme")
            language = form.cleaned_data.get("language")
            sort = form.cleaned_data.get("sort") or "newest"
            search = form.cleaned_data.get("search")

            if age:
                stories_qs = stories_qs.filter(parameters__age=int(age))
            if language:
                stories_qs = stories_qs.filter(texts__language=language)
            if search:
                stories_qs = stories_qs.filter(texts__title__icontains=search).distinct()

            stories_qs = stories_qs.annotate(num_likes=Count("liked_by"))
            stories_qs = stories_qs.order_by("-created_at")

            stories = list(stories_qs)

            if theme:
                stories = [s for s in stories if theme in s.parameters.get("themes", [])]

            if sort == "popular":
                stories.sort(key=lambda s: (-s.num_likes, -s.created_at.timestamp()))
        else:
            stories = list(
                stories_qs.order_by("-created_at").annotate(num_likes=Count("liked_by"))
            )

        cache.set(cache_key, stories, 300)
    else:
        form.is_valid()  # bind data for consistency

    return stories, form


def story_list(request):
    """Public homepage listing published stories with optional filters."""

    stories, form = _filtered_stories(request)

    paginator = Paginator(stories, 9)
    page_number = request.GET.get("page", 1)
    page_obj = paginator.get_page(page_number)
    stories_page = list(page_obj.object_list)

    selected_language = request.GET.get("lang")

    for story in stories_page:
        lang = selected_language or (
            story.texts.first().language if story.texts.exists() else None
        )
        story.display_language = lang
        if lang:
            story.display_audio = story.audios.filter(language=lang).first()
            story.display_text = story.texts.filter(language=lang).first()
        else:
            story.display_audio = None
            story.display_text = story.texts.first()

    playlist = None
    if request.user.is_authenticated:
        playlist, _ = Playlist.objects.get_or_create(user=request.user)
        playlist_stories = list(
            playlist.stories.prefetch_related("audios", "texts")
        )
        if playlist.order:
            ordering = {sid: idx for idx, sid in enumerate(playlist.order)}
            playlist_stories.sort(key=lambda s: ordering.get(s.id, len(ordering)))
        for item in playlist_stories:
            lang = selected_language or (
                item.texts.first().language if item.texts.exists() else None
            )
            item.display_language = lang
            if lang:
                item.display_audio = item.audios.filter(language=lang).first()
                item.display_text = item.texts.filter(language=lang).first()
            else:
                item.display_audio = None
                item.display_text = item.texts.first()
    else:
        playlist_stories = []

    context = {
        "stories": stories_page,
        "form": form,
        "page_obj": page_obj,
        "playlist": playlist,
        "playlist_stories": playlist_stories,
        "selected_language": selected_language,
    }

    if request.headers.get("X-Requested-With") == "XMLHttpRequest":
        resp = render(request, "stories/story_cards.html", context)
        resp["X-Has-Next"] = "true" if page_obj.has_next() else "false"
        return resp

    return render(request, "stories/story_list.html", context)


def filter_stories(request):
    """A dedicated view for searching and filtering stories (linked from bottom navbar)"""

    return render(request, "stories/filter_form.html", {
        "form": StoryFilterForm(),
    })


@login_required
def create_story(request):
    if request.method == "POST":
        form = StoryCreationForm(request.POST)
        if form.is_valid():
            story = Story.objects.create(
                author=request.user,
                parameters={
                    "realism": form.cleaned_data["realism"],
                    "didactic": form.cleaned_data["didactic"],
                    "age": form.cleaned_data["age"],
                    "themes": form.cleaned_data["themes"],
                    "story_length": form.cleaned_data["story_length"],
                },
                prompt=form.cleaned_data["extra_instructions"],
                original_language=get_language(),
            )
            text = request.POST.get("story_text")
            title = request.POST.get("story_title")
            StoryText.objects.create(
                story=story,
                language=get_language(),
                title=title or (text.splitlines()[0][:255] if text and text.strip() else _("Story")),
                text=text or "",
            )
            return redirect("story_detail", story_uuid=story.uuid)
    else:
        initial = {}
        age = request.GET.get("age")
        theme = request.GET.get("themes") or request.GET.get("theme")
        if age and age.isdigit():
            initial["age"] = int(age)
        if theme:
            initial["themes"] = [theme]
        form = StoryCreationForm(initial=initial)
    return render(request, "stories/create_story.html", {"form": form})


def story_detail(request, story_uuid: str):
    story = get_object_or_404(Story, uuid=story_uuid)

    lang = request.GET.get("lang")
    text_obj = None
    if lang:
        text_obj = story.texts.filter(language=lang).first()
    else:
        text_obj = story.texts.first()
        lang = text_obj.language if text_obj else None

    audio_obj = story.audios.filter(language=lang).first() if lang else None

    available_langs = story.languages
    supported_langs = [code for code, _ in settings.LANGUAGES]
    new_language_choices = [
        (code, label)
        for code, label in settings.LANGUAGES
        if code not in available_langs
    ]

    context = {
        "story": story,
        "text": text_obj,
        "audio": audio_obj,
        "languages": supported_langs,
        "selected_language": lang,
        "new_language_choices": new_language_choices,
    }

    return render(request, "stories/story_detail.html", context)


@login_required
def add_to_playlist(request, story_id: int):
    playlist, _ = Playlist.objects.get_or_create(user=request.user)
    story = get_object_or_404(Story, pk=story_id)
    playlist.stories.add(story)
    if story_id not in playlist.order:
        playlist.order.append(story_id)
        playlist.save(update_fields=["order"])
    return redirect("story_list")


@login_required
def add_filtered_to_playlist(request):
    stories, _ = _filtered_stories(request)
    playlist, _ = Playlist.objects.get_or_create(user=request.user)
    playlist.stories.add(*stories)
    for story in stories:
        if story.id not in playlist.order:
            playlist.order.append(story.id)
    playlist.save(update_fields=["order"])
    return redirect("story_list")


@login_required
def remove_from_playlist(request, story_id: int):
    playlist, _ = Playlist.objects.get_or_create(user=request.user)
    story = get_object_or_404(Story, pk=story_id)
    playlist.stories.remove(story)
    if story_id in playlist.order:
        playlist.order.remove(story_id)
        playlist.save(update_fields=["order"])
    return redirect("story_list")


@login_required
def reorder_playlist(request):
    playlist, _ = Playlist.objects.get_or_create(user=request.user)
    order_ids = request.POST.getlist("order[]") or request.POST.getlist("order")
    playlist.order = [int(sid) for sid in order_ids]
    playlist.save(update_fields=["order"])
    return JsonResponse({"status": "ok"})


@login_required
def play_playlist(request):
    playlist, _ = Playlist.objects.get_or_create(user=request.user)
    stories = list(playlist.stories.prefetch_related("audios", "texts"))
    if playlist.order:
        ordering = {sid: idx for idx, sid in enumerate(playlist.order)}
        stories.sort(key=lambda s: ordering.get(s.id, len(ordering)))
    context = {"playlist": playlist, "stories": stories}
    return render(request, "stories/playlist_play.html", context)
