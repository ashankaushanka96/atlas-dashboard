import asyncio
from facade import facade
from loguru import logger

# Global cache variables.
cached_schedules = None
cached_instance_schedules = None  # recurring schedules read from EC2 tags
cached_components = None  # <-- new cache variable for components
cached_ips = {}  # Dictionary to store IPs per region
cached_instances_summary = None
cached_lambda_functions_summary = None
cached_ecs_clusters_summary = None
cached_ecs_services_summary = None
cached_eks_clusters_summary = None
cached_msk_clusters_summary = None
cached_redis_clusters_summary = None
cached_load_balancers_summary = None
cached_elasticache_clusters_summary = None
cached_server_details = None
cached_server_control_instances = None
cached_route53_details = None
cached_route53_detail_by_zone = {}


async def schedules_cache_refresh():
    while True:
        try:
            logger.info("Starting scheduled update of schedules cache.")
            facade.schedules_section.fetch_schedules(fresh=True)
            logger.info("Events cache updated successfully.")
        except Exception as e:
            logger.exception("Error updating schedules cache: {}", e)
        await asyncio.sleep(30 * 60)  # Sleep for 30 minutes


async def instance_schedules_cache_refresh():
    while True:
        try:
            logger.info("Starting scheduled update of instance schedules cache.")
            facade.schedules_section.fetch_instance_schedules(fresh=True)
            logger.info("Instance schedules cache updated successfully.")
        except Exception as e:
            logger.exception("Error updating instance schedules cache: {}", e)
        await asyncio.sleep(30 * 60)  # Sleep for 30 minutes


async def ips_cache_refresh():
    while True:
        try:
            logger.info("Starting scheduled update of IPs cache.")
            facade.schedules_section.fetch_aws_ips(fresh=True)
            logger.info("IPs cache updated successfully.")
        except Exception as e:
            logger.exception("Error updating IPs cache: {}", e)
        await asyncio.sleep(3 * 60 * 60)  # Sleep for 3 hours


async def components_cache_refresh():
    global cached_components
    while True:
        try:
            logger.info("Starting scheduled update of components cache.")
            facade.component_section.fetch_components(fresh=True)
            logger.info("Components cache updated successfully.")
        except Exception as e:
            logger.exception("Error updating components cache: {}", e)
        await asyncio.sleep(30 * 60)  # Sleep for 30 minutes

async def instances_summary_cache_refresh():
    global cached_instances_summary
    while True:
        try:
            logger.info("Starting scheduled update of instances summary cache.")
            facade.ec2_details_section.fetch_instances_summary(fresh=True)
            logger.info("Instances summary cache updated successfully.")
        except Exception as e:
            logger.exception("Error updating instances summary cache: {}", e)
        await asyncio.sleep(30 * 60)  # Sleep for 30 minutes

async def lambda_functions_summary_cache_refresh():
    global cached_lambda_functions_summary
    while True:
        try:
            logger.info("Starting scheduled update of Lambda functions summary cache.")
            facade.lambda_section.fetch_lambda_functions_summary(fresh=True)
            logger.info("Lambda functions summary cache updated successfully.")
        except Exception as e:
            logger.exception("Error updating Lambda functions summary cache: {}", e)
        await asyncio.sleep(30 * 60)  # Sleep for 30 minutes

async def ecs_clusters_summary_cache_refresh():
    global cached_ecs_clusters_summary
    while True:
        try:
            logger.info("Starting scheduled update of ECS clusters summary cache.")
            facade.ecs_section.fetch_ecs_clusters_summary(fresh=True)
            logger.info("ECS clusters summary cache updated successfully.")
        except Exception as e:
            logger.exception("Error updating ECS clusters summary cache: {}", e)
        await asyncio.sleep(30 * 60)  # Sleep for 30 minutes

async def ecs_services_summary_cache_refresh():
    global cached_ecs_services_summary
    while True:
        try:
            logger.info("Starting scheduled update of ECS services summary cache.")
            facade.ecs_section.fetch_ecs_services_summary(fresh=True)
            logger.info("ECS services summary cache updated successfully.")
        except Exception as e:
            logger.exception("Error updating ECS services summary cache: {}", e)
        await asyncio.sleep(30 * 60)  # Sleep for 30 minutes

async def eks_clusters_summary_cache_refresh():
    global cached_eks_clusters_summary
    while True:
        try:
            logger.info("Starting scheduled update of EKS clusters summary cache.")
            facade.eks_section.fetch_eks_clusters_summary(fresh=True)
            logger.info("EKS clusters summary cache updated successfully.")
        except Exception as e:
            logger.exception("Error updating EKS clusters summary cache: {}", e)
        await asyncio.sleep(30 * 60)  # Sleep for 30 minutes

async def msk_clusters_summary_cache_refresh():
    global cached_msk_clusters_summary
    while True:
        try:
            logger.info("Starting scheduled update of MSK clusters summary cache.")
            facade.msk_section.fetch_msk_clusters_summary(fresh=True)
            logger.info("MSK clusters summary cache updated successfully.")
        except Exception as e:
            logger.exception("Error updating MSK clusters summary cache: {}", e)
        await asyncio.sleep(30 * 60)  # Sleep for 30 minutes

async def redis_clusters_summary_cache_refresh():
    global cached_redis_clusters_summary
    while True:
        try:
            logger.info("Starting scheduled update of Redis clusters summary cache.")
            facade.redis_section.fetch_redis_clusters_summary(fresh=True)
            logger.info("Redis clusters summary cache updated successfully.")
        except Exception as e:
            logger.exception("Error updating Redis clusters summary cache: {}", e)
        await asyncio.sleep(30 * 60)  # Sleep for 30 minutes

async def load_balancers_summary_cache_refresh():
    global cached_load_balancers_summary
    while True:
        try:
            logger.info("Starting scheduled update of Load Balancers summary cache.")
            facade.loadbalancer_section.fetch_load_balancers_summary(fresh=True)
            logger.info("Load Balancers summary cache updated successfully.")
        except Exception as e:
            logger.exception("Error updating Load Balancers summary cache: {}", e)
        await asyncio.sleep(30 * 60)  # Sleep for 30 minutes

async def elasticache_clusters_summary_cache_refresh():
    global cached_elasticache_clusters_summary
    while True:
        try:
            logger.info("Starting scheduled update of ElastiCache clusters summary cache.")
            facade.elasticache_section.fetch_elasticache_clusters_summary(fresh=True)
            logger.info("ElastiCache clusters summary cache updated successfully.")
        except Exception as e:
            logger.exception("Error updating ElastiCache clusters summary cache: {}", e)
        await asyncio.sleep(30 * 60)  # Sleep for 30 minutes


async def server_details_cache_refresh():
    global cached_server_details
    while True:
        try:
            logger.info("Starting scheduled update of server details cache.")
            facade.server_details_section.fetch_server_details(fresh=True)
            logger.info("Server details cache updated successfully.")
        except Exception as e:
            logger.exception("Error updating server details cache: {}", e)
        await asyncio.sleep(30 * 60)  # Sleep for 30 minutes

async def server_control_instances_cache_refresh():
    global cached_server_control_instances
    while True:
        try:
            logger.info("Starting scheduled update of server control instances cache.")
            facade.server_control_section.fetch_start_stop_instances(fresh=True)
            logger.info("Server control instances cache updated successfully.")
        except Exception as e:
            logger.exception("Error updating server control instances cache: {}", e)
        await asyncio.sleep(10 * 60)  # Sleep for 10 minutes

async def route53_cache_refresh():
    global cached_route53_details, cached_route53_detail_by_zone
    while True:
        try:
            logger.info("Starting scheduled update of Route53 cache.")
            facade.route53_section.get_all_zones(fresh=True)
            logger.info("Route53 cache updated successfully.")
        except Exception as e:
            logger.exception("Error updating Route53 cache: {}", e)
        await asyncio.sleep(10 * 60)  # Sleep for 10 minutes


async def server_details_aws_sync_refresh():
    while True:
        try:
            logger.info("Starting scheduled AWS server details synchronization.")
            await asyncio.to_thread(facade.server_details_section.sync_server_details_from_aws)
            facade.server_details_section.fetch_server_details(fresh=True)
            logger.info("Scheduled AWS server details synchronization completed successfully.")
        except Exception as e:
            logger.exception("Error synchronizing AWS server details: {}", e)
        await asyncio.sleep(3 * 60 * 60)  # Sleep for 3 hours

def clear_msk_cache():
    """Clear the MSK clusters cache to force fresh data fetch."""
    global cached_msk_clusters_summary
    cached_msk_clusters_summary = None
    logger.info("MSK clusters cache cleared.")
