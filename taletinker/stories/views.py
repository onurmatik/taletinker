from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect, render

from .forms import StoryCreationForm
from .models import Story


@login_required
def create_story(request):
    if request.method == "POST":
        form = StoryCreationForm(request.POST)
        if form.is_valid():
            Story.objects.create(
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
            return redirect("create_story")
    else:
        form = StoryCreationForm()
    return render(request, "stories/create_story.html", {"form": form})
