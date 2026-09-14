from typing import Dict, List, Optional

from pydantic import BaseModel, Field

from models.datadog_metrics_models import DatadogMetricSeries


class ServerDetailsRow(BaseModel):
    region: str
    ip: str
    hostname: Optional[str] = None
    instance_id: Optional[str] = None
    os: Optional[str] = None
    boot_time: Optional[int] = None
    compliant_status: Optional[str] = None
    watcher_status: Optional[str] = None
    watcher_version: Optional[str] = None
    watcher_configured_component_count: Optional[int] = 0
    tool_component_count: Optional[int] = 0
    job_component_count: Optional[int] = 0
    component_category_count: Optional[int] = 0
    total_component_count: Optional[int] = 0
    tags: Optional[Dict[str, Optional[str]]] = None
    asset_custodian: Optional[str] = None


class FetchServerDetailsResponse(BaseModel):
    status_code: int
    server_details: List[ServerDetailsRow]


class FetchAssetCustodiansResponse(BaseModel):
    status_code: int
    asset_custodians: List[str]


class InspectorFindingRow(BaseModel):
    finding_arn: Optional[str] = None
    title: Optional[str] = None
    severity: Optional[str] = None
    finding_type: Optional[str] = None
    status: Optional[str] = None
    inspector_score: Optional[float] = None
    package_name: Optional[str] = None
    package_version: Optional[str] = None
    fixed_in_version: Optional[str] = None
    vulnerability_id: Optional[str] = None
    remediation: Optional[str] = None
    recommendation_url: Optional[str] = None
    description: Optional[str] = None
    first_observed_at: Optional[str] = None
    last_observed_at: Optional[str] = None


class ServerDetailsDetail(BaseModel):
    ts: Optional[int] = None
    region: str
    ip: str
    instance_id: Optional[str] = None
    hostname: Optional[str] = None
    fqdn: Optional[str] = None
    all_ips: List[str] = Field(default_factory=list)
    os: Optional[str] = None
    os_version: Optional[str] = None
    os_release: Optional[str] = None
    kernel_version: Optional[str] = None
    kernel_release: Optional[str] = None
    architecture: Optional[str] = None
    platform: Optional[str] = None
    python_version: Optional[str] = None
    current_username: Optional[str] = None
    home_directory: Optional[str] = None
    watcher_directory: Optional[str] = None
    apps_directory: Optional[str] = None
    boot_time: Optional[int] = None
    vcpus: Optional[int] = None
    cores: Optional[int] = None
    total_memory_mb: Optional[int] = None
    last_ingested_at: Optional[str] = None
    compliant_status: Optional[str] = None
    watcher_status: Optional[str] = None
    watcher_version: Optional[str] = None
    crons: List[str] = Field(default_factory=list)


class FetchServerDetailsDetailResponse(BaseModel):
    status_code: int
    server_detail: ServerDetailsDetail


class FetchInspectorFindingsResponse(BaseModel):
    status_code: int
    inspector_findings: List[InspectorFindingRow] = Field(default_factory=list)


class ServerMetricsSeriesCard(BaseModel):
    key: str
    title: str
    unit: Optional[str] = None
    color: Optional[str] = None
    metric: Optional[str] = None
    query: Optional[str] = None
    series: List[DatadogMetricSeries] = Field(default_factory=list)
    error: Optional[str] = None


class ServerMetricsValueCard(BaseModel):
    key: str
    title: str
    value: Optional[float] = None
    timestamp_ms: Optional[int] = None
    error: Optional[str] = None


class ServerMetricsPayload(BaseModel):
    region: str
    ip: str
    period: int
    series_metrics: List[ServerMetricsSeriesCard] = Field(default_factory=list)
    last_value_metrics: List[ServerMetricsValueCard] = Field(default_factory=list)


class FetchServerMetricsResponse(BaseModel):
    status_code: int
    server_metrics: ServerMetricsPayload
