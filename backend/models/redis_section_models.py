from typing import List, Optional, Dict, Any
from pydantic import BaseModel

class RedisClusterSummary(BaseModel):
    region: str
    replication_group_id: str
    description: Optional[str]
    status: Optional[str]
    node_type: Optional[str]
    num_cache_nodes: Optional[int]
    engine: Optional[str]
    engine_version: Optional[str]
    port: Optional[int]

class RedisClusterDetails(BaseModel):
    replication_group_id: str
    description: Optional[str]
    status: Optional[str]
    node_type: Optional[str]
    num_cache_nodes: Optional[int]
    engine: Optional[str]
    engine_version: Optional[str]
    port: Optional[int]
    cache_nodes: Optional[List[Dict[str, Any]]]
    cache_parameter_group: Optional[Dict[str, Any]]
    cache_subnet_group: Optional[Dict[str, Any]]
    security_groups: Optional[List[Dict[str, Any]]]
    at_rest_encryption_enabled: Optional[bool]
    transit_encryption_enabled: Optional[bool]
    tags: Optional[List[Dict[str, str]]]

class FetchRedisClustersSummaryResponse(BaseModel):
    status_code: int
    clusters: List[RedisClusterSummary]

class FetchRedisClusterDetailsResponse(BaseModel):
    status_code: int
    cluster_details: RedisClusterDetails
