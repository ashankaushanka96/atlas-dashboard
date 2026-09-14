from loguru import logger
import cache
from subsystems.database import Database
from subsystems.aws import AWS
from models.redis_section_models import (
    FetchRedisClustersSummaryResponse,
    FetchRedisClusterDetailsResponse,
)

class RedisSection:
    def __init__(self, db: Database, aws: AWS, config):
        self.db = db
        self.aws = aws
        self.config = config

    def fetch_redis_clusters_summary(self, fresh: bool = False):
        logger.info("Fetching Redis clusters summary across regions.")
        if fresh or cache.cached_redis_clusters_summary is None:
            try:
                cache.cached_redis_clusters_summary = self.aws.fetch_redis_clusters_summary()
                logger.info("Redis clusters summary cache updated with fresh data.")
            except Exception as e:
                logger.exception("Error fetching Redis clusters summary: {}", e)
                raise
        logger.info("Returning Redis clusters summary from cache.")
        return FetchRedisClustersSummaryResponse(status_code=200, clusters=cache.cached_redis_clusters_summary)
    
    def fetch_redis_cluster_details(self, region: str, replication_group_id: str):
        logger.info("Fetching Redis cluster details for region: {}, replication_group_id: {}.", region, replication_group_id)
        try:
            cluster_details = self.aws.fetch_redis_cluster_details(region, replication_group_id)
            logger.info("Returning Redis cluster details for region: {}, replication_group_id: {}.", region, replication_group_id)
            return FetchRedisClusterDetailsResponse(status_code=200, cluster_details=cluster_details)
        except Exception as e:
            logger.exception("Error fetching Redis cluster details: {}", e)
            raise
