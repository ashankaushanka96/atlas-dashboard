import cache
from loguru import logger
from models.schedules_section_models import (
    FetchSchedulesResponse,
    FetchInstanceSchedulesResponse,
    FetchAvailableAWSRegionsResponse,
    FetchAWSIPsResponse,
    FetchExistingInstanceTagsResponse,
    UpdateInstanceTagsRequest,
    UpdateInstanceTagsResponse,
    RunLambdaResponse,
)
from subsystems.database import Database
from subsystems.aws import AWS

class SchedulesSection:
    def __init__(self, db: Database, config: dict):
        self.db = db
        self.config = config

        self.aws = AWS(config=self.config)

        self.available_aws_regions = self.config.get("available_aws_regions", [])

    def fetch_schedules(self, fresh: bool = False):
        logger.info("Fetching events; fresh flag is {}.", fresh)
        if fresh or cache.cached_schedules is None:
            try:
                cache.cached_schedules = self.aws.fetch_schedules()
                logger.info("Schedules cache updated with fresh data.")
            except Exception as e:
                logger.exception("Error fetching fresh schedules: {}", e)
                raise
        logger.info("Returning schedules from cache.")
        return FetchSchedulesResponse(status_code=200, schedules=cache.cached_schedules)

    def fetch_instance_schedules(self, fresh: bool = False):
        logger.info("Fetching instance schedules; fresh flag is {}.", fresh)
        if fresh or cache.cached_instance_schedules is None:
            try:
                cache.cached_instance_schedules = self.aws.fetch_instance_schedules()
                logger.info("Instance schedules cache updated with fresh data.")
            except Exception as e:
                logger.exception("Error fetching fresh instance schedules: {}", e)
                raise
        logger.info("Returning instance schedules from cache.")
        return FetchInstanceSchedulesResponse(
            status_code=200, schedules=cache.cached_instance_schedules
        )

    def fetch_available_aws_regions(self):
        logger.info("Fetching Available AWS Regions.")
        return FetchAvailableAWSRegionsResponse(status_code=200, regions=self.available_aws_regions)

    def fetch_aws_ips(self, fresh: bool = False):
        logger.info("Fetching AWS IPs; fresh flag is {}.", fresh)
        # If fresh is True or the cache is empty, update the cache for all regions.
        if fresh or not cache.cached_ips:
            for region in self.available_aws_regions:
                try:
                    cache.cached_ips[region] = self.aws.fetch_aws_ips(region)
                    logger.info("IPs cache updated with fresh IPs for region: {}", region)
                except Exception as e:
                    logger.exception("Error fetching fresh IPs for region {}: {}", region, e)
                    raise

        logger.info("Returning IPs from cache.")
        return FetchAWSIPsResponse(status_code=200, ips=cache.cached_ips)


    def fetch_existing_instance_tags(self, region: str, instance_id: str):
        logger.info("Fetching existing instance tags; region: {}, instance_id: {}",region,instance_id)
        if region not in self.available_aws_regions:
            logger.error("Region not available: {}", region)
            raise ValueError("Region not available")
        try:
            schedule_enabled_value, tags_list = self.aws.fetch_existing_instance_tags(region, instance_id)
        except Exception as e:
            logger.exception("Error fetching existing instance tags: {}", e)
            raise
        logger.info("Returning existing instance tags.")
        return FetchExistingInstanceTagsResponse(
            status_code=200, tags=tags_list, schedule_enabled=schedule_enabled_value
        )

    def update_instance_tags(self, req: UpdateInstanceTagsRequest):
        logger.info(
            "Updating instance tags; region: {}, instance_id: {}, tags: {}, schedule_enabled: {}",
            req.region,
            req.instance_id,
            req.tags,
            req.schedule_enabled,
        )
        available_aws_regions = self.config.get("available_aws_regions", [])
        if req.region not in available_aws_regions:
            logger.error("Region not available: {}", req.region)
            raise ValueError("Region not available")
        try:
            status = self.aws.update_instance_tags(
                region=req.region,
                instance_id=req.instance_id,
                submitted_tags=req.tags,
                schedule_enabled=req.schedule_enabled,
            )
            if status == "success":
                logger.info("Tags updated successfully for instance: {}", req.instance_id)
                return UpdateInstanceTagsResponse(status_code=200,message="Tags updated successfully for instance: {}".format(req.instance_id))
        except Exception as e:
            logger.exception("Error updating instance tags: {}", e)
            raise

    def run_lambda(self, region: str):
        available_aws_regions = self.config.get("available_aws_regions", [])
        if region not in available_aws_regions:
            logger.error("Region not available: {}", region)
            raise ValueError("Region not available")
        try:
            _ = self.aws.run_lambda(region)
            logger.info("Lambda invoked successfully in region: {}", region)
            return RunLambdaResponse(status_code=200, message="Lambda invoked successfully in region: {}".format(region))
        except Exception as e:
            logger.exception("Error running lambda: {}", e)
            raise