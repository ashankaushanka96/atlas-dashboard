from models.lambda_section_models import *
from facade import facade
from fastapi import APIRouter, Query, Depends

router = APIRouter(prefix="/api/v1/lambda", tags=["Lambda"])

###############################################################################################
#                                  LAMBDA SECTION ENDPOINTS                                   #
###############################################################################################
@router.get("/fetch-functions-summary", response_model=FetchLambdaFunctionsSummaryResponse, dependencies=[Depends(facade.auth.require_permission_flexible("view_server_details"))])
def fetch_lambda_functions_summary(fresh: bool = Query(False, description="Set to true to bypass cache and refresh data")):
    """
    Endpoint to fetch Lambda functions summary.

    This endpoint retrieves a summary of Lambda functions across all regions. If the 'fresh' flag 
    is set to true, the cache is bypassed and fresh data is fetched. Otherwise, it returns 
    the summary from the cache.

    Args:
        fresh (bool): Set to true to bypass cache and refresh data.

    Returns:
        FetchLambdaFunctionsSummaryResponse: Contains the status code and the list of function summaries.
    """

    return facade.lambda_section.fetch_lambda_functions_summary(fresh)

@router.get("/fetch-function-details", response_model=FetchLambdaFunctionDetailsResponse, dependencies=[Depends(facade.auth.require_permission_flexible("view_server_details"))])
def fetch_lambda_function_details(region: str = Query(...), function_name: str = Query(...)):
    """
    Endpoint to fetch Lambda function details.

    This endpoint retrieves detailed information about a specific Lambda function
    identified by its region and function name. It returns a response containing
    the function details and a status code.

    Args:
        region (str): The AWS region where the function is located.
        function_name (str): The name of the Lambda function.

    Returns:
        FetchLambdaFunctionDetailsResponse: Contains the status code and function details.
    """

    return facade.lambda_section.fetch_lambda_function_details(region, function_name)
