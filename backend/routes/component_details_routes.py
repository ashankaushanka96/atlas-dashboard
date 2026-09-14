from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from models.component_details_section_models import (
    ComponentDetailsPayload,
    ComponentMaxUpDaysResponse,
    ComponentStatusDetailResponse,
    MapResponse,
    UnconfiguredResponse,
)
from facade import facade
import asyncio
from fastapi import Query

component_details_router = APIRouter(prefix="/api/v1/component", tags=["Component Watcher"])

@component_details_router.post("/ingest-component", dependencies=[Depends(facade.auth.require_api_key_permission("add_components"))])
async def ingest_component_details(payload: ComponentDetailsPayload):
    return await facade.component_details_section.ingest_component_details(payload)

@component_details_router.get("/map", response_model=MapResponse, dependencies=[Depends(facade.auth.require_permission_flexible("view_component_tree"))])
async def get_component_map():
    return await facade.component_details_section.get_component_map()

@component_details_router.get("/unconfigured", response_model=UnconfiguredResponse, dependencies=[Depends(facade.auth.require_permission_flexible("view_component_tree"))])
async def get_unconfigured_components():
    return await facade.component_details_section.get_unconfigured_components()

@component_details_router.get(
    "/detail",
    response_model=ComponentStatusDetailResponse,
    dependencies=[Depends(facade.auth.require_permission_flexible("view_component_tree"))],
)
async def get_component_status_detail(
    ip: str = Query(..., description="IP address for the watcher status component"),
    component: str = Query(..., description="Component name for the watcher status component"),
):
    return await facade.component_details_section.get_component_status_detail(ip, component)

@component_details_router.get(
    "/max-up-days",
    response_model=ComponentMaxUpDaysResponse,
    dependencies=[Depends(facade.auth.require_permission_flexible("view_component_tree"))],
)
async def get_component_max_up_days(
    ip: str = Query(..., description="IP address for the watcher status component"),
    component: str = Query(..., description="Component name for the watcher status component"),
):
    return await facade.component_details_section.get_component_max_up_days(ip, component)

@component_details_router.websocket("/ws-component-details")
async def ws_component_details(websocket: WebSocket):
    token = websocket.query_params.get("token")
    try:
        facade.auth.authenticate_websocket_token(token)
    except HTTPException:
        await websocket.close(code=1008)
        return

    await websocket.accept()
    try:
        while True:
            data = await facade.component_details_section.get_component_status_summaries()
            await websocket.send_json({"type": "component_details", "data": data})
            await asyncio.sleep(20)
    except WebSocketDisconnect:
        # client closed; just exit the loop
        return
    except Exception as e:
        # optionally log, then close
        try:
            await websocket.close(code=1011)
        finally:
            return
