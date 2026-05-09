from django.shortcuts import render


def app_view(request, story_id: str | None = None):
    return render(
        request,
        "frontend/app.html",
        {
            "initial_story_id": story_id or "",
        },
    )
