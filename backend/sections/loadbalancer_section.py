from loguru import logger
import cache
from subsystems.database import Database
from subsystems.aws import AWS
from models.loadbalancer_section_models import (
    FetchLoadBalancersSummaryResponse,
    FetchLoadBalancerDetailsResponse,
)

class LoadBalancerSection:
    def __init__(self, db: Database, aws: AWS, config):
        self.db = db
        self.aws = aws
        self.config = config

    def fetch_load_balancers_summary(self, fresh: bool = False):
        logger.info("Fetching Load Balancers summary across regions.")
        if fresh or cache.cached_load_balancers_summary is None:
            try:
                cache.cached_load_balancers_summary = self.aws.fetch_load_balancers_summary()
                logger.info("Load Balancers summary cache updated with fresh data.")
            except Exception as e:
                logger.exception("Error fetching Load Balancers summary: {}", e)
                raise
        logger.info("Returning Load Balancers summary from cache.")
        return FetchLoadBalancersSummaryResponse(status_code=200, load_balancers=cache.cached_load_balancers_summary)
    
    def fetch_load_balancer_details(self, region: str, load_balancer_arn: str):
        logger.info("Fetching Load Balancer details for region: {}, load_balancer_arn: {}.", region, load_balancer_arn)
        try:
            load_balancer_details = self.aws.fetch_load_balancer_details(region, load_balancer_arn)
            logger.info("Returning Load Balancer details for region: {}, load_balancer_arn: {}.", region, load_balancer_arn)
            return FetchLoadBalancerDetailsResponse(status_code=200, load_balancer_details=load_balancer_details)
        except Exception as e:
            logger.exception("Error fetching Load Balancer details: {}", e)
            raise
