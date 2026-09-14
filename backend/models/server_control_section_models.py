from typing import List, Optional
from pydantic import BaseModel

class StartStopInstanceRequest(BaseModel):
    region: str
    instance_id: str
    action: str

class InstanceInfo(BaseModel):
    region: str
    instance_id: str
    instance_name: Optional[str]
    private_ip: Optional[str]
    instance_status: Optional[str]


class FetchStartStopInstancesResponse(BaseModel):
    status_code: int
    instances: List[InstanceInfo]

class StartStopInstanceResponse(BaseModel):
    status_code: int
    message: str