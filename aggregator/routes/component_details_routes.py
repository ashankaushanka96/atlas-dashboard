from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from models.component_details_section_models import ComponentDetailsPayload, MapResponse, UnconfiguredResponse
from facade import facade
import asyncio
from loguru import logger

component_details_router = APIRouter(prefix="/api/v1/component", tags=["Component_Tree"])

@component_details_router.post("/ingest-component")
async def ingest_component_details(payload: ComponentDetailsPayload):
    logger.info("Received component details payload for component={} on server={}", payload.component, payload.server_ip)
    return await facade.component_tree_section.ingest_component_details(payload)

@component_details_router.get("/map", response_model=MapResponse)
async def get_component_map():
    return await facade.component_tree_section.get_component_map()

@component_details_router.get("/unconfigured", response_model=UnconfiguredResponse)
async def get_unconfigured_components():
    return await facade.component_tree_section.get_unconfigured_components()

@component_details_router.websocket("/ws-component-details")
async def ws_component_details(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await facade.component_tree_section.get_component_details_no_connections()
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
