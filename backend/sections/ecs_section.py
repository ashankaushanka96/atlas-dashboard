from loguru import logger
import cache
from subsystems.database import Database
from subsystems.aws import AWS
from models.ecs_section_models import (
    FetchECSClustersSummaryResponse,
    FetchECSServicesSummaryResponse,
    FetchECSClusterDetailsResponse,
    FetchECSServiceDetailsResponse,
)

class ECSSection:
    def __init__(self, db: Database, aws: AWS, config):
        self.db = db
        self.aws = aws
        self.config = config

    def fetch_ecs_clusters_summary(self, fresh: bool = False):
        logger.info("Fetching ECS clusters summary across regions.")
        if fresh or cache.cached_ecs_clusters_summary is None:
            try:
                cache.cached_ecs_clusters_summary = self.aws.fetch_ecs_clusters_summary()
                logger.info("ECS clusters summary cache updated with fresh data.")
            except Exception as e:
                logger.exception("Error fetching ECS clusters summary: {}", e)
                raise
        logger.info("Returning ECS clusters summary from cache.")
        return FetchECSClustersSummaryResponse(status_code=200, clusters=cache.cached_ecs_clusters_summary)
    
    def fetch_ecs_services_summary(self, fresh: bool = False):
        logger.info("Fetching ECS services summary across regions.")
        if fresh or cache.cached_ecs_services_summary is None:
            try:
                cache.cached_ecs_services_summary = self.aws.fetch_ecs_services_summary()
                logger.info("ECS services summary cache updated with fresh data.")
            except Exception as e:
                logger.exception("Error fetching ECS services summary: {}", e)
                raise
        logger.info("Returning ECS services summary from cache.")
        return FetchECSServicesSummaryResponse(status_code=200, services=cache.cached_ecs_services_summary)

    def fetch_ecs_cluster_details(self, region: str, cluster_name: str):
        logger.info("Fetching ECS cluster details for region: {}, cluster_name: {}.", region, cluster_name)
        try:
            cluster_details = self.aws.fetch_ecs_cluster_details(region, cluster_name)
            logger.info("Returning ECS cluster details for region: {}, cluster_name: {}.", region, cluster_name)
            return FetchECSClusterDetailsResponse(status_code=200, cluster_details=cluster_details)
        except Exception as e:
            logger.exception("Error fetching ECS cluster details: {}", e)
            raise

    def fetch_ecs_service_details(self, region: str, cluster_name: str, service_name: str):
        logger.info("Fetching ECS service details for region: {}, cluster_name: {}, service_name: {}.", region, cluster_name, service_name)
        try:
            service_details = self.aws.fetch_ecs_service_details(region, cluster_name, service_name)
            logger.info("Returning ECS service details for region: {}, cluster_name: {}, service_name: {}.", region, cluster_name, service_name)
            return FetchECSServiceDetailsResponse(status_code=200, service_details=service_details)
        except Exception as e:
            logger.exception("Error fetching ECS service details: {}", e)
            raise
