import asyncio
from facade import Facade
from loguru import logger

facade = Facade()
# Global cache variables.
cached_schedules = None
cached_components = None  # <-- new cache variable for components
cached_ips = {}  # Dictionary to store IPs per region
cached_instances_summary = None


async def schedules_cache_refresh():
    while True:
        try:
            logger.info("Starting scheduled update of schedules cache.")
            facade.fetch_schedules(fresh=True)
            logger.info("Events cache updated successfully.")
        except Exception as e:
            logger.exception("Error updating schedules cache: {}", e)
        await asyncio.sleep(30 * 60)  # Sleep for 30 minutes


async def ips_cache_refresh():
    available_aws_regions = facade.fetch_available_aws_regions().regions
    while True:
        try:
            logger.info("Starting scheduled update of IPs cache.")
            for region in available_aws_regions:
                facade.fetch_aws_ips(region=region, fresh=True)
            logger.info("IPs cache updated successfully.")
        except Exception as e:
            logger.exception("Error updating IPs cache: {}", e)
        await asyncio.sleep(3 * 60 * 60)  # Sleep for 3 hours


async def components_cache_refresh():
    global cached_components
    while True:
        try:
            logger.info("Starting scheduled update of components cache.")
            facade.fetch_components(fresh=True)
            logger.info("Components cache updated successfully.")
        except Exception as e:
            logger.exception("Error updating components cache: {}", e)
        await asyncio.sleep(30 * 60)  # Sleep for 30 minutes

async def instances_summary_cache_refresh():
    global cached_instances_summary
    while True:
        try:
            logger.info("Starting scheduled update of instances summary cache.")
            facade.fetch_instances_summary(fresh=True)
            logger.info("Instances summary cache updated successfully.")
        except Exception as e:
            logger.exception("Error updating instances summary cache: {}", e)
        await asyncio.sleep(30 * 60)  # Sleep for 30 minutes