from loguru import logger
import cache
from subsystems.database import Database
from subsystems.aws import AWS
from models.ec2_details_section_models import (
    FetchInstancesSummaryResponse,
    FetchInstanceDetailsResponse,
    FetchComponentNamesResponse,
)

class EC2DetailsSection:
    def __init__(self, db: Database, aws: AWS, config):
        self.db = db
        self.aws = aws
        self.config = config

    def fetch_instances_summary(self, fresh: bool = False):
        logger.info("Fetching instances summary across regions.")
        if fresh or cache.cached_instances_summary is None:
            try:
                cache.cached_instances_summary = self.aws.fetch_instances_summary()
                logger.info("Instances summary cache updated with fresh data.")
            except Exception as e:
                logger.exception("Error fetching instances summary: {}", e)
                raise
        logger.info("Returning instances summary from cache.")
        return FetchInstancesSummaryResponse(status_code=200, instances=cache.cached_instances_summary)

    def fetch_instance_details(self, region: str, instance_id: str):
        logger.info("Fetching instance details for region: {}, instance_id: {}.", region, instance_id)
        try:
            instance_details = self.aws.fetch_instance_details(region, instance_id)
            logger.info("Returning instance details for region: {}, instance_id: {}.", region, instance_id)
            return FetchInstanceDetailsResponse(status_code=200, instance_details=instance_details)
        except Exception as e:
            logger.exception("Error fetching instance details: {}", e)
            raise

    def fetch_component_names(self, ip: str):
        logger.info("Fetching component names for IP: {}.", ip)
        try:
            component_names = self.db.fetch_component_names(ip)
            logger.info("Returning component names for IP: {}.", ip)
            return FetchComponentNamesResponse(status_code=200, component_names=component_names)
        except Exception as e:
            logger.exception("Error fetching component names: {}", e)
            raise