from fastapi import APIRouter, Depends, Query

from facade import facade
from models.datadog_metrics_models import FetchDatadogMetricResponse

router = APIRouter(prefix="/api/v1/datadog-metrics", tags=["Datadog Metrics"])


@router.get(
    "/fetch-cpu-metric",
    response_model=FetchDatadogMetricResponse,
    dependencies=[Depends(facade.auth.require_permission_flexible("view_server_details"))],
)
def fetch_cpu_metric(
    host: str = Query(..., description="Datadog host tag value"),
    component: str = Query(..., description="Datadog component tag value"),
    period: int = Query(..., gt=0, description="Lookback window in seconds"),
    rollup_seconds: int | None = Query(None, gt=0, description="Optional Datadog rollup interval in seconds"),
):
    return facade.datadog_metrics_section.fetch_component_metric(
        host=host,
        component=component,
        period=period,
        metric="cpu_percent",
        rollup_seconds=rollup_seconds,
    )


@router.get(
    "/fetch-memory-used-metric",
    response_model=FetchDatadogMetricResponse,
    dependencies=[Depends(facade.auth.require_permission_flexible("view_server_details"))],
)
def fetch_memory_used_metric(
    host: str = Query(..., description="Datadog host tag value"),
    component: str = Query(..., description="Datadog component tag value"),
    period: int = Query(..., gt=0, description="Lookback window in seconds"),
    rollup_seconds: int | None = Query(None, gt=0, description="Optional Datadog rollup interval in seconds"),
):
    return facade.datadog_metrics_section.fetch_component_metric(
        host=host,
        component=component,
        period=period,
        metric="memory_used",
        rollup_seconds=rollup_seconds,
    )


@router.get(
    "/fetch-memory-percent-metric",
    response_model=FetchDatadogMetricResponse,
    dependencies=[Depends(facade.auth.require_permission_flexible("view_server_details"))],
)
def fetch_memory_percent_metric(
    host: str = Query(..., description="Datadog host tag value"),
    component: str = Query(..., description="Datadog component tag value"),
    period: int = Query(..., gt=0, description="Lookback window in seconds"),
    rollup_seconds: int | None = Query(None, gt=0, description="Optional Datadog rollup interval in seconds"),
):
    return facade.datadog_metrics_section.fetch_component_metric(
        host=host,
        component=component,
        period=period,
        metric="memory_percent",
        rollup_seconds=rollup_seconds,
    )


@router.get(
    "/fetch-log-directory-size-metric",
    response_model=FetchDatadogMetricResponse,
    dependencies=[Depends(facade.auth.require_permission_flexible("view_server_details"))],
)
def fetch_log_directory_size_metric(
    host: str = Query(..., description="Datadog host tag value"),
    component: str = Query(..., description="Datadog component tag value"),
    period: int = Query(..., gt=0, description="Lookback window in seconds"),
    rollup_seconds: int | None = Query(None, gt=0, description="Optional Datadog rollup interval in seconds"),
):
    return facade.datadog_metrics_section.fetch_component_metric(
        host=host,
        component=component,
        period=period,
        metric="log_directory_size",
        rollup_seconds=rollup_seconds,
    )


@router.get(
    "/fetch-up-time-metric",
    response_model=FetchDatadogMetricResponse,
    dependencies=[Depends(facade.auth.require_permission_flexible("view_server_details"))],
)
def fetch_up_time_metric(
    host: str = Query(..., description="Datadog host tag value"),
    component: str = Query(..., description="Datadog component tag value"),
):
    return facade.datadog_metrics_section.fetch_component_metric(
        host=host,
        component=component,
        period=facade.datadog_metrics_section.DEFAULT_LAST_VALUE_PERIOD,
        metric="up_time",
    )


@router.get(
    "/fetch-up-time-max-exceeded-metric",
    response_model=FetchDatadogMetricResponse,
    dependencies=[Depends(facade.auth.require_permission_flexible("view_server_details"))],
)
def fetch_up_time_max_exceeded_metric(
    host: str = Query(..., description="Datadog host tag value"),
    component: str = Query(..., description="Datadog component tag value"),
):
    return facade.datadog_metrics_section.fetch_component_metric(
        host=host,
        component=component,
        period=facade.datadog_metrics_section.DEFAULT_LAST_VALUE_PERIOD,
        metric="up_time_max_exceeded",
    )


@router.get(
    "/fetch-process-status-metric",
    response_model=FetchDatadogMetricResponse,
    dependencies=[Depends(facade.auth.require_permission_flexible("view_server_details"))],
)
def fetch_process_status_metric(
    host: str = Query(..., description="Datadog host tag value"),
    component: str = Query(..., description="Datadog component tag value"),
    period: int = Query(..., gt=0, description="Lookback window in seconds"),
    rollup_seconds: int | None = Query(None, gt=0, description="Optional Datadog rollup interval in seconds"),
):
    return facade.datadog_metrics_section.fetch_component_metric(
        host=host,
        component=component,
        period=period,
        metric="process_status",
        rollup_seconds=rollup_seconds,
    )


@router.get(
    "/fetch-port-status-metric",
    response_model=FetchDatadogMetricResponse,
    dependencies=[Depends(facade.auth.require_permission_flexible("view_server_details"))],
)
def fetch_port_status_metric(
    host: str = Query(..., description="Datadog host tag value"),
    component: str = Query(..., description="Datadog component tag value"),
    period: int = Query(..., gt=0, description="Lookback window in seconds"),
    rollup_seconds: int | None = Query(None, gt=0, description="Optional Datadog rollup interval in seconds"),
):
    return facade.datadog_metrics_section.fetch_component_metric(
        host=host,
        component=component,
        period=period,
        metric="port_status",
        rollup_seconds=rollup_seconds,
    )


@router.get(
    "/fetch-server-cpu-metric",
    response_model=FetchDatadogMetricResponse,
    dependencies=[Depends(facade.auth.require_permission_flexible("view_server_details"))],
)
def fetch_server_cpu_metric(
    host: str = Query(..., description="Datadog host tag value"),
    period: int = Query(..., gt=0, description="Lookback window in seconds"),
    rollup_seconds: int | None = Query(None, gt=0, description="Optional Datadog rollup interval in seconds"),
):
    return facade.datadog_metrics_section.fetch_host_metric(
        host=host,
        period=period,
        metric="cpu_user",
        rollup_seconds=rollup_seconds,
    )


@router.get(
    "/fetch-server-memory-used-metric",
    response_model=FetchDatadogMetricResponse,
    dependencies=[Depends(facade.auth.require_permission_flexible("view_server_details"))],
)
def fetch_server_memory_used_metric(
    host: str = Query(..., description="Datadog host tag value"),
    period: int = Query(..., gt=0, description="Lookback window in seconds"),
    rollup_seconds: int | None = Query(None, gt=0, description="Optional Datadog rollup interval in seconds"),
):
    return facade.datadog_metrics_section.fetch_host_metric(
        host=host,
        period=period,
        metric="memory_used",
        rollup_seconds=rollup_seconds,
    )


@router.get(
    "/fetch-server-memory-usable-percent-metric",
    response_model=FetchDatadogMetricResponse,
    dependencies=[Depends(facade.auth.require_permission_flexible("view_server_details"))],
)
def fetch_server_memory_usable_percent_metric(
    host: str = Query(..., description="Datadog host tag value"),
    period: int = Query(..., gt=0, description="Lookback window in seconds"),
    rollup_seconds: int | None = Query(None, gt=0, description="Optional Datadog rollup interval in seconds"),
):
    return facade.datadog_metrics_section.fetch_host_metric(
        host=host,
        period=period,
        metric="memory_usable_percent",
        rollup_seconds=rollup_seconds,
    )


@router.get(
    "/fetch-server-load1-metric",
    response_model=FetchDatadogMetricResponse,
    dependencies=[Depends(facade.auth.require_permission_flexible("view_server_details"))],
)
def fetch_server_load1_metric(
    host: str = Query(..., description="Datadog host tag value"),
    period: int = Query(..., gt=0, description="Lookback window in seconds"),
    rollup_seconds: int | None = Query(None, gt=0, description="Optional Datadog rollup interval in seconds"),
):
    return facade.datadog_metrics_section.fetch_host_metric(
        host=host,
        period=period,
        metric="load_1",
        rollup_seconds=rollup_seconds,
    )


@router.get(
    "/fetch-server-uptime-metric",
    response_model=FetchDatadogMetricResponse,
    dependencies=[Depends(facade.auth.require_permission_flexible("view_server_details"))],
)
def fetch_server_uptime_metric(
    host: str = Query(..., description="Datadog host tag value"),
):
    return facade.datadog_metrics_section.fetch_host_metric(
        host=host,
        period=facade.datadog_metrics_section.DEFAULT_LAST_VALUE_PERIOD,
        metric="uptime",
    )
