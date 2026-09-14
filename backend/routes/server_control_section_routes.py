from models.server_control_section_models import *
from facade import facade
from fastapi import APIRouter, Depends, Query

router = APIRouter(prefix="/api/v1/server-start-stop", tags=["Server Handler"])

###############################################################################################
#                              SERVER START/STOP SECTION ENDPOINTS                            #
###############################################################################################
@router.get("/fetch-start-stop-instances", response_model=FetchStartStopInstancesResponse, dependencies=[Depends(facade.auth.require_permission_flexible("view_server_control"))])
def fetch_start_stop_instances(fresh: bool = Query(False, description="Set to true to bypass cache and refresh data")):
    """
    Endpoint to fetch EC2 instances that can be started or stopped.

    This endpoint returns a list of EC2 instances across all regions that can be
    started or stopped. It returns a response with a status code and a list of
    instances, each containing the region, instance ID, instance name, private IP
    and the current status of the instance.

    Returns:
        FetchStartStopInstancesResponse: Contains the status code and list of
            instances.
    """

    return facade.server_control_section.fetch_start_stop_instances(fresh=fresh)

@router.post("/start-stop-instance", response_model=StartStopInstanceResponse, dependencies=[Depends(facade.auth.require_permission("start_stop_servers"))])
def start_stop_instance(req: StartStopInstanceRequest):
    """
    Endpoint to start or stop an EC2 instance.

    This endpoint starts or stops an EC2 instance identified by its region and
    instance ID. It returns a response with a status code and a message
    indicating whether the operation was successful or not.

    Args:
        req: A StartStopInstanceRequest object containing the region, instance ID
            and the action to be performed (start or stop).

    Returns:
        StartStopInstanceResponse: Contains the status code and a message
            indicating whether the operation was successful or not.
    """

    return facade.server_control_section.start_stop_instance(region=req.region, instance_id=req.instance_id, action=req.action)
