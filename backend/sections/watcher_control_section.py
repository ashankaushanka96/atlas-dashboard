import os
from typing import Dict, List, Optional
from urllib.parse import quote

import requests
from fastapi import HTTPException
from fastapi.responses import StreamingResponse
from loguru import logger

from models.watcher_control_section_models import (
    ConfigureWatcherResponse,
    FetchComponentLogsResponse,
    FetchWatcherComponentsResponse,
    LogFileEntry,
    NewComponentEntry,
    ReadComponentLogResponse,
    RollbackWatcherResponse,
    WatcherComponentEntry,
    WatcherLifecycleResponse,
)
from subsystems.database import Database


class WatcherControlSection:
    def __init__(self, db: Database, config: dict):
        self.db = db
        watcher_api_config = config.get("watcher_api", {}) or {}
        self.port = watcher_api_config.get("port", 9500)
        self.api_key = watcher_api_config.get("api_key")
        self.timeout_seconds = watcher_api_config.get("timeout_seconds", 10)
        self.scheme = watcher_api_config.get("scheme", "http")

    def _ensure_watcher_configured(self, region: str, ip: str):
        row = self.db.fetch_server_detail(region, ip)
        if not row:
            raise HTTPException(status_code=404, detail=f"Server detail not found for region={region} ip={ip}")
        watcher_status = row[24]
        if str(watcher_status or "").lower() != "configured":
            raise HTTPException(
                status_code=409,
                detail=f"Watcher is not configured on region={region} ip={ip}; cannot manage it remotely.",
            )
        return row

    def _headers(self) -> Dict[str, str]:
        if not self.api_key:
            raise HTTPException(
                status_code=500,
                detail="watcher_api.api_key is not configured on the backend; cannot reach watcher hosts.",
            )
        return {"X-Watcher-Api-Key": self.api_key}

    def _base_url(self, ip: str) -> str:
        return f"{self.scheme}://{ip}:{self.port}"

    def _call_watcher(self, method: str, ip: str, path: str, json_body: Optional[dict] = None):
        url = f"{self._base_url(ip)}{path}"
        try:
            response = requests.request(
                method,
                url,
                headers=self._headers(),
                json=json_body,
                timeout=self.timeout_seconds,
            )
        except requests.exceptions.ConnectionError as exc:
            logger.warning("Could not reach watcher API at {}: {}", url, exc)
            raise HTTPException(
                status_code=502,
                detail=f"Could not reach the watcher API at {ip}:{self.port}. Is it running and reachable?",
            ) from exc
        except requests.exceptions.Timeout as exc:
            logger.warning("Timed out calling watcher API at {}: {}", url, exc)
            raise HTTPException(status_code=504, detail=f"Timed out calling the watcher API at {ip}:{self.port}.") from exc
        except requests.exceptions.RequestException as exc:
            logger.exception("Error calling watcher API at {}", url)
            raise HTTPException(status_code=502, detail=f"Error calling the watcher API: {exc}") from exc

        if response.status_code == 401:
            raise HTTPException(status_code=502, detail="Watcher rejected the request: API key mismatch.")
        if response.status_code >= 400:
            detail = response.text
            try:
                detail = response.json().get("detail", detail)
            except Exception:
                pass
            raise HTTPException(status_code=502, detail=f"Watcher returned an error: {detail}")

        return response.json()

    def fetch_components(self, region: str, ip: str) -> FetchWatcherComponentsResponse:
        self._ensure_watcher_configured(region, ip)
        data = self._call_watcher("GET", ip, "/api/v1/watcher/components")
        components = [WatcherComponentEntry(**entry) for entry in data.get("components", [])]
        return FetchWatcherComponentsResponse(
            status_code=200, components=components, has_backup=bool(data.get("has_backup", False))
        )

    def fetch_status(self, region: str, ip: str) -> WatcherLifecycleResponse:
        self._ensure_watcher_configured(region, ip)
        data = self._call_watcher("GET", ip, "/api/v1/watcher/status")
        running = bool(data.get("running", False))
        return WatcherLifecycleResponse(
            status_code=200,
            status="running" if running else "stopped",
            running=running,
            message=f"Watcher on {ip} is {'running' if running else 'stopped'}.",
        )

    def start_watcher(self, region: str, ip: str) -> WatcherLifecycleResponse:
        self._ensure_watcher_configured(region, ip)
        data = self._call_watcher("POST", ip, "/api/v1/watcher/start")
        logger.info("Start requested for watcher on region={} ip={}: {}", region, ip, data)
        return self._lifecycle_response(f"watcher on {ip}", data, action="start")

    def stop_watcher(self, region: str, ip: str) -> WatcherLifecycleResponse:
        self._ensure_watcher_configured(region, ip)
        data = self._call_watcher("POST", ip, "/api/v1/watcher/stop")
        logger.info("Stop requested for watcher on region={} ip={}: {}", region, ip, data)
        return self._lifecycle_response(f"watcher on {ip}", data, action="stop")

    def restart_watcher(self, region: str, ip: str) -> WatcherLifecycleResponse:
        self._ensure_watcher_configured(region, ip)
        data = self._call_watcher("POST", ip, "/api/v1/watcher/restart")
        logger.info("Restart requested for watcher on region={} ip={}: {}", region, ip, data)
        return self._lifecycle_response(f"watcher on {ip}", data, action="restart")

    def fetch_component_status(self, region: str, ip: str, tag: str) -> WatcherLifecycleResponse:
        self._ensure_watcher_configured(region, ip)
        data = self._call_watcher("GET", ip, f"/api/v1/watcher/component/status?tag={quote(tag)}")
        running = bool(data.get("running", False))
        return WatcherLifecycleResponse(
            status_code=200,
            status="running" if running else "stopped",
            running=running,
            message=f"Component '{tag}' on {ip} is {'running' if running else 'stopped'}.",
        )

    def start_component(self, region: str, ip: str, tag: str) -> WatcherLifecycleResponse:
        self._ensure_watcher_configured(region, ip)
        data = self._call_watcher("POST", ip, "/api/v1/watcher/component/start", json_body={"tag": tag})
        logger.info("Start requested for component tag={} on region={} ip={}: {}", tag, region, ip, data)
        return self._lifecycle_response(f"component '{tag}' on {ip}", data, action="start")

    def stop_component(self, region: str, ip: str, tag: str) -> WatcherLifecycleResponse:
        self._ensure_watcher_configured(region, ip)
        data = self._call_watcher("POST", ip, "/api/v1/watcher/component/stop", json_body={"tag": tag})
        logger.info("Stop requested for component tag={} on region={} ip={}: {}", tag, region, ip, data)
        return self._lifecycle_response(f"component '{tag}' on {ip}", data, action="stop")

    def restart_component(self, region: str, ip: str, tag: str) -> WatcherLifecycleResponse:
        self._ensure_watcher_configured(region, ip)
        data = self._call_watcher("POST", ip, "/api/v1/watcher/component/restart", json_body={"tag": tag})
        logger.info("Restart requested for component tag={} on region={} ip={}: {}", tag, region, ip, data)
        return self._lifecycle_response(f"component '{tag}' on {ip}", data, action="restart")

    def _lifecycle_response(self, subject: str, data: dict, action: str) -> WatcherLifecycleResponse:
        status = data.get("status", "unknown")
        running = bool(data.get("running", False))
        verb = {"start": "Started", "stop": "Stopped", "restart": "Restarted"}[action]

        if status.endswith("_failed"):
            # A current watcher raises an HTTP error for this instead of
            # returning 200, but treat this defensively too in case an older
            # watcher build (pre state-confirmation) is still deployed on ip.
            raise HTTPException(
                status_code=502,
                detail=f"Failed to {action} {subject}; it is currently {'running' if running else 'stopped'}.",
            )

        if status == "already_running":
            message = f"{subject.capitalize()} was already running."
        else:
            message = f"{verb} {subject}."
        return WatcherLifecycleResponse(status_code=200, status=status, running=running, message=message)

    def configure_watcher(
        self,
        region: str,
        ip: str,
        add_components: List[NewComponentEntry],
        remove_component_ids: List[str],
        restart: bool,
    ) -> ConfigureWatcherResponse:
        self._ensure_watcher_configured(region, ip)

        payload = {
            "add_components": [entry.model_dump() for entry in add_components],
            "remove_component_ids": remove_component_ids,
            "restart": restart,
        }
        data = self._call_watcher("POST", ip, "/api/v1/watcher/configure", json_body=payload)

        added = data.get("added", [])
        removed = data.get("removed", [])
        restarted = data.get("restarted", False)
        logger.info(
            "Configured watcher on region={} ip={}: added={} removed={} restarted={}",
            region,
            ip,
            added,
            removed,
            restarted,
        )
        message = f"Applied {len(added)} addition(s) and {len(removed)} removal(s) on {ip}."
        if restart and (added or removed) and not restarted:
            message += " The watcher failed to restart afterwards; restart it manually."

        return ConfigureWatcherResponse(
            status_code=200,
            added=added,
            removed=removed,
            restarted=restarted,
            message=message,
        )

    def rollback_watcher(self, region: str, ip: str, restart: bool) -> RollbackWatcherResponse:
        self._ensure_watcher_configured(region, ip)

        data = self._call_watcher("POST", ip, "/api/v1/watcher/rollback", json_body={"restart": restart})

        restored = data.get("restored", [])
        removed = data.get("removed", [])
        changed = data.get("changed", [])
        restarted = data.get("restarted", False)
        logger.info(
            "Rolled back watcher on region={} ip={}: restored={} removed={} changed={} restarted={}",
            region,
            ip,
            restored,
            removed,
            changed,
            restarted,
        )

        parts = []
        if restored:
            parts.append(f"restored {len(restored)} component(s)")
        if removed:
            parts.append(f"removed {len(removed)} component(s) added since the backup")
        if changed:
            parts.append(f"reverted edits on {len(changed)} component(s)")
        message = f"Rolled back {ip} to the previous config.ini" + (f": {', '.join(parts)}." if parts else " (no changes to undo).")
        if restart and not restarted:
            message += " The watcher failed to restart afterwards; restart it manually."

        return RollbackWatcherResponse(
            status_code=200,
            restored=restored,
            removed=removed,
            changed=changed,
            restarted=restarted,
            message=message,
        )

    def fetch_component_logs(self, region: str, ip: str, tag: str) -> FetchComponentLogsResponse:
        self._ensure_watcher_configured(region, ip)
        data = self._call_watcher("GET", ip, f"/api/v1/watcher/component/logs?tag={quote(tag)}")
        files = [LogFileEntry(**entry) for entry in data.get("files", [])]
        return FetchComponentLogsResponse(status_code=200, files=files)

    def tail_component_log(self, region: str, ip: str, tag: str, file: str, lines: int) -> ReadComponentLogResponse:
        self._ensure_watcher_configured(region, ip)
        query = f"tag={quote(tag)}&file={quote(file)}&lines={int(lines)}"
        data = self._call_watcher("GET", ip, f"/api/v1/watcher/component/logs/tail?{query}")
        return ReadComponentLogResponse(status_code=200, **data)

    def page_component_log(
        self, region: str, ip: str, tag: str, file: str, offset: int, lines: int
    ) -> ReadComponentLogResponse:
        self._ensure_watcher_configured(region, ip)
        query = f"tag={quote(tag)}&file={quote(file)}&offset={int(offset)}&lines={int(lines)}"
        data = self._call_watcher("GET", ip, f"/api/v1/watcher/component/logs/page?{query}")
        return ReadComponentLogResponse(status_code=200, **data)

    def grep_component_log(
        self,
        region: str,
        ip: str,
        tag: str,
        file: str,
        patterns: List[str],
        offset: int,
        lines: int,
        ignore_case: bool,
        regex: bool,
    ) -> ReadComponentLogResponse:
        # Multiple patterns are ANDed together on the watcher side - the same
        # as chaining `grep a | grep b`, one search narrowing the last.
        self._ensure_watcher_configured(region, ip)
        pattern_params = "&".join(f"pattern={quote(pattern)}" for pattern in patterns)
        query = (
            f"tag={quote(tag)}&file={quote(file)}&{pattern_params}"
            f"&offset={int(offset)}&lines={int(lines)}"
            f"&ignore_case={'true' if ignore_case else 'false'}&regex={'true' if regex else 'false'}"
        )
        data = self._call_watcher("GET", ip, f"/api/v1/watcher/component/logs/grep?{query}")
        return ReadComponentLogResponse(status_code=200, **data)

    def download_component_log(self, region: str, ip: str, tag: str, file: str) -> StreamingResponse:
        self._ensure_watcher_configured(region, ip)
        url = f"{self._base_url(ip)}/api/v1/watcher/component/logs/download?tag={quote(tag)}&file={quote(file)}"
        try:
            response = requests.get(url, headers=self._headers(), timeout=self.timeout_seconds, stream=True)
        except requests.exceptions.ConnectionError as exc:
            raise HTTPException(
                status_code=502,
                detail=f"Could not reach the watcher API at {ip}:{self.port}. Is it running and reachable?",
            ) from exc
        except requests.exceptions.Timeout as exc:
            raise HTTPException(status_code=504, detail=f"Timed out calling the watcher API at {ip}:{self.port}.") from exc
        except requests.exceptions.RequestException as exc:
            raise HTTPException(status_code=502, detail=f"Error calling the watcher API: {exc}") from exc

        if response.status_code == 401:
            raise HTTPException(status_code=502, detail="Watcher rejected the request: API key mismatch.")
        if response.status_code >= 400:
            detail = response.text
            try:
                detail = response.json().get("detail", detail)
            except Exception:
                pass
            raise HTTPException(status_code=502, detail=f"Watcher returned an error: {detail}")

        safe_filename = file.replace('"', "").replace("\r", "").replace("\n", "") or "log.txt"
        return StreamingResponse(
            response.iter_content(chunk_size=65536),
            media_type="application/octet-stream",
            headers={"Content-Disposition": f'attachment; filename="{safe_filename}"'},
        )

    def download_grep_component_log(
        self,
        region: str,
        ip: str,
        tag: str,
        file: str,
        patterns: List[str],
        ignore_case: bool,
        regex: bool,
    ) -> StreamingResponse:
        # Same AND-chained grep as grep_component_log, but streamed straight
        # to a file rather than paginated - the watcher scans the whole file
        # for this, with no MAX_GREP_SCAN_BYTES cap (see log_reader.py),
        # since it's a deliberate one-shot download rather than an
        # interactive page a user is waiting on.
        self._ensure_watcher_configured(region, ip)
        pattern_params = "&".join(f"pattern={quote(pattern)}" for pattern in patterns)
        url = (
            f"{self._base_url(ip)}/api/v1/watcher/component/logs/grep/download"
            f"?tag={quote(tag)}&file={quote(file)}&{pattern_params}"
            f"&ignore_case={'true' if ignore_case else 'false'}&regex={'true' if regex else 'false'}"
        )
        try:
            response = requests.get(url, headers=self._headers(), timeout=self.timeout_seconds, stream=True)
        except requests.exceptions.ConnectionError as exc:
            raise HTTPException(
                status_code=502,
                detail=f"Could not reach the watcher API at {ip}:{self.port}. Is it running and reachable?",
            ) from exc
        except requests.exceptions.Timeout as exc:
            raise HTTPException(status_code=504, detail=f"Timed out calling the watcher API at {ip}:{self.port}.") from exc
        except requests.exceptions.RequestException as exc:
            raise HTTPException(status_code=502, detail=f"Error calling the watcher API: {exc}") from exc

        if response.status_code == 401:
            raise HTTPException(status_code=502, detail="Watcher rejected the request: API key mismatch.")
        if response.status_code >= 400:
            detail = response.text
            try:
                detail = response.json().get("detail", detail)
            except Exception:
                pass
            raise HTTPException(status_code=502, detail=f"Watcher returned an error: {detail}")

        safe_filename = file.replace('"', "").replace("\r", "").replace("\n", "") or "log.txt"
        stem, suffix = os.path.splitext(safe_filename)
        filtered_filename = f"{stem}.filtered{suffix or '.txt'}"
        return StreamingResponse(
            response.iter_content(chunk_size=65536),
            media_type="text/plain",
            headers={"Content-Disposition": f'attachment; filename="{filtered_filename}"'},
        )
