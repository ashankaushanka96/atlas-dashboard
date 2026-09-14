from typing import List, Optional, Dict, Any
from pydantic import BaseModel

class ElastiCacheClusterSummary(BaseModel):
    region: str
    replication_group_id: str
    description: Optional[str]
    status: Optional[str]
    node_type: Optional[str]
    num_cache_nodes: Optional[int]
    engine: Optional[str]
    engine_version: Optional[str]
    port: Optional[int]
    cache_cluster_id: Optional[str]
    cache_node_type: Optional[str]
    num_cache_nodes: Optional[int]
    preferred_availability_zone: Optional[str]
    cache_cluster_status: Optional[str]

class Endpoint(BaseModel):
    address: Optional[str]
    port: Optional[int]

class ElastiCacheClusterDetails(BaseModel):
    replication_group_id: str
    description: Optional[str]
    status: Optional[str]
    node_type: Optional[str]
    num_cache_nodes: Optional[int]
    engine: Optional[str]
    engine_version: Optional[str]
    port: Optional[int]
    cache_cluster_id: Optional[str]
    cache_node_type: Optional[str]
    preferred_availability_zone: Optional[str]
    cache_cluster_status: Optional[str]
    cache_nodes: Optional[List[Dict[str, Any]]]
    cache_parameter_group: Optional[Dict[str, Any]]
    cache_subnet_group: Optional[Dict[str, Any]]
    security_groups: Optional[List[Dict[str, Any]]]
    at_rest_encryption_enabled: Optional[bool]
    transit_encryption_enabled: Optional[bool]
    tags: Optional[List[Dict[str, str]]]
    configuration_endpoint: Optional[Dict[str, Any]]
    node_groups: Optional[List[Dict[str, Any]]]
    primary_endpoint: Optional[Endpoint]
    reader_endpoint: Optional[Endpoint]
    snapshot_window: Optional[str]
    maintenance_window: Optional[str]
    auth_token_enabled: Optional[bool]
    automatic_failover: Optional[str]
    multi_az: Optional[str]

class FetchElastiCacheClustersSummaryResponse(BaseModel):
    status_code: int
    clusters: List[ElastiCacheClusterSummary]

class FetchElastiCacheClusterDetailsResponse(BaseModel):
    status_code: int
    cluster_details: ElastiCacheClusterDetails
