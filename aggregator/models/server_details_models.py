from typing import List, Optional

from pydantic import BaseModel, Field


class ServerDetailsPayload(BaseModel):
    ts: int
    region: str
    hostname: str
    fqdn: Optional[str] = None
    primary_ip: str
    all_ips: List[str] = Field(default_factory=list)
    os_name: Optional[str] = None
    os_version: Optional[str] = None
    os_release: Optional[str] = None
    kernel_version: Optional[str] = None
    kernel_release: Optional[str] = None
    architecture: Optional[str] = None
    platform: Optional[str] = None
    python_version: Optional[str] = None
    current_user: Optional[str] = None
    home_directory: Optional[str] = None
    watcher_directory: Optional[str] = None
    apps_directory: Optional[str] = None
    boot_time: Optional[int] = None
    cpu_count_logical: Optional[int] = None
    cpu_count_physical: Optional[int] = None
    total_memory_mb: Optional[int] = None
    watcher_version: Optional[str] = None
    crons: List[str] = Field(default_factory=list)

    class Config:
        extra = "ignore"
