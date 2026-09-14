from typing import List, Optional, Dict, Any
from pydantic import BaseModel

class EKSClusterSummary(BaseModel):
    region: str
    cluster_name: str
    cluster_arn: str
    status: Optional[str]
    version: Optional[str]
    platform_version: Optional[str]
    endpoint: Optional[str]
    created_at: Optional[str]
    private_ips: Optional[List[str]]  # List of private IP addresses
    public_ips: Optional[List[str]]   # List of public IP addresses

class EKSClusterDetails(BaseModel):
    cluster_name: str
    cluster_arn: str
    status: Optional[str]
    version: Optional[str]
    platform_version: Optional[str]
    endpoint: Optional[str]
    created_at: Optional[str]
    role_arn: Optional[str]
    resources_vpc_config: Optional[Dict[str, Any]]
    logging: Optional[Dict[str, Any]]
    identity: Optional[Dict[str, Any]]
    tags: Optional[List[Dict[str, str]]]
    node_groups: Optional[List[Dict[str, Any]]]

class FetchEKSClustersSummaryResponse(BaseModel):
    status_code: int
    clusters: List[EKSClusterSummary]

class FetchEKSClusterDetailsResponse(BaseModel):
    status_code: int
    cluster_details: EKSClusterDetails
