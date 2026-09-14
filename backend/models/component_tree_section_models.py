from pydantic import BaseModel
from typing import List, Dict

class Edge(BaseModel):
    component: str
    local_port: int
    remote_port: int

class ComponentMap(BaseModel):
    upstream: List[Edge]
    downstream: List[Edge]
    # "component" for a watched component, "unknown" for a peer we only ever
    # see from the other end of a socket (no watcher, so no name).
    kind: str = "component"

class MapResponse(BaseModel):
    components: Dict[str, ComponentMap]

class UnconfiguredComponent(BaseModel):
    key: str          # "{server_ip}:{component}"
    ip: str
    component: str

class UnconfiguredResponse(BaseModel):
    components: List[UnconfiguredComponent]