from models.elasticache_section_models import *
from facade import facade
from fastapi import APIRouter, Query, Depends

router = APIRouter(prefix="/api/v1/elasticache", tags=["ElastiCache"])

###############################################################################################
#                              ELASTICACHE SECTION ENDPOINTS                                   #
###############################################################################################
@router.get("/fetch-clusters-summary", response_model=FetchElastiCacheClustersSummaryResponse, dependencies=[Depends(facade.auth.require_permission_flexible("view_server_details"))])
def fetch_elasticache_clusters_summary(fresh: bool = Query(False, description="Set to true to bypass cache and refresh data")):
    """
    Endpoint to fetch ElastiCache clusters summary.

    This endpoint retrieves a summary of ElastiCache clusters across all regions. If the 'fresh' flag 
    is set to true, the cache is bypassed and fresh data is fetched. Otherwise, it returns 
    the summary from the cache.

    Args:
        fresh (bool): Set to true to bypass cache and refresh data.

    Returns:
        FetchElastiCacheClustersSummaryResponse: Contains the status code and the list of cluster summaries.
    """

    return facade.elasticache_section.fetch_elasticache_clusters_summary(fresh)

@router.get("/fetch-cluster-details", response_model=FetchElastiCacheClusterDetailsResponse, dependencies=[Depends(facade.auth.require_permission_flexible("view_server_details"))])
def fetch_elasticache_cluster_details(region: str = Query(...), replication_group_id: str = Query(...)):
    """
    Endpoint to fetch ElastiCache cluster details.

    This endpoint retrieves detailed information about a specific ElastiCache cluster
    identified by its region and replication group ID. It returns a response containing
    the cluster details and a status code.

    Args:
        region (str): The AWS region where the cluster is located.
        replication_group_id (str): The replication group ID of the ElastiCache cluster.

    Returns:
        FetchElastiCacheClusterDetailsResponse: Contains the status code and cluster details.
    """

    return facade.elasticache_section.fetch_elasticache_cluster_details(region, replication_group_id)
