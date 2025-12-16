from typing import List, Optional
from django.shortcuts import get_object_or_404
from ninja import Router, Schema
from ninja.errors import HttpError
from django.db import transaction

from taletinker.stories.models import Story, Line

router = Router()

class StorySchema(Schema):
    id: int
    uuid: str
    title: str
    preview: str | None = None
    lines: List[str]
    created_at: str
    length: int
    author_name: str | None = None

class StoryCreateSchema(Schema):
    title: str
    lines: List[str]
    is_kid_safe: bool = False # Not used in model yet but good for API contract

class StoryResponse(Schema):
    id: str # UUID
    title: str
    success: bool

@router.get("/", response=List[StorySchema])
def list_stories(request):
    stories = Story.objects.all().select_related('end', 'author').order_by('-created_at')
    
    # Minimal serialization for list view
    results = []
    for s in stories:
        # Get first line for preview? 
        # Since it's a backward linked list, getting the FIRST line is hard without traversing.
        # But we can just use the title or maybe the end line text as preview for now?
        # Or traverse fully?
        # For performance, maybe just use end line.
        
        # let's try to get full lines for now, optimize later if slow
        lines = []
        curr = s.end
        count = 0 
        while curr and count < 5: # Just peek last few lines for preview?
             # actually backwards traversal gives us the END of the story.
             # The "preview" usually implies the START.
             # Linked list makes this inefficient.
             # We'll just return empty lines for list view or just the end line text?
             curr = curr.previous
        
        # Proper way:
        # We really should have a 'preview' field or 'start' field on Story for efficiency.
        # For now, let's just return the END line text as preview.
        preview = s.end.text if s.end else ""
        
        results.append({
            "id": s.id,
            "uuid": str(s.uuid),
            "title": s.title,
            "preview": preview,
            "lines": [], # Don't send all lines in list view
            "created_at": s.created_at.isoformat() if s.created_at else "",
            "length": 0, # TODO: store length on Story model
            "author_name": s.author.email if s.author else "Anonymous"
        })
    return results

@router.get("/{story_id}", response=StorySchema)
def get_story(request, story_id: str):
    # Support UUID or ID? Frontend likely uses UUID strings?
    # Model has integer ID and UUID field.
    # Frontend mocks used string IDs (UUIDs).
    try:
        story = Story.objects.get(uuid=story_id)
    except Story.DoesNotExist:
        # Try integer ID fallback?
        try:
             story = Story.objects.get(id=story_id)
        except:
             raise HttpError(404, "Story not found")

    lines = []
    curr = story.end
    while curr:
        lines.insert(0, curr.text)
        curr = curr.previous

    return {
        "id": story.id,
        "uuid": str(story.uuid),
        "title": story.title,
        "preview": lines[0] if lines else "",
        "lines": lines,
        "created_at": story.created_at.isoformat() if story.created_at else "",
        "length": len(lines),
        "author_name": story.author.email if story.author else "Anonymous"
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
            # If created, 'author' is set to current user.
            # If retrieved, 'author' remains the original author.
            
            prev_line = line
            
        # 3. Create Story pointer
        story = Story.objects.create(
            title=data.title,
            end=prev_line,
            author=author,
        )
        
    return {
        "id": str(story.uuid),
        "title": story.title,
        "success": True
    }

@router.delete("/{story_id}")
def delete_story(request, story_id: str):
    if not request.user.is_authenticated:
        raise HttpError(401, "Authentication required")

    try:
        story = Story.objects.get(uuid=story_id)
    except Story.DoesNotExist:
        raise HttpError(404, "Story not found")
        
    if story.author != request.user:
        raise HttpError(403, "You can only delete your own stories")
        
    story.delete()
    return {"success": True}
