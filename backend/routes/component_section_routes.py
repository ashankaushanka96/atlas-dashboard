from models.component_section_models import *
from facade import facade
from fastapi import APIRouter, Query, Depends

router = APIRouter(prefix="/api/v1/components", tags=["Components"])

@router.get("/fetch-all-regions", response_model=FetchAllRegionsResponse, dependencies=[Depends(facade.auth.require_permission_flexible("view_components"))])
def fetch_all_regions():
    """
    Endpoint to fetch all regions.

    This endpoint retrieves a list of all regions configured in the system.
    It returns a response with a status code and the list of regions.

    Returns:
        FetchAllRegionsResponse: Contains the status code and list of regions.
    """
    return facade.component_section.fetch_all_regions()


@router.get("/fetch-platforms", response_model=FetchPlatformsResponse, dependencies=[Depends(facade.auth.require_permission_flexible("view_components"))])
def fetch_platforms():
    """
    Endpoint to fetch all platforms.

    This endpoint retrieves a list of all platforms configured in the system.
    It returns a response with a status code and the list of platforms.

    Returns:
        FetchPlatformsResponse: Contains the status code and list of platforms.
    """
    
    return facade.component_section.fetch_platforms()


@router.get("/fetch-components", response_model=FetchComponentsResponse, dependencies=[Depends(facade.auth.require_permission_flexible("view_components"))])
def fetch_components(fresh: bool = Query(False, description="Set to true to bypass cache and refresh data")):
    """
    Endpoint to fetch components.

    This endpoint retrieves a list of components. If the 'fresh' flag is set to true,
    the cache is bypassed and fresh data is fetched from the database. Otherwise, it
    returns components from the cache.

    Args:
        fresh (bool): Set to true to bypass cache and refresh data.

    Returns:
        FetchComponentsResponse: Contains the status code and list of components.
    """

    return facade.component_section.fetch_components(fresh)

@router.get("/fetch-component-detail", response_model=FetchComponentDetailResponse, dependencies=[Depends(facade.auth.require_permission_flexible("view_components"))])
def fetch_component_detail(
    region: str = Query(..., description="Region for the component"),
    ip: str = Query(..., description="IP address for the component"),
    component_name: str = Query(..., description="Component name"),
    platform: str = Query(..., description="Component platform"),
    comp_path: str = Query(..., description="Component path"),
):
    return facade.component_section.fetch_component_detail(
        region=region,
        ip=ip,
        component_name=component_name,
        platform=platform,
        comp_path=comp_path,
    )

@router.get("/fetch-components-by-ip", response_model=FetchComponentsResponse, dependencies=[Depends(facade.auth.require_permission_flexible("view_components"))])
def fetch_components_by_ip(ip: str = Query(..., description="IP to get components names"), region: str = Query(..., description="Region to get components names")):
    """
    Endpoint to fetch components by IP and region.

    This endpoint retrieves a list of components associated with the specified IP address
    and region. It returns a response containing the status code and the list of components.

    Args:
        ip (str): The IP address to get components names.
        region (str): The region to get components names.

    Returns:
        FetchComponentsResponse: Contains the status code and list of components.
    """

    return facade.component_section.fetch_components_by_ip(ip, region)


@router.post("/add-component", response_model=AddComponentResponse, dependencies=[Depends(facade.auth.require_permission("add_components"))])
def add_component(component: Component):
    """
    Endpoint to add a component to the database.

    This endpoint adds a component to the database. It returns a response with a status code
    and a message indicating the result of the operation.

    Args:
        component (Component): The component to add.

    Returns:
        AddComponentResponse: Contains the status code and message.
    """
    return facade.component_section.add_component(component)


@router.delete("/delete-component", response_model=DeleteComponentResponse, dependencies=[Depends(facade.auth.require_permission("add_components"))])
def delete_component(component: Component):
    """
    Endpoint to delete a component from the database.

    This endpoint deletes the specified component from the database. It returns
    a response containing the status code and a message indicating the result of
    the operation.

    Args:
        component (Component): The component to delete.

    Returns:
        DeleteComponentResponse: Contains the status code and message.
    """

    return facade.component_section.delete_component(component)

@router.post("/sync-components", response_model=SyncComponentsResponse, dependencies=[Depends(facade.auth.require_permission("add_components"))])
def sync_components(payload: ComponentList):
    """
    Endpoint to synchronize components in the database.

    This endpoint synchronizes the components in the database with the provided list.
    It returns a response containing the status code and a message indicating the result
    of the operation.

    Args:
        payload (ComponentList): The list of components to synchronize.

    Returns:
        SyncComponentsResponse: Contains the status code, message, and counts of
            components added, updated, and deleted.
    """
    return facade.component_section.sync_components(payload.components)
   

