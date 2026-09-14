import json
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Optional, Tuple

from fastapi import HTTPException
from loguru import logger

from models.datadog_metrics_models import FetchDatadogMetricResponse


class DatadogMetricsSection:
    DEFAULT_LAST_VALUE_PERIOD = 300
    STATUS_TIMELINE_METRICS = {"process_status", "port_status"}
    SERIES_METRICS = {
        "cpu_percent": "feed.component.process.cpu.percent",
        "memory_used": "feed.component.process.memory.used",
        "memory_percent": "feed.component.process.memory.percent",
        "log_directory_size": "feed.component.log_directory.size",
        "process_status": "feed.component.process.status.value",
        "port_status": "feed.component.port.status.value",
    }
    LAST_VALUE_METRICS = {
        "up_time": "feed.component.process.uptime",
        "up_time_max_exceeded": "feed.component.process.uptime.exceeded.status.value",
    }
    SERVER_SERIES_METRICS = {
        "cpu_user": "system.cpu.user",
        "memory_used": "system.mem.used",
        "memory_usable_percent": "system.mem.pct_usable",
        "load_1": "system.load.1",
    }
    SERVER_LAST_VALUE_METRICS = {
        "uptime": "system.uptime",
    }
    ALL_METRICS = {**SERIES_METRICS, **LAST_VALUE_METRICS}
    HOST_METRICS = {**SERVER_SERIES_METRICS, **SERVER_LAST_VALUE_METRICS}

    def __init__(self, config):
        self.config = config or {}

    def _get_datadog_settings(self) -> Tuple[str, str, str]:
        dd_cfg = self.config.get("datadog", {})
        dd_api_key = dd_cfg.get("dd_api_key") or self.config.get("dd_api_key")
        dd_app_key = dd_cfg.get("dd_app_key") or self.config.get("dd_app_key")
        dd_site = (dd_cfg.get("site") or self.config.get("dd_site") or "datadoghq.com").strip()

        if not dd_api_key or not dd_app_key:
            raise HTTPException(
                status_code=500,
                detail="Datadog credentials are missing in config.yaml",
            )

        return str(dd_api_key), str(dd_app_key), dd_site

    def _run_query(
        self,
        metric_name: str,
        from_ts: int,
        to_ts: int,
        dd_api_key: str,
        dd_app_key: str,
        dd_site: str,
        host: str,
        component: Optional[str] = None,
        rollup_seconds: Optional[int] = None,
        aggregator: str = "avg",
        rollup_aggregator: Optional[str] = None,
        fill_null: bool = False,
    ) -> tuple[str, list]:
        scope_parts = [f"host:{host}"]
        if component:
            scope_parts.append(f"component:{component}")
        query = f"{aggregator}:{metric_name}{{{','.join(scope_parts)}}}"
        if rollup_seconds and rollup_seconds > 0:
            query = f"{query}.rollup({rollup_aggregator or aggregator},{int(rollup_seconds)})"
        if fill_null:
            query = f"{query}.fill(null)"
        query_params = urllib.parse.urlencode(
            {
                "from": from_ts,
                "to": to_ts,
                "query": query,
            }
        )
        url = f"https://api.{dd_site}/api/v1/query?{query_params}"
        request = urllib.request.Request(
            url,
            headers={
                "Accept": "application/json",
                "DD-API-KEY": dd_api_key,
                "DD-APPLICATION-KEY": dd_app_key,
            },
            method="GET",
        )

        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            error_body = exc.read().decode("utf-8", errors="replace")
            logger.exception("Datadog HTTP error while querying metric {}: {}", metric_name, error_body)
            raise HTTPException(
                status_code=exc.code,
                detail=f"Datadog API request failed for {metric_name}: {error_body}",
            ) from exc
        except urllib.error.URLError as exc:
            logger.exception("Datadog connection error for metric {}: {}", metric_name, exc)
            raise HTTPException(status_code=502, detail="Failed to connect to Datadog") from exc
        except Exception as exc:
            logger.exception("Unexpected Datadog query error for metric {}: {}", metric_name, exc)
            raise HTTPException(status_code=500, detail="Unexpected Datadog query error") from exc

        return query, payload.get("series") or []

    def _extract_last_value(self, series: list) -> tuple[Optional[float], Optional[int]]:
        latest_timestamp = None
        latest_value = None

        for item in series:
            for point in item.get("pointlist") or []:
                if not isinstance(point, list) or len(point) < 2:
                    continue
                timestamp_ms, value = point[0], point[1]
                if value is None or timestamp_ms is None:
                    continue
                timestamp_ms = int(timestamp_ms)
                if latest_timestamp is None or timestamp_ms > latest_timestamp:
                    latest_timestamp = timestamp_ms
                    latest_value = float(value)

        return latest_value, latest_timestamp

    def _resolve_metric_name(self, metric: str) -> tuple[str, str]:
        if metric in self.ALL_METRICS:
            return metric, self.ALL_METRICS[metric]

        for alias, metric_name in self.ALL_METRICS.items():
            if metric == metric_name:
                return alias, metric_name

        allowed_metrics = ", ".join(self.ALL_METRICS.keys())
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported metric '{metric}'. Allowed metrics: {allowed_metrics}",
        )

    def _resolve_host_metric_name(self, metric: str) -> tuple[str, str]:
        if metric in self.HOST_METRICS:
            return metric, self.HOST_METRICS[metric]

        for alias, metric_name in self.HOST_METRICS.items():
            if metric == metric_name:
                return alias, metric_name

        allowed_metrics = ", ".join(self.HOST_METRICS.keys())
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported host metric '{metric}'. Allowed metrics: {allowed_metrics}",
        )

    def fetch_component_metric(
        self,
        host: str,
        component: str,
        period: int,
        metric: str,
        rollup_seconds: Optional[int] = None,
    ) -> FetchDatadogMetricResponse:
        logger.info(
            "Fetching Datadog metric for host={} component={} period={} metric={} rollup_seconds={}.",
            host,
            component,
            period,
            metric,
            rollup_seconds,
        )

        if period <= 0:
            raise HTTPException(status_code=400, detail="period must be greater than 0")
        if rollup_seconds is not None and rollup_seconds <= 0:
            raise HTTPException(status_code=400, detail="rollup_seconds must be greater than 0")

        dd_api_key, dd_app_key, dd_site = self._get_datadog_settings()
        now_ts = int(time.time())
        from_ts = now_ts - period
        metric_alias, metric_name = self._resolve_metric_name(metric)
        is_status_timeline_metric = metric_alias in self.STATUS_TIMELINE_METRICS

        query, series = self._run_query(
            metric_name=metric_name,
            host=host,
            component=component,
            from_ts=from_ts,
            to_ts=now_ts,
            dd_api_key=dd_api_key,
            dd_app_key=dd_app_key,
            dd_site=dd_site,
            rollup_seconds=rollup_seconds,
            aggregator="max" if is_status_timeline_metric else "avg",
            rollup_aggregator="max" if is_status_timeline_metric else "avg",
            fill_null=is_status_timeline_metric,
        )

        if metric_alias in self.SERIES_METRICS:
            return FetchDatadogMetricResponse(
                status_code=200,
                host=host,
                component=component,
                period=period,
                from_ts=from_ts,
                to_ts=now_ts,
                metric=metric_name,
                query=query,
                response_type="series",
                series=series,
            )

        value, timestamp_ms = self._extract_last_value(series)
        return FetchDatadogMetricResponse(
            status_code=200,
            host=host,
            component=component,
            period=period,
            from_ts=from_ts,
            to_ts=now_ts,
            metric=metric_name,
            query=query,
            response_type="last_value",
            value=value,
            timestamp_ms=timestamp_ms,
        )

    def fetch_host_metric(
        self,
        host: str,
        period: int,
        metric: str,
        rollup_seconds: Optional[int] = None,
    ) -> FetchDatadogMetricResponse:
        logger.info(
            "Fetching Datadog host metric for host={} period={} metric={} rollup_seconds={}.",
            host,
            period,
            metric,
            rollup_seconds,
        )

        if period <= 0:
            raise HTTPException(status_code=400, detail="period must be greater than 0")
        if rollup_seconds is not None and rollup_seconds <= 0:
            raise HTTPException(status_code=400, detail="rollup_seconds must be greater than 0")

        dd_api_key, dd_app_key, dd_site = self._get_datadog_settings()
        now_ts = int(time.time())
        from_ts = now_ts - period
        metric_alias, metric_name = self._resolve_host_metric_name(metric)

        query, series = self._run_query(
            metric_name=metric_name,
            host=host,
            component=None,
            from_ts=from_ts,
            to_ts=now_ts,
            dd_api_key=dd_api_key,
            dd_app_key=dd_app_key,
            dd_site=dd_site,
            rollup_seconds=rollup_seconds,
        )

        if metric_alias in self.SERVER_SERIES_METRICS:
            return FetchDatadogMetricResponse(
                status_code=200,
                host=host,
                component=None,
                period=period,
                from_ts=from_ts,
                to_ts=now_ts,
                metric=metric_name,
                query=query,
                response_type="series",
                series=series,
            )

        value, timestamp_ms = self._extract_last_value(series)
        return FetchDatadogMetricResponse(
            status_code=200,
            host=host,
            component=None,
            period=period,
            from_ts=from_ts,
            to_ts=now_ts,
            metric=metric_name,
            query=query,
            response_type="last_value",
            value=value,
            timestamp_ms=timestamp_ms,
        )
