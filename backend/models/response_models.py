from datetime import datetime
from pydantic import BaseModel, Json
from typing import List, Optional, Dict, Any
from models.other_models import Component, Schedule, Tag, InstanceIPInfo, InstanceSummary, InstanceDetails, InstanceInfo, RegionIPs, ZoneModel, RecordModel
import json


###############################################################################################
#                                  COMPONENTS SECTION RESPONSES                               #
###############################################################################################
class FetchAllRegionsResponse(BaseModel):
    status_code: int
    regions: List[str]


class FetchPlatformsResponse(BaseModel):
    status_code: int
    platforms: List[str]


class FetchComponentsResponse(BaseModel):
    status_code: int
    components: List[Component]


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


###############################################################################################
#                                  SCHEDULER SECTION RESPONSES                                #
###############################################################################################
class FetchSchedulesResponse(BaseModel):
    status_code: int
    schedules: List[Schedule]


class FetchAvailableAWSRegionsResponse(BaseModel):
    status_code: int
    regions: list


class FetchAWSIPsResponse(BaseModel):
    status_code: int
    ips: Dict[str, List[InstanceIPInfo]]


class FetchExistingInstanceTagsResponse(BaseModel):
    status_code: int
    tags: List[Tag]  # List of tags (start/stop tags)
    schedule_enabled: str  # Value of schedule_enabled tag


class UpdateInstanceTagsResponse(BaseModel):
    status_code: int
    message: str

class RunLambdaResponse(BaseModel):
    status_code: int
    message: str


###############################################################################################
#                                  EC2 DETAILS SECTION RESPONSES                              #
###############################################################################################
class FetchInstancesSummaryResponse(BaseModel):
    status_code: int
    instances: List[InstanceSummary]

class FetchInstanceDetailsResponse(BaseModel):
    status_code: int
    instance_details: InstanceDetails

class FetchComponentNamesResponse(BaseModel):
    status_code: int
    component_names: List[str]

###############################################################################################
#                             SERVER START/STOP SECTION RESPONSES                             #
###############################################################################################
class FetchStartStopInstancesResponse(BaseModel):
    status_code: int
    instances: List[InstanceInfo]

class StartStopInstanceResponse(BaseModel):
    status_code: int
    message: str
###############################################################################################
#                                         ROUTE 53 SECTION                                   #
###############################################################################################
class FetchRoute53Response(BaseModel):
    status_code: int
    route53_details: List[ZoneModel]

class FetchSingleZoneResponse(BaseModel):
    status_code: int
    zone_detail: ZoneModel

###############################################################################################
#                                         ERROR RESPONSES                                     #
###############################################################################################
class ErrorResponse(BaseModel):
    error_code: int
    error_message: str

class LoginResponse(BaseModel):
    status_code: int
    username: str
    message: str
