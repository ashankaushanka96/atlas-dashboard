from loguru import logger
from datetime import datetime, timezone
import boto3
import re
from croniter import croniter
from concurrent.futures import ThreadPoolExecutor, as_completed
from models.other_models import (
    Schedule, 
    Tag, 
    InstanceIPInfo, 
    InstanceSummary,
    AmiDetails,
    NetworkDetails,
    StatusChecks,
    InstanceDetails,
    InstanceInfo,
    ZoneModel,
    RecordModel
    )
from typing import List
import json


class AWS:
    def __init__(self, config):
        self.config = config
        self.lambda_arn_mapping = self.config.get("lambda_arn_mapping", {})
        self.available_aws_regions = self.config.get("available_aws_regions", [])
        self.start_stop_servers = self.config.get("start_stop_servers", {})
        self.region_labels = {
            'us-east-1': 'NV',
            'ap-southeast-1': 'SG',
    # Add more if needed
        }

    

    ###############################################################################################
    #                                  SCHEDULER SECTION FUNCTIONS                                #
    ###############################################################################################
    def fetch_schedules(self):
        schedules = []
        available_aws_regions = self.config.get("available_aws_regions", [])
        scheduler_prefix = "feed-instance-scheduler-"
        rule_pattern = re.compile(
            r"^feed-instance-scheduler-(i-[0-9a-f]+)-(start_time(?:_[0-9]+)?|stop_time(?:_[0-9]+)?)$"
        )
        now = datetime.now(timezone.utc)

        def get_all_rules(events_client: boto3.client):
            logger.debug("Listing rules using events_client.")
            rules = []
            response = events_client.list_rules()
            rules.extend(response.get("Rules", []))
            while "NextToken" in response:
                response = events_client.list_rules(NextToken=response["NextToken"])
                rules.extend(response.get("Rules", []))
            logger.info("Total rules fetched: {}", len(rules))
            return rules

        def compute_scheduled_time(schedule_expression, rule_name):
            logger.debug("Computing scheduled time for rule: {}", rule_name)
            scheduled_time = None
            if schedule_expression.startswith("cron(") and schedule_expression.endswith(
                ")"
            ):
                cron_expr = schedule_expression[5:-1].strip().replace("?", "*")
                fields = cron_expr.split()
                minute, hour, day, month, dow, year = fields
                scheduled_time = datetime(
                    year=int(year),
                    month=int(month),
                    day=int(day),
                    hour=int(hour),
                    minute=int(minute),
                    second=0,
                    tzinfo=timezone.utc,
                )
                logger.info(
                    "Scheduled time for rule {}: {}",
                    rule_name,
                    scheduled_time,
                )

            return scheduled_time

        for region in available_aws_regions:
            events_client = boto3.client("events", region_name=region)
            ec2_client = boto3.client("ec2", region_name=region)
            rules = get_all_rules(events_client)
            for rule in rules:
                rule_name = rule.get("Name", "")
                if rule_name.startswith(scheduler_prefix):
                    match = rule_pattern.match(rule_name)
                    if match:
                        instance_id = match.group(1)
                        event_tag_key = match.group(2)
                        action = (
                            "start" if event_tag_key.startswith("start") else "stop"
                        )

                        try:
                            rule_detail = events_client.describe_rule(Name=rule_name)
                            schedule_expression = rule_detail.get(
                                "ScheduleExpression", ""
                            )
                        except Exception as e:
                            logger.exception(
                                "Error describing rule {}: {}", rule_name, e
                            )
                            continue

                        scheduled_time = compute_scheduled_time(
                            schedule_expression, rule_name
                        )

                        try:
                            response = ec2_client.describe_instances(
                                InstanceIds=[instance_id]
                            )
                            reservations = response.get("Reservations", [])
                            if reservations and reservations[0].get("Instances"):
                                instance = reservations[0]["Instances"][0]
                            else:
                                logger.warning(
                                    "No instance found for ID {} in region {}",
                                    instance_id,
                                    region,
                                )
                                continue
                        except Exception as e:
                            logger.exception(
                                "Error describing instance {}: {}", instance_id, e
                            )
                            continue

                        instance_name = "N/A"
                        private_ip = instance.get("PrivateIpAddress", "N/A")
                        schedule_enabled = False
                        if "Tags" in instance:
                            for tag in instance["Tags"]:
                                key = tag.get("Key")
                                if key == "Name":
                                    instance_name = tag.get("Value")
                                if key == "schedule_enabled":
                                    schedule_enabled = (tag.get("Value", "").lower() == "true")

                        schedule = Schedule(
                            instance_id=instance_id,
                            region=region,
                            private_ip=private_ip,
                            instance_name=instance_name,
                            action=action,
                            schedule_enabled=schedule_enabled,
                            scheduled_time=scheduled_time if scheduled_time else now,
                        )
                        schedules.append(schedule)
        schedules.sort(
            key=lambda x: (
                x.scheduled_time
                if x.scheduled_time
                else datetime.max.replace(tzinfo=timezone.utc)
            )
        )
        logger.info("Total scheduled events fetched: {}", len(schedules))
        return schedules

    def fetch_aws_ips(self, region: str):
        ec2_client = boto3.client("ec2", region_name=region)
        try:
            response = ec2_client.describe_instances()
        except Exception as e:
            logger.exception("Error fetching instances in region {}: {}", region, e)
            raise
        ips = []
        for reservation in response.get("Reservations", []):
            for instance in reservation.get("Instances", []):
                private_ip = instance.get("PrivateIpAddress")
                instance_id = instance.get("InstanceId")
                if private_ip and instance_id:
                    ips.append(
                        InstanceIPInfo(instance_id=instance_id, private_ip=private_ip)
                    )
        logger.info("Fetched {} IPs for region {}.", len(ips), region)
        return ips

    def fetch_existing_instance_tags(self, region: str, instance_id: str):
        ec2_client = boto3.client("ec2", region_name=region)
        try:
            response = ec2_client.describe_instances(InstanceIds=[instance_id])
        except Exception as e:
            logger.exception("Error fetching tags for instance {}: {}", instance_id, e)
            raise Exception(f"Error fetching instance tags: {e}")

        tags_list = []
        schedule_enabled_value = "not found"

        def get_next_schedule(cron_str: str):
            base = datetime.now()
            try:
                iter_obj = croniter(cron_str, base)
                return iter_obj.get_next(datetime)
            except Exception:
                return datetime.max

        for reservation in response.get("Reservations", []):
            for instance in reservation.get("Instances", []):
                for tag in instance.get("Tags", []):
                    key = tag.get("Key", "")
                    value = tag.get("Value", "")
                    if key == "schedule_enabled":
                        schedule_enabled_value = value
                    elif key.startswith("start_time") or key.startswith("stop_time"):
                        tags_list.append(Tag(key=key, value=value))
        if tags_list:
            tags_list = sorted(tags_list, key=lambda tag: get_next_schedule(tag.value))
        logger.info(
            "Fetched {} tags for instance {} in region {}.",
            len(tags_list),
            instance_id,
            region,
        )
        return schedule_enabled_value, tags_list

    def update_instance_tags(
        self,
        region: str,
        instance_id: str,
        submitted_tags: List[Tag],
        schedule_enabled: str,
    ):
        ec2_client = boto3.client("ec2", region_name=region)
        try:
            _, tags_list = self.fetch_existing_instance_tags(region, instance_id)
            existing_keys = []
            for tag in tags_list:
                existing_keys.append(tag.key)
        except Exception as e:
            logger.exception("Error fetching existing instance tags: {}", e)
            raise
        submitted_keys = [tag.key for tag in submitted_tags]
        keys_to_delete = [key for key in existing_keys if key not in submitted_keys]

        if keys_to_delete:
            try:
                ec2_client.delete_tags(
                    Resources=[instance_id],
                    Tags=[{"Key": key} for key in keys_to_delete],
                )
                logger.info(
                    "Deleted outdated tags for instance {}: {}",
                    instance_id,
                    keys_to_delete,
                )
            except Exception as e:
                logger.exception(
                    "Error deleting tags for instance {}: {}", instance_id, e
                )
                raise Exception(f"Error deleting tags: {e}")

        try:
            tags = [{"Key": tag.key, "Value": tag.value} for tag in submitted_tags]
            ec2_client.create_tags(Resources=[instance_id], Tags=tags)
            logger.info("Updated tags for instance {}.", instance_id)
        except Exception as e:
            logger.exception("Error updating tags for instance {}: {}", instance_id, e)
            raise Exception(f"Error updating tags: {e}")

        try:
            ec2_client.create_tags(
                Resources=[instance_id],
                Tags=[{"Key": "schedule_enabled", "Value": schedule_enabled}],
            )
            logger.info("Updated schedule_enabled tag for instance {}.", instance_id)
        except Exception as e:
            logger.exception(
                "Error updating schedule_enabled tag for instance {}: {}",
                instance_id,
                e,
            )
            raise Exception(f"Error updating schedule_enabled tag: {e}")

        return "success"
    
    def run_lambda(self, region: str):
        arn = self.lambda_arn_mapping.get(region)
        if not arn:
            logger.error("Lambda ARN not configured for region: {}", region)
            raise ValueError("Lambda ARN not configured for this region")
        lambda_client = boto3.client("lambda", region_name=region)
        try:
            response = lambda_client.invoke(
                FunctionName=arn,
                InvocationType="RequestResponse",
                Payload=json.dumps({}),
            )
            payload = response.get("Payload").read()
            result = json.loads(payload)
            logger.info("Lambda invoked successfully in region {}.", region)
        except Exception as e:
            logger.exception("Error invoking lambda in region {}: {}", region, e)
            raise Exception(f"Error invoking lambda: {e}")
        return result
    
    ###############################################################################################
    #                                  EC2 DETAILS SECTION FUNCTIONS                              #
    ###############################################################################################
    def fetch_instances_summary(self):
        def process_region(region):
            logger.debug("Processing region: {}", region)
            ec2_client = boto3.client("ec2", region_name=region)
            region_instances = []
            try:
                instances_data = ec2_client.describe_instances()
            except Exception as e:
                logger.exception("Error fetching instances in region {}: {}", region, e)
                raise  # Skip this region on error

            for reservation in instances_data.get("Reservations", []):
                for instance in reservation.get("Instances", []):
                    summary = InstanceSummary(
                        region=region,
                        instance_name=next((tag["Value"] for tag in instance.get("Tags", []) if tag.get("Key") == "Name"),None,),
                        instance_type=instance.get("InstanceType", None),
                        instance_id=instance.get("InstanceId", ""),
                        private_ip=instance.get("PrivateIpAddress", None),
                        instance_status=instance.get("State", {}).get("Name", None),
                    )
                    region_instances.append(summary)
            logger.info("Region {}: Found {} instances.", region, len(region_instances))
            return region_instances

        all_instances_summary = []
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = {
                executor.submit(process_region, region): region
                for region in self.available_aws_regions
            }
            for future in as_completed(futures):
                try:
                    region_summary = future.result()
                    all_instances_summary.extend(region_summary)
                except Exception as e:
                    logger.exception("Error processing region {}: {}", futures[future], e)
                    raise
        logger.info("Total instances summary fetched: {}", len(all_instances_summary))
        return all_instances_summary

    def fetch_instance_details(self, region: str, instance_id: str):
        
        ec2_client = boto3.client("ec2", region_name=region)
        try:
            instances_data = ec2_client.describe_instances(InstanceIds=[instance_id])
        except Exception as e:
            logger.exception("Error fetching details for instance {}: {}", instance_id, e)
            raise
        if not instances_data.get("Reservations"):
            logger.warning("No reservations found for instance {}.", instance_id)
            return None

        instance = instances_data["Reservations"][0]["Instances"][0]
        #Fetch VPC name
        vpc_name = None
        if "VpcId" in instance:
            try:
                vpc_response = ec2_client.describe_vpcs(VpcIds=[instance["VpcId"]])
                vpc_name = next((tag["Value"] for tag in vpc_response["Vpcs"][0].get("Tags", []) if tag.get("Key") == "Name"), None)
            except Exception as e:
                logger.exception("Error fetching VPC details for instance {}: {}", instance_id, e)
        #Fetch Subnet name
        subnet_name = None
        if "SubnetId" in instance:
            try:
                subnet_response = ec2_client.describe_subnets(SubnetIds=[instance["SubnetId"]])
                subnet_name = next((tag["Value"] for tag in subnet_response["Subnets"][0].get("Tags", []) if tag.get("Key") == "Name"), None)
            except Exception as e:
                logger.exception("Error fetching subnet details for instance {}: {}", instance_id, e)
        # Fetch Instance Status Checks
        status_checks = StatusChecks()
        try:
            status_response = ec2_client.describe_instance_status(InstanceIds=[instance_id])
            for status in status_response.get("InstanceStatuses", []):
                status_checks.system_status_check = status.get("SystemStatus", {}).get("Status", None)
                status_checks.instance_status_check = status.get("InstanceStatus", {}).get("Status", None)
                status_checks.attached_ebs_status_checks = [vol.get("Status", None) for vol in status.get("InstanceStatus", {}).get("Details", [])]
        except Exception as e:
            logger.exception("Error fetching status checks for instance {}: {}", instance_id, e)

        # Initialize InstanceDetails without storage sizes yet
        instance_details = InstanceDetails(
            instance_name=next((tag["Value"] for tag in instance.get("Tags", []) if tag.get("Key") == "Name"), None,),
            instance_type=instance.get("InstanceType", None),
            instance_id=instance.get("InstanceId", ""),
            instance_status=instance.get("State", {}).get("Name", None),
            instance_profile=(lambda arn: arn.split("/")[-1] if arn else None)(instance.get("IamInstanceProfile", {}).get("Arn")),
            launch_time=str(instance.get("LaunchTime", None)),
            status_checks=status_checks,
            ami_details=AmiDetails(
                ami_id=instance.get("ImageId", None), 
                ami_name=None
                ),
            network_details=NetworkDetails(
                vpc_name=vpc_name,
                vpc_id=instance.get("VpcId", None),
                subnet_name=subnet_name,
                subnet_id=instance.get("SubnetId", None),
                security_group_name=[sg.get("GroupName", None) for sg in instance.get("SecurityGroups", [])],
                security_group_id=[sg.get("GroupId", None) for sg in instance.get("SecurityGroups", [])],
                region=region,
                availability_zone=instance.get("Placement", {}).get("AvailabilityZone", None),
                private_ip=instance.get("PrivateIpAddress", None),
                public_ip=instance.get("PublicIpAddress", None),
                ),
            tags=sorted(instance.get("Tags", []), key=lambda tag: tag["Key"]),
            storages=instance.get("BlockDeviceMappings", []),
        )

        # Fetch AMI Name if AMI ID exists
        if instance_details.ami_details.ami_id:
            try:
                ami_response = ec2_client.describe_images(ImageIds=[instance_details.ami_details.ami_id])
                if ami_response["Images"]:
                    instance_details.ami_details.ami_name = ami_response["Images"][0].get("Name", None)
                    logger.info("AMI details updated for instance {}.", instance_id)
            except Exception as e:
                logger.exception("Error fetching AMI details for instance {}: {}", instance_id, e)

        # --- New Code to Fetch Storage Sizes ---
        block_device_mappings = instance.get("BlockDeviceMappings", [])
        if block_device_mappings:
            volume_ids = [bdm["Ebs"]["VolumeId"] for bdm in block_device_mappings if "Ebs" in bdm]
            try:
                volumes_response = ec2_client.describe_volumes(VolumeIds=volume_ids)
                volumes_dict = {vol["VolumeId"]: vol["Size"] for vol in volumes_response.get("Volumes", [])}
                for bdm in block_device_mappings:
                    if "Ebs" in bdm:
                        volume_id = bdm["Ebs"]["VolumeId"]
                        bdm["Ebs"]["Size"] = volumes_dict.get(volume_id)
                logger.info("Storage sizes updated for instance {}.", instance_id)
            except Exception as e:
                logger.exception("Error fetching volume sizes for instance {}: {}", instance_id, e)

        instance_details.storages = block_device_mappings
        logger.info("Completed fetching details for instance {}.", instance_id)
        return instance_details
    
    ###############################################################################################
    #                             SERVER START/STOP SECTION FUNCTIONS                             #
    ###############################################################################################
    def fetch_start_stop_instances(self):
        instances = []
        for server in self.start_stop_servers:
            for region, instance_ids in server.items():
                ec2_client = boto3.client("ec2", region_name=region)
                try:
                    response = ec2_client.describe_instances(InstanceIds=instance_ids)
                    logger.debug("Described instances in region: {}", region)
                except Exception as e:
                    logger.exception(
                        "Error describing instances in region {}: {}", region, e
                    )
                    continue

                for reservation in response.get("Reservations", []):
                    for instance in reservation.get("Instances", []):
                        instance_id = instance.get("InstanceId", "N/A")
                        private_ip = instance.get("PrivateIpAddress", "")
                        instance_status = instance.get("State", {}).get("Name", "N/A")
                        instance_name = "N/A"
                        for tag in instance.get("Tags", []):
                            if tag.get("Key") == "Name":
                                instance_name = tag.get("Value")
                                break
                        instances.append(InstanceInfo(
                            region=region,
                            instance_id=instance_id,
                            instance_name=instance_name,
                            private_ip=private_ip,
                            instance_status=instance_status

                        )
                        )
        logger.info("Fetched instance details for {} instances.", len(instances))
        return instances
    
    def start_stop_instance(self, region,instance_id, action):
        ec2_client = boto3.client("ec2", region_name=region)
        try:
            if action == "stop":
                ec2_client.stop_instances(InstanceIds=[instance_id])
                waiter = ec2_client.get_waiter("instance_stopped")
                waiter.wait(InstanceIds=[instance_id])
                logger.info("Instance {} stopped successfully.", instance_id)
                return "success", "stopped"
            elif action == "start":
                ec2_client.start_instances(InstanceIds=[instance_id])
                waiter = ec2_client.get_waiter("instance_running")
                waiter.wait(InstanceIds=[instance_id])
                logger.info("Instance {} started successfully.", instance_id)
                return "success", "started"
            else:
                logger.warning("Invalid action provided: {}.", action)
                raise Exception("Invalid action provided: {}".format(action))
        except Exception as e:
            logger.exception("Error during instance {} action on {}: {}", action, instance_id, e)
            raise e
        
    def format_zone_data(self, zone_name: str, main_url: str):
        def get_hosted_zone_id_by_name(zone_name):
            client = boto3.client('route53')
            response = client.list_hosted_zones_by_name(DNSName=zone_name)
            for zone in response['HostedZones']:
                if zone['Name'] == zone_name or zone['Name'] == zone_name + '.':
                    return zone['Id'].split('/')[-1]
            return None

        def get_health_check_status(health_check_id):
            client = boto3.client('route53')
            health_response = client.get_health_check_status(HealthCheckId=health_check_id)
            observations = health_response['HealthCheckObservations']
            for obs in observations:
                status = obs['StatusReport']['Status']
                if 'unhealthy' in status.lower():
                    return "Unhealthy"
            return "Healthy"

        def get_failover_records(zone_id):
            client = boto3.client('route53')
            paginator = client.get_paginator('list_resource_record_sets')
            primary, secondary = None, None
            for page in paginator.paginate(HostedZoneId=zone_id):
                for record in page['ResourceRecordSets']:
                    if 'Failover' in record:
                        if record['Failover'] == 'PRIMARY':
                            primary = record
                        elif record['Failover'] == 'SECONDARY':
                            secondary = record
            return primary, secondary

        zone_id = get_hosted_zone_id_by_name(zone_name)
        if not zone_id:
            return None, None

        primary, secondary = get_failover_records(zone_id)

        primary_record_model = None
        secondary_record_model = None

        if primary:
            alias_dns = primary.get('AliasTarget', {}).get('DNSName', '')
            primary_record_model = RecordModel(
                dns_name=primary.get('Name', '').rstrip('.'),
                alias_target=alias_dns.replace('dualstack.', '').rstrip('.') if alias_dns else 'Not an alias',
                location=next((label for region_key, label in self.region_labels.items() if region_key in alias_dns), "Unknown Location"),
                health_check_id=primary.get("HealthCheckId", None),
                health_status=get_health_check_status(primary["HealthCheckId"]) if "HealthCheckId" in primary else "Not associated"
            )

        if secondary:
            alias_dns = secondary.get('AliasTarget', {}).get('DNSName', '')
            secondary_record_model = RecordModel(
                dns_name=secondary.get('Name', '').rstrip('.'),  # ✅ fixed
                alias_target=alias_dns.replace('dualstack.', '').rstrip('.') if alias_dns else 'Not an alias',
                location=next((label for region_key, label in self.region_labels.items() if region_key in alias_dns), "Unknown Location"),
                health_check_id=secondary.get("HealthCheckId", None),  # ✅ fixed
                health_status=get_health_check_status(secondary["HealthCheckId"]) if "HealthCheckId" in secondary else "Not associated"
            )

        return primary_record_model, secondary_record_model