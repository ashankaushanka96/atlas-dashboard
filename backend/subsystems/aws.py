from loguru import logger
from datetime import datetime, timezone
import boto3
import re
from croniter import croniter
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List
import json

from models.schedules_section_models import (
    Schedule,
    InstanceSchedule,
    InstanceIPInfo,
    Tag,
)
from models.ec2_details_section_models import (
    InstanceSummary,
    StatusChecks,
    InstanceDetails,
    AmiDetails,
    NetworkDetails,
)
from models.server_control_section_models import (InstanceInfo)
from models.route53_section_models import (
    RecordModel
)
from models.lambda_section_models import (
    LambdaFunctionSummary,
    LambdaFunctionDetails,
)
from models.ecs_section_models import (
    ECSClusterSummary,
    ECSServiceSummary,
    ECSClusterDetails,
    ECSServiceDetails,
)
from models.eks_section_models import (
    EKSClusterSummary,
    EKSClusterDetails,
)
from models.msk_section_models import (
    MSKClusterSummary,
    MSKClusterDetails,
)
from models.redis_section_models import (
    RedisClusterSummary,
    RedisClusterDetails,
)
from models.loadbalancer_section_models import (
    LoadBalancerSummary,
    LoadBalancerDetails,
)
from models.elasticache_section_models import (
    ElastiCacheClusterSummary,
    ElastiCacheClusterDetails,
)

# cron day-of-week is 0-6 starting Sunday; 7 is also Sunday.
_CRON_DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]


def describe_cron_days(cron_expression: str) -> str:
    """Turn the day-of-week field of a cron expression into something readable.

    "0 6 * * 1-5" -> "Mon, Tue, Wed, Thu, Fri". Anything that doesn't parse is
    handed back verbatim rather than guessed at.
    """
    parts = (cron_expression or "").split()
    if len(parts) < 5:
        return "N/A"

    day_of_week = parts[4].strip()
    if day_of_week in ("*", "?"):
        return "Every day"

    days = set()
    for token in day_of_week.split(","):
        token = token.strip()
        try:
            if "-" in token:
                start, end = token.split("-", 1)
                for day in range(int(start), int(end) + 1):
                    days.add(day % 7)
            else:
                days.add(int(token) % 7)
        except ValueError:
            return day_of_week

    if not days:
        return day_of_week
    return ", ".join(_CRON_DAY_NAMES[day] for day in sorted(days))


class AWS:
    def __init__(self, config):
        self.config = config
        self.lambda_arn_mapping = self.config.get("lambda_arn_mapping", {})
        self.available_aws_regions = self.config.get("available_aws_regions", [])
        self.start_stop_servers = self.config.get("start_stop_servers", {})
        self._region_instance_ip_map_cache = {}
        self.region_labels = {
            'us-east-1': 'NV',
            'ap-southeast-1': 'SG',
    # Add more if needed
        }

    def _parallel_fetch_by_region(self, process_region, regions, entity_name: str):
        aggregated_results = []
        max_workers = min(16, max(1, len(regions)))
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {
                executor.submit(process_region, region): region
                for region in regions
            }
            for future in as_completed(futures):
                region = futures[future]
                try:
                    aggregated_results.extend(future.result())
                except Exception as e:
                    logger.exception("Error processing {} in region {}: {}", entity_name, region, e)
                    raise
        return aggregated_results

    def _load_region_instance_ip_map(self, region: str, refresh: bool = False):
        if not refresh and region in self._region_instance_ip_map_cache:
            return self._region_instance_ip_map_cache[region]

        ec2_client = boto3.client("ec2", region_name=region)
        all_ips = {}
        private_ips = {}
        next_token = None

        while True:
            kwargs = {}
            if next_token:
                kwargs["NextToken"] = next_token

            response = ec2_client.describe_instances(**kwargs)
            for reservation in response.get("Reservations", []):
                for instance in reservation.get("Instances", []):
                    instance_id = instance.get("InstanceId")
                    if not instance_id:
                        continue

                    private_ip = instance.get("PrivateIpAddress")
                    public_ip = instance.get("PublicIpAddress")

                    if private_ip:
                        all_ips[private_ip] = instance_id
                        private_ips[private_ip] = instance_id
                    if public_ip:
                        all_ips[public_ip] = instance_id

            next_token = response.get("NextToken")
            if not next_token:
                break

        cached_value = {
            "all_ips": all_ips,
            "private_ips": private_ips,
        }
        self._region_instance_ip_map_cache[region] = cached_value
        logger.info(
            "Loaded {} total IP mappings and {} private IP mappings for region {}.",
            len(all_ips),
            len(private_ips),
            region,
        )
        return cached_value

    def _find_instance_id_by_ip(self, region: str, ip: str, refresh: bool = False):
        ip_map = self._load_region_instance_ip_map(region, refresh=refresh)
        return ip_map["all_ips"].get(ip)

    def fetch_instance_compliant_status(self, region: str, ip: str):
        try:
            instance_id = self._find_instance_id_by_ip(region, ip)
        except Exception as e:
            logger.warning(
                "Error resolving instance id for region {} ip {}: {}",
                region,
                ip,
                e,
            )
            return None

        if not instance_id:
            return None

        inventory_by_instance_id = self.fetch_ssm_inventory_for_instance_ids(region, [instance_id])
        instance_information_by_instance_id = self.fetch_ssm_instance_information_for_instance_ids(region, [instance_id])
        return self._fetch_instance_compliant_status_for_instance_id(
            region,
            instance_id,
            inventory=inventory_by_instance_id.get(instance_id),
            instance_information=instance_information_by_instance_id.get(instance_id),
        )

    def _fetch_instance_compliant_status_for_instance_id(
        self,
        region: str,
        instance_id: str,
        inventory: dict | None,
        instance_information: dict | None,
    ):
        try:
            findings = self._fetch_instance_inspector_findings_by_instance_id(region, instance_id)
        except Exception as e:
            logger.warning(
                "Error fetching Inspector findings for region {} instance {}: {}",
                region,
                instance_id,
                e,
            )
            return None

        now = datetime.now(timezone.utc)
        finding_ages = []
        for finding in findings:
            first_observed_at = finding.get("firstObservedAt")
            if not first_observed_at:
                continue

            try:
                observed_at = first_observed_at.astimezone(timezone.utc)
            except Exception:
                logger.warning(
                    "Unable to normalize firstObservedAt for Inspector finding {} in region {} instance {}.",
                    finding.get("findingArn"),
                    region,
                    instance_id,
                )
                continue

            finding_ages.append((now - observed_at).days)

        if any(age > 90 for age in finding_ages):
            return "NON_COMPLIANT"

        if findings:
            return "PARTIALLY_COMPLIANT"

        if not inventory:
            return "PENDING"

        ping_status = str((instance_information or {}).get("PingStatus") or "").strip().lower()
        if ping_status != "online":
            return "PENDING"

        return "COMPLIANT"

    def fetch_ssm_inventory_for_instance_ids(self, region: str, instance_ids: List[str]):
        if not instance_ids:
            return {}

        ssm_client = boto3.client("ssm", region_name=region)
        inventory_by_instance_id = {}

        for instance_id_chunk in self._chunked(instance_ids, 40):
            next_token = None
            while True:
                request = {
                    "Filters": [
                        {
                            "Key": "AWS:InstanceInformation.InstanceId",
                            "Values": instance_id_chunk,
                            "Type": "Equal",
                        }
                    ],
                    "ResultAttributes": [
                        {"TypeName": "AWS:InstanceInformation"},
                    ],
                    "MaxResults": 50,
                }
                if next_token:
                    request["NextToken"] = next_token

                try:
                    response = ssm_client.get_inventory(**request)
                except Exception as e:
                    logger.warning(
                        "Error fetching SSM inventory in region {} for instances {}: {}",
                        region,
                        instance_id_chunk,
                        e,
                    )
                    break

                for entity in response.get("Entities", []):
                    data = entity.get("Data") or {}
                    instance_info = (data.get("AWS:InstanceInformation") or {}).get("Content") or []
                    if not instance_info:
                        continue
                    content = instance_info[0]
                    entity_id = content.get("InstanceId") or entity.get("Id")
                    if entity_id:
                        inventory_by_instance_id[entity_id] = content

                next_token = response.get("NextToken")
                if not next_token:
                    break

        logger.info(
            "Fetched SSM inventory for {} of {} instances in region {}.",
            len(inventory_by_instance_id),
            len(instance_ids),
            region,
        )
        return inventory_by_instance_id

    def fetch_ssm_instance_information_for_instance_ids(self, region: str, instance_ids: List[str]):
        if not instance_ids:
            return {}

        ssm_client = boto3.client("ssm", region_name=region)
        instance_information_by_instance_id = {}

        for instance_id_chunk in self._chunked(instance_ids, 50):
            next_token = None
            while True:
                request = {
                    "Filters": [
                        {
                            "Key": "InstanceIds",
                            "Values": instance_id_chunk,
                        }
                    ],
                    "MaxResults": 50,
                }
                if next_token:
                    request["NextToken"] = next_token

                try:
                    response = ssm_client.describe_instance_information(**request)
                except Exception as e:
                    logger.warning(
                        "Error fetching SSM instance information in region {} for instances {}: {}",
                        region,
                        instance_id_chunk,
                        e,
                    )
                    break

                for instance_information in response.get("InstanceInformationList", []):
                    instance_id = instance_information.get("InstanceId")
                    if instance_id:
                        instance_information_by_instance_id[instance_id] = instance_information

                next_token = response.get("NextToken")
                if not next_token:
                    break

        logger.info(
            "Fetched SSM instance information for {} of {} instances in region {}.",
            len(instance_information_by_instance_id),
            len(instance_ids),
            region,
        )
        return instance_information_by_instance_id

    def fetch_ec2_server_inventory(self, region: str):
        ec2_client = boto3.client("ec2", region_name=region)
        instances = []
        next_token = None
        instance_types = set()

        while True:
            request = {}
            if next_token:
                request["NextToken"] = next_token

            response = ec2_client.describe_instances(**request)
            for reservation in response.get("Reservations", []):
                for instance in reservation.get("Instances", []):
                    state_name = ((instance.get("State") or {}).get("Name") or "").lower()
                    if state_name in {"terminated", "shutting-down"}:
                        continue

                    private_ip = instance.get("PrivateIpAddress")
                    instance_id = instance.get("InstanceId")
                    if not private_ip or not instance_id:
                        continue

                    instance_type = instance.get("InstanceType")
                    if instance_type:
                        instance_types.add(instance_type)

                    hostname = private_ip
                    tags = {}
                    for tag in instance.get("Tags", []):
                        key = tag.get("Key")
                        if key:
                            tags[key] = tag.get("Value")
                        if key == "Name" and tag.get("Value"):
                            hostname = tag["Value"]

                    launch_time = instance.get("LaunchTime")
                    boot_time = None
                    if state_name in {"stopped", "stopping"}:
                        boot_time = 0
                    elif launch_time is not None:
                        try:
                            boot_time = int(launch_time.timestamp())
                        except Exception:
                            logger.warning(
                                "Unable to convert LaunchTime for region {} instance {}.",
                                region,
                                instance_id,
                            )

                    cpu_options = instance.get("CpuOptions") or {}
                    core_count = cpu_options.get("CoreCount")
                    threads_per_core = cpu_options.get("ThreadsPerCore")

                    instances.append(
                        {
                            "ts": int(datetime.now(timezone.utc).timestamp()),
                            "region": region,
                            "instance_id": instance_id,
                            "hostname": hostname,
                            "fqdn": None,
                            "primary_ip": private_ip,
                            "all_ips": [private_ip],
                            "boot_time": boot_time,
                            "cpu_count_physical": core_count,
                            "cpu_count_logical": (
                                core_count * threads_per_core
                                if core_count is not None and threads_per_core is not None
                                else None
                            ),
                            "total_memory_mb": None,
                            "platform": None,
                            "os_name": None,
                            "os_version": None,
                            "compliant_status": None,
                            "watcher_status": "unconfigured",
                            "instance_type": instance_type,
                            "tags": tags,
                        }
                    )

            next_token = response.get("NextToken")
            if not next_token:
                break

        instance_type_details = self._describe_instance_types(region, list(instance_types))
        inventory_by_instance_id = self.fetch_ssm_inventory_for_instance_ids(
            region,
            [instance["instance_id"] for instance in instances],
        )
        instance_information_by_instance_id = self.fetch_ssm_instance_information_for_instance_ids(
            region,
            [instance["instance_id"] for instance in instances],
        )

        def resolve_compliant_status(instance):
            instance_id = instance["instance_id"]
            try:
                return self._fetch_instance_compliant_status_for_instance_id(
                    region,
                    instance_id,
                    inventory=inventory_by_instance_id.get(instance_id),
                    instance_information=instance_information_by_instance_id.get(instance_id),
                )
            except Exception as e:
                logger.warning(
                    "Error resolving compliant status for region {} instance {}: {}",
                    region,
                    instance_id,
                    e,
                )
                return None

        for instance in instances:
            type_details = instance_type_details.get(instance.get("instance_type")) or {}
            if instance.get("cpu_count_physical") is None:
                instance["cpu_count_physical"] = (
                    ((type_details.get("VCpuInfo") or {}).get("DefaultCores"))
                )
            if instance.get("cpu_count_logical") is None:
                instance["cpu_count_logical"] = (
                    ((type_details.get("VCpuInfo") or {}).get("DefaultVCpus"))
                )
            instance["total_memory_mb"] = ((type_details.get("MemoryInfo") or {}).get("SizeInMiB"))

            instance_id = instance["instance_id"]
            inventory = inventory_by_instance_id.get(instance_id) or {}
            instance["platform"] = inventory.get("PlatformType")
            instance["os_name"] = inventory.get("PlatformName")
            instance["os_version"] = inventory.get("PlatformVersion")

        compliance_workers = min(12, max(1, len(instances)))
        if compliance_workers == 1:
            for instance in instances:
                instance["compliant_status"] = resolve_compliant_status(instance)
        else:
            with ThreadPoolExecutor(max_workers=compliance_workers) as executor:
                future_by_instance_id = {
                    executor.submit(resolve_compliant_status, instance): instance["instance_id"]
                    for instance in instances
                }
                compliant_status_by_instance_id = {}
                for future in as_completed(future_by_instance_id):
                    instance_id = future_by_instance_id[future]
                    compliant_status_by_instance_id[instance_id] = future.result()

            for instance in instances:
                instance["compliant_status"] = compliant_status_by_instance_id.get(instance["instance_id"])

        for instance in instances:
            instance.pop("instance_type", None)

        logger.info("Fetched {} EC2 inventory rows for region {}.", len(instances), region)
        return instances

    def _describe_instance_types(self, region: str, instance_types: List[str]):
        if not instance_types:
            return {}

        ec2_client = boto3.client("ec2", region_name=region)
        details = {}
        for instance_type_chunk in self._chunked(sorted(set(instance_types)), 100):
            try:
                response = ec2_client.describe_instance_types(InstanceTypes=instance_type_chunk)
            except Exception as e:
                logger.warning(
                    "Error describing instance types in region {} for {}: {}",
                    region,
                    instance_type_chunk,
                    e,
                )
                continue

            for instance_type in response.get("InstanceTypes", []):
                type_name = instance_type.get("InstanceType")
                if type_name:
                    details[type_name] = instance_type

        return details

    def _chunked(self, values, size):
        for index in range(0, len(values), size):
            yield values[index:index + size]

    def fetch_instance_inspector_findings(self, region: str, ip: str):
        try:
            instance_id = self._find_instance_id_by_ip(region, ip)
        except Exception as e:
            logger.warning(
                "Error resolving instance id for Inspector findings in region {} ip {}: {}",
                region,
                ip,
                e,
            )
            return []

        if not instance_id:
            return []

        return self._fetch_instance_inspector_findings_by_instance_id(region, instance_id)

    def _fetch_instance_inspector_findings_by_instance_id(self, region: str, instance_id: str):
        inspector_client = boto3.client("inspector2", region_name=region)
        findings = []
        next_token = None

        while True:
            request = {
                "filterCriteria": {
                    "resourceType": [
                        {"comparison": "EQUALS", "value": "AWS_EC2_INSTANCE"}
                    ],
                    "resourceId": [
                        {"comparison": "EQUALS", "value": instance_id}
                    ],
                    "findingStatus": [
                        {"comparison": "EQUALS", "value": "ACTIVE"}
                    ],
                },
                "maxResults": 100,
            }
            if next_token:
                request["nextToken"] = next_token

            try:
                response = inspector_client.list_findings(**request)
            except Exception as e:
                logger.warning(
                    "Error fetching Inspector findings for region {} instance {}: {}",
                    region,
                    instance_id,
                    e,
                )
                return []

            findings.extend(response.get("findings", []))
            next_token = response.get("nextToken")
            if not next_token:
                break

        logger.info(
            "Fetched {} active Inspector findings for region {} instance {}.",
            len(findings),
            region,
            instance_id,
        )
        return findings

    

    ###############################################################################################
    #                                  SCHEDULER SECTION FUNCTIONS                                #
    ###############################################################################################
    def fetch_schedules(self):
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

        def chunked(values, size):
            for index in range(0, len(values), size):
                yield values[index:index + size]

        def load_instances_by_id(ec2_client, instance_ids, region):
            instances_by_id = {}
            for instance_id_chunk in chunked(instance_ids, 100):
                try:
                    response = ec2_client.describe_instances(InstanceIds=instance_id_chunk)
                except Exception as e:
                    logger.exception(
                        "Error describing instance batch in region {}: {}",
                        region,
                        e,
                    )
                    continue

                for reservation in response.get("Reservations", []):
                    for instance in reservation.get("Instances", []):
                        current_instance_id = instance.get("InstanceId")
                        if current_instance_id:
                            instances_by_id[current_instance_id] = instance

            logger.info(
                "Loaded {} instances for {} requested ids in region {}.",
                len(instances_by_id),
                len(instance_ids),
                region,
            )
            return instances_by_id

        def process_region(region):
            events_client = boto3.client("events", region_name=region)
            ec2_client = boto3.client("ec2", region_name=region)
            rules = get_all_rules(events_client)
            matched_rules = []

            for rule in rules:
                rule_name = rule.get("Name", "")
                if not rule_name.startswith(scheduler_prefix):
                    continue

                match = rule_pattern.match(rule_name)
                if not match:
                    continue

                instance_id = match.group(1)
                event_tag_key = match.group(2)
                action = "start" if event_tag_key.startswith("start") else "stop"
                schedule_expression = rule.get("ScheduleExpression", "")
                scheduled_time = compute_scheduled_time(schedule_expression, rule_name)

                matched_rules.append(
                    {
                        "instance_id": instance_id,
                        "action": action,
                        "scheduled_time": scheduled_time if scheduled_time else now,
                    }
                )

            if not matched_rules:
                return []

            unique_instance_ids = list({rule["instance_id"] for rule in matched_rules})
            instances_by_id = load_instances_by_id(ec2_client, unique_instance_ids, region)

            region_schedules = []
            for rule in matched_rules:
                instance = instances_by_id.get(rule["instance_id"])
                if not instance:
                    logger.warning(
                        "No instance found for ID {} in region {}",
                        rule["instance_id"],
                        region,
                    )
                    continue

                instance_name = "N/A"
                private_ip = instance.get("PrivateIpAddress", "N/A")
                schedule_enabled = False
                for tag in instance.get("Tags", []):
                    key = tag.get("Key")
                    if key == "Name":
                        instance_name = tag.get("Value")
                    if key == "schedule_enabled":
                        schedule_enabled = tag.get("Value", "").lower() == "true"

                region_schedules.append(
                    Schedule(
                        instance_id=rule["instance_id"],
                        region=region,
                        private_ip=private_ip,
                        instance_name=instance_name,
                        action=rule["action"],
                        schedule_enabled=schedule_enabled,
                        scheduled_time=rule["scheduled_time"],
                    )
                )

            logger.info("Region {}: built {} schedule rows.", region, len(region_schedules))
            return region_schedules

        schedules = []
        max_workers = min(10, max(1, len(available_aws_regions)))
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {
                executor.submit(process_region, region): region
                for region in available_aws_regions
            }
            for future in as_completed(futures):
                region = futures[future]
                try:
                    schedules.extend(future.result())
                except Exception as e:
                    logger.exception("Error processing schedules for region {}: {}", region, e)
                    raise

        schedules.sort(
            key=lambda x: (
                x.scheduled_time
                if x.scheduled_time
                else datetime.max.replace(tzinfo=timezone.utc)
            )
        )
        logger.info("Total scheduled events fetched: {}", len(schedules))
        return schedules

    def fetch_instance_schedules(self):
        """Read the recurring schedule straight off the instances' tags.

        fetch_schedules() only sees the EventBridge rules the scheduler lambda
        creates, and it only creates rules for the current day -- so a schedule
        that starts Monday and stops Friday is invisible on a Wednesday. This
        reads start_time*/stop_time* tags directly instead, so every configured
        schedule shows up regardless of what runs today.
        """
        available_aws_regions = self.config.get("available_aws_regions", [])
        now = datetime.now(timezone.utc)

        def next_run(cron_expression: str):
            try:
                return croniter(cron_expression, now).get_next(datetime)
            except Exception:
                logger.warning("Unparsable cron expression: {}", cron_expression)
                return None

        def process_region(region):
            ec2_client = boto3.client("ec2", region_name=region)
            rows = []
            paginator = ec2_client.get_paginator("describe_instances")
            pages = paginator.paginate(
                Filters=[
                    {
                        "Name": "tag-key",
                        "Values": ["start_time", "stop_time", "start_time_*", "stop_time_*"],
                    }
                ]
            )

            for page in pages:
                for reservation in page.get("Reservations", []):
                    for instance in reservation.get("Instances", []):
                        instance_id = instance.get("InstanceId")
                        if not instance_id:
                            continue

                        tags = {
                            tag.get("Key", ""): tag.get("Value", "")
                            for tag in instance.get("Tags", [])
                        }
                        instance_name = tags.get("Name") or "N/A"
                        private_ip = instance.get("PrivateIpAddress") or "N/A"
                        schedule_enabled = (
                            tags.get("schedule_enabled", "").strip().lower() == "true"
                        )

                        for key, value in tags.items():
                            if key.startswith("start_time"):
                                action = "start"
                            elif key.startswith("stop_time"):
                                action = "stop"
                            else:
                                continue

                            cron_expression = (value or "").strip()
                            rows.append(
                                InstanceSchedule(
                                    instance_id=instance_id,
                                    region=region,
                                    private_ip=private_ip,
                                    instance_name=instance_name,
                                    action=action,
                                    schedule_enabled=schedule_enabled,
                                    tag_key=key,
                                    cron_expression=cron_expression or "N/A",
                                    days=describe_cron_days(cron_expression),
                                    scheduled_time=next_run(cron_expression),
                                )
                            )

            logger.info("Region {}: built {} instance schedule rows.", region, len(rows))
            return rows

        schedules = []
        max_workers = min(10, max(1, len(available_aws_regions)))
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {
                executor.submit(process_region, region): region
                for region in available_aws_regions
            }
            for future in as_completed(futures):
                region = futures[future]
                try:
                    schedules.extend(future.result())
                except Exception as e:
                    logger.exception(
                        "Error processing instance schedules for region {}: {}", region, e
                    )
                    raise

        # Grouped by instance, so every schedule for one box sits together.
        schedules.sort(
            key=lambda row: (
                row.instance_name.lower(),
                row.region,
                row.action or "",
                row.tag_key,
            )
        )
        logger.info("Total instance schedules fetched: {}", len(schedules))
        return schedules

    def fetch_aws_ips(self, region: str):
        try:
            ip_map = self._load_region_instance_ip_map(region, refresh=True)
        except Exception as e:
            logger.exception("Error fetching instances in region {}: {}", region, e)
            raise
        ips = []
        for private_ip, instance_id in ip_map["private_ips"].items():
            if private_ip and instance_id:
                ips.append(InstanceIPInfo(instance_id=instance_id, private_ip=private_ip))
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
                        public_ip=instance.get("PublicIpAddress", None),
                        instance_status=instance.get("State", {}).get("Name", None),
                        asset_custodian=next(
                            (tag["Value"] for tag in instance.get("Tags", []) if tag.get("Key") == "AssetCustodian"),
                            None,
                        ),
                    )
                    region_instances.append(summary)
            logger.info("Region {}: Found {} instances.", region, len(region_instances))
            return region_instances

        all_instances_summary = self._parallel_fetch_by_region(
            process_region,
            self.available_aws_regions,
            "instances summary",
        )
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
                public_ip_is_eip="False",
                eip_allocation_id=None
                ),
            tags=sorted(instance.get("Tags", []), key=lambda tag: tag["Key"]),
            storages=instance.get("BlockDeviceMappings", []),
        )

        pub_ip = instance_details.network_details.public_ip
        if pub_ip:
            try:
                addr_resp = ec2_client.describe_addresses(PublicIps=[pub_ip])
                addrs = addr_resp.get("Addresses", [])
                if addrs:
                    instance_details.network_details.public_ip_is_eip = "True"
                    instance_details.network_details.eip_allocation_id = addrs[0].get("AllocationId")
                else:
                    # still false, it's an ephemeral public IP
                    instance_details.network_details.public_ip_is_eip = "False"
            except Exception as e:
                logger.exception(
                    "Error checking EIP for instance %s (IP %s): %s", instance_id, pub_ip, e
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
        return self.build_zone_data(zone_name, main_url)

    def build_zone_data(self, zone_name: str, main_url: str):
        client = boto3.client("route53")
        normalized_zone_name = zone_name if zone_name.endswith(".") else f"{zone_name}."

        def get_hosted_zone_id_by_name(record_name):
            response = client.list_hosted_zones_by_name(DNSName=record_name)
            for zone in response.get("HostedZones", []):
                if zone.get("Name") == record_name:
                    return zone["Id"].split("/")[-1]
            return None

        def get_health_check_status(health_check_id):
            if not health_check_id:
                return "Not associated"

            try:
                health_check = client.get_health_check(HealthCheckId=health_check_id)
                health_response = client.get_health_check_status(
                    HealthCheckId=health_check_id
                )
            except Exception as e:
                logger.warning(
                    "Error fetching Route 53 health check status for {}: {}",
                    health_check_id,
                    e,
                )
                return "Unknown"

            inverted = bool(
                ((health_check.get("HealthCheck") or {}).get("HealthCheckConfig") or {}).get("Inverted")
            )
            observations = health_response.get("HealthCheckObservations", [])
            if not observations:
                return "Unknown"

            effective_status = "Healthy"
            for obs in observations:
                status = ((obs.get("StatusReport") or {}).get("Status") or "").lower()
                if "unhealthy" in status:
                    effective_status = "Unhealthy"
                    break

            if inverted:
                return "Healthy" if effective_status == "Unhealthy" else "Unhealthy"
            return effective_status

        def get_failover_records(zone_id, record_name):
            response = client.list_resource_record_sets(
                HostedZoneId=zone_id,
                StartRecordName=record_name,
                MaxItems="100",
            )
            failover_records = {}
            type_priority = {"A": 0, "AAAA": 1, "CNAME": 2}
            record_name_lower = record_name.lower()

            for record in response.get("ResourceRecordSets", []):
                if (record.get("Name") or "").lower() != record_name_lower:
                    break

                failover_role = record.get("Failover")
                if failover_role not in {"PRIMARY", "SECONDARY"}:
                    continue

                existing = failover_records.get(failover_role)
                current_priority = type_priority.get(record.get("Type", "ZZZ"), 999)
                existing_priority = type_priority.get(
                    (existing or {}).get("Type", "ZZZ"),
                    999,
                )
                if existing is None or current_priority < existing_priority:
                    failover_records[failover_role] = record

            return failover_records.get("PRIMARY"), failover_records.get("SECONDARY")

        def get_alias_target(record):
            alias_dns = ((record.get("AliasTarget") or {}).get("DNSName")) or ""
            if alias_dns:
                return alias_dns.replace("dualstack.", "").rstrip(".")

            resource_records = record.get("ResourceRecords") or []
            if resource_records:
                return (resource_records[0].get("Value") or "").rstrip(".")

            return "Not an alias"

        def get_location_label(alias_target):
            if not alias_target or alias_target == "Not an alias":
                return "Unknown Location"
            return next(
                (
                    label
                    for region_key, label in self.region_labels.items()
                    if region_key in alias_target
                ),
                "Unknown Location",
            )

        def build_record_model(record):
            if not record:
                return None

            alias_target = get_alias_target(record)
            return RecordModel(
                dns_name=(record.get("Name") or "").rstrip("."),
                alias_target=alias_target,
                location=get_location_label(alias_target),
                health_check_id=record.get("HealthCheckId"),
                health_status=get_health_check_status(record.get("HealthCheckId")),
            )

        def resolve_active_target(primary_record, secondary_record):
            primary_status = primary_record.health_status if primary_record else None
            secondary_status = secondary_record.health_status if secondary_record else None

            if primary_record and primary_status != "Unhealthy":
                return (
                    "primary",
                    primary_record.alias_target,
                    primary_record.location,
                    (
                        "Primary record is serving traffic"
                        if primary_status == "Healthy"
                        else "Primary record has no failing health signal, so Route 53 keeps traffic on primary"
                    ),
                )

            if secondary_record and secondary_status != "Unhealthy":
                return (
                    "secondary",
                    secondary_record.alias_target,
                    secondary_record.location,
                    "Primary record is unhealthy, so traffic has failed over to secondary",
                )

            return (
                None,
                None,
                None,
                "Unable to determine an active target from Route 53 failover health",
            )

        zone_id = get_hosted_zone_id_by_name(normalized_zone_name)
        if not zone_id:
            return {
                "primary": None,
                "secondary": None,
                "active_target": None,
                "active_alias_target": None,
                "active_location": None,
                "routing_reason": "Hosted zone was not found",
            }

        primary, secondary = get_failover_records(zone_id, normalized_zone_name)
        primary_record_model = build_record_model(primary)
        secondary_record_model = build_record_model(secondary)
        active_target, active_alias_target, active_location, routing_reason = resolve_active_target(
            primary_record_model,
            secondary_record_model,
        )

        return {
            "primary": primary_record_model,
            "secondary": secondary_record_model,
            "active_target": active_target,
            "active_alias_target": active_alias_target,
            "active_location": active_location,
            "routing_reason": routing_reason,
        }

    ###############################################################################################
    #                                  LAMBDA SECTION FUNCTIONS                                   #
    ###############################################################################################
    def fetch_lambda_functions_summary(self):
        def process_region(region):
            logger.debug("Processing Lambda functions in region: {}", region)
            lambda_client = boto3.client("lambda", region_name=region)
            region_functions = []
            try:
                functions_data = lambda_client.list_functions()
            except Exception as e:
                logger.exception("Error fetching Lambda functions in region {}: {}", region, e)
                raise

            for function in functions_data.get("Functions", []):
                summary = LambdaFunctionSummary(
                    region=region,
                    function_name=function.get("FunctionName", ""),
                    function_arn=function.get("FunctionArn", ""),
                    runtime=function.get("Runtime", None),
                    memory_size=function.get("MemorySize", None),
                    timeout=function.get("Timeout", None),
                    last_modified=function.get("LastModified", None),
                    code_size=function.get("CodeSize", None),
                    description=function.get("Description", None),
                    state=function.get("State", None),
                )
                region_functions.append(summary)
            logger.info("Region {}: Found {} Lambda functions.", region, len(region_functions))
            return region_functions

        all_functions_summary = self._parallel_fetch_by_region(
            process_region,
            self.available_aws_regions,
            "lambda functions summary",
        )
        logger.info("Total Lambda functions summary fetched: {}", len(all_functions_summary))
        return all_functions_summary

    def fetch_lambda_function_details(self, region: str, function_name: str):
        lambda_client = boto3.client("lambda", region_name=region)
        try:
            function_data = lambda_client.get_function(FunctionName=function_name)
        except Exception as e:
            logger.exception("Error fetching details for Lambda function {}: {}", function_name, e)
            raise

        function = function_data.get("Configuration", {})
        function_details = LambdaFunctionDetails(
            function_name=function.get("FunctionName", ""),
            function_arn=function.get("FunctionArn", ""),
            runtime=function.get("Runtime", None),
            role=function.get("Role", None),
            handler=function.get("Handler", None),
            code_size=function.get("CodeSize", None),
            description=function.get("Description", None),
            timeout=function.get("Timeout", None),
            memory_size=function.get("MemorySize", None),
            last_modified=function.get("LastModified", None),
            version=function.get("Version", None),
            environment_variables=function.get("Environment", {}).get("Variables", None),
            tags=function_data.get("Tags", None),
            vpc_config=function.get("VpcConfig", None),
            layers=function.get("Layers", None),
        )
        return function_details

    ###############################################################################################
    #                                  ECS SECTION FUNCTIONS                                      #
    ###############################################################################################
    def fetch_ecs_clusters_summary(self):
        def process_region(region):
            logger.debug("Processing ECS clusters in region: {}", region)
            ecs_client = boto3.client("ecs", region_name=region)
            region_clusters = []
            try:
                clusters_data = ecs_client.list_clusters()
                if clusters_data.get("clusterArns"):
                    cluster_details = ecs_client.describe_clusters(clusters=clusters_data["clusterArns"])
                else:
                    cluster_details = {"clusters": []}
            except Exception as e:
                logger.exception("Error fetching ECS clusters in region {}: {}", region, e)
                raise

            for cluster in cluster_details.get("clusters", []):
                # Get IP addresses from ECS tasks directly
                private_ips = []
                public_ips = []
                
                try:
                    ec2_client = boto3.client("ec2", region_name=region)
                    
                    # Get all tasks in the cluster
                    tasks_response = ecs_client.list_tasks(cluster=cluster.get("clusterName", ""))
                    
                    if tasks_response.get("taskArns"):
                        # Get task details
                        tasks_details = ecs_client.describe_tasks(
                            cluster=cluster.get("clusterName", ""),
                            tasks=tasks_response["taskArns"]
                        )
                        
                        for task in tasks_details.get("tasks", []):
                            # Get IPs from task attachments
                            for attachment in task.get("attachments", []):
                                if attachment.get("type") == "ElasticNetworkInterface":
                                    for detail in attachment.get("details", []):
                                        if detail.get("name") == "networkInterfaceId":
                                            eni_id = detail.get("value")
                                            if eni_id:
                                                try:
                                                    # Get ENI details
                                                    eni_response = ec2_client.describe_network_interfaces(
                                                        NetworkInterfaceIds=[eni_id]
                                                    )
                                                    for eni in eni_response.get("NetworkInterfaces", []):
                                                        # Get private IPs
                                                        for private_ip in eni.get("PrivateIpAddresses", []):
                                                            ip = private_ip.get("PrivateIpAddress")
                                                            if ip and ip not in private_ips:
                                                                private_ips.append(ip)
                                                        
                                                        # Get public IP if associated
                                                        association = eni.get("Association")
                                                        if association and association.get("PublicIp"):
                                                            public_ip = association.get("PublicIp")
                                                            if public_ip not in public_ips:
                                                                public_ips.append(public_ip)
                                                except Exception as eni_error:
                                                    logger.debug("Error fetching ENI {} for task {}: {}", eni_id, task.get("taskArn", ""), eni_error)
                                    
                except Exception as e:
                    logger.warning("Error fetching IP addresses for ECS cluster {}: {}", cluster.get("clusterName", ""), e)

                summary = ECSClusterSummary(
                    region=region,
                    cluster_name=cluster.get("clusterName", ""),
                    cluster_arn=cluster.get("clusterArn", ""),
                    status=cluster.get("status", None),
                    active_services_count=cluster.get("activeServicesCount", None),
                    running_tasks_count=cluster.get("runningTasksCount", None),
                    pending_tasks_count=cluster.get("pendingTasksCount", None),
                    private_ips=private_ips if private_ips else None,
                    public_ips=public_ips if public_ips else None,
                )
                region_clusters.append(summary)
            logger.info("Region {}: Found {} ECS clusters.", region, len(region_clusters))
            return region_clusters

        all_clusters_summary = self._parallel_fetch_by_region(
            process_region,
            self.available_aws_regions,
            "ecs clusters summary",
        )
        logger.info("Total ECS clusters summary fetched: {}", len(all_clusters_summary))
        return all_clusters_summary

    def fetch_ecs_services_summary(self):
        def process_region(region):
            logger.debug("Processing ECS services in region: {}", region)
            ecs_client = boto3.client("ecs", region_name=region)
            region_services = []
            try:
                clusters_data = ecs_client.list_clusters()
                for cluster_arn in clusters_data.get("clusterArns", []):
                    cluster_name = cluster_arn.split("/")[-1]
                    services_data = ecs_client.list_services(cluster=cluster_arn)
                    if services_data.get("serviceArns"):
                        service_details = ecs_client.describe_services(
                            cluster=cluster_arn, 
                            services=services_data["serviceArns"]
                        )
                        for service in service_details.get("services", []):
                            # Get IP addresses from ECS tasks
                            private_ips = []
                            public_ips = []
                            
                            try:
                                ec2_client = boto3.client("ec2", region_name=region)
                                
                                # Get tasks for this service
                                tasks_response = ecs_client.list_tasks(
                                    cluster=cluster_name,
                                    serviceName=service.get("serviceName", "")
                                )
                                
                                if tasks_response.get("taskArns"):
                                    # Get task details
                                    tasks_details = ecs_client.describe_tasks(
                                        cluster=cluster_name,
                                        tasks=tasks_response["taskArns"]
                                    )
                                    
                                    for task in tasks_details.get("tasks", []):
                                        # Get IPs from task attachments
                                        for attachment in task.get("attachments", []):
                                            if attachment.get("type") == "ElasticNetworkInterface":
                                                for detail in attachment.get("details", []):
                                                    if detail.get("name") == "networkInterfaceId":
                                                        eni_id = detail.get("value")
                                                        if eni_id:
                                                            try:
                                                                # Get ENI details
                                                                eni_response = ec2_client.describe_network_interfaces(
                                                                    NetworkInterfaceIds=[eni_id]
                                                                )
                                                                for eni in eni_response.get("NetworkInterfaces", []):
                                                                    # Get private IPs
                                                                    for private_ip in eni.get("PrivateIpAddresses", []):
                                                                        ip = private_ip.get("PrivateIpAddress")
                                                                        if ip and ip not in private_ips:
                                                                            private_ips.append(ip)
                                                                    
                                                                    # Get public IP if associated
                                                                    association = eni.get("Association")
                                                                    if association and association.get("PublicIp"):
                                                                        public_ip = association.get("PublicIp")
                                                                        if public_ip not in public_ips:
                                                                            public_ips.append(public_ip)
                                                            except Exception as eni_error:
                                                                logger.debug("Error fetching ENI {} for task {}: {}", eni_id, task.get("taskArn", ""), eni_error)
                                                
                            except Exception as e:
                                logger.warning("Error fetching IP addresses for ECS service {}: {}", service.get("serviceName", ""), e)

                            summary = ECSServiceSummary(
                                region=region,
                                cluster_name=cluster_name,
                                service_name=service.get("serviceName", ""),
                                service_arn=service.get("serviceArn", ""),
                                status=service.get("status", None),
                                desired_count=service.get("desiredCount", None),
                                running_count=service.get("runningCount", None),
                                pending_count=service.get("pendingCount", None),
                                launch_type=service.get("launchType", None),
                                private_ips=private_ips if private_ips else None,
                                public_ips=public_ips if public_ips else None,
                            )
                            region_services.append(summary)
            except Exception as e:
                logger.exception("Error fetching ECS services in region {}: {}", region, e)
                raise

            logger.info("Region {}: Found {} ECS services.", region, len(region_services))
            return region_services

        all_services_summary = self._parallel_fetch_by_region(
            process_region,
            self.available_aws_regions,
            "ecs services summary",
        )
        logger.info("Total ECS services summary fetched: {}", len(all_services_summary))
        return all_services_summary

    def fetch_ecs_cluster_details(self, region: str, cluster_name: str):
        ecs_client = boto3.client("ecs", region_name=region)
        try:
            cluster_data = ecs_client.describe_clusters(clusters=[cluster_name])
        except Exception as e:
            logger.exception("Error fetching details for ECS cluster {}: {}", cluster_name, e)
            raise

        if not cluster_data.get("clusters"):
            logger.warning("No cluster found for cluster name {}.", cluster_name)
            return None

        cluster = cluster_data["clusters"][0]
        cluster_details = ECSClusterDetails(
            cluster_name=cluster.get("clusterName", ""),
            cluster_arn=cluster.get("clusterArn", ""),
            status=cluster.get("status", None),
            active_services_count=cluster.get("activeServicesCount", None),
            running_tasks_count=cluster.get("runningTasksCount", None),
            pending_tasks_count=cluster.get("pendingTasksCount", None),
            registered_container_instances_count=cluster.get("registeredContainerInstancesCount", None),
            capacity_providers=cluster.get("capacityProviders", None),
            default_capacity_provider_strategy=cluster.get("defaultCapacityProviderStrategy", None),
            tags=cluster.get("tags", None),
        )
        return cluster_details

    def fetch_ecs_service_details(self, region: str, cluster_name: str, service_name: str):
        ecs_client = boto3.client("ecs", region_name=region)
        try:
            service_data = ecs_client.describe_services(cluster=cluster_name, services=[service_name])
        except Exception as e:
            logger.exception("Error fetching details for ECS service {}: {}", service_name, e)
            raise

        if not service_data.get("services"):
            logger.warning("No service found for service name {}.", service_name)
            return None

        service = service_data["services"][0]
        service_details = ECSServiceDetails(
            service_name=service.get("serviceName", ""),
            service_arn=service.get("serviceArn", ""),
            cluster_name=cluster_name,
            status=service.get("status", None),
            desired_count=service.get("desiredCount", None),
            running_count=service.get("runningCount", None),
            pending_count=service.get("pendingCount", None),
            launch_type=service.get("launchType", None),
            task_definition=service.get("taskDefinition", None),
            deployment_configuration=service.get("deploymentConfiguration", None),
            network_configuration=service.get("networkConfiguration", None),
            load_balancers=service.get("loadBalancers", None),
            tags=service.get("tags", None),
        )
        return service_details

    ###############################################################################################
    #                                  EKS SECTION FUNCTIONS                                       #
    ###############################################################################################
    def fetch_eks_clusters_summary(self):
        def process_region(region):
            logger.debug("Processing EKS clusters in region: {}", region)
            eks_client = boto3.client("eks", region_name=region)
            region_clusters = []
            try:
                clusters_data = eks_client.list_clusters()
                if clusters_data.get("clusters"):
                    cluster_detail = eks_client.describe_cluster(name=clusters_data["clusters"][0])
                    # Note: describe_cluster only returns one cluster, so we need to iterate
                    for cluster_name in clusters_data["clusters"]:
                        try:
                            cluster_detail = eks_client.describe_cluster(name=cluster_name)
                            cluster = cluster_detail.get("cluster", {})
                            
                            # Get IP addresses from node group instances
                            private_ips = []
                            public_ips = []
                            
                            try:
                                # Get node groups for this cluster
                                node_groups_data = eks_client.list_nodegroups(clusterName=cluster_name)
                                ec2_client = boto3.client("ec2", region_name=region)
                                autoscaling_client = boto3.client("autoscaling", region_name=region)
                                
                                for nodegroup_name in node_groups_data.get("nodegroups", []):
                                    try:
                                        nodegroup_detail = eks_client.describe_nodegroup(
                                            clusterName=cluster_name, 
                                            nodegroupName=nodegroup_name
                                        )
                                        nodegroup = nodegroup_detail.get("nodegroup", {})
                                        
                                        # Get instances from Auto Scaling Groups
                                        asg_names = nodegroup.get("resources", {}).get("autoScalingGroups", [])
                                        for asg in asg_names:
                                            asg_name = asg.get("name")
                                            if asg_name:
                                                try:
                                                    asg_response = autoscaling_client.describe_auto_scaling_groups(
                                                        AutoScalingGroupNames=[asg_name]
                                                    )
                                                    for group in asg_response.get("AutoScalingGroups", []):
                                                        instance_ids = [i["InstanceId"] for i in group.get("Instances", [])]
                                                        if instance_ids:
                                                            try:
                                                                instances_response = ec2_client.describe_instances(InstanceIds=instance_ids)
                                                                for reservation in instances_response.get("Reservations", []):
                                                                    for instance in reservation.get("Instances", []):
                                                                        private_ip = instance.get("PrivateIpAddress")
                                                                        public_ip = instance.get("PublicIpAddress")
                                                                        if private_ip and private_ip not in private_ips:
                                                                            private_ips.append(private_ip)
                                                                        if public_ip and public_ip not in public_ips:
                                                                            public_ips.append(public_ip)
                                                            except Exception as instance_error:
                                                                logger.debug("Error fetching instances for ASG {}: {}", asg_name, instance_error)
                                                except Exception as asg_error:
                                                    logger.debug("Error fetching ASG {}: {}", asg_name, asg_error)
                                    except Exception as e:
                                        logger.warning("Error fetching IP addresses for node group {}: {}", nodegroup_name, e)
                                        continue
                            except Exception as e:
                                logger.warning("Error fetching IP addresses for EKS cluster {}: {}", cluster_name, e)
                            
                            # Fallback: Try to get IPs from instances tagged with this cluster
                            if not private_ips and not public_ips:
                                try:
                                    instances_response = ec2_client.describe_instances(
                                        Filters=[
                                            {
                                                'Name': 'tag:kubernetes.io/cluster/' + cluster_name,
                                                'Values': ['owned', 'shared']
                                            }
                                        ]
                                    )
                                    for reservation in instances_response.get("Reservations", []):
                                        for instance in reservation.get("Instances", []):
                                            private_ip = instance.get("PrivateIpAddress")
                                            public_ip = instance.get("PublicIpAddress")
                                            if private_ip and private_ip not in private_ips:
                                                private_ips.append(private_ip)
                                            if public_ip and public_ip not in public_ips:
                                                public_ips.append(public_ip)
                                except Exception as fallback_error:
                                    logger.debug("Fallback IP fetching failed for EKS cluster {}: {}", cluster_name, fallback_error)
                            
                            summary = EKSClusterSummary(
                                region=region,
                                cluster_name=cluster.get("name", ""),
                                cluster_arn=cluster.get("arn", ""),
                                status=cluster.get("status", None),
                                version=cluster.get("version", None),
                                platform_version=cluster.get("platformVersion", None),
                                endpoint=cluster.get("endpoint", None),
                                created_at=str(cluster.get("createdAt", None)),
                                private_ips=private_ips if private_ips else None,
                                public_ips=public_ips if public_ips else None,
                            )
                            region_clusters.append(summary)
                        except Exception as e:
                            logger.warning("Error fetching details for EKS cluster {}: {}", cluster_name, e)
                            continue
            except Exception as e:
                logger.exception("Error fetching EKS clusters in region {}: {}", region, e)
                raise

            logger.info("Region {}: Found {} EKS clusters.", region, len(region_clusters))
            return region_clusters

        all_clusters_summary = self._parallel_fetch_by_region(
            process_region,
            self.available_aws_regions,
            "eks clusters summary",
        )
        logger.info("Total EKS clusters summary fetched: {}", len(all_clusters_summary))
        return all_clusters_summary

    def fetch_eks_cluster_details(self, region: str, cluster_name: str):
        eks_client = boto3.client("eks", region_name=region)
        try:
            cluster_data = eks_client.describe_cluster(name=cluster_name)
        except Exception as e:
            logger.exception("Error fetching details for EKS cluster {}: {}", cluster_name, e)
            raise

        cluster = cluster_data.get("cluster", {})
        if not cluster:
            logger.warning("No cluster found for cluster name {}.", cluster_name)
            return None

        # Get node groups for this cluster
        node_groups = []
        try:
            node_groups_data = eks_client.list_nodegroups(clusterName=cluster_name)
            for nodegroup_name in node_groups_data.get("nodegroups", []):
                try:
                    nodegroup_detail = eks_client.describe_nodegroup(
                        clusterName=cluster_name, 
                        nodegroupName=nodegroup_name
                    )
                    node_groups.append(nodegroup_detail.get("nodegroup", {}))
                except Exception as e:
                    logger.warning("Error fetching details for node group {}: {}", nodegroup_name, e)
                    continue
        except Exception as e:
            logger.warning("Error fetching node groups for cluster {}: {}", cluster_name, e)

        cluster_details = EKSClusterDetails(
            cluster_name=cluster.get("name", ""),
            cluster_arn=cluster.get("arn", ""),
            status=cluster.get("status", None),
            version=cluster.get("version", None),
            platform_version=cluster.get("platformVersion", None),
            endpoint=cluster.get("endpoint", None),
            created_at=str(cluster.get("createdAt", None)),
            role_arn=cluster.get("roleArn", None),
            resources_vpc_config=cluster.get("resourcesVpcConfig", None),
            logging=cluster.get("logging", None),
            identity=cluster.get("identity", None),
            tags=cluster.get("tags", None),
            node_groups=node_groups,
        )
        return cluster_details

    ###############################################################################################
    #                                  MSK SECTION FUNCTIONS                                       #
    ###############################################################################################
    def fetch_msk_clusters_summary(self):
        def process_region(region):
            logger.debug("Processing MSK clusters in region: {}", region)
            region_clusters = []
            
            try:
                kafka_client = boto3.client("kafka", region_name=region)
                
                # Fetch provisioned MSK clusters
                provisioned_clusters_data = kafka_client.list_clusters()
                provisioned_count = 0
                serverless_count = 0
                
                for cluster in provisioned_clusters_data.get("ClusterInfoList", []):
                    cluster_name = cluster.get("ClusterName", "")
                    cluster_type_info = cluster.get("ClusterType", "")
                    
                    # Determine cluster type - serverless clusters might have different indicators
                    is_serverless = (
                        cluster_type_info == "SERVERLESS" or
                        cluster_type_info == "serverless" or
                        cluster_name.upper().find("SERVERLESS") != -1 or
                        # Serverless clusters typically don't have broker nodes
                        cluster.get("NumberOfBrokerNodes") is None or
                        cluster.get("NumberOfBrokerNodes") == 0
                    )
                    
                    if is_serverless:
                        summary = MSKClusterSummary(
                            region=region,
                            cluster_name=cluster_name,
                            cluster_arn=cluster.get("ClusterArn", ""),
                            state=cluster.get("State", None),
                            kafka_version=cluster.get("CurrentBrokerSoftwareInfo", {}).get("KafkaVersion", None),
                            number_of_broker_nodes=None,  # Serverless clusters don't have broker nodes
                            cluster_type="serverless"
                        )
                        region_clusters.append(summary)
                        serverless_count += 1
                        logger.debug("Found serverless cluster: {} (ClusterType: '{}')", cluster_name, cluster_type_info)
                    else:
                        summary = MSKClusterSummary(
                            region=region,
                            cluster_name=cluster_name,
                            cluster_arn=cluster.get("ClusterArn", ""),
                            state=cluster.get("State", None),
                            kafka_version=cluster.get("CurrentBrokerSoftwareInfo", {}).get("KafkaVersion", None),
                            number_of_broker_nodes=cluster.get("NumberOfBrokerNodes", None),
                            cluster_type="provisioned"
                        )
                        region_clusters.append(summary)
                        provisioned_count += 1
                
                # Try to fetch serverless MSK clusters using a different approach
                # Some serverless clusters might not appear in the regular list_clusters call
                try:
                    # Check if there are any serverless clusters that might be listed differently
                    # This is a fallback approach for regions where serverless clusters might be listed separately
                    logger.debug("Checking for additional serverless MSK clusters in region: {}", region)
                    
                    # Log all clusters for debugging
                    for cluster in provisioned_clusters_data.get("ClusterInfoList", []):
                        logger.debug("Cluster: {} | Type: {} | BrokerNodes: {} | ARN: {}", 
                                   cluster.get("ClusterName", ""),
                                   cluster.get("ClusterType", "Unknown"),
                                   cluster.get("NumberOfBrokerNodes", "Unknown"),
                                   cluster.get("ClusterArn", ""))
                        
                        # Additional check for serverless indicators
                        if (cluster.get("ClusterType") == "SERVERLESS" or 
                            cluster.get("State") == "ACTIVE" and cluster.get("NumberOfBrokerNodes") is None):
                            # This might be a serverless cluster that wasn't caught earlier
                            if not any(c.cluster_arn == cluster.get("ClusterArn") for c in region_clusters):
                                summary = MSKClusterSummary(
                                    region=region,
                                    cluster_name=cluster.get("ClusterName", ""),
                                    cluster_arn=cluster.get("ClusterArn", ""),
                                    state=cluster.get("State", None),
                                    kafka_version=cluster.get("CurrentBrokerSoftwareInfo", {}).get("KafkaVersion", None),
                                    number_of_broker_nodes=None,
                                    cluster_type="serverless"
                                )
                                region_clusters.append(summary)
                                serverless_count += 1
                                logger.debug("Found additional serverless cluster: {}", cluster.get("ClusterName", ""))
                
                except Exception as e:
                    logger.debug("No additional serverless clusters found in region {}: {}", region, e)
                
                # Try to use list_clusters_v2 if available (for newer AWS SDK versions)
                try:
                    logger.debug("Attempting to use list_clusters_v2 for region: {}", region)
                    clusters_v2_data = kafka_client.list_clusters_v2()
                    
                    for cluster in clusters_v2_data.get("ClusterInfoList", []):
                        cluster_name = cluster.get("ClusterName", "")
                        cluster_type_info = cluster.get("ClusterType", "")
                        
                        # Check if this cluster is already in our list
                        if not any(c.cluster_arn == cluster.get("ClusterArn") for c in region_clusters):
                            is_serverless = (
                                cluster_type_info == "SERVERLESS" or
                                cluster_type_info == "serverless" or
                                cluster_name.upper().find("SERVERLESS") != -1 or
                                cluster.get("NumberOfBrokerNodes") is None or
                                cluster.get("NumberOfBrokerNodes") == 0
                            )
                            
                            summary = MSKClusterSummary(
                                region=region,
                                cluster_name=cluster_name,
                                cluster_arn=cluster.get("ClusterArn", ""),
                                state=cluster.get("State", None),
                                kafka_version=cluster.get("CurrentBrokerSoftwareInfo", {}).get("KafkaVersion", None),
                                number_of_broker_nodes=cluster.get("NumberOfBrokerNodes", None),
                                cluster_type="serverless" if is_serverless else "provisioned"
                            )
                            region_clusters.append(summary)
                            
                            if is_serverless:
                                serverless_count += 1
                                logger.debug("Found serverless cluster via v2 API: {}", cluster_name)
                            else:
                                provisioned_count += 1
                                logger.debug("Found provisioned cluster via v2 API: {}", cluster_name)
                
                except Exception as e:
                    logger.debug("list_clusters_v2 not available or failed in region {}: {}", region, e)
                
                logger.debug("Region {}: Found {} provisioned and {} serverless MSK clusters.", 
                           region, provisioned_count, serverless_count)
                
            except Exception as e:
                logger.exception("Error fetching MSK clusters in region {}: {}", region, e)
            
            logger.info("Region {}: Found {} total MSK clusters (provisioned + serverless).", region, len(region_clusters))
            return region_clusters

        all_clusters_summary = self._parallel_fetch_by_region(
            process_region,
            self.available_aws_regions,
            "msk clusters summary",
        )
        logger.info("Total MSK clusters summary fetched: {} (including both provisioned and serverless)", len(all_clusters_summary))
        return all_clusters_summary

    def fetch_msk_cluster_details(self, cluster_arn: str):
        # URL decode the cluster ARN in case it's encoded
        import urllib.parse
        try:
            cluster_arn = urllib.parse.unquote(cluster_arn)
        except Exception as e:
            logger.debug("Failed to URL decode cluster ARN, using as-is: {}", e)
        
        logger.debug("Processing cluster details request for ARN: {}", cluster_arn)
        
        # Extract region from ARN: arn:aws:kafka:region:account:cluster/cluster-name/uuid
        try:
            region = cluster_arn.split(":")[3]
            logger.debug("Extracted region: {} from ARN", region)
            
            # Validate that this is a valid MSK ARN
            if not cluster_arn.startswith("arn:aws:kafka:"):
                logger.error("Invalid MSK ARN format: {}", cluster_arn)
                raise ValueError("Invalid MSK ARN format")
                
        except IndexError:
            logger.error("Invalid cluster ARN format: {}", cluster_arn)
            raise ValueError("Invalid cluster ARN format")
        
        kafka_client = boto3.client("kafka", region_name=region)
        
        # First, try to determine if this is a serverless cluster by checking the cluster list
        try:
            logger.debug("Fetching cluster list for region: {}", region)
            clusters_data = kafka_client.list_clusters()
            cluster_info = None
            
            logger.debug("Found {} clusters in region {}", len(clusters_data.get("ClusterInfoList", [])), region)
            
            for cluster in clusters_data.get("ClusterInfoList", []):
                aws_cluster_arn = cluster.get("ClusterArn", "")
                logger.debug("Comparing ARN: {} with: {}", cluster_arn, aws_cluster_arn)
                if aws_cluster_arn == cluster_arn:
                    cluster_info = cluster
                    logger.debug("Found matching cluster: {}", cluster.get("ClusterName", ""))
                    break
            
            if not cluster_info:
                logger.warning("Cluster ARN {} not found in cluster list for region {}.", cluster_arn, region)
                logger.debug("Available clusters in region {}: {}", region, 
                           [c.get("ClusterArn", "") for c in clusters_data.get("ClusterInfoList", [])])
                
                # Try to find the cluster in other regions as a fallback
                logger.info("Trying to find cluster in other regions...")
                for fallback_region in self.available_aws_regions:
                    if fallback_region == region:
                        continue
                    
                    try:
                        logger.debug("Checking region: {}", fallback_region)
                        fallback_client = boto3.client("kafka", region_name=fallback_region)
                        fallback_clusters_data = fallback_client.list_clusters()
                        
                        for cluster in fallback_clusters_data.get("ClusterInfoList", []):
                            if cluster.get("ClusterArn") == cluster_arn:
                                cluster_info = cluster
                                logger.info("Found cluster in fallback region: {}", fallback_region)
                                break
                        
                        if cluster_info:
                            break
                    except Exception as e:
                        logger.debug("Error checking region {}: {}", fallback_region, e)
                        continue
                
                if not cluster_info:
                    logger.warning("Cluster ARN {} not found in any available region.", cluster_arn)
                    
                    # Try to use describe_cluster directly as a last resort
                    # This might work for clusters that don't appear in list_clusters
                    logger.info("Trying describe_cluster directly as fallback...")
                    try:
                        cluster_data = kafka_client.describe_cluster(ClusterArn=cluster_arn)
                        cluster = cluster_data.get("ClusterInfo", {})
                        
                        if cluster:
                            logger.info("Successfully found cluster using describe_cluster fallback")
                            cluster_info = cluster
                        else:
                            logger.error("Cluster ARN {} not found in any available region or via describe_cluster.", cluster_arn)
                            raise ValueError("Cluster not found in any available region or via describe_cluster")
                            
                    except Exception as e:
                        logger.error("Failed to find cluster via describe_cluster fallback: {}", e)
                        raise ValueError("Cluster not found in any available region or via describe_cluster")
            
            # Determine cluster type
            cluster_type_info = cluster_info.get("ClusterType", "")
            cluster_name = cluster_info.get("ClusterName", "")
            
            logger.debug("Cluster info - Name: {}, Type: {}, BrokerNodes: {}", 
                        cluster_name, cluster_type_info, cluster_info.get("NumberOfBrokerNodes"))
            
            is_serverless = (
                cluster_type_info == "SERVERLESS" or
                cluster_type_info == "serverless" or
                cluster_name.upper().find("SERVERLESS") != -1 or
                # Serverless clusters typically don't have broker nodes
                cluster_info.get("NumberOfBrokerNodes") is None or
                cluster_info.get("NumberOfBrokerNodes") == 0
            )
            
            cluster_type = "serverless" if is_serverless else "provisioned"
            logger.debug("Cluster {} detected as {} (ClusterType: '{}', BrokerNodes: {})", 
                        cluster_name, cluster_type, cluster_type_info, cluster_info.get("NumberOfBrokerNodes"))
            
            # For serverless clusters, we can't use describe_cluster, so we'll use the data from list_clusters
            if is_serverless:
                logger.info("Using list_clusters data for serverless cluster: {}", cluster_name)
                
                # Convert tags from list of dicts to dict if needed
                tags = cluster_info.get("Tags", None)
                if tags and isinstance(tags, list):
                    tags_dict = {}
                    for tag in tags:
                        if isinstance(tag, dict) and "Key" in tag and "Value" in tag:
                            tags_dict[tag["Key"]] = tag["Value"]
                    tags = tags_dict
                
                cluster_details = MSKClusterDetails(
                    cluster_name=cluster_info.get("ClusterName", ""),
                    cluster_arn=cluster_info.get("ClusterArn", ""),
                    state=cluster_info.get("State", None),
                    kafka_version=cluster_info.get("CurrentBrokerSoftwareInfo", {}).get("KafkaVersion", None),
                    number_of_broker_nodes=None,  # Serverless clusters don't have broker nodes
                    enhanced_monitoring=None,  # Not available for serverless via list_clusters
                    broker_node_group_info=None,  # Not applicable for serverless
                    client_authentication=None,  # Not available for serverless via list_clusters
                    encryption_info=None,  # Not available for serverless via list_clusters
                    connectivity_info=None,  # Not available for serverless via list_clusters
                    logging_info=None,  # Not available for serverless via list_clusters
                    tags=tags,
                    configuration_info=None,  # Not available for serverless via list_clusters
                    cluster_type=cluster_type
                )
                
                return cluster_details
            
            # For provisioned clusters, use describe_cluster as before
            else:
                logger.info("Using describe_cluster for provisioned cluster: {}", cluster_name)
                try:
                    cluster_data = kafka_client.describe_cluster(ClusterArn=cluster_arn)
                except Exception as e:
                    logger.exception("Error fetching details for provisioned MSK cluster {}: {}", cluster_arn, e)
                    raise

                cluster = cluster_data.get("ClusterInfo", {})
                if not cluster:
                    logger.warning("No cluster found for cluster ARN {}.", cluster_arn)
                    return None

                # Convert tags from list of dicts to dict if needed
                tags = cluster.get("Tags", None)
                if tags and isinstance(tags, list):
                    tags_dict = {}
                    for tag in tags:
                        if isinstance(tag, dict) and "Key" in tag and "Value" in tag:
                            tags_dict[tag["Key"]] = tag["Value"]
                    tags = tags_dict

                cluster_details = MSKClusterDetails(
                    cluster_name=cluster.get("ClusterName", ""),
                    cluster_arn=cluster.get("ClusterArn", ""),
                    state=cluster.get("State", None),
                    kafka_version=cluster.get("CurrentBrokerSoftwareInfo", {}).get("KafkaVersion", None),
                    number_of_broker_nodes=cluster.get("NumberOfBrokerNodes", None),
                    enhanced_monitoring=cluster.get("EnhancedMonitoring", None),
                    broker_node_group_info=cluster.get("BrokerNodeGroupInfo", None),
                    client_authentication=cluster.get("ClientAuthentication", None),
                    encryption_info=cluster.get("EncryptionInfo", None),
                    connectivity_info=cluster.get("ConnectivityInfo", None),
                    logging_info=cluster.get("LoggingInfo", None),
                    tags=tags,
                    configuration_info=cluster.get("ConfigurationInfo", None),
                    cluster_type=cluster_type
                )
                
                return cluster_details
                
        except Exception as e:
            logger.exception("Error fetching details for MSK cluster {}: {}", cluster_arn, e)
            raise

    ###############################################################################################
    #                                  REDIS SECTION FUNCTIONS                                     #
    ###############################################################################################
    def fetch_redis_clusters_summary(self):
        def process_region(region):
            logger.debug("Processing Redis clusters in region: {}", region)
            elasticache_client = boto3.client("elasticache", region_name=region)
            region_clusters = []
            try:
                clusters_data = elasticache_client.describe_replication_groups()
            except Exception as e:
                logger.exception("Error fetching Redis clusters in region {}: {}", region, e)
                raise

            for cluster in clusters_data.get("ReplicationGroups", []):
                summary = RedisClusterSummary(
                    region=region,
                    replication_group_id=cluster.get("ReplicationGroupId", ""),
                    description=cluster.get("Description", None),
                    status=cluster.get("Status", None),
                    node_type=cluster.get("CacheNodeType", None),
                    num_cache_nodes=cluster.get("NumCacheNodes", None),
                    engine=cluster.get("Engine", None),
                    engine_version=cluster.get("EngineVersion", None),
                    port=cluster.get("Port", None),
                )
                region_clusters.append(summary)
            logger.info("Region {}: Found {} Redis clusters.", region, len(region_clusters))
            return region_clusters

        all_clusters_summary = self._parallel_fetch_by_region(
            process_region,
            self.available_aws_regions,
            "redis clusters summary",
        )
        logger.info("Total Redis clusters summary fetched: {}", len(all_clusters_summary))
        return all_clusters_summary

    def fetch_redis_cluster_details(self, region: str, replication_group_id: str):
        elasticache_client = boto3.client("elasticache", region_name=region)
        try:
            cluster_data = elasticache_client.describe_replication_groups(ReplicationGroupId=replication_group_id)
        except Exception as e:
            logger.exception("Error fetching details for Redis cluster {}: {}", replication_group_id, e)
            raise

        if not cluster_data.get("ReplicationGroups"):
            logger.warning("No cluster found for replication group ID {}.", replication_group_id)
            return None

        cluster = cluster_data["ReplicationGroups"][0]
        cluster_details = RedisClusterDetails(
            replication_group_id=cluster.get("ReplicationGroupId", ""),
            description=cluster.get("Description", None),
            status=cluster.get("Status", None),
            node_type=cluster.get("CacheNodeType", None),
            num_cache_nodes=cluster.get("NumCacheNodes", None),
            engine=cluster.get("Engine", None),
            engine_version=cluster.get("EngineVersion", None),
            port=cluster.get("Port", None),
            cache_nodes=cluster.get("NodeGroups", [{}])[0].get("NodeGroupMembers", None) if cluster.get("NodeGroups") else None,
            cache_parameter_group=cluster.get("CacheParameterGroup", None),
            cache_subnet_group=cluster.get("CacheSubnetGroup", None),
            security_groups=cluster.get("SecurityGroupIds", None),
            at_rest_encryption_enabled=cluster.get("AtRestEncryptionEnabled", None),
            transit_encryption_enabled=cluster.get("TransitEncryptionEnabled", None),
            tags=cluster.get("Tags", None),
        )
        return cluster_details

    ###############################################################################################
    #                              LOAD BALANCER SECTION FUNCTIONS                                 #
    ###############################################################################################
    def fetch_load_balancers_summary(self):
        def collect_v2_load_balancer_ips(ec2_client, lb):
            private_ips = set()
            public_ips = set()
            lb_name = lb.get("LoadBalancerName", "")

            for az in lb.get("AvailabilityZones", []):
                subnet_id = az.get("SubnetId")
                if not subnet_id:
                    continue

                eni_response = ec2_client.describe_network_interfaces(
                    Filters=[
                        {
                            "Name": "subnet-id",
                            "Values": [subnet_id],
                        },
                        {
                            "Name": "description",
                            "Values": [f"*{lb_name}*", f"*ELB*{lb_name}*"],
                        },
                    ]
                )

                for eni in eni_response.get("NetworkInterfaces", []):
                    for private_ip in eni.get("PrivateIpAddresses", []):
                        ip = private_ip.get("PrivateIpAddress")
                        if ip:
                            private_ips.add(ip)

                    association = eni.get("Association")
                    if association and association.get("PublicIp"):
                        public_ips.add(association["PublicIp"])

            return (
                sorted(private_ips) if private_ips else None,
                sorted(public_ips) if public_ips else None,
            )

        def collect_classic_load_balancer_ips(ec2_client, lb):
            private_ips = set()
            public_ips = set()

            instance_ids = [instance.get("InstanceId") for instance in lb.get("Instances", []) if instance.get("InstanceId")]
            if instance_ids:
                instances_response = ec2_client.describe_instances(InstanceIds=instance_ids)
                for reservation in instances_response.get("Reservations", []):
                    for instance in reservation.get("Instances", []):
                        private_ip = instance.get("PrivateIpAddress")
                        public_ip = instance.get("PublicIpAddress")
                        if private_ip:
                            private_ips.add(private_ip)
                        if public_ip:
                            public_ips.add(public_ip)

            dns_name = lb.get("DNSName")
            if dns_name and not private_ips and not public_ips:
                try:
                    import socket

                    ips = socket.gethostbyname_ex(dns_name)[2]
                    for ip in ips:
                        ip_parts = ip.split(".")
                        if len(ip_parts) != 4:
                            continue

                        first_octet = int(ip_parts[0])
                        second_octet = int(ip_parts[1])
                        is_private = (
                            first_octet == 10
                            or (first_octet == 172 and 16 <= second_octet <= 31)
                            or (first_octet == 192 and second_octet == 168)
                        )

                        if is_private:
                            private_ips.add(ip)
                        else:
                            public_ips.add(ip)
                except Exception as e:
                    logger.warning(
                        "Error resolving DNS for Classic LB {}: {}",
                        lb.get("LoadBalancerName", ""),
                        e,
                    )

            return (
                sorted(private_ips) if private_ips else None,
                sorted(public_ips) if public_ips else None,
            )

        def process_region(region):
            logger.debug("Processing Load Balancers in region: {}", region)
            region_load_balancers = []
            ec2_client = boto3.client("ec2", region_name=region)
            
            try:
                elbv2_client = boto3.client("elbv2", region_name=region)
                elbv2_response = elbv2_client.describe_load_balancers()

                def build_v2_summary(lb):
                    try:
                        private_ips, public_ips = collect_v2_load_balancer_ips(ec2_client, lb)
                    except Exception as e:
                        logger.warning(
                            "Error fetching IP addresses for {} {}: {}",
                            lb.get("Type", "v2"),
                            lb.get("LoadBalancerName", ""),
                            e,
                        )
                        private_ips, public_ips = None, None

                    return LoadBalancerSummary(
                        region=region,
                        load_balancer_name=lb.get("LoadBalancerName", ""),
                        load_balancer_arn=lb.get("LoadBalancerArn", ""),
                        load_balancer_type=lb.get("Type", ""),
                        scheme=lb.get("Scheme", None),
                        state=lb.get("State", {}).get("Code", None),
                        vpc_id=lb.get("VpcId", None),
                        availability_zones=lb.get("AvailabilityZones", None),
                        security_groups=lb.get("SecurityGroups", None),
                        ip_address_type=lb.get("IpAddressType", None),
                        private_ips=private_ips,
                        public_ips=public_ips,
                    )

                v2_load_balancers = [
                    lb for lb in elbv2_response.get("LoadBalancers", [])
                    if lb.get("Type") in {"application", "network"}
                ]

                max_workers = min(8, max(1, len(v2_load_balancers)))
                with ThreadPoolExecutor(max_workers=max_workers) as executor:
                    futures = [executor.submit(build_v2_summary, lb) for lb in v2_load_balancers]
                    for future in as_completed(futures):
                        region_load_balancers.append(future.result())
            except Exception as e:
                logger.warning("Error fetching ALB/NLB in region {}: {}", region, e)

            try:
                clb_client = boto3.client("elb", region_name=region)
                clb_response = clb_client.describe_load_balancers()

                def build_classic_summary(lb):
                    try:
                        private_ips, public_ips = collect_classic_load_balancer_ips(ec2_client, lb)
                    except Exception as e:
                        logger.warning(
                            "Error fetching IP addresses for Classic LB {}: {}",
                            lb.get("LoadBalancerName", ""),
                            e,
                        )
                        private_ips, public_ips = None, None

                    return LoadBalancerSummary(
                        region=region,
                        load_balancer_name=lb.get("LoadBalancerName", ""),
                        load_balancer_arn=f"arn:aws:elasticloadbalancing:{region}:{lb.get('LoadBalancerName', '')}",
                        load_balancer_type="classic",
                        scheme=lb.get("Scheme", None),
                        state=lb.get("LoadBalancerName", None),
                        vpc_id=lb.get("VPCId", None),
                        availability_zones=lb.get("AvailabilityZones", None),
                        security_groups=lb.get("SecurityGroups", None),
                        ip_address_type=None,
                        private_ips=private_ips,
                        public_ips=public_ips,
                    )

                classic_load_balancers = clb_response.get("LoadBalancerDescriptions", [])
                max_workers = min(8, max(1, len(classic_load_balancers)))
                with ThreadPoolExecutor(max_workers=max_workers) as executor:
                    futures = [executor.submit(build_classic_summary, lb) for lb in classic_load_balancers]
                    for future in as_completed(futures):
                        region_load_balancers.append(future.result())
            except Exception as e:
                logger.warning("Error fetching CLB in region {}: {}", region, e)

            logger.info("Region {}: Found {} Load Balancers.", region, len(region_load_balancers))
            return region_load_balancers

        all_load_balancers_summary = self._parallel_fetch_by_region(
            process_region,
            self.available_aws_regions,
            "load balancers summary",
        )
        logger.info("Total Load Balancers summary fetched: {}", len(all_load_balancers_summary))
        return all_load_balancers_summary

    def fetch_load_balancer_details(self, region: str, load_balancer_arn: str):
        # Determine the load balancer type from the ARN
        # elbv2 (ALB/NLB) ARNs contain '/app/' or '/net/'
        is_v2 = ("/app/" in load_balancer_arn) or ("/net/" in load_balancer_arn)
        if not is_v2:
            # Classic Load Balancer
            clb_client = boto3.client("elb", region_name=region)
            ec2_client = boto3.client("ec2", region_name=region)
            try:
                # Classic ELB ARN pattern: arn:aws:elasticloadbalancing:region:acct:loadbalancer/name
                if ":loadbalancer/" in load_balancer_arn:
                    lb_name = load_balancer_arn.split(":loadbalancer/")[-1]
                else:
                    lb_name = load_balancer_arn.split("/")[-1]
                lb_data = clb_client.describe_load_balancers(LoadBalancerNames=[lb_name])
            except Exception as e:
                logger.exception("Error fetching details for Classic Load Balancer {}: {}", lb_name, e)
                raise

            if not lb_data.get("LoadBalancerDescriptions"):
                logger.warning("No Classic Load Balancer found for name {}.", lb_name)
                return None

            lb = lb_data["LoadBalancerDescriptions"][0]

            # Get listeners (basic structure only available for CLB)
            listener_details = []
            for listener_desc in lb.get("ListenerDescriptions", []):
                listener = listener_desc.get("Listener", {})
                listener_details.append({
                    "listener_arn": f"classic:{lb.get('LoadBalancerName','')}:{listener.get('LoadBalancerPort')}",
                    "port": listener.get("LoadBalancerPort"),
                    "protocol": listener.get("Protocol"),
                    "ssl_policy": None,
                    "certificates": None,
                    "rules": None,
                })

            # Instances and health
            instance_ids = [i.get("InstanceId") for i in lb.get("Instances", []) if i.get("InstanceId")]
            instance_health = {}
            if instance_ids:
                try:
                    health_resp = clb_client.describe_instance_health(LoadBalancerName=lb_name, Instances=[{"InstanceId": iid} for iid in instance_ids])
                    for st in health_resp.get("InstanceStates", []):
                        instance_health[st.get("InstanceId")] = {
                            "State": st.get("State"),
                            "ReasonCode": st.get("ReasonCode"),
                            "Description": st.get("Description"),
                        }
                except Exception as e:
                    logger.warning("Error fetching instance health for CLB {}: {}", lb_name, e)

            # Resolve instance IPs
            instance_ip_map = {}
            if instance_ids:
                try:
                    ec2_resp = ec2_client.describe_instances(InstanceIds=instance_ids)
                    for res in ec2_resp.get("Reservations", []):
                        for inst in res.get("Instances", []):
                            instance_ip_map[inst.get("InstanceId")] = {
                                "private_ip": inst.get("PrivateIpAddress"),
                                "public_ip": inst.get("PublicIpAddress"),
                            }
                except Exception as e:
                    logger.warning("Error resolving instance IPs for CLB {}: {}", lb_name, e)

            instances = []
            for iid in instance_ids:
                health = instance_health.get(iid, {})
                ips = instance_ip_map.get(iid, {})
                instances.append({
                    "InstanceId": iid,
                    "State": health.get("State"),
                    "ReasonCode": health.get("ReasonCode"),
                    "Description": health.get("Description"),
                    "private_ip": ips.get("private_ip"),
                    "public_ip": ips.get("public_ip"),
                })

            # Tags
            tags = None
            try:
                tags_resp = clb_client.describe_tags(LoadBalancerNames=[lb_name])
                if tags_resp.get("TagDescriptions"):
                    tags = tags_resp["TagDescriptions"][0].get("Tags", [])
            except Exception as e:
                logger.warning("Error fetching CLB tags for {}: {}", lb_name, e)

            # Attributes
            attributes = None
            try:
                attrs_resp = clb_client.describe_load_balancer_attributes(LoadBalancerName=lb_name)
                attributes = attrs_resp.get("LoadBalancerAttributes", {})
            except Exception as e:
                logger.warning("Error fetching CLB attributes for {}: {}", lb_name, e)

            load_balancer_details = LoadBalancerDetails(
                load_balancer_name=lb.get("LoadBalancerName", ""),
                load_balancer_arn=load_balancer_arn,
                load_balancer_type="classic",
                dns_name=lb.get("DNSName", None),
                scheme=lb.get("Scheme", None),
                state="active",  # CLB has no explicit state code in the same shape
                vpc_id=lb.get("VPCId", None),
                availability_zones=lb.get("AvailabilityZones", None),
                security_groups=lb.get("SecurityGroups", None),
                ip_address_type=None,
                listeners=listener_details,
                target_groups=None,
                instances=instances,
                tags=tags,
                attributes=attributes,
            )
        else:
            # Application or Network Load Balancer
            alb_client = boto3.client("elbv2", region_name=region)
            ec2_client = boto3.client("ec2", region_name=region)
            try:
                lb_data = alb_client.describe_load_balancers(LoadBalancerArns=[load_balancer_arn])
            except Exception as e:
                logger.exception("Error fetching details for Load Balancer {}: {}", load_balancer_arn, e)
                raise

            if not lb_data.get("LoadBalancers"):
                logger.warning("No Load Balancer found for ARN {}.", load_balancer_arn)
                return None

            lb = lb_data["LoadBalancers"][0]

            # Get listeners and rules
            listener_details = []
            try:
                listeners_data = alb_client.describe_listeners(LoadBalancerArn=load_balancer_arn)
                for l in listeners_data.get("Listeners", []):
                    rules_list = []
                    try:
                        rules_data = alb_client.describe_rules(ListenerArn=l.get("ListenerArn"))
                        for rule in rules_data.get("Rules", []):
                            rules_list.append({
                                "priority": rule.get("Priority"),
                                "conditions": rule.get("Conditions", []),
                                "actions": rule.get("Actions", []),
                                "is_default": rule.get("IsDefault"),
                            })
                    except Exception:
                        # NLB listeners don't support rules
                        rules_list = None

                    listener_details.append({
                        "listener_arn": l.get("ListenerArn", ""),
                        "port": l.get("Port"),
                        "protocol": l.get("Protocol"),
                        "ssl_policy": l.get("SslPolicy"),
                        "certificates": l.get("Certificates"),
                        "rules": rules_list,
                    })
            except Exception as e:
                logger.warning("Error fetching listeners for Load Balancer {}: {}", load_balancer_arn, e)

            # Get target groups and health
            target_groups_details = []
            instance_ids: List[str] = []
            try:
                target_groups_data = alb_client.describe_target_groups(LoadBalancerArn=load_balancer_arn)
                for tg in target_groups_data.get("TargetGroups", []):
                    targets_list = []
                    try:
                        th = alb_client.describe_target_health(TargetGroupArn=tg.get("TargetGroupArn"))
                        for desc in th.get("TargetHealthDescriptions", []):
                            target = desc.get("Target", {})
                            health = desc.get("TargetHealth", {})
                            target_id = target.get("Id")
                            if tg.get("TargetType") == "instance" and target_id:
                                instance_ids.append(target_id)
                            targets_list.append({
                                "id": target_id,
                                "port": target.get("Port"),
                                "availability_zone": target.get("AvailabilityZone"),
                                "health_state": health.get("State"),
                                "health_reason": health.get("Reason"),
                                "health_description": health.get("Description"),
                                "private_ip": None,
                                "public_ip": None,
                            })
                    except Exception as e:
                        logger.warning("Error fetching target health for TG {}: {}", tg.get("TargetGroupArn"), e)

                    health_check = {
                        "protocol": tg.get("HealthCheckProtocol"),
                        "port": tg.get("HealthCheckPort"),
                        "path": tg.get("HealthCheckPath"),
                        "interval_seconds": tg.get("HealthCheckIntervalSeconds"),
                        "timeout_seconds": tg.get("HealthCheckTimeoutSeconds"),
                        "healthy_threshold": tg.get("HealthyThresholdCount"),
                        "unhealthy_threshold": tg.get("UnhealthyThresholdCount"),
                        "matcher": (tg.get("Matcher") or {}).get("HttpCode") if tg.get("Matcher") else None,
                    }

                    target_groups_details.append({
                        "target_group_arn": tg.get("TargetGroupArn", ""),
                        "target_group_name": tg.get("TargetGroupName"),
                        "protocol": tg.get("Protocol"),
                        "port": tg.get("Port"),
                        "target_type": tg.get("TargetType"),
                        "health_check": health_check,
                        "targets": targets_list,
                    })
            except Exception as e:
                logger.warning("Error fetching target groups for Load Balancer {}: {}", load_balancer_arn, e)

            # Resolve instance IPs for instance targets in one call
            instance_ip_map = {}
            if instance_ids:
                unique_instance_ids = list(set(instance_ids))
                try:
                    ec2_resp = ec2_client.describe_instances(InstanceIds=unique_instance_ids)
                    for res in ec2_resp.get("Reservations", []):
                        for inst in res.get("Instances", []):
                            instance_ip_map[inst.get("InstanceId")] = {
                                "private_ip": inst.get("PrivateIpAddress"),
                                "public_ip": inst.get("PublicIpAddress"),
                            }
                except Exception as e:
                    logger.warning("Error resolving instance IPs for ALB/NLB {}: {}", load_balancer_arn, e)

                # Fill back IPs
                for tg in target_groups_details:
                    if tg.get("targets"):
                        for t in tg["targets"]:
                            iid = t.get("id")
                            if iid and iid in instance_ip_map:
                                t["private_ip"] = instance_ip_map[iid]["private_ip"]
                                t["public_ip"] = instance_ip_map[iid]["public_ip"]

            # Get attributes
            attributes = {}
            try:
                attributes_data = alb_client.describe_load_balancer_attributes(LoadBalancerArn=load_balancer_arn)
                attributes = {attr.get("Key"): attr.get("Value") for attr in attributes_data.get("Attributes", [])}
            except Exception as e:
                logger.warning("Error fetching attributes for Load Balancer {}: {}", load_balancer_arn, e)

            # Get tags
            tags = None
            try:
                tags_data = alb_client.describe_tags(ResourceArns=[load_balancer_arn])
                if tags_data.get("TagDescriptions"):
                    tags = tags_data["TagDescriptions"][0].get("Tags", [])
            except Exception as e:
                logger.warning("Error fetching tags for Load Balancer {}: {}", load_balancer_arn, e)

            load_balancer_details = LoadBalancerDetails(
                load_balancer_name=lb.get("LoadBalancerName", ""),
                load_balancer_arn=lb.get("LoadBalancerArn", ""),
                load_balancer_type=lb.get("Type", ""),
                dns_name=lb.get("DNSName", None),
                scheme=lb.get("Scheme", None),
                state=lb.get("State", {}).get("Code", None),
                vpc_id=lb.get("VpcId", None),
                availability_zones=lb.get("AvailabilityZones", None),
                security_groups=lb.get("SecurityGroups", None),
                ip_address_type=lb.get("IpAddressType", None),
                listeners=listener_details,
                target_groups=target_groups_details,
                instances=None,
                tags=tags,
                attributes=attributes,
            )

        return load_balancer_details

    ###############################################################################################
    #                              ELASTICACHE SECTION FUNCTIONS                                   #
    ###############################################################################################
    def fetch_elasticache_clusters_summary(self):
        def process_region(region):
            logger.debug("Processing ElastiCache clusters in region: {}", region)
            elasticache_client = boto3.client("elasticache", region_name=region)
            region_clusters = []
            try:
                # Get replication groups (Redis clusters)
                replication_groups_data = elasticache_client.describe_replication_groups()
                for group in replication_groups_data.get("ReplicationGroups", []):
                    summary = ElastiCacheClusterSummary(
                        region=region,
                        replication_group_id=group.get("ReplicationGroupId", ""),
                        description=group.get("Description", None),
                        status=group.get("Status", None),
                        node_type=group.get("CacheNodeType", None),
                        num_cache_nodes=group.get("NumCacheNodes", None),
                        engine=group.get("Engine", None),
                        engine_version=group.get("EngineVersion", None),
                        port=group.get("Port", None),
                        cache_cluster_id=None,  # Will be filled from cache clusters
                        cache_node_type=group.get("CacheNodeType", None),
                        preferred_availability_zone=None,
                        cache_cluster_status=None,
                    )
                    region_clusters.append(summary)

                # Get cache clusters (Memcached clusters)
                cache_clusters_data = elasticache_client.describe_cache_clusters()
                for cluster in cache_clusters_data.get("CacheClusters", []):
                    summary = ElastiCacheClusterSummary(
                        region=region,
                        replication_group_id=cluster.get("CacheClusterId", ""),  # Use cluster ID as replication group ID
                        description=cluster.get("CacheClusterId", None),
                        status=cluster.get("CacheClusterStatus", None),
                        node_type=cluster.get("CacheNodeType", None),
                        num_cache_nodes=cluster.get("NumCacheNodes", None),
                        engine=cluster.get("Engine", None),
                        engine_version=cluster.get("EngineVersion", None),
                        port=cluster.get("Port", None),
                        cache_cluster_id=cluster.get("CacheClusterId", None),
                        cache_node_type=cluster.get("CacheNodeType", None),
                        preferred_availability_zone=cluster.get("PreferredAvailabilityZone", None),
                        cache_cluster_status=cluster.get("CacheClusterStatus", None),
                    )
                    region_clusters.append(summary)
            except Exception as e:
                logger.exception("Error fetching ElastiCache clusters in region {}: {}", region, e)
                raise

            logger.info("Region {}: Found {} ElastiCache clusters.", region, len(region_clusters))
            return region_clusters

        all_clusters_summary = self._parallel_fetch_by_region(
            process_region,
            self.available_aws_regions,
            "elasticache clusters summary",
        )
        logger.info("Total ElastiCache clusters summary fetched: {}", len(all_clusters_summary))
        return all_clusters_summary

    def fetch_elasticache_cluster_details(self, region: str, replication_group_id: str):
        elasticache_client = boto3.client("elasticache", region_name=region)
        
        # First try to get as a replication group (Redis)
        try:
            cluster_data = elasticache_client.describe_replication_groups(ReplicationGroupId=replication_group_id)
            if cluster_data.get("ReplicationGroups"):
                cluster = cluster_data["ReplicationGroups"][0]
                # Pull additional metadata
                primary_endpoint = cluster.get("NodeGroups", [{}])[0].get("PrimaryEndpoint", {}) if cluster.get("NodeGroups") else {}
                reader_endpoint = cluster.get("ReaderEndpoint", {})
                snapshot_window = cluster.get("SnapshotWindow")
                maintenance_window = cluster.get("AutomaticFailover", None)
                automatic_failover = cluster.get("AutomaticFailover", None)
                multi_az = cluster.get("MultiAZ", None)
                cluster_details = ElastiCacheClusterDetails(
                    replication_group_id=cluster.get("ReplicationGroupId", ""),
                    description=cluster.get("Description", None),
                    status=cluster.get("Status", None),
                    node_type=cluster.get("CacheNodeType", None),
                    num_cache_nodes=cluster.get("NumCacheNodes", None),
                    engine=cluster.get("Engine", None),
                    engine_version=cluster.get("EngineVersion", None),
                    port=cluster.get("Port", None),
                    cache_cluster_id=None,
                    cache_node_type=cluster.get("CacheNodeType", None),
                    preferred_availability_zone=None,
                    cache_cluster_status=None,
                    cache_nodes=cluster.get("NodeGroups", [{}])[0].get("NodeGroupMembers", None) if cluster.get("NodeGroups") else None,
                    cache_parameter_group=cluster.get("CacheParameterGroup", None),
                    cache_subnet_group=cluster.get("CacheSubnetGroup", None),
                    security_groups=cluster.get("SecurityGroupIds", None),
                    at_rest_encryption_enabled=cluster.get("AtRestEncryptionEnabled", None),
                    transit_encryption_enabled=cluster.get("TransitEncryptionEnabled", None),
                    tags=cluster.get("Tags", None),
                    configuration_endpoint=cluster.get("ConfigurationEndpoint", None),
                    node_groups=cluster.get("NodeGroups", None),
                    primary_endpoint={"address": primary_endpoint.get("Address"), "port": primary_endpoint.get("Port")},
                    reader_endpoint={"address": reader_endpoint.get("Address"), "port": reader_endpoint.get("Port")},
                    snapshot_window=snapshot_window,
                    maintenance_window=cluster.get("PreferredMaintenanceWindow", None),
                    auth_token_enabled=cluster.get("AuthTokenEnabled", None),
                    automatic_failover=automatic_failover,
                    multi_az=multi_az,
                )
                return cluster_details
        except Exception as e:
            logger.warning("Error fetching Redis replication group {}: {}", replication_group_id, e)

        # If not found as replication group, try as cache cluster (Memcached)
        try:
            cluster_data = elasticache_client.describe_cache_clusters(CacheClusterId=replication_group_id)
            if cluster_data.get("CacheClusters"):
                cluster = cluster_data["CacheClusters"][0]
                cluster_details = ElastiCacheClusterDetails(
                    replication_group_id=cluster.get("CacheClusterId", ""),
                    description=cluster.get("CacheClusterId", None),
                    status=cluster.get("CacheClusterStatus", None),
                    node_type=cluster.get("CacheNodeType", None),
                    num_cache_nodes=cluster.get("NumCacheNodes", None),
                    engine=cluster.get("Engine", None),
                    engine_version=cluster.get("EngineVersion", None),
                    port=cluster.get("Port", None),
                    cache_cluster_id=cluster.get("CacheClusterId", None),
                    cache_node_type=cluster.get("CacheNodeType", None),
                    preferred_availability_zone=cluster.get("PreferredAvailabilityZone", None),
                    cache_cluster_status=cluster.get("CacheClusterStatus", None),
                    cache_nodes=cluster.get("CacheNodes", None),
                    cache_parameter_group=cluster.get("CacheParameterGroup", None),
                    cache_subnet_group=cluster.get("CacheSubnetGroup", None),
                    security_groups=cluster.get("SecurityGroups", None),
                    at_rest_encryption_enabled=cluster.get("AtRestEncryptionEnabled", None),
                    transit_encryption_enabled=cluster.get("TransitEncryptionEnabled", None),
                    tags=cluster.get("Tags", None),
                    configuration_endpoint=None,  # Memcached doesn't have configuration endpoint
                    node_groups=None,  # Memcached doesn't have node groups
                    primary_endpoint={"address": (cluster.get("ConfigurationEndpoint") or {}).get("Address"), "port": (cluster.get("ConfigurationEndpoint") or {}).get("Port")},
                    reader_endpoint=None,
                    snapshot_window=cluster.get("SnapshotWindow", None),
                    maintenance_window=cluster.get("PreferredMaintenanceWindow", None),
                    auth_token_enabled=None,
                    automatic_failover=None,
                    multi_az=None,
                )
                return cluster_details
        except Exception as e:
            logger.exception("Error fetching ElastiCache cluster {}: {}", replication_group_id, e)
            raise

        logger.warning("No ElastiCache cluster found for ID {}.", replication_group_id)
        return None
