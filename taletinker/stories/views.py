from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect, render, get_object_or_404

from .forms import StoryCreationForm
from .models import Story, StoryText


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
            if text:
                StoryText.objects.create(
                    story=story,
                    language=form.cleaned_data["language"],
                    title=text.splitlines()[0][:255] if text.strip() else "Story",
                    text=text,
                )
            return redirect("story_detail", story_id=story.id)
    else:
        form = StoryCreationForm()
    return render(request, "stories/create_story.html", {"form": form})


def story_detail(request, story_id: int):
    story = get_object_or_404(Story, pk=story_id)
    return render(request, "stories/story_detail.html", {"story": story})
