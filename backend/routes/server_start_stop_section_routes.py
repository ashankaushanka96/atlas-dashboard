from models.response_models import FetchStartStopInstancesResponse, StartStopInstanceResponse
from models.input_models import StartStopInstanceRequest
from facade import Facade
from fastapi import APIRouter

facade = Facade()

router = APIRouter(prefix="/api/v1/server-start-stop")

###############################################################################################
#                              SERVER START/STOP SECTION ENDPOINTS                            #
###############################################################################################
@router.get("/fetch-start-stop-instances", response_model=FetchStartStopInstancesResponse)
def fetch_start_stop_instances():
    return facade.fetch_start_stop_instances()

@router.post("/start-stop-instance", response_model=StartStopInstanceResponse)
def start_stop_instance(req: StartStopInstanceRequest):
    return facade.start_stop_instance(region=req.region, instance_id=req.instance_id, action=req.action)