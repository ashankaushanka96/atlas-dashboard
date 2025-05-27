from pydantic import BaseModel
from typing import List
from models.other_models import Tag
from models.other_models import Component
from pydantic import root_validator


class UpdateInstanceTagsRequest(BaseModel):
    region: str
    instance_id: str
    tags: List[Tag]
    schedule_enabled: str

class StartStopInstanceRequest(BaseModel):
    region: str
    instance_id: str
    action: str

class LoginRequest(BaseModel):
    username: str
    password: str

class ComponentList(BaseModel):
    components: List[Component]