from typing import List, Dict, Optional
from datetime import datetime
from pydantic import BaseModel

class Tag(BaseModel):
    key: str
    value: str

class UpdateInstanceTagsRequest(BaseModel):
    region: str
    instance_id: str
    tags: List[Tag]
    schedule_enabled: str

class Schedule(BaseModel):
    instance_id: str
    region: str
    private_ip: str
    instance_name: str
    action: Optional[str] = None
    schedule_enabled: bool
    scheduled_time: datetime

class InstanceSchedule(BaseModel):
    """One start_time*/stop_time* tag on an instance.

    Unlike Schedule (which reflects the EventBridge rules the scheduler lambda
    creates for today only), this is the full recurring schedule as configured
    on the instance, so a Mon-start/Fri-stop pair is still visible mid-week.
    """
    instance_id: str
    region: str
    private_ip: str
    instance_name: str
    action: Optional[str] = None
    schedule_enabled: bool
    tag_key: str
    cron_expression: str
    days: str
    # Next occurrence of the cron, or None when the expression won't parse.
    scheduled_time: Optional[datetime] = None

class InstanceIPInfo(BaseModel):
    instance_id: str
    private_ip: str

class RegionIPs(BaseModel):
    region: str
    ips: List[InstanceIPInfo]

class FetchSchedulesResponse(BaseModel):
    status_code: int
    schedules: List[Schedule]

class FetchInstanceSchedulesResponse(BaseModel):
    status_code: int
    schedules: List[InstanceSchedule]

class FetchAvailableAWSRegionsResponse(BaseModel):
    status_code: int
    regions: list

class FetchAWSIPsResponse(BaseModel):
    status_code: int
    ips: Dict[str, List[InstanceIPInfo]]

class FetchExistingInstanceTagsResponse(BaseModel):
    status_code: int
    tags: List[Tag]  
    schedule_enabled: str 

class UpdateInstanceTagsResponse(BaseModel):
    status_code: int
    message: str

class RunLambdaResponse(BaseModel):
    status_code: int
    message: str