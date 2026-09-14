from typing import Any, List, Optional
from datetime import datetime
from pydantic import BaseModel

class Component(BaseModel):
    region: str
    ip: str
    component_name: str
    platform: str
    comp_path: str
    comp_version: Optional[str] = None
    pipeline: Optional[str] = None
    last_run_time: Optional[datetime] = None
    last_update_time: Optional[datetime] = None
    previous_tag: Optional[str] = None
    release_date: Optional[datetime] = None
    code_repo_url: Optional[str] = None
    config_repo_url: Optional[str] = None
    script_repo_url: Optional[str] = None
    description: Optional[str] = None
    watcher: Optional[str] = None
    config_meta: Optional[Any] = None
    category: Optional[str] = None


class ComponentSummary(BaseModel):
    region: str
    ip: str
    component_name: str
    platform: str
    comp_path: str
    comp_version: Optional[str] = None
    pipeline: Optional[str] = None
    watcher: Optional[str] = None
    release_date: Optional[datetime] = None
    code_repo_url: Optional[str] = None
    category: Optional[str] = None
    config_meta: Optional[Any] = None
    asset_custodian: Optional[str] = None

class ComponentList(BaseModel):
    components: List[Component]

class FetchAllRegionsResponse(BaseModel):
    status_code: int
    regions: List[str]


class FetchPlatformsResponse(BaseModel):
    status_code: int
    platforms: List[str]


class FetchComponentsResponse(BaseModel):
    status_code: int
    components: List[ComponentSummary]


class FetchComponentDetailResponse(BaseModel):
    status_code: int
    component: Component


class AddComponentResponse(BaseModel):
    status_code: int
    message: str

class DeleteComponentResponse(BaseModel):
    status_code: int
    message: str

class SyncComponentsResponse(BaseModel):
    status_code: int
    message: str
    added: int
    updated: int
    deleted: int
