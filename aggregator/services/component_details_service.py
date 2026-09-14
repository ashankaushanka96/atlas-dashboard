import json
from datetime import datetime, timezone
from typing import Dict, Any, List, Tuple, Optional
from fastapi.encoders import jsonable_encoder
from loguru import logger
from models.component_details_section_models import (
    ComponentDetailsPayload, Edge, ComponentMap, MapResponse, UnconfiguredComponent, UnconfiguredResponse
)
from subsystems.database import get_pool
from subsystems.redis import get_redis
from utils.config import load_config
import copy

SELECT_CONFIG_META_SQL = """
SELECT config_meta
FROM components
WHERE region = %s AND ip = %s AND component_name = %s
LIMIT 1
"""

def _ttl() -> int:
    cfg = load_config()
    return int(cfg.get("component_tree", {}).get("ttl_seconds", 60))

class ComponentDetailSection:
    def __init__(self):
        self._prefix = "component"
    """Persists component-tree connection snapshots in Redis with TTL."""

    async def startup(self) -> None:
        await self.rehydrate_config_meta_from_db()

    async def _fetch_config_meta(self, region: str, ip: str, component: str) -> Optional[Dict[str, Any]]:
        pool = get_pool()
        if pool is None:
            raise RuntimeError("DB pool not initialized")

        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(SELECT_CONFIG_META_SQL, (region, ip, component))
                row = await cur.fetchone()

        if not row:
            return None

        raw = row[0]
        if isinstance(raw, (dict, list)):
            return raw
        try:
            return json.loads(raw)
        except Exception:
            logger.warning(
                "Skipping unparsable config_meta from DB for region={} ip={} component={}",
                region,
                ip,
                component,
            )
            return None

    async def rehydrate_config_meta_from_db(self) -> None:
        r = get_redis()
        if r is None:
            raise RuntimeError("Redis not initialized")

        pattern = f"{self._prefix}:*"
        updated = 0

        async for key in r.scan_iter(match=pattern):
            value = await r.get(key)
            if not value:
                continue

            try:
                data = json.loads(value)
            except Exception:
                logger.warning("Skipping config_meta rehydrate for unparsable key={}", key)
                continue

            if data.get("config_meta"):
                continue

            config_meta = await self._fetch_config_meta(
                data.get("region") or "",
                data.get("ip") or "",
                data.get("component") or "",
            )
            if not config_meta:
                continue

            data["config_meta"] = config_meta
            ttl = await r.ttl(key)
            if ttl and ttl > 0:
                await r.set(key, json.dumps(data), ex=ttl)
            else:
                await r.set(key, json.dumps(data))
            updated += 1

        logger.info("Rehydrated config_meta for {} Redis component snapshots", updated)

    async def ingest_component_details(self, payload: ComponentDetailsPayload) -> Dict[str, Any]:
        r = get_redis()
        if r is None:
            raise RuntimeError("Redis not initialized")

        key = f"{self._prefix}:{payload.server_ip}:{payload.component}"
        logger.info("Ingesting connections key={}", key)

        # config_meta is no longer persisted to the DB from the ingest path.
        # It is only written via the /add-modify route; here we either use
        # whatever the watcher reported, or fall back to the last value
        # stored in the DB.
        config_meta = jsonable_encoder(payload.config_meta) if payload.config_meta else None
        if config_meta is None:
            config_meta = await self._fetch_config_meta(payload.region, payload.server_ip, payload.component)

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
            "config_meta": config_meta,
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
