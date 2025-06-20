from typing import List
import json

from ninja import NinjaAPI
from pydantic import BaseModel, Field
import openai


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
    parts.append(
        "Return the result strictly as JSON with keys 'title' and 'text'."
    )
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
