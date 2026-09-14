from models.eks_section_models import *
from facade import facade
from fastapi import APIRouter, Query, Depends

router = APIRouter(prefix="/api/v1/eks", tags=["EKS"])

###############################################################################################
#                                  EKS SECTION ENDPOINTS                                       #
###############################################################################################
@router.get("/fetch-clusters-summary", response_model=FetchEKSClustersSummaryResponse, dependencies=[Depends(facade.auth.require_permission_flexible("view_server_details"))])
def fetch_eks_clusters_summary(fresh: bool = Query(False, description="Set to true to bypass cache and refresh data")):
    """
    Endpoint to fetch EKS clusters summary.

    This endpoint retrieves a summary of EKS clusters across all regions. If the 'fresh' flag 
    is set to true, the cache is bypassed and fresh data is fetched. Otherwise, it returns 
    the summary from the cache.

    Args:
        fresh (bool): Set to true to bypass cache and refresh data.

    Returns:
        FetchEKSClustersSummaryResponse: Contains the status code and the list of cluster summaries.
    """

    return facade.eks_section.fetch_eks_clusters_summary(fresh)

@router.get("/fetch-cluster-details", response_model=FetchEKSClusterDetailsResponse, dependencies=[Depends(facade.auth.require_permission_flexible("view_server_details"))])
def fetch_eks_cluster_details(region: str = Query(...), cluster_name: str = Query(...)):
    """
    Endpoint to fetch EKS cluster details.

    This endpoint retrieves detailed information about a specific EKS cluster
    identified by its region and cluster name. It returns a response containing
    the cluster details and a status code.

    Args:
        region (str): The AWS region where the cluster is located.
        cluster_name (str): The name of the EKS cluster.

    Returns:
        FetchEKSClusterDetailsResponse: Contains the status code and cluster details.
    """

    return facade.eks_section.fetch_eks_cluster_details(region, cluster_name)
