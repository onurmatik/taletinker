from typing import List
import json
import base64
from io import BytesIO
from PIL import Image

from ninja import NinjaAPI
from pydantic import BaseModel, Field
import openai
import logging

from django.shortcuts import get_object_or_404
from django.core.files.base import ContentFile
from django.db import IntegrityError

from taletinker.stories.models import Story, StoryImage, StoryAudio, StoryText


api = NinjaAPI()
logger = logging.getLogger(__name__)


class StoryParams(BaseModel):
    realism: int = Field(50, ge=0, le=100)
    didactic: int = Field(50, ge=0, le=100)
    age: int = Field(5, ge=3, le=10)
    themes: List[str] = Field(default_factory=list)
    story_length: int = Field(1, ge=1, le=5)
    extra_instructions: str = ""
    language: str = "en"


def build_prompt(params: StoryParams) -> str:
    parts = [
        f"Write a {params.story_length}-minute children's story suitable for a {params.age}-year-old child.",
        f"Balance realism vs fantasy at {params.realism}/5.",
        f"Balance didactic vs fun at {params.didactic}/5.",
        f"Respond in language {params.language.upper()}",
    ]
    if params.themes:
        parts.append("Themes: " + ", ".join(params.themes) + ".")
    if params.extra_instructions:
        parts.append("Topic: " + params.extra_instructions)
    parts.append("Return the result strictly as JSON with keys 'title' and 'text'.")
    return "\n".join(parts)


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
        logger.exception("OpenAI API error")
        return api.create_response(request, {"detail": str(exc)}, status=503)
    except Exception as exc:  # noqa: PIE786
        logger.exception("Unexpected error")
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


THUMB_MAX_SIZE = (256, 256)

@api.post("/create_image")
def create_image(request, payload: ImagePayload):
    if not request.user.is_authenticated:
        return api.create_response(request, {"detail": "unauthorized"}, status=401)

    story = get_object_or_404(Story, pk=payload.story_id)
    prompt = "cover image for a children's story"
    if story.texts.exists():
        prompt += f" called {story.texts.first().title}"

    client = openai.OpenAI()
    try:
        # 1) generate the cover once
        result = client.images.generate(
            # model="dall-e-3",
            # style="vivid",
            # quality="standard",
            # size="1792x1024",
            prompt=prompt,
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
        logger.exception("OpenAI API error")
        return api.create_response(request, {"detail": str(exc)}, status=503)
    except Exception:                   # noqa: PIE786
        logger.exception("Unexpected error")
        return api.create_response(request, {"detail": "internal error"}, status=500)


class TranslationPayload(BaseModel):
    story_id: int
    language: str


@api.post("/translate")
def create_translation(request, payload: TranslationPayload):
    if not request.user.is_authenticated:
        return api.create_response(request, {"detail": "unauthorized"}, status=401)

    story = get_object_or_404(Story, pk=payload.story_id)

    existing = story.texts.filter(language=payload.language).first()
    if existing:
        return {
            "text_id": existing.id,
            "title": existing.title,
            "text": existing.text,
        }

    base_text = story.texts.first()
    if not base_text:
        return api.create_response(request, {"detail": "no story text"}, status=400)

    prompt = (
        f"Translate the following children's story to {payload.language}. "
        "Return the result strictly as JSON with keys 'title' and 'text'.\n"
        f"Title: {base_text.title}\nStory: {base_text.text}"
    )

    client = openai.OpenAI()
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
        )
        result = json.loads(response.choices[0].message.content)
        story_text = StoryText.objects.create(
            story=story,
            language=payload.language,
            title=result.get("title") or base_text.title,
            text=result.get("text") or base_text.text,
        )
        return {
            "text_id": story_text.id,
            "title": story_text.title,
            "text": story_text.text,
        }
    except openai.OpenAIError as exc:
        logger.exception("OpenAI API error")
        return api.create_response(request, {"detail": str(exc)}, status=503)
    except Exception:  # noqa: PIE786
        logger.exception("Unexpected error")
        return api.create_response(request, {"detail": "internal error"}, status=500)


class AudioPayload(BaseModel):
    story_id: int
    voice: str = "shimmer"
    language: str | None = None


@api.post("/create_audio")
def create_audio(request, payload: AudioPayload):
    if not request.user.is_authenticated:
        return api.create_response(request, {"detail": "unauthorized"}, status=401)

    story = get_object_or_404(Story, pk=payload.story_id)

    target_language = payload.language or (story.texts.first().language if story.texts.exists() else None)

    if not target_language:
        return api.create_response(request, {"detail": "no story text"}, status=400)

    if story.audios.filter(language=target_language).exists():
        return api.create_response(request, {"detail": "exists"}, status=400)

    text_obj = story.texts.filter(language=target_language).first()

    client = openai.OpenAI()

    if not text_obj and payload.language:
        base_text = story.texts.first()
        if not base_text:
            return api.create_response(request, {"detail": "no story text"}, status=400)
        prompt = (
            f"Translate the following children's story to {payload.language}. "
            "Return the result strictly as JSON with keys 'title' and 'text'.\n"
            f"Title: {base_text.title}\nStory: {base_text.text}"
        )
        try:
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
            )
            result = json.loads(response.choices[0].message.content)
            try:
                text_obj = StoryText.objects.create(
                    story=story,
                    language=payload.language,
                    title=result.get("title") or base_text.title,
                    text=result.get("text") or base_text.text,
                )
            except IntegrityError:
                text_obj = StoryText.objects.filter(
                    story=story, language=payload.language
                ).first()
        except openai.OpenAIError as exc:
            logger.exception("OpenAI API error")
            return api.create_response(request, {"detail": str(exc)}, status=503)
        except Exception:  # noqa: PIE786
            logger.exception("Unexpected error")
            return api.create_response(request, {"detail": "internal error"}, status=500)

    if not text_obj:
        return api.create_response(request, {"detail": "no story text"}, status=400)

    try:
        with client.audio.speech.with_streaming_response.create(
            # model="gpt-4o-mini-tts",
            model="tts-1",
            # model="tts-1-hd",
            # instructions=instructions,
            # speed=.8,
            voice=payload.voice,
            input=f"{text_obj.title}\n...\n{text_obj.text}",
        ) as response:
            audio_data = b"".join(response.iter_bytes())

        story_audio = StoryAudio(story=story, language=target_language)
        filename = f"speech{story.pk}_{target_language}.mp3"
        story_audio.mp3.save(filename, ContentFile(audio_data))
        return {"audio_id": story_audio.id, "file": story_audio.mp3.name}
    except openai.OpenAIError as exc:
        logger.exception("OpenAI API error")
        return api.create_response(request, {"detail": str(exc)}, status=503)
    except Exception:  # noqa: PIE786
        logger.exception("Unexpected error")
        return api.create_response(request, {"detail": "internal error"}, status=500)
