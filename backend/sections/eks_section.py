from loguru import logger
import cache
from subsystems.database import Database
from subsystems.aws import AWS
from models.eks_section_models import (
    FetchEKSClustersSummaryResponse,
    FetchEKSClusterDetailsResponse,
)

class EKSSection:
    def __init__(self, db: Database, aws: AWS, config):
        self.db = db
        self.aws = aws
        self.config = config

    def fetch_eks_clusters_summary(self, fresh: bool = False):
        logger.info("Fetching EKS clusters summary across regions.")
        if fresh or cache.cached_eks_clusters_summary is None:
            try:
                cache.cached_eks_clusters_summary = self.aws.fetch_eks_clusters_summary()
                logger.info("EKS clusters summary cache updated with fresh data.")
            except Exception as e:
                logger.exception("Error fetching EKS clusters summary: {}", e)
                raise
        logger.info("Returning EKS clusters summary from cache.")
        return FetchEKSClustersSummaryResponse(status_code=200, clusters=cache.cached_eks_clusters_summary)
    
    def fetch_eks_cluster_details(self, region: str, cluster_name: str):
        logger.info("Fetching EKS cluster details for region: {}, cluster_name: {}.", region, cluster_name)
        try:
            cluster_details = self.aws.fetch_eks_cluster_details(region, cluster_name)
            logger.info("Returning EKS cluster details for region: {}, cluster_name: {}.", region, cluster_name)
            return FetchEKSClusterDetailsResponse(status_code=200, cluster_details=cluster_details)
        except Exception as e:
            logger.exception("Error fetching EKS cluster details: {}", e)
            raise
