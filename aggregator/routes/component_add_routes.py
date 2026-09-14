from fastapi import APIRouter, HTTPException, Request
from loguru import logger
from models.component_add_section_models import AddModifyPayload
from facade import facade

components_add_router = APIRouter(prefix="/api/v1/components", tags=["Components"])

@components_add_router.post("/add-modify")
async def add_modify_components(payload: AddModifyPayload, request: Request):
    ip = payload.ip or (request.client.host if request.client else None)
    if not ip:
        raise HTTPException(status_code=400, detail="Client IP not available and not provided")
    region = (payload.region or "").strip()
    if not region:
        raise HTTPException(status_code=400, detail="Region is required")

    logger.info(f"Add/Modify request: ip={ip}, region={region}, count={len(payload.components)}")

    try:
        deleted, inserted = await facade.component_service.process_components(
            ip=ip, region=region, components=payload.components
        )
    except Exception:
        logger.exception("Failed processing components")
        raise HTTPException(status_code=500, detail="Failed to process components")

    return {"status": "success", "ip": ip, "region": region, "deleted": deleted, "inserted": inserted}
