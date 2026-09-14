from models.route53_section_models import *
from facade import facade
from fastapi import APIRouter, Query, Depends

router = APIRouter(prefix="/api/v1/route53", tags=["Route53"])

@router.get("/fetch-zones", response_model=FetchRoute53Response, dependencies=[Depends(facade.auth.require_permission_flexible("view_routes"))])
def fetch_zones(fresh: bool = Query(False)):
    """
    Endpoint to fetch all Route53 zones.

    This endpoint retrieves a list of all Route53 zones configured in the system.
    It returns a response with a status code and the list of zones.

    Returns:
        FetchRoute53Response: Contains the status code and list of zones.
    """

    return facade.route53_section.get_all_zones(fresh=fresh)

@router.get("/fetch-zone-detail", response_model=FetchSingleZoneResponse, dependencies=[Depends(facade.auth.require_permission_flexible("view_routes"))])
def fetch_zones_detail(zone_name: str = Query(...), fresh: bool = Query(False)):
    """
    Endpoint to fetch details of a single Route53 zone.

    This endpoint retrieves the details of a specific Route53 zone. It returns a response
    with a status code and the details of the zone.

    Args:
        zone_name (str): The name of the zone to fetch details for.

    Returns:
        FetchSingleZoneResponse: Contains the status code and details of the zone.
    """
    return facade.route53_section.get_single_zone(zone_name, fresh=fresh)

@router.get("/fetch-zone-names", dependencies=[Depends(facade.auth.require_permission_flexible("view_routes"))])
def get_zone_names():
    """
    Endpoint to fetch all Route53 zone names.

    This endpoint retrieves a list of all Route53 zone names configured in the system.
    It returns a response with a status code and the list of zone names.

    Returns:
        List[str]: A list of Route53 zone names.
    """
    return facade.route53_section.get_zone_names()
