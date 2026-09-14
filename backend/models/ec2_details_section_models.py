from typing import List, Optional, Dict, Any
from pydantic import BaseModel

class InstanceSummary(BaseModel):
    region: str
    instance_name: Optional[str]
    instance_type: Optional[str]
    instance_id: str
    private_ip: Optional[str]
    public_ip: Optional[str]
    instance_status: Optional[str]
    asset_custodian: Optional[str] = None

class AmiDetails(BaseModel):
    ami_id: Optional[str]
    ami_name: Optional[str]

class NetworkDetails(BaseModel):
    vpc_name: Optional[str]
    vpc_id: Optional[str]
    subnet_name: Optional[str]
    subnet_id: Optional[str]
    security_group_name: List[Optional[str]]
    security_group_id: List[Optional[str]]
    region: str
    availability_zone: Optional[str]
    private_ip: Optional[str]
    public_ip: Optional[str]
    public_ip_is_eip: bool = False
    eip_allocation_id: Optional[str] = None

class StatusChecks(BaseModel):
    system_status_check: Optional[str] = None
    instance_status_check: Optional[str] = None
    attached_ebs_status_checks: List[Optional[str]] = []

class InstanceDetails(BaseModel):
    instance_name: Optional[str]
    instance_type: Optional[str]
    instance_id: str
    instance_status: Optional[str]
    instance_profile: Optional[str]
    launch_time: Optional[str]
    status_checks: StatusChecks
    ami_details: AmiDetails
    network_details: NetworkDetails
    tags: Optional[List[Dict[str, str]]]
    storages: Optional[List[Dict[str, Any]]]

class FetchInstancesSummaryResponse(BaseModel):
    status_code: int
    instances: List[InstanceSummary]

class FetchInstanceDetailsResponse(BaseModel):
    status_code: int
    instance_details: InstanceDetails

class FetchComponentNamesResponse(BaseModel):
    status_code: int
    component_names: List[str]