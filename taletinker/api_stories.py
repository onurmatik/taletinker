from typing import List
from ninja import Router, Schema
from ninja.errors import HttpError
from django.db import transaction
from django.conf import settings
from pydantic import BaseModel
import openai
import os

from taletinker.stories.models import Story, Line

router = Router()

_ALLOWED_REASONING_EFFORTS = {"minimal", "low", "medium", "high", "none"}


def _openai_reasoning_params():
    effort = settings.AI_REASONING_EFFORT
    if effort in _ALLOWED_REASONING_EFFORTS:
        return {"reasoning": {"effort": settings.AI_REASONING_EFFORT}}
    return {}

def mask_email(value: str) -> str:
    if "@" not in value:
        return value
    local, domain = value.split("@", 1)
    domain_parts = domain.split(".")
    domain_label = domain_parts[0] if domain_parts else ""
    domain_tail = ".".join(domain_parts[1:]) if len(domain_parts) > 1 else ""

    def mask_component(component: str) -> str:
        if not component:
            return component
        if len(component) <= 2:
            return component[0] + "*" * (len(component) - 1)
        if len(component) <= 4:
            return component[:2] + "*" * (len(component) - 2)
        if len(component) <= 6:
            return component[:3] + "*" * (len(component) - 3)
        return component[:3] + "*" * (len(component) - 5) + component[-2:]

    masked_local = mask_component(local)
    masked_domain = mask_component(domain_label)
    if domain_tail:
        return f"{masked_local}@{masked_domain}.{domain_tail}"
    return f"{masked_local}@{masked_domain}"

def get_author_display_name(user) -> str:
    if not user:
        return "Anonymous"
    display_name = (getattr(user, "first_name", "") or "").strip()
    if display_name:
        return display_name
    email = (getattr(user, "email", "") or "").strip()
    username = (getattr(user, "username", "") or "").strip()
    if email:
        return mask_email(email)
    if username:
        return mask_email(username)
    return "Anonymous"


class LineSchema(Schema):
    id: str # UUID
    text: str
    is_manual: bool
    like_count: int = 0
    is_liked: bool = False

class StorySchema(Schema):
    id: int
    uuid: str
    title: str | None
    tagline: str | None = None
    preview: str | None = None
    lines: List[LineSchema]
    created_at: str
    length: int
    author_name: str | None = None
    like_count: int = 0
    like_count: int = 0
    is_liked: bool = False
    root_node_id: str | None = None

class StoryCreateSchema(Schema):
    title: str | None = None
    tagline: str | None = None
    lines: List[str]

class StoryResponse(Schema):
    id: str # UUID
    title: str | None
    tagline: str | None = None
    success: bool

class LikeResponse(Schema):
    success: bool
    like_count: int
    is_liked: bool

@router.get("/", response=List[StorySchema])
def list_stories(request):
    # Optimize query with annotations for likes
    # author is likely on last_line, so we traverse last_line__author
    stories = Story.objects.all().select_related('last_line__author').order_by('-created_at')
    
    results = []
    
    for s in stories:
        is_liked = False
        if request.user.is_authenticated:
            is_liked = s.liked_by.filter(id=request.user.id).exists()
        
        like_count = s.liked_by.count()

        # Preview from tagline (library/landing view)
        preview = s.tagline or ""
        
        # Safe author access
        author_name = get_author_display_name(s.last_line.author if s.last_line else None)
        
        # Find root node for tree grouping
        # Build lines and find root
        curr = s.last_line
        story_lines = []
        
        temp = curr
        depth = 0
        while temp and depth < 100:
             story_lines.insert(0, {
                 "id": str(temp.uuid),
                 "text": temp.text,
                 "is_manual": temp.is_manual,
                 "like_count": 0, # Optimization: skip line likes in list view
                 "is_liked": False
             })
             temp = temp.previous
             depth += 1
        
        root_id = story_lines[0]['id'] if story_lines else None

        results.append({
            "id": s.id,
            "uuid": str(s.uuid),
            "title": s.title,
            "tagline": s.tagline,
            "preview": preview,
            "lines": story_lines, 
            "created_at": s.created_at.isoformat() if s.created_at else "",
            "length": len(story_lines), 
            "author_name": author_name,
            "like_count": like_count,
            "is_liked": is_liked,
            "root_node_id": root_id
        })
    return results


class SuggestSchema(Schema):
    context: List[str]

class LineCheckSchema(Schema):
    line: str
    context: List[str] | None = None

class LineCheckResponse(Schema):
    is_valid: bool
    line: str | None = None
    reason: str | None = None

class StoryMetaResponse(Schema):
    title: str | None
    tagline: str | None

class StoryConfigResponse(Schema):
    min_story_lines: int
    anon_signin_line: int

class StoryMetaUpdateSchema(Schema):
    title: str | None = None
    tagline: str | None = None

class StoryOptions(BaseModel):
    options: List[str]

class LineCheckOptions(BaseModel):
    is_valid: bool
    line: str
    reason: str

class StoryMetaOptions(BaseModel):
    title: str
    tagline: str

@router.post("/suggest", response=List[str])
def suggest_lines(request, data: SuggestSchema):
    if not data.context:
         # Initial prompts if context is empty
         return [
             "Once upon a time, in a magical forest...", 
             "The little robot woke up with a beep..."
         ]

    prompt = (
        "Continue the following children's story with 2 distinct, single-sentence options for what happens next.\\n"
        "Return the options as a structured list.\\n\\nStory:\\n"
    ) + "\\n".join(data.context)
    
    if not os.getenv("OPENAI_API_KEY"):
        raise HttpError(500, "OPENAI_API_KEY not configured")
    
    client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    response = client.responses.parse(
        model=settings.AI_DEFAULT_MODEL,
        input=[{
            "role": "system",
            "content": "You are a helpful assistant for writing children's stories. "
                       "You provide engaging continuations."
        }, {
            "role": "user", "content": prompt
        }],
        text_format=StoryOptions,
        **_openai_reasoning_params(),
    )
    
    event = response.output_parsed
    options = [option.strip() for option in (event.options or []) if option and option.strip()]

    if len(options) < 2:
        options.extend(["Something unexpected happened."] * (2 - len(options)))

    return options[:2]


@router.post("/check-line", response=LineCheckResponse)
def check_line(request, data: LineCheckSchema):
    line = (data.line or "").strip()
    if not line:
        return {
            "is_valid": False,
            "line": None,
            "reason": "Please enter a sentence."
        }
    min_chars = settings.STORY_LINE_MIN_CHARS
    min_words = settings.STORY_LINE_MIN_WORDS
    word_count = len(line.split())
    alpha_count = sum(1 for char in line if char.isalpha())

    if len(line) < min_chars:
        return {
            "is_valid": False,
            "line": None,
            "reason": f"Please write at least {min_chars} characters."
        }
    if word_count < min_words:
        return {
            "is_valid": False,
            "line": None,
            "reason": f"Please use at least {min_words} words."
        }
    if alpha_count < 3:
        return {
            "is_valid": False,
            "line": None,
            "reason": "Please include some letters."
        }

    prompt = (
        "You review a single proposed sentence for a children's story.\n"
        "If it is meaningful and appropriate, return is_valid=true and the sentence with only minor typo fixes.\n"
        "If it is nonsense or inappropriate, return is_valid=false and a short reason.\n"
        "Do not add new information beyond minor fixes.\n\n"
    )

    context = data.context or []
    if context:
        prompt += "Story so far:\n" + "\n".join(context) + "\n\n"

    prompt += f"Proposed line:\n{line}"

    if not os.getenv("OPENAI_API_KEY"):
        raise HttpError(500, "OPENAI_API_KEY not configured")

    client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    response = client.responses.parse(
        model=settings.AI_DEFAULT_MODEL,
        input=[{
            "role": "system",
            "content": "You validate and lightly correct short story sentences."
        }, {
            "role": "user", "content": prompt
        }],
        text_format=LineCheckOptions,
        **_openai_reasoning_params(),
    )

    event = response.output_parsed
    cleaned_line = (event.line or "").strip()

    if not event.is_valid or not cleaned_line:
        return {
            "is_valid": False,
            "line": None,
            "reason": (event.reason or "Please enter a clearer sentence.").strip()
        }

    return {
        "is_valid": True,
        "line": cleaned_line,
        "reason": None
    }


@router.post("/suggest-meta", response=StoryMetaResponse)
def suggest_story_meta(request, data: SuggestSchema):
    if not data.context:
        return {
            "title": "Untitled Story",
            "tagline": "A tale waiting to be told."
        }

    prompt = (
        "Generate a short title (max 8 words) and a short tagline (max 12 words) "
        "for the following children's story. Return both in a structured format.\n\nStory:\n"
    ) + "\n".join(data.context)

    if not os.getenv("OPENAI_API_KEY"):
        raise HttpError(500, "OPENAI_API_KEY not configured")

    client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    response = client.responses.parse(
        model=settings.AI_DEFAULT_MODEL,
        input=[{
            "role": "system",
            "content": "You suggest catchy, kid-friendly story titles and taglines."
        }, {
            "role": "user", "content": prompt
        }],
        text_format=StoryMetaOptions,
        **_openai_reasoning_params(),
    )

    event = response.output_parsed

    return {
        "title": event.title.strip() if event.title else "Untitled Story",
        "tagline": event.tagline.strip() if event.tagline else "A tale waiting to be told."
    }


@router.get("/config", response=StoryConfigResponse)
def story_config(request):
    return {
        "min_story_lines": settings.STORY_MIN_LINES,
        "anon_signin_line": settings.STORY_ANON_SIGNIN_LINE
    }


@router.get("/{story_id}", response=StorySchema)
def get_story(request, story_id: str):
    try:
        story = Story.objects.get(uuid=story_id)
    except Story.DoesNotExist:
        try:
            story = Story.objects.get(id=story_id)
        except:
             raise HttpError(404, "Story not found")

    # Build lines list (linked list traversal)
    lines_data = []
    curr = story.last_line
    while curr:
        # Check likes for each line
        l_is_liked = False
        if request.user.is_authenticated:
            l_is_liked = curr.liked_by.filter(id=request.user.id).exists()
            
        lines_data.insert(0, {
            "id": str(curr.uuid),
            "text": curr.text,
            "is_manual": curr.is_manual,
            "like_count": curr.liked_by.count(),
            "is_liked": l_is_liked
        })
        curr = curr.previous

    is_liked = False
    if request.user.is_authenticated:
        is_liked = story.liked_by.filter(id=request.user.id).exists()

    author_name = get_author_display_name(story.last_line.author if story.last_line else None)

    return {
        "id": story.id,
        "uuid": str(story.uuid),
        "title": story.title,
        "tagline": story.tagline,
        "preview": story.tagline or "",
        "lines": lines_data,
        "created_at": story.created_at.isoformat() if story.created_at else "",
        "length": len(lines_data),
        "author_name": author_name,
        "like_count": story.liked_by.count(),
        "is_liked": is_liked,
        "root_node_id": lines_data[0]['id'] if lines_data else None
    }

@router.post("/", response=StoryResponse)
def create_story(request, data: StoryCreateSchema):
    if not data.lines:
         raise HttpError(400, "Story must have at least one line")
         
    author = request.user if request.user.is_authenticated else None

    with transaction.atomic():
        # 1. Reuse or Create Lines (Immutable Tree)
        prev_line = None
        for text in data.lines:
            # Check if this exact line node exists in the tree
            # (Same content AND same parent)
            line, created = Line.objects.get_or_create(
                text=text,
                previous=prev_line,
                defaults={
                    'author': author,
                    'is_manual': True
                }
            )
            prev_line = line
            
        # 3. Create Story pointer
        story = Story.objects.create(
            title=data.title,
            tagline=data.tagline,
            last_line=prev_line,
        )
        
    return {
        "id": str(story.uuid),
        "title": story.title,
        "tagline": story.tagline,
        "success": True
    }


@router.patch("/{story_id}", response=StoryMetaResponse)
def update_story_meta(request, story_id: str, data: StoryMetaUpdateSchema):
    try:
        story = Story.objects.get(uuid=story_id)
    except Story.DoesNotExist:
        try:
            story = Story.objects.get(id=story_id)
        except:
            raise HttpError(404, "Story not found")

    fields_set = getattr(data, "model_fields_set", data.__fields_set__)
    fields_to_update = []
    if "title" in fields_set:
        story.title = data.title
        fields_to_update.append("title")
    if "tagline" in fields_set:
        story.tagline = data.tagline
        fields_to_update.append("tagline")

    if fields_to_update:
        story.save(update_fields=fields_to_update)

    return {
        "title": story.title,
        "tagline": story.tagline
    }

@router.delete("/{story_id}")
def delete_story(request, story_id: str):
    if not request.user.is_authenticated:
        raise HttpError(401, "Authentication required")

    try:
        story = Story.objects.get(uuid=story_id)
    except Story.DoesNotExist:
        raise HttpError(404, "Story not found")
        
    # Check author via last_line
    story_author = story.last_line.author if story.last_line else None
    
    if story_author != request.user:
        raise HttpError(403, "You can only delete your own stories")
        
    story.delete()
    return {"success": True}

@router.post("/{story_id}/like", response=LikeResponse)
def like_story(request, story_id: str):
    if not request.user.is_authenticated:
        raise HttpError(401, "Authentication required")
        
    try:
        story = Story.objects.get(uuid=story_id)
    except Story.DoesNotExist:
        raise HttpError(404, "Story not found")
        
    if story.liked_by.filter(id=request.user.id).exists():
        story.liked_by.remove(request.user)
        is_liked = False
    else:
        story.liked_by.add(request.user)
        is_liked = True
        
    return {
        "success": True,
        "like_count": story.liked_by.count(),
        "is_liked": is_liked
    }

@router.post("/lines/{line_id}/like", response=LikeResponse)
def like_line(request, line_id: str):
    if not request.user.is_authenticated:
        raise HttpError(401, "Authentication required")
        
    try:
        # line_id is UUID string
        line = Line.objects.get(uuid=line_id)
    except Line.DoesNotExist:
        raise HttpError(404, "Line not found")
        
    if line.liked_by.filter(id=request.user.id).exists():
        line.liked_by.remove(request.user)
        is_liked = False
    else:
        line.liked_by.add(request.user)
        is_liked = True
        
    return {
        "success": True,
        "like_count": line.liked_by.count(),
        "is_liked": is_liked
    }
