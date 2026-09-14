import json
from datetime import datetime, timezone
from typing import Dict, Any, List, Tuple
from fastapi import HTTPException
from fastapi.encoders import jsonable_encoder
from loguru import logger
from models.component_details_section_models import (
    ComponentDetailsPayload,
    ComponentMaxUpDaysResponse,
    ComponentStatusDetail,
    ComponentStatusDetailResponse,
    Edge,
    ComponentMap,
    MapResponse,
    UnconfiguredComponent,
    UnconfiguredResponse,
)
from subsystems.redis import get_redis
from utils.config import load_config
import copy

def _ttl() -> int:
    cfg = load_config()
    return int(cfg.get("component_tree", {}).get("ttl_seconds", 60))

class ComponentDetailsSection:
    def __init__(self):
        self._prefix = "component"
    """Persists component-tree connection snapshots in Redis with TTL."""

    async def ingest_component_details(self, payload: ComponentDetailsPayload) -> Dict[str, Any]:
        r = get_redis()
        if r is None:
            raise RuntimeError("Redis not initialized")

        key = f"{self._prefix}:{payload.server_ip}:{payload.component}"
        logger.info("Ingesting connections key={}", key)

        conns_dict = [jsonable_encoder(c) for c in payload.connections]
        entry = {
            "ip": payload.server_ip,
            "region": payload.region,
            "component": payload.component,
            "pid": payload.pid,
            "ts": payload.ts,
            "listen": payload.listen_port,
            "conns": conns_dict,
            "state": payload.state,                       # NEW
            "needs_to_run": payload.needs_to_run,         # NEW
            "port_status": payload.port_status,           # NEW
            "uptime_seconds": payload.uptime_seconds,     # NEW
            "config_meta": jsonable_encoder(payload.config_meta) if payload.config_meta else None,  # NEW
            "ingested_at": datetime.now(timezone.utc).isoformat(),
        }

        await r.set(key, json.dumps(entry), ex=_ttl())
        return {"status": "ok"}

    def _strip_prefix(self, full_key: str) -> str:
        """Remove leading '<prefix>:' if present, e.g. 'ct:10.0.0.11:api-gateway' -> '10.0.0.11:api-gateway'."""
        p = f"{self._prefix}:"
        return full_key[len(p):] if full_key.startswith(p) else full_key

    async def _fetch_store_snapshot(self) -> Dict[str, Dict[str, Any]]:
        r = get_redis()
        if r is None:
            raise RuntimeError("Redis not initialized")

        pattern = f"{self._prefix}:*"
        keys: List[str] = [k async for k in r.scan_iter(match=pattern)]
        if not keys:
            return {}

        values = await r.mget(keys)
        snapshot: Dict[str, Dict[str, Any]] = {}

        for k, v in zip(keys, values):
            if not v:
                continue
            try:
                data = json.loads(v)
            except Exception:
                logger.warning("Skipping unparsable JSON at key={}", k)
                continue

            # Always strip the redis prefix from the response key
            short_key = self._strip_prefix(k)
            snapshot[short_key] = data

        return snapshot

    def _compute_component_map(self, store_data: Dict[str, Dict[str, Any]]) -> MapResponse:
        logger.info("Computing component map from Redis snapshot")
        result: Dict[str, ComponentMap] = {}

        endpoint_map: Dict[Tuple[str, int], str] = {}
        for key, data in store_data.items():
            listen = int(data.get("listen") or 0)
            ip = data.get("ip")
            if ip and listen > 0:
                endpoint_map[(ip, listen)] = key  # key is already stripped (e.g. '10.0.0.11:api-gateway')

        for key, own in store_data.items():
            upstream: List[Edge] = []
            downstream: List[Edge] = []

            # Upstream: I connect to others
            for conn in own.get("conns", []):
                remote_ep = (conn.get("remote_ip"), int(conn.get("remote_port") or 0))
                if remote_ep in endpoint_map:
                    comp_key = endpoint_map[remote_ep]  # already stripped
                    if comp_key != key:
                        upstream.append(Edge(
                            component=comp_key,
                            local_port=int(conn.get("local_port") or 0),
                            remote_port=int(conn.get("remote_port") or 0),
                        ))

            # Downstream: Others connect to me
            listen = int(own.get("listen") or 0)
            ip = own.get("ip")
            if ip and listen > 0:
                my_ep = (ip, listen)
                for oth_key, oth in store_data.items():
                    if oth_key == key:
                        continue
                    for conn in oth.get("conns", []):
                        if (conn.get("remote_ip"), int(conn.get("remote_port") or 0)) == my_ep:
                            downstream.append(Edge(
                                component=oth_key,           # already stripped
                                local_port=listen,           # my listen port
                                remote_port=int(conn.get("local_port") or 0),  # their source port
                            ))

            if upstream or downstream:
                result[key] = ComponentMap(upstream=upstream, downstream=downstream)

        return MapResponse(components=result)

    async def get_component_map(self) -> MapResponse:
        snapshot = await self._fetch_store_snapshot()
        return self._compute_component_map(snapshot)

    async def get_unconfigured_components(self) -> UnconfiguredResponse:
        snapshot = await self._fetch_store_snapshot()
        items: List[UnconfiguredComponent] = []
        for key, data in snapshot.items():
            listen = int(data.get("listen") or 0)
            if listen == 0:
                try:
                    ip, component = key.split(":", 1)  # key is stripped -> "ip:component"
                except ValueError:
                    ip, component = data.get("ip", ""), key
                items.append(UnconfiguredComponent(key=key, ip=ip, component=component))
        return UnconfiguredResponse(components=items)
    
    async def get_component_details_no_connections(self) -> Dict[str, Any]:
        """
        Returns the latest snapshot of components with all fields EXCEPT 'conns'.
        Keys are 'ip:component' (already stripped).
        """
        snapshot = await self._fetch_store_snapshot()  # uses ct:* scan + mget
        cleaned: Dict[str, Any] = {}
        for key, data in snapshot.items():
            item = copy.deepcopy(data)
            item.pop("conns", None)  # drop network connection details only
            cleaned[key] = item
        return cleaned

    async def get_component_status_summaries(self) -> Dict[str, Any]:
        """
        Returns a lightweight watcher snapshot for the table/websocket.
        Keys are 'ip:component' (already stripped).
        """
        snapshot = await self._fetch_store_snapshot()
        summaries: Dict[str, Any] = {}
        for key, data in snapshot.items():
            summaries[key] = {
                "ip": data.get("ip") or "",
                "region": data.get("region") or "",
                "component": data.get("component") or "",
                "listen": int(data.get("listen") or 0),
                "state": data.get("state"),
                "port_status": data.get("port_status"),
                "uptime_seconds": data.get("uptime_seconds"),
            }
        return summaries

    async def get_component_status_detail(self, ip: str, component: str) -> ComponentStatusDetailResponse:
        r = get_redis()
        if r is None:
            raise RuntimeError("Redis not initialized")

        key = f"{self._prefix}:{ip}:{component}"
        value = await r.get(key)
        if not value:
            raise HTTPException(
                status_code=404,
                detail=f"Watcher status detail not found for ip={ip} component={component}",
            )

        try:
            data = json.loads(value)
        except Exception as exc:
            logger.exception("Invalid watcher status JSON for key={}: {}", key, exc)
            raise HTTPException(status_code=500, detail="Unable to parse watcher status detail")

        return ComponentStatusDetailResponse(
            status_code=200,
            component=ComponentStatusDetail(
                ip=data.get("ip") or "",
                region=data.get("region") or "",
                component=data.get("component") or "",
                ts=data.get("ts"),
                listen=int(data.get("listen") or 0),
                state=data.get("state"),
                needs_to_run=data.get("needs_to_run"),
                port_status=data.get("port_status"),
                uptime_seconds=data.get("uptime_seconds"),
                config_meta=data.get("config_meta"),
            ),
        )

    async def get_component_max_up_days(self, ip: str, component: str) -> ComponentMaxUpDaysResponse:
        r = get_redis()
        if r is None:
            raise RuntimeError("Redis not initialized")

        key = f"{self._prefix}:{ip}:{component}"
        value = await r.get(key)
        if not value:
            raise HTTPException(
                status_code=404,
                detail=f"Watcher status detail not found for ip={ip} component={component}",
            )

        try:
            data = json.loads(value)
        except Exception as exc:
            logger.exception("Invalid watcher status JSON for key={}: {}", key, exc)
            raise HTTPException(status_code=500, detail="Unable to parse watcher status detail")

        config_meta = data.get("config_meta") or {}

        return ComponentMaxUpDaysResponse(
            status_code=200,
            ip=data.get("ip") or ip,
            component=data.get("component") or component,
            max_up_days=config_meta.get("max_up_days"),
        )
