import asyncio
import pyfiglet
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from loguru import logger
from cache import (
    schedules_cache_refresh,
    ips_cache_refresh,
    components_cache_refresh,
    instances_summary_cache_refresh,
)

# Import your routers and error handler as needed
from routes.component_section_routes import router as component_router
from routes.scheduler_section_routes import router as scheduler_router
from routes.ec2_details_section_routes import router as ec2_details_router
from routes.server_start_stop_section_routes import router as server_start_stop_router
from routes.route53_section import router as route53_router
from routes.other_routes import router as other_router
from subsystems.logger_config import LoggerConfigurator
from subsystems.error_handlers import ErrorHandler

LoggerConfigurator.configure()

async def log_banner():
    await asyncio.sleep(0.2)
    ascii_banner = pyfiglet.figlet_format("Application Started", font="slant")
    logger.info("\n" + ascii_banner)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create the background cache update tasks.
    events_cache_task = asyncio.create_task(schedules_cache_refresh())
    ips_cache_task = asyncio.create_task(ips_cache_refresh())
    components_cache_task = asyncio.create_task(components_cache_refresh())
    instances_summary_cache_task = asyncio.create_task(instances_summary_cache_refresh())
    
    # Schedule the banner logging to occur shortly after startup completes.
    asyncio.create_task(log_banner())
    
    yield
    
    # Shutdown: cancel the background tasks.
    events_cache_task.cancel()
    ips_cache_task.cancel()
    components_cache_task.cancel()
    instances_summary_cache_task.cancel()
    try:
        await events_cache_task
    except asyncio.CancelledError:
        pass
    try:
        await ips_cache_task
    except asyncio.CancelledError:
        pass
    try:
        await components_cache_task
    except asyncio.CancelledError:
        pass
    try:
        await instances_summary_cache_task
    except asyncio.CancelledError:
        pass

app = FastAPI(lifespan=lifespan)
# app = FastAPI()
origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(component_router)
app.include_router(scheduler_router)
app.include_router(ec2_details_router)
app.include_router(server_start_stop_router)
app.include_router(other_router)
app.include_router(route53_router)

ErrorHandler.register(app)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("feed_dashboard_backend:app", host="0.0.0.0", port=8000)
