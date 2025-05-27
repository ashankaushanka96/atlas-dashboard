from models.response_models import FetchAllRegionsResponse, FetchPlatformsResponse, FetchComponentsResponse, AddComponentResponse, DeleteComponentResponse, SyncComponentsResponse
from models.other_models import Component
from models.input_models import ComponentList
from facade import Facade
from fastapi import APIRouter, Query

facade = Facade()

router = APIRouter(prefix="/api/v1/components")


###############################################################################################
#                                  COMPONENTS SECTION ENDPOINTS                               #
###############################################################################################
@router.get("/fetch-all-regions", response_model=FetchAllRegionsResponse)
def fetch_all_regions():
    return facade.fetch_all_regions()


@router.get("/fetch-platforms", response_model=FetchPlatformsResponse)
def fetch_platforms():
    return facade.fetch_platforms()


@router.get("/fetch-components", response_model=FetchComponentsResponse)
def fetch_components(fresh: bool = Query(False, description="Set to true to bypass cache and refresh data")):
    return facade.fetch_components(fresh)

@router.get("/fetch-components-by-ip", response_model=FetchComponentsResponse)
def fetch_components_by_ip(ip: str = Query(..., description="IP to get components names"), region: str = Query(..., description="Region to get components names")):
    return facade.fetch_components_by_ip(ip, region)


@router.post("/add-component", response_model=AddComponentResponse)
def add_component(component: Component):
    return facade.add_component(component)


@router.delete("/delete-component", response_model=DeleteComponentResponse)
def delete_component(component: Component):
    return facade.delete_component(component)

@router.post("/sync-components", response_model=SyncComponentsResponse)
def sync_components(payload: ComponentList):
    return facade.sync_components(payload.components)
   

