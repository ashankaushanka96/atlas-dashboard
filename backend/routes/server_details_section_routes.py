from fastapi import APIRouter, Depends, Query

from facade import facade
from models.server_details_section_models import (
    FetchAssetCustodiansResponse,
    FetchInspectorFindingsResponse,
    FetchServerDetailsDetailResponse,
    FetchServerDetailsResponse,
    FetchServerMetricsResponse,
)

router = APIRouter(prefix="/api/v1/server-details", tags=["Server Details"])


@router.get(
    "/fetch-server-details",
    response_model=FetchServerDetailsResponse,
    dependencies=[Depends(facade.auth.require_permission_flexible("view_server_details"))],
)
def fetch_server_details(
    fresh: bool = Query(False, description="Set to true to bypass cache and refresh data"),
    refresh: bool = Query(False, description="Set to true to sync AWS details before returning data"),
):
    should_refresh = fresh or refresh
    if refresh:
        facade.server_details_section.sync_server_details_from_aws()
    return facade.server_details_section.fetch_server_details(should_refresh)


@router.get(
    "/fetch-asset-custodians",
    response_model=FetchAssetCustodiansResponse,
    dependencies=[Depends(facade.auth.require_permission_flexible("view_server_details"))],
)
def fetch_asset_custodians():
    """
    List the distinct AssetCustodian tag values across hosts, for the Home
    page's Asset Custodian filter dropdown (mirrors fetch-all-regions).
    """
    return facade.server_details_section.fetch_asset_custodians()


@router.get(
    "/fetch-server-detail",
    response_model=FetchServerDetailsDetailResponse,
    dependencies=[Depends(facade.auth.require_permission_flexible("view_server_details"))],
)
def fetch_server_detail(
    region: str = Query(..., description="Server region"),
    ip: str = Query(..., description="Server primary IP"),
):
    return facade.server_details_section.fetch_server_detail(region, ip)


@router.get(
    "/fetch-inspector-findings",
    response_model=FetchInspectorFindingsResponse,
    dependencies=[Depends(facade.auth.require_permission_flexible("view_server_details"))],
)
def fetch_inspector_findings(
    region: str = Query(..., description="Server region"),
    ip: str = Query(..., description="Server primary IP"),
):
    return facade.server_details_section.fetch_inspector_findings(region, ip)


@router.get(
    "/fetch-server-metrics",
    response_model=FetchServerMetricsResponse,
    dependencies=[Depends(facade.auth.require_permission_flexible("view_server_details"))],
)
def fetch_server_metrics(
    region: str = Query(..., description="Server region"),
    ip: str = Query(..., description="Server primary IP / Datadog host"),
    period: int = Query(10800, gt=0, description="Lookback window in seconds"),
):
    return facade.server_details_section.fetch_server_metrics(region, ip, period)
