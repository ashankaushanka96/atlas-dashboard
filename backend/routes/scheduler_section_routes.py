from models.response_models import FetchSchedulesResponse, FetchAWSIPsResponse, FetchExistingInstanceTagsResponse, FetchAvailableAWSRegionsResponse, UpdateInstanceTagsResponse, RunLambdaResponse
from models.input_models import UpdateInstanceTagsRequest
from facade import Facade
from fastapi import APIRouter, Query

facade = Facade()

router = APIRouter(prefix="/api/v1/schedules")

###############################################################################################
#                                  SCHEDULER SECTION ENDPOINTS                                #
###############################################################################################
@router.get("/fetch-schedules", response_model=FetchSchedulesResponse)
def fetch_schedules(fresh: bool = Query(False, description="Set to true to bypass cache and refresh data")):
    return facade.fetch_schedules(fresh)


@router.get("/aws/fetch-available-regions",response_model=FetchAvailableAWSRegionsResponse)
def fetch_available_aws_regions():
    return facade.fetch_available_aws_regions()


@router.get("/aws/fetch-ips", response_model=FetchAWSIPsResponse)
def fetch_aws_ips(fresh: bool = Query(False, description="Set to true to bypass cache and refresh data")):
    return facade.fetch_aws_ips(fresh)


@router.get("/fetch-existing-instance-tags",response_model=FetchExistingInstanceTagsResponse)
def fetch_existing_instance_tags(region: str = Query(...), instance_id: str = Query(...)):
    return facade.fetch_existing_instance_tags(region, instance_id)


@router.post("/update-instance-tags", response_model=UpdateInstanceTagsResponse)
def update_instance_tags(req: UpdateInstanceTagsRequest):
    return facade.update_instance_tags(req)

@router.post("/run-lambda", response_model=RunLambdaResponse)
def run_lambda(region: str = Query(..., description="Region to run Lambda from")):
    return facade.run_lambda(region)