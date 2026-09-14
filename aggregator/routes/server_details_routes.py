from fastapi import APIRouter, HTTPException
from loguru import logger

from facade import facade
from models.server_details_models import ServerDetailsPayload

server_details_router = APIRouter(prefix="/api/v1/server", tags=["Server_Details"])


@server_details_router.post("/ingest-server-details")
async def ingest_server_details(payload: ServerDetailsPayload):
    region = payload.region.strip()
    hostname = payload.hostname.strip()
    primary_ip = payload.primary_ip.strip()

    if not region:
        raise HTTPException(status_code=400, detail="Region is required")
    if not hostname:
        raise HTTPException(status_code=400, detail="Hostname is required")
    if not primary_ip:
        raise HTTPException(status_code=400, detail="Primary IP is required")

    payload.region = region
    payload.hostname = hostname
    payload.primary_ip = primary_ip

    logger.info(
        "Server details ingest request: region={} hostname={} primary_ip={}",
        region,
        hostname,
        primary_ip,
    )

    try:
        return await facade.server_details_service.ingest_server_details(payload)
    except Exception:
        logger.exception("Failed processing server details ingest")
        raise HTTPException(status_code=500, detail="Failed to process server details")
