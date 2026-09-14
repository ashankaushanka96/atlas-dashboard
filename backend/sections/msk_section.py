from loguru import logger
import cache
from subsystems.database import Database
from subsystems.aws import AWS
from models.msk_section_models import (
    FetchMSKClustersSummaryResponse,
    FetchMSKClusterDetailsResponse,
)

class MSKSection:
    def __init__(self, db: Database, aws: AWS, config):
        self.db = db
        self.aws = aws
        self.config = config

    def fetch_msk_clusters_summary(self, fresh: bool = False):
        logger.info("Fetching MSK clusters summary across regions.")
        if fresh or cache.cached_msk_clusters_summary is None:
            try:
                cache.cached_msk_clusters_summary = self.aws.fetch_msk_clusters_summary()
                logger.info("MSK clusters summary cache updated with fresh data.")
            except Exception as e:
                logger.exception("Error fetching MSK clusters summary: {}", e)
                raise
        logger.info("Returning MSK clusters summary from cache.")
        return FetchMSKClustersSummaryResponse(status_code=200, clusters=cache.cached_msk_clusters_summary)
    
    def fetch_msk_cluster_details(self, cluster_arn: str):
        logger.info("Fetching MSK cluster details for cluster_arn: {}.", cluster_arn)
        try:
            cluster_details = self.aws.fetch_msk_cluster_details(cluster_arn)
            logger.info("Returning MSK cluster details for cluster_arn: {}.", cluster_arn)
            return FetchMSKClusterDetailsResponse(status_code=200, cluster_details=cluster_details)
        except Exception as e:
            logger.exception("Error fetching MSK cluster details: {}", e)
            raise
