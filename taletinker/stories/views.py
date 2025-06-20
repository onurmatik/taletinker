from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404, redirect, render

from .forms import StoryCreationForm
from .models import Story, StoryText


def story_list(request):
    """Public homepage listing published stories with optional filters."""

    stories = (
        Story.objects.filter(is_published=True)
        .prefetch_related("texts", "author", "images")
        .order_by("-created_at")
    )

    filter_param = request.GET.get("filter")
    if filter_param == "mine" and request.user.is_authenticated:
        stories = stories.filter(author=request.user)
    elif filter_param == "favorites" and request.user.is_authenticated:
        stories = stories.filter(liked_by=request.user)

    return render(request, "stories/story_list.html", {"stories": stories})


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
                    "characters": form.cleaned_data["characters"],
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
    return render(request, "stories/story_detail.html", {"story": story})
