from typing import List
import json
import base64
from io import BytesIO
from PIL import Image

from ninja import NinjaAPI
from pydantic import BaseModel, Field
import openai
import logging

from taletinker.stories.models import Story, Line



from .api_auth import router as auth_router
from .api_stories import router as stories_router

api = NinjaAPI()
logger = logging.getLogger(__name__)

api.add_router("/auth", auth_router)
api.add_router("/stories", stories_router)

"""
Endpoints:
- create follow up sentences(lang='en')
- add sentence
- suggest title
"""
