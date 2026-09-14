from models.loadbalancer_section_models import *
from facade import facade
from fastapi import APIRouter, Query, Depends

router = APIRouter(prefix="/api/v1/loadbalancer", tags=["Load Balancer"])

###############################################################################################
#                              LOAD BALANCER SECTION ENDPOINTS                                 #
###############################################################################################
@router.get("/fetch-load-balancers-summary", response_model=FetchLoadBalancersSummaryResponse, dependencies=[Depends(facade.auth.require_permission("view_server_details"))])
def fetch_load_balancers_summary(fresh: bool = Query(False, description="Set to true to bypass cache and refresh data")):
    """
    Endpoint to fetch Load Balancers summary.

    This endpoint retrieves a summary of Load Balancers (ALB, NLB, CLB) across all regions. If the 'fresh' flag 
    is set to true, the cache is bypassed and fresh data is fetched. Otherwise, it returns 
    the summary from the cache.

    Args:
        fresh (bool): Set to true to bypass cache and refresh data.

    Returns:
        FetchLoadBalancersSummaryResponse: Contains the status code and the list of load balancer summaries.
    """

    return facade.loadbalancer_section.fetch_load_balancers_summary(fresh)

@router.get("/fetch-load-balancer-details", response_model=FetchLoadBalancerDetailsResponse, dependencies=[Depends(facade.auth.require_permission("view_server_details"))])
def fetch_load_balancer_details(region: str = Query(...), load_balancer_arn: str = Query(...)):
    """
    Endpoint to fetch Load Balancer details.

    This endpoint retrieves detailed information about a specific Load Balancer
    identified by its region and load balancer ARN. It returns a response containing
    the load balancer details and a status code.

    Args:
        region (str): The AWS region where the load balancer is located.
        load_balancer_arn (str): The ARN of the Load Balancer.

    Returns:
        FetchLoadBalancerDetailsResponse: Contains the status code and load balancer details.
    """

    return facade.loadbalancer_section.fetch_load_balancer_details(region, load_balancer_arn)
