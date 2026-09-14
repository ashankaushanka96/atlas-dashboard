#!/usr/bin/env python3
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from loguru import logger

# from routes.routes import router as api_router
from routes.component_add_routes import components_add_router 
from routes.component_details_routes import component_details_router
from routes.server_details_routes import server_details_router
from subsystems.database import init_db, close_db
from subsystems.redis import init_redis, close_redis
from facade import facade

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_DIR = os.path.join(BASE_DIR, "logs")
os.makedirs(LOG_DIR, exist_ok=True)

logger.add(
    os.path.join(LOG_DIR, "aggregator_{time:YYYYMMDDHHmmss}.log"),
    rotation="1 day",
    retention="2 days",
    backtrace=True,
    diagnose=True,
    format="{time:YYYY-MM-DD HH:mm:ss.SSS} | {level:<7} | {message}{exception}",
    level="DEBUG",
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup
    await init_db()
    await init_redis()
    await facade.component_tree_section.startup()
    logger.info("Startup complete")
    yield
    # shutdown
    await close_redis()
    await close_db()
    logger.info("Shutdown complete")

app = FastAPI(title="Component Aggregator", version="1.2.0", lifespan=lifespan)
# app.include_router(api_router)
app.include_router(components_add_router)
app.include_router(component_details_router)
app.include_router(server_details_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("aggregator:app", host="0.0.0.0", port=8000)
