import yaml
import boto3
import os
import json
from datetime import datetime, timezone
from croniter import croniter
from models.other_models import Component, ZoneModel, RecordModel
from models.response_models import (
    FetchAllRegionsResponse,
    FetchPlatformsResponse,
    FetchComponentsResponse,
    AddComponentResponse,
    DeleteComponentResponse,
    FetchSchedulesResponse,
    FetchAvailableAWSRegionsResponse,
    FetchAWSIPsResponse,
    FetchExistingInstanceTagsResponse,
    UpdateInstanceTagsResponse,
    RunLambdaResponse,
    FetchInstancesSummaryResponse,
    FetchInstanceDetailsResponse,
    FetchComponentNamesResponse,
    FetchStartStopInstancesResponse,
    StartStopInstanceResponse,
    LoginResponse,
    SyncComponentsResponse,
    FetchRoute53Response,
    FetchSingleZoneResponse
)
from models.input_models import UpdateInstanceTagsRequest, LoginRequest
import cache
from typing import List, Dict, Any, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
from loguru import logger
import sys
from subsystems.database import Database
from subsystems.aws import AWS


class Facade:
    def __init__(self):
        config_path = "config/config.yaml"
        if not os.path.exists(config_path):
            logger.error("Config file not found: {}", config_path)
            sys.exit(f"Config file not found: {config_path}")
        try:
            with open(config_path, "r") as config_file:
                self.config = yaml.safe_load(config_file)
            logger.info("Configuration loaded successfully from {}", config_path)
        except Exception as e:
            logger.exception("Failed to load configuration: {}", e)
            sys.exit(1)
        self.users = self.config.get("users", {})
        self.available_aws_regions = self.config.get("available_aws_regions", [])
        self.all_regions = self.config.get("all_regions", [])
        self.platforms = self.config.get("platforms", [])
        self.start_stop_servers_region_dict = self.build_start_stop_servers_region_dict()
        self.db = Database(db_config=self.config.get("db_config", {}))
        self.aws = AWS(config=self.config)
        self.hosted_zones = self.config.get('hosted_zones', {})
        # self.hosted_zones = {
        #                         "alertservice.gtn.tech.": "alertservice.feedgma.com",
        #                         "calcserver-ap.gtn.tech.": "calcserver-ap.feedgma.com",
        #                         # Add more hosted zones here
        #                     }

    ###############################################################################################
    #                                  COMPONENTS SECTION FUNCTIONS                               #
    ###############################################################################################

    def fetch_all_regions(self):
        logger.info("Fetching All Regions.")
        return FetchAllRegionsResponse(status_code=200, regions=self.all_regions)

    def fetch_platforms(self):
        logger.info("Fetching Platforms.")
        return FetchPlatformsResponse(status_code=200, platforms=self.platforms)

    def fetch_components(self, fresh: bool = False):
        logger.info("Fetching components; fresh flag is {}.", fresh)
        if fresh or cache.cached_components is None:
            try:
                results = self.db.fetch_all_components()
                components = list(
                    map(
                        lambda row: Component(
                            region=row[0],
                            ip=row[1],
                            component_name=row[2],
                            platform=row[3],
                            comp_path=row[4],
                            comp_version=row[5],
                            pipeline=row[6],
                            last_run_time=row[7],
                            last_update_time=row[8],
                            previous_tag=row[9],
                            release_date=row[10],
                            code_repo_url=row[11],
                            config_repo_url=row[12],
                            script_repo_url=row[13],
                            description=row[14],
                        ),
                        results,
                    )
                )
                cache.cached_components = components
                logger.info("Components cache updated with fresh data.")
            except Exception as e:
                logger.exception("Error fetching fresh components: {}", e)
                raise
        logger.info("Returning components from cache.")
        return FetchComponentsResponse(status_code=200, components=cache.cached_components)
    
    def fetch_components_by_ip(self, ip: str, region: str):
        logger.info("Fetching components by IP: {}.", ip)
        try:
            results = self.db.fetch_components_by_ip(ip, region)
            components = list(
                map(
                    lambda row: Component(
                        region=row[0],
                        ip=row[1],
                        component_name=row[2],
                        platform=row[3],
                        comp_path=row[4],
                    ),
                    results,
                )
            )
            logger.info("Components cache updated with fresh data.")
        except Exception as e:
            logger.exception("Error fetching fresh components: {}", e)
            raise
        logger.info("Returning components from cache.")
        return FetchComponentsResponse(status_code=200, components=components)


    def add_component(self, component: Component):
        logger.info("Adding component: {}", component)
        try:
            self.db.add_component(component)
            return AddComponentResponse(status_code=200, message=f"Component added successfully: {component.component_name}")
        except Exception as e:
            logger.exception("Error adding component: {}", e)
            raise

    def delete_component(self, component: Component):
        logger.info("Deleting component: {}", component)
        try:
            self.db.delete_component(component)
            logger.info(f"Component deleted successfully: {component.component_name}")
            return DeleteComponentResponse(
                status_code=200,
                message=f"Component deleted successfully: {component.component_name}",
            )
        except Exception as e:
            logger.exception("Error deleting component: {}", e)
            raise
        
    def sync_components(self, components: List[Component]) -> SyncComponentsResponse:
        logger.info("Syncing %d components", len(components))
        result = self.db.sync_components(components)
        return SyncComponentsResponse(
            status_code=200,
            message="Components synchronized successfully",
            added=result["added"],
            updated=result["updated"],
            deleted=result["deleted"],
        )
    ###############################################################################################
    #                                  SCHEDULER SECTION FUNCTIONS                                #
    ###############################################################################################

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

    def fetch_available_aws_regions(self):
        logger.info("Fetching Available AWS Regions.")
        return FetchAvailableAWSRegionsResponse(
            status_code=200, regions=self.available_aws_regions
        )

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
        logger.info(
            "Fetching existing instance tags; region: {}, instance_id: {}",
            region,
            instance_id,
        )
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

    ###############################################################################################
    #                                  EC2 DETAILS SECTION FUNCTIONS                              #
    ###############################################################################################
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
    ###############################################################################################
    #                             SERVER START/STOP SECTION FUNCTIONS                             #
    ###############################################################################################
    def build_start_stop_servers_region_dict(self):
        region_dict = {}
        for region_item in self.config.get("start_stop_servers", []):
            for region, instances in region_item.items():
                region_dict[region] = instances
        return region_dict
    
    def fetch_start_stop_instances(self):
        logger.info("Fetching instances for start/stop.")
        try:
            instances = self.aws.fetch_start_stop_instances()
            logger.info("Returning instances for start/stop.")
            return FetchStartStopInstancesResponse(status_code=200, instances=instances)
        except Exception as e:
            logger.exception("Error fetching instances: {}", e)
            raise
        
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
            logger.info("Returning instance: {} in region: {} successfully {}.", instance_id, region, action_got)
            return StartStopInstanceResponse(status_code=200, message="Instance: {} in region: {} successfully {}.".format(instance_id, region, action_got))
        except Exception as e:
            logger.exception("Error starting/stopping instance: {}", e)
            raise

    def login(self, login_request: LoginRequest):
        logger.info("Login attempt for user: {}", login_request.username)
        username = login_request.username
        password = login_request.password
        if username in self.users and self.users[username] == password:
            logger.info("Login successful for user: {}", username)
            return LoginResponse(status_code=200, username=username, message="Login successful")
        logger.error("Invalid credentials for user: {}", username)
        raise Exception(status_code=401, detail="Invalid credentials")
    
    def get_all_zones(self):
        logger.info("Fetching all Route 53 zones from configuration.")
        zone_model_list = []

        try:
            for zone_name, main_url in self.hosted_zones.items():
                logger.debug(f"Processing hosted zone: {zone_name} → {main_url}")
                primary_record_model, secondary_record_model = self.aws.format_zone_data(zone_name, main_url)

                zone_model_list.append(
                    ZoneModel(
                        hosted_zone=zone_name.rstrip('.'),
                        main_url=main_url,
                        primary=primary_record_model,
                        secondary=secondary_record_model,
                        error=None
                    )
                )
            logger.info("Successfully processed all hosted zones.")
        except Exception as e:
            logger.exception("Failed to fetch Route 53 zone data: {}", e)
            raise

        return FetchRoute53Response(status_code=200, route53_details=zone_model_list)

    def get_single_zone(self, zone_name: str) -> FetchSingleZoneResponse:
        full_zone_name = zone_name if zone_name.endswith('.') else zone_name + '.'
        logger.info(f"Fetching Route 53 details for zone: {full_zone_name}")

        try:
            main_url = self.hosted_zones.get(full_zone_name)
            if not main_url:
                logger.warning(f"Zone '{full_zone_name}' not found in configuration.")
                raise HTTPException(status_code=404, detail="Zone not mapped")

            logger.debug(f"Zone mapped to main URL: {main_url}")
            primary_record_model, secondary_record_model = self.aws.format_zone_data(full_zone_name, main_url)

            zone_model = ZoneModel(
                hosted_zone=full_zone_name.rstrip('.'),
                main_url=main_url,
                primary=primary_record_model,
                secondary=secondary_record_model,
                error=None
            )
            logger.info(f"Successfully fetched zone details for: {full_zone_name}")
            return FetchSingleZoneResponse(status_code=200, zone_detail=zone_model)
        except Exception as e:
            logger.exception(f"Error while processing zone '{full_zone_name}': {e}")
            raise

    def get_zone_names(self):
        return [zone_name.rstrip('.') for zone_name in self.hosted_zones.keys()]


