from loguru import logger
import cache
from subsystems.database import Database
from subsystems.aws import AWS
from models.server_control_section_models import (
    FetchStartStopInstancesResponse,
    StartStopInstanceResponse,)

class ServerControlSection:
    def __init__(self, db: Database, aws: AWS, config):
        self.db = db
        self.aws = aws
        self.config = config

        self.start_stop_servers_region_dict = self.build_start_stop_servers_region_dict()

    def build_start_stop_servers_region_dict(self):
        region_dict = {}
        for region_item in self.config.get("start_stop_servers", []):
            for region, instances in region_item.items():
                region_dict[region] = instances
        return region_dict
    
    def fetch_start_stop_instances(self, fresh: bool = False):
        logger.info("Fetching instances for start/stop; fresh flag is {}.", fresh)
        if fresh or cache.cached_server_control_instances is None:
            try:
                cache.cached_server_control_instances = self.aws.fetch_start_stop_instances()
                logger.info("Server control instances cache updated with fresh data.")
            except Exception as e:
                logger.exception("Error fetching instances: {}", e)
                raise

        logger.info("Returning instances for start/stop from cache.")
        return FetchStartStopInstancesResponse(
            status_code=200,
            instances=cache.cached_server_control_instances,
        )
        
    def start_stop_instance(self, region: str, instance_id: str, action: str):
        logger.info("{} instance: {} in region: {}.", action, instance_id, region)
        if region not in self.start_stop_servers_region_dict:
            logger.error("Region {} is not available for start/stop.".format(region))
            raise ValueError("Region {} is not available for start/stop.".format(region))
        
        if instance_id not in self.start_stop_servers_region_dict[region]:
            logger.error("Instance {} not available for start/stop in region: {}".format(instance_id, region))
            raise ValueError("Instance {} not available for start/stop in region: {}".format(instance_id, region))
        try:
            _, action_got = self.aws.start_stop_instance(region, instance_id, action)
            if cache.cached_server_control_instances:
                target_status = "running" if action == "start" else "stopped"
                updated_instances = []
                for instance in cache.cached_server_control_instances:
                    if instance.instance_id == instance_id and instance.region == region:
                        updated_instances.append(
                            instance.model_copy(update={"instance_status": target_status})
                        )
                    else:
                        updated_instances.append(instance)
                cache.cached_server_control_instances = updated_instances
            logger.info("Returning instance: {} in region: {} successfully {}.", instance_id, region, action_got)
            return StartStopInstanceResponse(status_code=200, message="Instance: {} in region: {} successfully {}.".format(instance_id, region, action_got))
        except Exception as e:
            logger.exception("Error starting/stopping instance: {}", e)
            raise
