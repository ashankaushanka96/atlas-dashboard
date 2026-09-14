from models.msk_section_models import *
from facade import facade
from fastapi import APIRouter, Query, Depends
import cache

router = APIRouter(prefix="/api/v1/msk", tags=["MSK"])

###############################################################################################
#                                  MSK SECTION ENDPOINTS                                       #
###############################################################################################
@router.get("/fetch-clusters-summary", response_model=FetchMSKClustersSummaryResponse, dependencies=[Depends(facade.auth.require_permission("view_server_details"))])
def fetch_msk_clusters_summary(fresh: bool = Query(False, description="Set to true to bypass cache and refresh data")):
    """
    Endpoint to fetch MSK clusters summary.

    This endpoint retrieves a summary of both provisioned and serverless MSK clusters across all regions. 
    If the 'fresh' flag is set to true, the cache is bypassed and fresh data is fetched. Otherwise, 
    it returns the summary from the cache.

    Args:
        fresh (bool): Set to true to bypass cache and refresh data.

    Returns:
        FetchMSKClustersSummaryResponse: Contains the status code and the list of cluster summaries 
        (including both provisioned and serverless clusters).
    """

    return facade.msk_section.fetch_msk_clusters_summary(fresh)

@router.get("/fetch-cluster-details", response_model=FetchMSKClusterDetailsResponse, dependencies=[Depends(facade.auth.require_permission("view_server_details"))])
def fetch_msk_cluster_details(cluster_arn: str = Query(..., description="The ARN of the MSK cluster (supports both provisioned and serverless)")):
    """
    Endpoint to fetch MSK cluster details.

    This endpoint retrieves detailed information about a specific MSK cluster
    identified by its ARN. It supports both provisioned and serverless MSK clusters.
    
    For provisioned clusters, it uses the AWS describe_cluster API to get full details.
    For serverless clusters, it uses the list_clusters API data since describe_cluster
    is not supported for serverless clusters. Some fields may be None for serverless clusters.
    
    It returns a response containing the cluster details and a status code.

    Args:
        cluster_arn (str): The ARN of the MSK cluster (supports both provisioned and serverless).

    Returns:
        FetchMSKClusterDetailsResponse: Contains the status code and cluster details.
        Note: For serverless clusters, some fields like enhanced_monitoring, 
        broker_node_group_info, client_authentication, encryption_info, 
        connectivity_info, logging_info, and configuration_info will be None.
    """
    from loguru import logger
    
    try:
        logger.info("Fetching MSK cluster details for ARN: {}", cluster_arn)
        return facade.msk_section.fetch_msk_cluster_details(cluster_arn)
    except ValueError as e:
        logger.error("ValueError in fetch_msk_cluster_details: {}", e)
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Unexpected error in fetch_msk_cluster_details: {}", e)
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/clear-cache", dependencies=[Depends(facade.auth.require_permission("view_server_details"))])
def clear_msk_cache():
    """
    Endpoint to clear the MSK clusters cache.

    This endpoint clears the cached MSK clusters data, forcing the next request
    to fetch fresh data from AWS. This is useful for testing or when you need
    to ensure the latest data is retrieved.

    Returns:
        dict: Contains the status code and a message indicating the cache was cleared.
    """
    cache.clear_msk_cache()
    return {"status_code": 200, "message": "MSK clusters cache cleared successfully"}

@router.get("/debug-cluster-arn", dependencies=[Depends(facade.auth.require_permission("view_server_details"))])
def debug_cluster_arn(cluster_arn: str = Query(..., description="Debug cluster ARN processing")):
    """
    Debug endpoint to test cluster ARN processing.
    
    This endpoint helps debug issues with cluster ARN processing by showing
    how the ARN is being parsed and processed.
    
    Args:
        cluster_arn (str): The cluster ARN to debug.
        
    Returns:
        dict: Debug information about the ARN processing.
    """
    import urllib.parse
    from loguru import logger
    
    original_arn = cluster_arn
    
    # URL decode
    try:
        decoded_arn = urllib.parse.unquote(cluster_arn)
    except Exception as e:
        decoded_arn = cluster_arn
        logger.error("Failed to URL decode: {}", e)
    
    # Extract region
    try:
        region = decoded_arn.split(":")[3]
    except IndexError:
        region = "ERROR: Invalid ARN format"
    
    # Extract cluster name from ARN
    try:
        cluster_name_part = decoded_arn.split("/")[-1]
    except IndexError:
        cluster_name_part = "ERROR: Could not extract cluster name"
    
    debug_info = {
        "original_arn": original_arn,
        "decoded_arn": decoded_arn,
        "extracted_region": region,
        "cluster_name_part": cluster_name_part,
        "arn_parts": decoded_arn.split(":"),
        "path_parts": decoded_arn.split("/")
    }
    
    logger.info("Debug cluster ARN: {}", debug_info)
    return debug_info
