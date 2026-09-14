from models.schedules_section_models import *
from facade import facade
from fastapi import APIRouter, Query, Depends

router = APIRouter(prefix="/api/v1/schedules", tags=["Schedules"])

@router.get("/fetch-schedules", response_model=FetchSchedulesResponse, dependencies=[Depends(facade.auth.require_permission_flexible("view_schedules"))])
def fetch_schedules(fresh: bool = Query(False, description="Set to true to bypass cache and refresh data")):
    """
    Endpoint to fetch schedules.

    This endpoint retrieves a list of schedules. If the 'fresh' flag is set to true,
    the cache is bypassed and fresh data is fetched from the database. Otherwise, it
    returns schedules from the cache.

    Args:
        fresh (bool): Set to true to bypass cache and refresh data.

    Returns:
        FetchSchedulesResponse: Contains the status code and list of schedules.
    """
    
    return facade.schedules_section.fetch_schedules(fresh)


@router.get("/fetch-instance-schedules", response_model=FetchInstanceSchedulesResponse, dependencies=[Depends(facade.auth.require_permission_flexible("view_schedules"))])
def fetch_instance_schedules(fresh: bool = Query(False, description="Set to true to bypass cache and refresh data")):
    """
    Endpoint to fetch every configured schedule, read from EC2 tags.

    fetch-schedules only reports the EventBridge rules the scheduler lambda has
    created, and it only creates rules for the current day - so a schedule that
    starts on Monday and stops on Friday is missing from it on a Wednesday.
    This endpoint reads the start_time*/stop_time* tags on the instances
    instead, so every configured schedule is returned regardless of whether it
    fires today.

    Args:
        fresh (bool): Set to true to bypass cache and refresh data.

    Returns:
        FetchInstanceSchedulesResponse: Contains the status code and the list of
        schedules, ordered so all rows for one instance sit together.
    """

    return facade.schedules_section.fetch_instance_schedules(fresh)


@router.get("/aws/fetch-available-regions",response_model=FetchAvailableAWSRegionsResponse, dependencies=[Depends(facade.auth.require_permission_flexible("view_schedules"))])
def fetch_available_aws_regions():
    
    """
    Endpoint to fetch available AWS regions.

    This endpoint retrieves a list of available AWS regions configured in the system.
    It returns a response with a status code and the list of regions.

    Returns:
        FetchAvailableAWSRegionsResponse: Contains the status code and list of regions.
    """
    return facade.schedules_section.fetch_available_aws_regions()


@router.get("/aws/fetch-ips", response_model=FetchAWSIPsResponse, dependencies=[Depends(facade.auth.require_permission_flexible("view_schedules"))])
def fetch_aws_ips(fresh: bool = Query(False, description="Set to true to bypass cache and refresh data")):
    """
    Endpoint to fetch AWS IPs.

    This endpoint retrieves a list of AWS IPs for all available regions. If the 'fresh' 
    flag is set to true, the cache is bypassed and fresh IPs are fetched from AWS. 
    Otherwise, it returns IPs from the cache.

    Args:
        fresh (bool): Set to true to bypass cache and refresh data.

    Returns:
        FetchAWSIPsResponse: Contains the status code and a dictionary of IPs per region.
    """

    return facade.schedules_section.fetch_aws_ips(fresh)


@router.get("/fetch-existing-instance-tags",response_model=FetchExistingInstanceTagsResponse, dependencies=[Depends(facade.auth.require_permission_flexible("add_schedules"))])
def fetch_existing_instance_tags(region: str = Query(...), instance_id: str = Query(...)):
    """
    Endpoint to fetch existing instance tags.

    This endpoint retrieves a list of existing instance tags for a given instance
    in a given region. It returns a response with a status code, a list of tags and
    a boolean indicating whether the instance is scheduled or not.

    Args:
        region (str): Region of the instance.
        instance_id (str): ID of the instance.

    Returns:
        FetchExistingInstanceTagsResponse: Contains the status code, list of tags and
        a boolean indicating whether the instance is scheduled or not.
    """
    return facade.schedules_section.fetch_existing_instance_tags(region, instance_id)


@router.post("/update-instance-tags", response_model=UpdateInstanceTagsResponse, dependencies=[Depends(facade.auth.require_permission("add_schedules"))])
def update_instance_tags(req: UpdateInstanceTagsRequest):
    """
    Endpoint to update instance tags.

    This endpoint updates the tags of an instance in a given region. The request
    body should contain the region, instance ID, tags and a boolean indicating
    whether the instance is scheduled or not. It returns a response with a status
    code and a message indicating whether the update was successful or not.

    Args:
        req (UpdateInstanceTagsRequest): Request object containing the region,
            instance ID, tags and schedule status.

    Returns:
        UpdateInstanceTagsResponse: Contains the status code and a message
            indicating whether the update was successful or not.
    """
    
    return facade.schedules_section.update_instance_tags(req)

@router.post("/run-lambda", response_model=RunLambdaResponse, dependencies=[Depends(facade.auth.require_permission("run_lambda"))])
def run_lambda(region: str = Query(..., description="Region to run Lambda from")):
    """
    Endpoint to run a Lambda function in a given region.

    This endpoint runs a Lambda function in the given region. It returns a response
    with a status code and a message indicating whether the Lambda was invoked
    successfully or not.

    Args:
        region (str): Region to run Lambda from.

    Returns:
        RunLambdaResponse: Contains the status code and a message indicating whether
            the Lambda was invoked successfully or not.
    """
    
    return facade.schedules_section.run_lambda(region)
