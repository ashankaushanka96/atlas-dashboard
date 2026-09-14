from typing import List, Optional, Dict, Any
from pydantic import BaseModel

class MSKClusterSummary(BaseModel):
    region: str
    cluster_name: str
    cluster_arn: str
    state: Optional[str]
    kafka_version: Optional[str]
    number_of_broker_nodes: Optional[int]
    cluster_type: Optional[str] = "provisioned"  # "provisioned" or "serverless"

class MSKClusterDetails(BaseModel):
    cluster_name: str
    cluster_arn: str
    state: Optional[str]
    kafka_version: Optional[str]
    number_of_broker_nodes: Optional[int]
    enhanced_monitoring: Optional[str]
    broker_node_group_info: Optional[Dict[str, Any]]
    client_authentication: Optional[Dict[str, Any]]
    encryption_info: Optional[Dict[str, Any]]
    connectivity_info: Optional[Dict[str, Any]]
    logging_info: Optional[Dict[str, Any]]
    tags: Optional[Dict[str, str]]
    configuration_info: Optional[Dict[str, Any]]
    cluster_type: Optional[str] = "provisioned"  # "provisioned" or "serverless"

class FetchMSKClustersSummaryResponse(BaseModel):
    status_code: int
    clusters: List[MSKClusterSummary]

class FetchMSKClusterDetailsResponse(BaseModel):
    status_code: int
    cluster_details: MSKClusterDetails
