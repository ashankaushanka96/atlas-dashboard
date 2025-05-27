from datetime import datetime
from pydantic import BaseModel
from typing import List, Optional, Dict, Any


###############################################################################################
#                                  COMPONENTS SECTION MODELS                                  #
###############################################################################################
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


###############################################################################################
#                                  SCHEDULER SECTION MODELS                                   #
###############################################################################################
class Schedule(BaseModel):
    instance_id: str
    region: str
    private_ip: str
    instance_name: str
    action: Optional[str] = None
    schedule_enabled: bool
    scheduled_time: datetime


class InstanceIPInfo(BaseModel):
    instance_id: str
    private_ip: str

class RegionIPs(BaseModel):
    region: str
    ips: List[InstanceIPInfo]


class Tag(BaseModel):
    key: str
    value: str

###############################################################################################
#                                  EC2 DETAILS SECTION MODELS                                 #
###############################################################################################
class InstanceSummary(BaseModel):
    region: str
    instance_name: Optional[str]
    instance_type: Optional[str]
    instance_id: str
    private_ip: Optional[str]
    instance_status: Optional[str]

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

###############################################################################################
#                              SERVER START/STOP SECTION MODELS                               #
###############################################################################################
class InstanceInfo(BaseModel):
    region: str
    instance_id: str
    instance_name: Optional[str]
    private_ip: Optional[str]
    instance_status: Optional[str]

###############################################################################################
#                              ROUTE53 SECTION MODELS                                         #
###############################################################################################
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
    error: Optional[str] = None











