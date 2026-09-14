from typing import List, Optional
from pydantic import BaseModel

class RecordModel(BaseModel):
    dns_name: str
    alias_target: str
    location: str
    health_check_id: Optional[str] = None
    health_status: str

class ZoneModel(BaseModel):
    hosted_zone: str
    main_url: str
    primary: Optional[RecordModel] = None
    secondary: Optional[RecordModel] = None
    active_target: Optional[str] = None
    active_alias_target: Optional[str] = None
    active_location: Optional[str] = None
    routing_reason: Optional[str] = None
    error: Optional[str] = None

class FetchRoute53Response(BaseModel):
    status_code: int
    route53_details: List[ZoneModel]

class FetchSingleZoneResponse(BaseModel):
    status_code: int
    zone_detail: ZoneModel
