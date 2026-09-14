from models.ec2_details_section_models import *
from facade import facade
from fastapi import APIRouter, Query, Depends

router = APIRouter(prefix="/api/v1/ec2-details", tags=["EC2 Details"])

###############################################################################################
#                                  EC2 DETAILS SECTION ENDPOINTS                              #
###############################################################################################
@router.get("/fetch-instance-summary", response_model=FetchInstancesSummaryResponse, dependencies=[Depends(facade.auth.require_permission_flexible("view_server_details"))])
def fetch_instances_summary(fresh: bool = Query(False, description="Set to true to bypass cache and refresh data")):
    """
    Endpoint to fetch EC2 instances summary.

    This endpoint retrieves a summary of EC2 instances across all regions. If the 'fresh' flag 
    is set to true, the cache is bypassed and fresh data is fetched. Otherwise, it returns 
    the summary from the cache.

    Args:
        fresh (bool): Set to true to bypass cache and refresh data.

    Returns:
        FetchInstancesSummaryResponse: Contains the status code and the list of instance summaries.
    """

    return facade.ec2_details_section.fetch_instances_summary(fresh)

@router.get("/fetch-instance-details", response_model=FetchInstanceDetailsResponse, dependencies=[Depends(facade.auth.require_permission_flexible("view_server_details"))])
def fetch_instance_details(region: str = Query(...), instance_id: str = Query(...)):
    """
    Endpoint to fetch EC2 instance details.

    This endpoint retrieves detailed information about a specific EC2 instance
    identified by its region and instance ID. It returns a response containing
    the instance details and a status code.

    Args:
        region (str): The AWS region where the instance is located.
        instance_id (str): The ID of the EC2 instance.

    Returns:
        FetchInstanceDetailsResponse: Contains the status code and instance details.
    """

    return facade.ec2_details_section.fetch_instance_details(region, instance_id)

@router.get("/fetch-component-names", response_model=FetchComponentNamesResponse, dependencies=[Depends(facade.auth.require_permission_flexible("view_components"))])
def fetch_component_names(ip: str = Query(..., description="IP to get components names")):
    """
    Endpoint to fetch component names.

    This endpoint retrieves a list of component names associated with the
    specified IP address. It returns a response containing the status code and
    the list of component names.

    Args:
        ip (str): The IP address to get components names.

    Returns:
        FetchComponentNamesResponse: Contains the status code and list of component names.
    """
    response = facade.ec2_details_section.fetch_component_names(ip)
    return response
