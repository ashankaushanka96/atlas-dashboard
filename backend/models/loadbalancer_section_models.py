from typing import List, Optional, Dict, Any
from pydantic import BaseModel

class LoadBalancerSummary(BaseModel):
    region: str
    load_balancer_name: str
    load_balancer_arn: str
    load_balancer_type: str  # application, network, or classic
    scheme: Optional[str]  # internet-facing or internal
    state: Optional[str]
    vpc_id: Optional[str]
    availability_zones: Optional[List[Dict[str, Any]]]
    security_groups: Optional[List[str]]
    ip_address_type: Optional[str]
    private_ips: Optional[List[str]]  # List of private IP addresses
    public_ips: Optional[List[str]]   # List of public IP addresses

class TargetDescription(BaseModel):
    id: Optional[str]
    port: Optional[int]
    availability_zone: Optional[str]
    health_state: Optional[str]
    health_reason: Optional[str]
    health_description: Optional[str]
    private_ip: Optional[str]
    public_ip: Optional[str]

class ListenerRule(BaseModel):
    priority: Optional[str]
    conditions: Optional[List[Dict[str, Any]]]
    actions: Optional[List[Dict[str, Any]]]
    is_default: Optional[bool]

class ListenerDetails(BaseModel):
    listener_arn: str
    port: Optional[int]
    protocol: Optional[str]
    ssl_policy: Optional[str]
    certificates: Optional[List[Dict[str, Any]]]
    rules: Optional[List[ListenerRule]]

class TargetGroupDetails(BaseModel):
    target_group_arn: str
    target_group_name: Optional[str]
    protocol: Optional[str]
    port: Optional[int]
    target_type: Optional[str]
    health_check: Optional[Dict[str, Any]]
    targets: Optional[List[TargetDescription]]

class LoadBalancerDetails(BaseModel):
    load_balancer_name: str
    load_balancer_arn: str
    load_balancer_type: str
    dns_name: Optional[str]
    scheme: Optional[str]
    state: Optional[str]
    vpc_id: Optional[str]
    availability_zones: Optional[List[Dict[str, Any]]]
    security_groups: Optional[List[str]]
    ip_address_type: Optional[str]
    listeners: Optional[List[ListenerDetails]]
    target_groups: Optional[List[TargetGroupDetails]]
    instances: Optional[List[Dict[str, Any]]]  # For Classic Load Balancers
    tags: Optional[List[Dict[str, str]]]
    attributes: Optional[Dict[str, Any]]

class FetchLoadBalancersSummaryResponse(BaseModel):
    status_code: int
    load_balancers: List[LoadBalancerSummary]

class FetchLoadBalancerDetailsResponse(BaseModel):
    status_code: int
    load_balancer_details: LoadBalancerDetails
