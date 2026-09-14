from loguru import logger
import json
from fastapi import HTTPException
import cache
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock

from sections.datadog_metrics_section import DatadogMetricsSection
from models.server_details_section_models import (
    FetchAssetCustodiansResponse,
    FetchInspectorFindingsResponse,
    FetchServerDetailsResponse,
    FetchServerDetailsDetailResponse,
    FetchServerMetricsResponse,
    InspectorFindingRow,
    ServerDetailsDetail,
    ServerDetailsRow,
    ServerMetricsPayload,
    ServerMetricsSeriesCard,
    ServerMetricsValueCard,
)
from subsystems.aws import AWS
from subsystems.database import Database


class ServerDetailsSection:
    SERVER_SERIES_METRICS = [
        {
            "key": "cpu_user",
            "metric": "cpu_user",
            "title": "CPU User",
            "unit": "%",
            "color": "#FF6B35",
        },
        {
            "key": "memory_used",
            "metric": "memory_used",
            "title": "Memory Used",
            "unit": "MB",
            "color": "#22C55E",
        },
        {
            "key": "memory_usable_percent",
            "metric": "memory_usable_percent",
            "title": "Memory Usable",
            "unit": "%",
            "color": "#0EA5E9",
        },
        {
            "key": "load_1",
            "metric": "load_1",
            "title": "Load Average (1m)",
            "unit": "",
            "color": "#F59E0B",
        },
    ]
    SERVER_LAST_VALUE_METRICS = [
        {
            "key": "uptime",
            "metric": "uptime",
            "title": "System Uptime",
        },
    ]

    def __init__(self, db: Database, aws: AWS, config: dict, datadog_metrics: DatadogMetricsSection | None = None):
        self.db = db
        self.aws = aws
        self.config = config
        self.datadog_metrics = datadog_metrics
        self._sync_lock = Lock()

    def sync_server_details_from_aws(self):
        logger.info("Starting AWS server details synchronization.")
        with self._sync_lock:
            return self._sync_server_details_from_aws_locked()

    def _sync_server_details_from_aws_locked(self):
        logger.info("Running locked AWS server details synchronization.")
        watcher_enabled_rows = self.db.fetch_configured_server_details()
        watcher_enabled_keys = {
            (row["region"], row["primary_ip"])
            for row in watcher_enabled_rows
        }

        aws_rows = []
        watcher_status_updates = []
        configured_regions = self.config.get("available_aws_regions", [])

        with ThreadPoolExecutor(max_workers=min(8, max(1, len(configured_regions)))) as executor:
            futures = {
                executor.submit(self.aws.fetch_ec2_server_inventory, region): region
                for region in configured_regions
            }
            for future in as_completed(futures):
                region = futures[future]
                try:
                    region_rows = future.result()
                except Exception as e:
                    logger.exception(
                        "Error synchronizing AWS server details for region {}: {}",
                        region,
                        e,
                    )
                    raise

                for row in region_rows:
                    key = (row["region"], row["primary_ip"])
                    if key in watcher_enabled_keys:
                        watcher_status_updates.append(
                            {
                                "region": row["region"],
                                "primary_ip": row["primary_ip"],
                                "hostname": row["hostname"],
                                "boot_time": row["boot_time"],
                                "cpu_count_logical": row["cpu_count_logical"],
                                "cpu_count_physical": row["cpu_count_physical"],
                                "total_memory_mb": row["total_memory_mb"],
                                "instance_id": row["instance_id"],
                                "compliant_status": row["compliant_status"],
                                "tags": row["tags"],
                            }
                        )
                        continue
                    aws_rows.append(row)

        result = self.db.sync_server_details_from_aws(aws_rows, watcher_status_updates)
        cache.cached_server_details = None
        logger.info("Completed AWS server details synchronization: {}", result)
        return result

    def fetch_server_details(self, fresh: bool = False):
        logger.info("Fetching server details; fresh flag is {}.", fresh)
        if fresh or cache.cached_server_details is None:
            try:
                results = self.db.fetch_server_details()
                server_details = []
                for row in results:
                    tags = self._parse_json_dict(row[14])
                    server_details.append(
                        ServerDetailsRow(
                            region=row[0],
                            ip=row[1],
                            hostname=row[2],
                            instance_id=row[3],
                            os=self._normalize_os_value(row[4]),
                            boot_time=row[5],
                            compliant_status=self._normalize_compliant_status(row[0], row[6]),
                            watcher_status=row[7],
                            watcher_version=row[8],
                            watcher_configured_component_count=row[9] or 0,
                            tool_component_count=row[10] or 0,
                            job_component_count=row[11] or 0,
                            component_category_count=row[12] or 0,
                            total_component_count=row[13] or 0,
                            tags=tags,
                            asset_custodian=tags.get("AssetCustodian") or None,
                        )
                    )
                cache.cached_server_details = server_details
                logger.info("Server details cache updated with fresh data.")
            except Exception as e:
                logger.exception("Error fetching server details: {}", e)
                raise
        logger.info("Returning server details from cache.")
        return FetchServerDetailsResponse(status_code=200, server_details=cache.cached_server_details)

    def fetch_asset_custodians(self):
        """Distinct AssetCustodian tag values across hosts, for the Home
        page's Asset Custodian filter dropdown - the same idea as the
        region filter's fetch-all-regions."""
        self.fetch_server_details()
        values = {
            row.asset_custodian for row in (cache.cached_server_details or []) if row.asset_custodian
        }
        return FetchAssetCustodiansResponse(status_code=200, asset_custodians=sorted(values))

    def fetch_server_detail(self, region: str, ip: str):
        logger.info("Fetching server detail for region {} ip {}.", region, ip)
        try:
            row = self.db.fetch_server_detail(region, ip)
        except Exception as e:
            logger.exception("Error fetching server detail for region {} ip {}: {}", region, ip, e)
            raise

        if not row:
            raise HTTPException(status_code=404, detail=f"Server detail not found for region={region} ip={ip}")

        compliant_status = self._normalize_compliant_status(region, row[23])

        all_ips = self._parse_json_list(row[6])
        crons = self._parse_json_list(row[26])

        return FetchServerDetailsDetailResponse(
            status_code=200,
            server_detail=ServerDetailsDetail(
                ts=row[0],
                region=row[1],
                ip=row[2],
                instance_id=row[3],
                hostname=row[4],
                fqdn=row[5],
                all_ips=all_ips,
                os=self._normalize_os_value(row[7]),
                os_version=row[8],
                os_release=row[9],
                kernel_version=row[10],
                kernel_release=row[11],
                architecture=row[12],
                platform=row[13],
                python_version=row[14],
                current_username=row[15],
                home_directory=row[16],
                watcher_directory=row[17],
                apps_directory=row[18],
                boot_time=row[19],
                vcpus=row[20],
                cores=row[21],
                total_memory_mb=row[22],
                last_ingested_at=self._serialize_datetime(row[27]),
                compliant_status=compliant_status,
                watcher_status=row[24],
                watcher_version=row[25],
                crons=crons,
            ),
        )

    def fetch_inspector_findings(self, region: str, ip: str):
        logger.info("Fetching Inspector findings for region {} ip {}.", region, ip)
        try:
            row = self.db.fetch_server_detail(region, ip)
        except Exception as e:
            logger.exception("Error validating server detail for region {} ip {}: {}", region, ip, e)
            raise

        if not row:
            raise HTTPException(status_code=404, detail=f"Server detail not found for region={region} ip={ip}")

        compliant_status = self._normalize_compliant_status(region, row[23])
        inspector_findings = []
        if region in self.config.get("available_aws_regions", []) and str(compliant_status or "").upper() in {"NON_COMPLIANT", "PARTIALLY_COMPLIANT"}:
            try:
                inspector_findings = [
                    self._map_inspector_finding(finding)
                    for finding in self.aws.fetch_instance_inspector_findings(region, ip)
                ]
            except Exception as e:
                logger.exception(
                    "Unable to fetch Inspector findings for region {} ip {}: {}",
                    region,
                    ip,
                    e,
                )
                raise

        return FetchInspectorFindingsResponse(status_code=200, inspector_findings=inspector_findings)

    def fetch_server_metrics(self, region: str, ip: str, period: int):
        logger.info("Fetching server metrics for region {} ip {} period {}.", region, ip, period)

        if period <= 0:
            raise HTTPException(status_code=400, detail="period must be greater than 0")

        if self.datadog_metrics is None:
            raise HTTPException(status_code=500, detail="Datadog metrics service is not configured")

        try:
            row = self.db.fetch_server_detail(region, ip)
        except Exception as e:
            logger.exception("Error validating server detail for region {} ip {}: {}", region, ip, e)
            raise

        if not row:
            raise HTTPException(status_code=404, detail=f"Server detail not found for region={region} ip={ip}")

        def fetch_series_metric(metric_def):
            try:
                response = self.datadog_metrics.fetch_host_metric(
                    host=ip,
                    period=period,
                    metric=metric_def["metric"],
                )
                return ServerMetricsSeriesCard(
                    key=metric_def["key"],
                    title=metric_def["title"],
                    unit=metric_def["unit"],
                    color=metric_def["color"],
                    metric=response.metric,
                    query=response.query,
                    series=response.series or [],
                )
            except HTTPException as e:
                return ServerMetricsSeriesCard(
                    key=metric_def["key"],
                    title=metric_def["title"],
                    unit=metric_def["unit"],
                    color=metric_def["color"],
                    error=e.detail if isinstance(e.detail, str) else str(e.detail),
                )
            except Exception as e:
                logger.warning(
                    "Unable to fetch Datadog series metric {} for ip {}: {}",
                    metric_def["metric"],
                    ip,
                    e,
                )
                return ServerMetricsSeriesCard(
                    key=metric_def["key"],
                    title=metric_def["title"],
                    unit=metric_def["unit"],
                    color=metric_def["color"],
                    error=str(e),
                )

        def fetch_last_value_metric(metric_def):
            try:
                response = self.datadog_metrics.fetch_host_metric(
                    host=ip,
                    period=period,
                    metric=metric_def["metric"],
                )
                return ServerMetricsValueCard(
                    key=metric_def["key"],
                    title=metric_def["title"],
                    value=response.value,
                    timestamp_ms=response.timestamp_ms,
                )
            except HTTPException as e:
                return ServerMetricsValueCard(
                    key=metric_def["key"],
                    title=metric_def["title"],
                    error=e.detail if isinstance(e.detail, str) else str(e.detail),
                )
            except Exception as e:
                logger.warning(
                    "Unable to fetch Datadog last-value metric {} for ip {}: {}",
                    metric_def["metric"],
                    ip,
                    e,
                )
                return ServerMetricsValueCard(
                    key=metric_def["key"],
                    title=metric_def["title"],
                    error=str(e),
                )

        series_results_by_key = {}
        last_value_results_by_key = {}
        metric_jobs = []
        with ThreadPoolExecutor(max_workers=min(8, len(self.SERVER_SERIES_METRICS) + len(self.SERVER_LAST_VALUE_METRICS))) as executor:
            for metric_def in self.SERVER_SERIES_METRICS:
                metric_jobs.append((metric_def["key"], "series", executor.submit(fetch_series_metric, metric_def)))
            for metric_def in self.SERVER_LAST_VALUE_METRICS:
                metric_jobs.append((metric_def["key"], "last_value", executor.submit(fetch_last_value_metric, metric_def)))

            for metric_key, metric_type, future in metric_jobs:
                if metric_type == "series":
                    series_results_by_key[metric_key] = future.result()
                else:
                    last_value_results_by_key[metric_key] = future.result()

        return FetchServerMetricsResponse(
            status_code=200,
            server_metrics=ServerMetricsPayload(
                region=region,
                ip=ip,
                period=period,
                series_metrics=[
                    series_results_by_key[metric_def["key"]]
                    for metric_def in self.SERVER_SERIES_METRICS
                ],
                last_value_metrics=[
                    last_value_results_by_key[metric_def["key"]]
                    for metric_def in self.SERVER_LAST_VALUE_METRICS
                ],
            ),
        )

    def _parse_json_list(self, value):
        if value is None:
            return []
        if isinstance(value, list):
            return [str(item) for item in value]
        if isinstance(value, (bytes, bytearray)):
            value = value.decode("utf-8", errors="ignore")
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
                if isinstance(parsed, list):
                    return [str(item) for item in parsed]
            except Exception:
                logger.warning("Unable to parse JSON list from server detail field.")
                return []
        return []

    def _parse_json_dict(self, value):
        if value is None:
            return {}
        if isinstance(value, dict):
            return value
        if isinstance(value, (bytes, bytearray)):
            value = value.decode("utf-8", errors="ignore")
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
                if isinstance(parsed, dict):
                    return parsed
            except Exception:
                logger.warning("Unable to parse JSON dict from server detail field.")
                return {}
        return {}

    def _normalize_compliant_status(self, region: str, compliant_status):
        if region not in self.config.get("available_aws_regions", []):
            return "NOT_AVAILABLE"

        normalized = str(compliant_status or "").strip().upper()
        if normalized in {"COMPLIANT", "PARTIALLY_COMPLIANT", "NON_COMPLIANT"}:
            return normalized
        return "PENDING"

    def _normalize_os_value(self, os_value):
        normalized = str(os_value or "").strip()
        if not normalized:
            return "Unknown"
        return normalized

    def _map_inspector_finding(self, finding):
        package_details = finding.get("packageVulnerabilityDetails") or {}
        vulnerable_packages = package_details.get("vulnerablePackages") or []
        first_package = vulnerable_packages[0] if vulnerable_packages else {}
        remediation = (finding.get("remediation") or {}).get("recommendation") or {}

        return InspectorFindingRow(
            finding_arn=finding.get("findingArn"),
            title=finding.get("title"),
            severity=finding.get("severity"),
            finding_type=finding.get("type"),
            status=finding.get("status"),
            inspector_score=finding.get("inspectorScore"),
            package_name=first_package.get("name"),
            package_version=first_package.get("version"),
            fixed_in_version=first_package.get("fixedInVersion"),
            vulnerability_id=package_details.get("vulnerabilityId"),
            remediation=remediation.get("text") or first_package.get("remediation"),
            recommendation_url=remediation.get("Url"),
            description=finding.get("description"),
            first_observed_at=self._serialize_datetime(finding.get("firstObservedAt")),
            last_observed_at=self._serialize_datetime(finding.get("lastObservedAt")),
        )

    def _serialize_datetime(self, value):
        if value is None:
            return None
        try:
            return value.isoformat()
        except Exception:
            return str(value)
