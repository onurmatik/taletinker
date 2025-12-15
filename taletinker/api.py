from typing import List
import json
import base64
from io import BytesIO
from PIL import Image

from ninja import NinjaAPI
from pydantic import BaseModel, Field
import openai
import logging

from taletinker.stories.models import Story, Sentence


api = NinjaAPI()
logger = logging.getLogger(__name__)


"""
Endpoints:
- create follow up sentences(lang='en', kid_safe=False)
- add sentence
- suggest title
"""
