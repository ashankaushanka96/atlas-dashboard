from typing import List, Optional, Dict, Any
from pydantic import BaseModel

class ECSClusterSummary(BaseModel):
    region: str
    cluster_name: str
    cluster_arn: str
    status: Optional[str]
    active_services_count: Optional[int]
    running_tasks_count: Optional[int]
    pending_tasks_count: Optional[int]
    private_ips: Optional[List[str]]  # List of private IP addresses
    public_ips: Optional[List[str]]   # List of public IP addresses

class ECSServiceSummary(BaseModel):
    region: str
    cluster_name: str
    service_name: str
    service_arn: str
    status: Optional[str]
    desired_count: Optional[int]
    running_count: Optional[int]
    pending_count: Optional[int]
    launch_type: Optional[str]
    private_ips: Optional[List[str]]  # List of private IP addresses
    public_ips: Optional[List[str]]   # List of public IP addresses

class ECSClusterDetails(BaseModel):
    cluster_name: str
    cluster_arn: str
    status: Optional[str]
    active_services_count: Optional[int]
    running_tasks_count: Optional[int]
    pending_tasks_count: Optional[int]
    registered_container_instances_count: Optional[int]
    capacity_providers: Optional[List[str]]
    default_capacity_provider_strategy: Optional[List[Dict[str, Any]]]
    tags: Optional[List[Dict[str, str]]]

class ECSServiceDetails(BaseModel):
    service_name: str
    service_arn: str
    cluster_name: str
    status: Optional[str]
    desired_count: Optional[int]
    running_count: Optional[int]
    pending_count: Optional[int]
    launch_type: Optional[str]
    task_definition: Optional[str]
    deployment_configuration: Optional[Dict[str, Any]]
    network_configuration: Optional[Dict[str, Any]]
    load_balancers: Optional[List[Dict[str, Any]]]
    tags: Optional[List[Dict[str, str]]]

class FetchECSClustersSummaryResponse(BaseModel):
    status_code: int
    clusters: List[ECSClusterSummary]

class FetchECSServicesSummaryResponse(BaseModel):
    status_code: int
    services: List[ECSServiceSummary]

class FetchECSClusterDetailsResponse(BaseModel):
    status_code: int
    cluster_details: ECSClusterDetails

class FetchECSServiceDetailsResponse(BaseModel):
    status_code: int
    service_details: ECSServiceDetails
