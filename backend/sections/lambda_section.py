from loguru import logger
import cache
from subsystems.database import Database
from subsystems.aws import AWS
from models.lambda_section_models import (
    FetchLambdaFunctionsSummaryResponse,
    FetchLambdaFunctionDetailsResponse,
)

class LambdaSection:
    def __init__(self, db: Database, aws: AWS, config):
        self.db = db
        self.aws = aws
        self.config = config

    def fetch_lambda_functions_summary(self, fresh: bool = False):
        logger.info("Fetching Lambda functions summary across regions.")
        if fresh or cache.cached_lambda_functions_summary is None:
            try:
                cache.cached_lambda_functions_summary = self.aws.fetch_lambda_functions_summary()
                logger.info("Lambda functions summary cache updated with fresh data.")
            except Exception as e:
                logger.exception("Error fetching Lambda functions summary: {}", e)
                raise
        logger.info("Returning Lambda functions summary from cache.")
        return FetchLambdaFunctionsSummaryResponse(status_code=200, functions=cache.cached_lambda_functions_summary)
    
    def fetch_lambda_function_details(self, region: str, function_name: str):
        logger.info("Fetching Lambda function details for region: {}, function_name: {}.", region, function_name)
        try:
            function_details = self.aws.fetch_lambda_function_details(region, function_name)
            logger.info("Returning Lambda function details for region: {}, function_name: {}.", region, function_name)
            return FetchLambdaFunctionDetailsResponse(status_code=200, function_details=function_details)
        except Exception as e:
            logger.exception("Error fetching Lambda function details: {}", e)
            raise
