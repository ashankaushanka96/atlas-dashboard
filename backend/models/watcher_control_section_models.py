from typing import List, Optional

from pydantic import BaseModel, Field


class WatcherComponentEntry(BaseModel):
    """Mirrors one [section] in the watcher's config.ini."""

    section_id: str
    tag: Optional[str] = None
    name: Optional[str] = None
    port: Optional[int] = None
    startTime: Optional[str] = None
    endTime: Optional[str] = None
    runningDates: Optional[str] = None
    maxUpDays: Optional[str] = None
    needToUp: Optional[str] = None
    needToSendMail: Optional[str] = None
    runScriptPath: Optional[str] = None
    runScript: Optional[str] = None
    logDirectory: Optional[str] = None


class FetchWatcherComponentsResponse(BaseModel):
    status_code: int
    components: List[WatcherComponentEntry] = Field(default_factory=list)
    has_backup: bool = False


class WatcherActionRequest(BaseModel):
    region: str
    ip: str


class RollbackWatcherRequest(BaseModel):
    region: str
    ip: str
    restart: bool = True


class WatcherLifecycleResponse(BaseModel):
    status_code: int
    status: str
    running: bool
    message: str


class NewComponentEntry(BaseModel):
    section_id: str
    tag: str
    name: str
    port: Optional[int] = None
    startTime: str
    endTime: str
    runningDates: List[int] = Field(default_factory=list)
    maxUpDays: int = 1
    needToUp: bool = False
    needToSendMail: bool = False
    runScriptPath: str
    runScript: str
    logDirectory: Optional[str] = None


class ConfigureWatcherRequest(BaseModel):
    region: str
    ip: str
    add_components: List[NewComponentEntry] = Field(default_factory=list)
    remove_component_ids: List[str] = Field(default_factory=list)
    restart: bool = True


class ConfigureWatcherResponse(BaseModel):
    status_code: int
    added: List[str] = Field(default_factory=list)
    removed: List[str] = Field(default_factory=list)
    restarted: bool = False
    message: str


class RollbackWatcherResponse(BaseModel):
    status_code: int
    restored: List[str] = Field(default_factory=list)
    removed: List[str] = Field(default_factory=list)
    changed: List[str] = Field(default_factory=list)
    restarted: bool = False
    message: str


class ComponentActionRequest(BaseModel):
    region: str
    ip: str
    tag: str


class LogFileEntry(BaseModel):
    name: str
    size: int
    modified: float


class FetchComponentLogsResponse(BaseModel):
    status_code: int
    files: List[LogFileEntry] = Field(default_factory=list)


class ReadComponentLogResponse(BaseModel):
    status_code: int
    lines: List[str] = Field(default_factory=list)
    next_offset: Optional[int] = None
    total_size: Optional[int] = None
    eof: Optional[bool] = None
    scan_truncated: Optional[bool] = None
