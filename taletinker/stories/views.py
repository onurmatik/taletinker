from django.shortcuts import render

from .forms import StoryCreationForm


def create_story(request):
    form = StoryCreationForm()
    return render(request, "stories/create_story.html", {"form": form})
