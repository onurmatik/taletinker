from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404, redirect, render
from django.conf import settings
from django.db.models import Count
from django.core.paginator import Paginator

from .forms import StoryCreationForm, StoryFilterForm
from .models import Story, StoryText, Playlist


def _filtered_stories(request):
    """Return stories and bound filter form applying GET parameters."""

    stories = Story.objects.filter(is_published=True).prefetch_related(
        "texts", "author", "images"
    )

    filter_param = request.GET.get("filter")
    if filter_param == "mine" and request.user.is_authenticated:
        stories = stories.filter(author=request.user)
    elif filter_param == "favorites" and request.user.is_authenticated:
        stories = stories.filter(liked_by=request.user)

    form = StoryFilterForm(request.GET)
    if form.is_valid():
        age = form.cleaned_data.get("age")
        theme = form.cleaned_data.get("theme")
        language = form.cleaned_data.get("language")
        sort = form.cleaned_data.get("sort") or "newest"

        if age:
            stories = stories.filter(parameters__age=int(age))
        if language:
            stories = stories.filter(texts__language=language)

        stories = stories.annotate(num_likes=Count("liked_by"))
        stories = stories.order_by("-created_at")

        stories = list(stories)

        if theme:
            stories = [s for s in stories if theme in s.parameters.get("themes", [])]

        if sort == "popular":
            stories.sort(key=lambda s: (-s.num_likes, -s.created_at.timestamp()))
    else:
        stories = list(stories.order_by("-created_at").annotate(num_likes=Count("liked_by")))

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
                    "purposes": form.cleaned_data["purposes"],
                    "story_length": form.cleaned_data["story_length"],
                },
                prompt=form.cleaned_data["extra_instructions"],
                original_language=form.cleaned_data["language"],
            )
            text = request.POST.get("story_text")
            title = request.POST.get("story_title")
            if text:
                StoryText.objects.create(
                    story=story,
                    language=form.cleaned_data["language"],
                    title=title or (text.splitlines()[0][:255] if text.strip() else "Story"),
                    text=text,
                )
            return redirect("story_detail", story_id=story.id)
    else:
        form = StoryCreationForm()
    return render(request, "stories/create_story.html", {"form": form})


def story_detail(request, story_id: int):
    story = get_object_or_404(Story, pk=story_id)

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
    return redirect("story_list")


@login_required
def add_filtered_to_playlist(request):
    stories, _ = _filtered_stories(request)
    playlist, _ = Playlist.objects.get_or_create(user=request.user)
    playlist.stories.add(*stories)
    return redirect("story_list")


@login_required
def remove_from_playlist(request, story_id: int):
    playlist, _ = Playlist.objects.get_or_create(user=request.user)
    story = get_object_or_404(Story, pk=story_id)
    playlist.stories.remove(story)
    return redirect("story_list")


@login_required
def play_playlist(request):
    playlist, _ = Playlist.objects.get_or_create(user=request.user)
    stories = playlist.stories.prefetch_related("audios", "texts")
    context = {"playlist": playlist, "stories": stories}
    return render(request, "stories/playlist_play.html", context)
