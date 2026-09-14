import asyncio
import os
import pyfiglet
from fastapi import FastAPI
from fastapi.security import HTTPBearer
from fastapi.openapi.utils import get_openapi
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from loguru import logger
from cache import (
    schedules_cache_refresh,
    instance_schedules_cache_refresh,
    ips_cache_refresh,
    components_cache_refresh,
    instances_summary_cache_refresh,
    lambda_functions_summary_cache_refresh,
    ecs_clusters_summary_cache_refresh,
    ecs_services_summary_cache_refresh,
    eks_clusters_summary_cache_refresh,
    msk_clusters_summary_cache_refresh,
    redis_clusters_summary_cache_refresh,
    load_balancers_summary_cache_refresh,
    elasticache_clusters_summary_cache_refresh,
    server_details_cache_refresh,
    server_control_instances_cache_refresh,
    route53_cache_refresh,
    server_details_aws_sync_refresh,
)

# Import your routers and error handler as needed
from routes.component_section_routes import router as component_router
from routes.schedules_section_routes import router as schedules_router
from routes.ec2_details_section_routes import router as ec2_details_router
from routes.server_control_section_routes import router as server_control_router
from routes.route53_section_routes import router as route53_router
from routes.authentication_routes import router as auth_router
from routes.component_tree_section_routes import router as component_tree_router
from routes.component_details_routes import component_details_router
from routes.lambda_section_routes import router as lambda_router
from routes.ecs_section_routes import router as ecs_router
from routes.eks_section_routes import router as eks_router
from routes.msk_section_routes import router as msk_router
from routes.redis_section_routes import router as redis_router
from routes.loadbalancer_section_routes import router as loadbalancer_router
from routes.elasticache_section_routes import router as elasticache_router
from routes.datadog_metrics_routes import router as datadog_metrics_router
from routes.server_details_section_routes import router as server_details_router
from routes.table_preferences_section_routes import router as table_preferences_router
from routes.watcher_control_section_routes import router as watcher_control_router
from subsystems.logger_config import LoggerConfigurator
from subsystems.error_handlers import ErrorHandler
from subsystems.redis import init_redis, close_redis

# Configure logging
LoggerConfigurator.configure()


def should_skip_startup_cache_tasks() -> bool:
    return os.getenv("SKIP_STARTUP_CACHE_TASKS", "").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }

async def log_banner():
    await asyncio.sleep(0.2)
    ascii_banner = pyfiglet.figlet_format("Application Started", font="slant")
    logger.info("\n" + ascii_banner)

# Uncomment and use lifespan for background tasks if desired
@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_redis()
    background_tasks = []

    if should_skip_startup_cache_tasks():
        logger.info("Skipping startup cache refresh tasks because SKIP_STARTUP_CACHE_TASKS is enabled.")
    else:
        background_tasks = [
            asyncio.create_task(schedules_cache_refresh()),
            asyncio.create_task(instance_schedules_cache_refresh()),
            asyncio.create_task(ips_cache_refresh()),
            asyncio.create_task(components_cache_refresh()),
            asyncio.create_task(instances_summary_cache_refresh()),
            asyncio.create_task(lambda_functions_summary_cache_refresh()),
            asyncio.create_task(ecs_clusters_summary_cache_refresh()),
            asyncio.create_task(ecs_services_summary_cache_refresh()),
            asyncio.create_task(eks_clusters_summary_cache_refresh()),
            asyncio.create_task(msk_clusters_summary_cache_refresh()),
            asyncio.create_task(redis_clusters_summary_cache_refresh()),
            asyncio.create_task(load_balancers_summary_cache_refresh()),
            asyncio.create_task(elasticache_clusters_summary_cache_refresh()),
            asyncio.create_task(server_details_cache_refresh()),
            asyncio.create_task(server_control_instances_cache_refresh()),
            asyncio.create_task(route53_cache_refresh()),
            asyncio.create_task(server_details_aws_sync_refresh()),
        ]

    asyncio.create_task(log_banner())
    yield
    await close_redis()
    for task in background_tasks:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass

tags_metadata = [
    {"name": "Component DB",   "description": "Manage components and fetch component data."},
    {"name": "EC2 Schedules",    "description": "Manage your EC2 start/stop schedules."},
    {"name": "EC2",  "description": "Fetch EC2 instance details and summaries."},
    {"name": "Server Handler","description": "Start/stop EC2 instances."},
    {"name": "Route53 Status",      "description": "Manage Route53 records and zones."},
    {"name": "Authentication","description": "Authentication endpoints."},
    {"name": "Component Map", "description": "Visualize component connections and relationships."},
    {"name": "Component Watcher", "description": "Component details and websocket connections."},
    {"name": "Lambda",       "description": "Fetch Lambda functions details and summaries."},
    {"name": "ECS",          "description": "Fetch ECS clusters and services details and summaries."},
    {"name": "EKS",          "description": "Fetch EKS clusters details and summaries."},
    {"name": "MSK",          "description": "Fetch MSK clusters details and summaries."},
    {"name": "Redis",        "description": "Fetch Redis clusters details and summaries."},
    {"name": "Load Balancer","description": "Fetch Load Balancers (ALB, NLB, CLB) details and summaries."},
    {"name": "ElastiCache",  "description": "Fetch ElastiCache clusters details and summaries."},
    {"name": "Datadog Metrics", "description": "Fetch Datadog metrics for configured queries."},
    {"name": "Server Details", "description": "Fetch ingested server details for frontend tables."},
    {"name": "Table Preferences", "description": "Per-user table column visibility/order preferences."},
    {"name": "Watcher Control", "description": "Restart watchers and manage their component config.ini remotely."},
]

app = FastAPI(
    title="Feed Dashboard Backend",
    version="1.0.0",
    openapi_tags=tags_metadata,
    lifespan=lifespan,
    docs_url="/swagger",
)

# Instantiate an HTTP Bearer scheme for Swagger UI docs
bearer_scheme = HTTPBearer(auto_error=False)

# Override OpenAPI to show only bearerAuth for protected routes

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    # generate the base schema
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        routes=app.routes,
    )

    # inject our HTTP bearer scheme
    openapi_schema["components"]["securitySchemes"]["bearerAuth"] = {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT",
    }

    # replace OAuth2PasswordBearer with bearerAuth only on secured endpoints
    for path_item in openapi_schema.get("paths", {}).values():
        for operation in path_item.values():
            security = operation.get("security")
            if not security:
                continue
            new_security = []
            for sec_req in security:
                if "OAuth2PasswordBearer" in sec_req:
                    # switch to our bearerAuth
                    new_security.append({"bearerAuth": []})
                else:
                    # keep any other security requirements
                    new_security.append(sec_req)
            operation["security"] = new_security

    # remove the default OAuth2PasswordBearer scheme entirely
    openapi_schema["components"]["securitySchemes"].pop("OAuth2PasswordBearer", None)

    app.openapi_schema = openapi_schema
    return app.openapi_schema

# apply our custom OpenAPI builder
app.openapi = custom_openapi

# CORS
origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(component_router)
app.include_router(component_details_router)
app.include_router(component_tree_router)
app.include_router(schedules_router)
app.include_router(ec2_details_router)
app.include_router(lambda_router)
app.include_router(ecs_router)
app.include_router(eks_router)
app.include_router(msk_router)
app.include_router(redis_router)
app.include_router(loadbalancer_router)
app.include_router(elasticache_router)
app.include_router(datadog_metrics_router)
app.include_router(server_details_router)
app.include_router(table_preferences_router)
app.include_router(route53_router)
app.include_router(server_control_router)
app.include_router(watcher_control_router)
app.include_router(auth_router)




# Error handlers
ErrorHandler.register(app)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend:app", host="0.0.0.0", port=8080)
