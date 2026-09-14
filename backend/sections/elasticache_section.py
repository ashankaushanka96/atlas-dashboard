from loguru import logger
import cache
from subsystems.database import Database
from subsystems.aws import AWS
from models.elasticache_section_models import (
    FetchElastiCacheClustersSummaryResponse,
    FetchElastiCacheClusterDetailsResponse,
)

class ElastiCacheSection:
    def __init__(self, db: Database, aws: AWS, config):
        self.db = db
        self.aws = aws
        self.config = config

    def fetch_elasticache_clusters_summary(self, fresh: bool = False):
        logger.info("Fetching ElastiCache clusters summary across regions.")
        if fresh or cache.cached_elasticache_clusters_summary is None:
            try:
                cache.cached_elasticache_clusters_summary = self.aws.fetch_elasticache_clusters_summary()
                logger.info("ElastiCache clusters summary cache updated with fresh data.")
            except Exception as e:
                logger.exception("Error fetching ElastiCache clusters summary: {}", e)
                raise
        logger.info("Returning ElastiCache clusters summary from cache.")
        return FetchElastiCacheClustersSummaryResponse(status_code=200, clusters=cache.cached_elasticache_clusters_summary)
    
    def fetch_elasticache_cluster_details(self, region: str, replication_group_id: str):
        logger.info("Fetching ElastiCache cluster details for region: {}, replication_group_id: {}.", region, replication_group_id)
        try:
            cluster_details = self.aws.fetch_elasticache_cluster_details(region, replication_group_id)
            logger.info("Returning ElastiCache cluster details for region: {}, replication_group_id: {}.", region, replication_group_id)
            return FetchElastiCacheClusterDetailsResponse(status_code=200, cluster_details=cluster_details)
        except Exception as e:
            logger.exception("Error fetching ElastiCache cluster details: {}", e)
            raise
