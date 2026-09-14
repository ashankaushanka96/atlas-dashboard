from models.ecs_section_models import *
from facade import facade
from fastapi import APIRouter, Query, Depends

router = APIRouter(prefix="/api/v1/ecs", tags=["ECS"])

###############################################################################################
#                                  ECS SECTION ENDPOINTS                                      #
###############################################################################################
@router.get("/fetch-clusters-summary", response_model=FetchECSClustersSummaryResponse, dependencies=[Depends(facade.auth.require_permission_flexible("view_server_details"))])
def fetch_ecs_clusters_summary(fresh: bool = Query(False, description="Set to true to bypass cache and refresh data")):
    """
    Endpoint to fetch ECS clusters summary.

    This endpoint retrieves a summary of ECS clusters across all regions. If the 'fresh' flag 
    is set to true, the cache is bypassed and fresh data is fetched. Otherwise, it returns 
    the summary from the cache.

    Args:
        fresh (bool): Set to true to bypass cache and refresh data.

    Returns:
        FetchECSClustersSummaryResponse: Contains the status code and the list of cluster summaries.
    """

    return facade.ecs_section.fetch_ecs_clusters_summary(fresh)

@router.get("/fetch-services-summary", response_model=FetchECSServicesSummaryResponse, dependencies=[Depends(facade.auth.require_permission_flexible("view_server_details"))])
def fetch_ecs_services_summary(fresh: bool = Query(False, description="Set to true to bypass cache and refresh data")):
    """
    Endpoint to fetch ECS services summary.

    This endpoint retrieves a summary of ECS services across all regions. If the 'fresh' flag 
    is set to true, the cache is bypassed and fresh data is fetched. Otherwise, it returns 
    the summary from the cache.

    Args:
        fresh (bool): Set to true to bypass cache and refresh data.

    Returns:
        FetchECSServicesSummaryResponse: Contains the status code and the list of service summaries.
    """

    return facade.ecs_section.fetch_ecs_services_summary(fresh)

@router.get("/fetch-cluster-details", response_model=FetchECSClusterDetailsResponse, dependencies=[Depends(facade.auth.require_permission_flexible("view_server_details"))])
def fetch_ecs_cluster_details(region: str = Query(...), cluster_name: str = Query(...)):
    """
    Endpoint to fetch ECS cluster details.

    This endpoint retrieves detailed information about a specific ECS cluster
    identified by its region and cluster name. It returns a response containing
    the cluster details and a status code.

    Args:
        region (str): The AWS region where the cluster is located.
        cluster_name (str): The name of the ECS cluster.

    Returns:
        FetchECSClusterDetailsResponse: Contains the status code and cluster details.
    """

    return facade.ecs_section.fetch_ecs_cluster_details(region, cluster_name)

@router.get("/fetch-service-details", response_model=FetchECSServiceDetailsResponse, dependencies=[Depends(facade.auth.require_permission_flexible("view_server_details"))])
def fetch_ecs_service_details(region: str = Query(...), cluster_name: str = Query(...), service_name: str = Query(...)):
    """
    Endpoint to fetch ECS service details.

    This endpoint retrieves detailed information about a specific ECS service
    identified by its region, cluster name, and service name. It returns a response containing
    the service details and a status code.

    Args:
        region (str): The AWS region where the service is located.
        cluster_name (str): The name of the ECS cluster.
        service_name (str): The name of the ECS service.

    Returns:
        FetchECSServiceDetailsResponse: Contains the status code and service details.
    """

    return facade.ecs_section.fetch_ecs_service_details(region, cluster_name, service_name)
