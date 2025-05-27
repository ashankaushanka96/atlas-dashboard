from models.response_models import FetchInstancesSummaryResponse, FetchInstanceDetailsResponse, FetchComponentNamesResponse
from facade import Facade
from fastapi import APIRouter, Query

facade = Facade()

router = APIRouter(prefix="/api/v1/ec2-details")

###############################################################################################
#                                  EC2 DETAILS SECTION ENDPOINTS                              #
###############################################################################################
@router.get("/fetch-instance-summary", response_model=FetchInstancesSummaryResponse)
def fetch_instances_summary(fresh: bool = Query(False, description="Set to true to bypass cache and refresh data")):
    return facade.fetch_instances_summary(fresh)

@router.get("/fetch-instance-details", response_model=FetchInstanceDetailsResponse)
def fetch_instance_details(region: str = Query(...), instance_id: str = Query(...)):
    return facade.fetch_instance_details(region, instance_id)

@router.get("/fetch-component-names", response_model=FetchComponentNamesResponse)
def fetch_component_names(ip: str = Query(..., description="IP to get components names")):
    response = facade.fetch_component_names(ip)
    return response