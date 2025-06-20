from typing import List
import json

from django.shortcuts import get_object_or_404
from ninja import NinjaAPI
from pydantic import BaseModel, Field
import openai

from taletinker.stories.models import Story, StoryImage, StoryAudio
from django.core.files.base import ContentFile
import base64


api = NinjaAPI()


class StoryParams(BaseModel):
    realism: int = Field(50, ge=0, le=100)
    didactic: int = Field(50, ge=0, le=100)
    age: int = Field(5, ge=3, le=10)
    themes: List[str] = Field(default_factory=list)
    purposes: List[str] = Field(default_factory=list)
    characters: str = ""
    story_length: str = "short"
    extra_instructions: str = ""
    language: str = "en"


def build_prompt(params: StoryParams) -> str:
    parts = [
        f"Write a {params.story_length} children's story suitable for a {params.age}-year-old child.",
        f"Balance realism vs fantasy at {params.realism}/100.",
        f"Balance didactic vs fun at {params.didactic}/100.",
    ]
    if params.themes:
        parts.append("Themes: " + ", ".join(params.themes) + ".")
    if params.purposes:
        parts.append("Purpose: " + ", ".join(params.purposes) + ".")
    if params.characters:
        parts.append("Characters: " + params.characters + ".")
    if params.extra_instructions:
        parts.append(params.extra_instructions)
    parts.append("Return the result strictly as JSON with keys 'title' and 'text'.")
    return " ".join(parts)


@api.post("/create")
def create_story(request, params: StoryParams):
    prompt = build_prompt(params)
    client = openai.OpenAI()
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
        )
        result = json.loads(response.choices[0].message.content)
        return {"title": result.get("title"), "text": result.get("text")}
    except openai.OpenAIError as exc:
        api.logger.exception("OpenAI API error")
        return api.create_response(request, {"detail": str(exc)}, status=503)
    except Exception as exc:  # noqa: PIE786
        api.logger.exception("Unexpected error")
        return api.create_response(request, {"detail": "internal error"}, status=500)


class LikePayload(BaseModel):
    story_id: int


@api.post("/like")
def like_story(request, payload: LikePayload):
    if not request.user.is_authenticated:
        return api.create_response(request, {"detail": "unauthorized"}, status=401)

    story = get_object_or_404(Story, pk=payload.story_id)

    if story.liked_by.filter(pk=request.user.pk).exists():
        story.liked_by.remove(request.user)
        liked = False
    else:
        story.liked_by.add(request.user)
        liked = True

    return {"liked": liked, "likes": story.liked_by.count()}


class ImagePayload(BaseModel):
    story_id: int


from io import BytesIO

from PIL import Image
from django.core.files.base import ContentFile
from django.shortcuts import get_object_or_404
import base64
import openai

THUMB_MAX_SIZE = (256, 256)          # tweak as you like

@api.post("/create_image")
def create_image(request, payload: ImagePayload):
    if not request.user.is_authenticated:
        return api.create_response(request, {"detail": "unauthorized"}, status=401)

    story = get_object_or_404(Story, pk=payload.story_id)
    prompt = story.texts.first().title if story.texts.exists() else "children's story cover"

    client = openai.OpenAI()
    try:
        # 1) generate the cover once
        result = client.images.generate(
            prompt=prompt,
            n=1,
            size="1024x1024",
            response_format="b64_json",
        )
        b64 = result.data[0].b64_json
        image_data = base64.b64decode(b64)

        # 2) save the full-size cover
        story_image = StoryImage(story=story)
        story_image.image.save(f"cover_{story.pk}.png", ContentFile(image_data))

        # 3) build and save the thumbnail locally
        with Image.open(BytesIO(image_data)) as im:
            im.thumbnail(THUMB_MAX_SIZE, Image.LANCZOS)
            thumb_io = BytesIO()
            im.save(thumb_io, format="PNG")
            story_image.thumbnail.save(f"thumb_{story.pk}.png", ContentFile(thumb_io.getvalue()))

        return {"image_id": story_image.id}

    except openai.OpenAIError as exc:
        api.logger.exception("OpenAI API error")
        return api.create_response(request, {"detail": str(exc)}, status=503)
    except Exception:                   # noqa: PIE786
        api.logger.exception("Unexpected error")
        return api.create_response(request, {"detail": "internal error"}, status=500)


class AudioPayload(BaseModel):
    story_id: int
    voice: str = "alloy"


@api.post("/create_audio")
def create_audio(request, payload: AudioPayload):
    if not request.user.is_authenticated:
        return api.create_response(request, {"detail": "unauthorized"}, status=401)

    story = get_object_or_404(Story, pk=payload.story_id)

    text_obj = story.texts.first()
    if not text_obj:
        return api.create_response(request, {"detail": "no story text"}, status=400)

    client = openai.OpenAI()
    try:
        with client.audio.speech.with_streaming_response.create(
            model="gpt-4o-mini-tts",
            voice=payload.voice,
            input=text_obj.text,
        ) as response:
            audio_data = b"".join(response.iter_bytes())

        story_audio = StoryAudio(story=story, language=text_obj.language)
        story_audio.mp3.save(f"speech{story.pk}.mp3", ContentFile(audio_data))
        return {"audio_id": story_audio.id}
    except openai.OpenAIError as exc:
        api.logger.exception("OpenAI API error")
        return api.create_response(request, {"detail": str(exc)}, status=503)
    except Exception:  # noqa: PIE786
        api.logger.exception("Unexpected error")
        return api.create_response(request, {"detail": "internal error"}, status=500)
