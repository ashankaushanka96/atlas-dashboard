from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

class ScheduleMeta(BaseModel):
    effective_day: str
    start_time: str
    end_time: str

class ConfigMeta(BaseModel):
    tag: Optional[str] = None
    port: Optional[int] = None
    schedules: Optional[List[ScheduleMeta]] = None
    max_up_days: Optional[int] = None
    need_to_up: Optional[bool] = None
    need_to_send_mail: Optional[bool] = None

class ComponentIn(BaseModel):
    comp_name: str
    platform: str
    path: str
    version: Optional[str] = None
    category: Optional[str] = None
    pipeline: Optional[bool] = False
    description: Optional[str] = None
    previous_tag: Optional[str] = None
    release_date: Optional[datetime] = None  
    code_repo_url: Optional[str] = None
    config_repo_url: Optional[str] = None
    script_repo_url: Optional[str] = None
    last_run_time: Optional[datetime] = None
    watcher: Optional[bool] = False
    config_meta: Optional[ConfigMeta] = None

class AddModifyPayload(BaseModel):
    ip: Optional[str] = None
    region: str
    components: List[ComponentIn]

    class Config:
        extra = "ignore"
