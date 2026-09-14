from typing import List, Dict, Optional, Union
from pydantic import BaseModel

class Connection(BaseModel):
    local_ip: str
    local_port: int
    remote_ip: str
    remote_port: int

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

class ComponentDetailsPayload(BaseModel):
    server_ip: str
    region: str
    component: str
    pid: int
    ts: int
    listen_port: int
    connections: List[Connection]
    state: Optional[str] = None
    needs_to_run: Optional[bool] = None
    port_status: Optional[str] = None
    uptime_seconds: Optional[int] = None
    config_meta: Optional[ConfigMeta] = None

class Edge(BaseModel):
    component: str
    local_port: int
    remote_port: int

class ComponentMap(BaseModel):
    upstream: List[Edge]
    downstream: List[Edge]

class MapResponse(BaseModel):
    components: Dict[str, ComponentMap]

class UnconfiguredComponent(BaseModel):
    key: str
    ip: str
    component: str

class UnconfiguredResponse(BaseModel):
    components: List[UnconfiguredComponent]
