import asyncio
import ipaddress
import json
import time
from collections import defaultdict
from typing import Dict, Any, List, Optional, Tuple
from loguru import logger
from models.component_tree_section_models import (
    Edge, ComponentMap, MapResponse, UnconfiguredComponent, UnconfiguredResponse
)
from subsystems.redis import get_redis
from utils.config import load_config

def _ttl() -> int:
    cfg = load_config()
    return int(cfg.get("component_tree", {}).get("ttl_seconds", 60))

def _include_unknown() -> bool:
    cfg = load_config()
    return bool(cfg.get("component_tree", {}).get("include_unknown", True))

def _ephemeral_port_min() -> int:
    cfg = load_config()
    return int(cfg.get("component_tree", {}).get("ephemeral_port_min", 32768))

class ComponentTreeSection:
    def __init__(self):
        self._prefix = "component"  # redis key prefix, e.g. "ct:IP:COMPONENT"
        self._map_cache: Optional[MapResponse] = None
        self._map_cache_ts: float = 0.0
        self._map_cache_lock = asyncio.Lock()

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

    def _normalize_ip(self, ip: Optional[str]) -> Optional[str]:
        """Collapse IPv4-mapped IPv6 ('::ffff:10.0.0.1') down to plain IPv4.

        A dual-stack listener reports inbound IPv4 peers in that form, so the
        same endpoint would otherwise key differently depending on which side of
        the connection observed it -- splitting one node in two and making
        known components fail to resolve against endpoint_map.
        """
        if not ip:
            return ip
        try:
            parsed = ipaddress.ip_address(ip)
        except ValueError:
            return ip
        mapped = getattr(parsed, "ipv4_mapped", None)
        return str(mapped) if mapped else str(parsed)

    def _unknown_key(self, remote_ip: str, remote_port: int, own_ip: Optional[str]) -> str:
        """Unknown peers are named '<ip>-<port>'.

        Loopback is rewritten to the reporting host's ip, otherwise 127.0.0.1 on
        two different hosts would collapse into one shared node.
        """
        ip = remote_ip
        try:
            if ipaddress.ip_address(remote_ip).is_loopback and own_ip:
                ip = own_ip
        except ValueError:
            pass
        return f"{ip}-{remote_port}"

    def _classify_unknown(self, own_listen: int, local_port: int, ephemeral_min: int) -> str:
        """Decide which side of us an unresolved peer sits on.

        - It reached us on our own service port -> it is calling us (downstream).
        - We dialled out from an ephemeral port -> it is serving us (upstream).
        - Neither is decidable                  -> assume it is calling us.
        """
        if own_listen > 0 and local_port == own_listen:
            return "downstream"
        if local_port >= ephemeral_min:
            return "upstream"
        return "downstream"

    def _compute_component_map(self, store_data: Dict[str, Dict[str, Any]]) -> MapResponse:
        logger.info("Computing component map from Redis snapshot")
        result: Dict[str, ComponentMap] = {}

        endpoint_map: Dict[Tuple[str, int], str] = {}
        for key, data in store_data.items():
            listen = int(data.get("listen") or 0)
            ip = self._normalize_ip(data.get("ip"))
            if ip and listen > 0:
                endpoint_map[(ip, listen)] = key  # key is already stripped (e.g. '10.0.0.11:api-gateway')

        include_unknown = _include_unknown()
        ephemeral_min = _ephemeral_port_min()

        # Every socket a watched component holds open, so an inbound connection
        # from another watched component isn't mistaken for an unknown peer --
        # those are already covered by the "others connect to me" pass below.
        socket_owner: Dict[Tuple[str, int], str] = {}
        if include_unknown:
            for key, data in store_data.items():
                for conn in data.get("conns", []):
                    local_ip = self._normalize_ip(conn.get("local_ip"))
                    local_port = int(conn.get("local_port") or 0)
                    if local_ip and local_port > 0:
                        socket_owner[(local_ip, local_port)] = key

        # Unknown peers are shared across components, so they're accumulated for
        # the whole snapshot and appended to the result once at the end.
        unknown_upstream: Dict[str, List[Edge]] = defaultdict(list)
        unknown_downstream: Dict[str, List[Edge]] = defaultdict(list)

        # "Others connect to me" edges are the mirror of "I connect to others"
        # edges, so they're collected here (keyed by the *target* component) as
        # each upstream match is found below, instead of re-scanning every other
        # component's connections per component (which was O(N^2)).
        upstream_by_key: Dict[str, List[Edge]] = {}
        downstream_by_key: Dict[str, List[Edge]] = defaultdict(list)

        for key, own in store_data.items():
            upstream: List[Edge] = []
            own_listen = int(own.get("listen") or 0)
            own_ip = self._normalize_ip(own.get("ip"))
            seen_unknown = set()

            # Upstream: I connect to others
            for conn in own.get("conns", []):
                remote_ip = self._normalize_ip(conn.get("remote_ip"))
                remote_port = int(conn.get("remote_port") or 0)
                local_port = int(conn.get("local_port") or 0)
                remote_ep = (remote_ip, remote_port)

                if remote_ep in endpoint_map:
                    comp_key = endpoint_map[remote_ep]  # already stripped
                    if comp_key != key:
                        upstream.append(Edge(
                            component=comp_key,
                            local_port=local_port,
                            remote_port=remote_port,
                        ))
                        downstream_by_key[comp_key].append(Edge(
                            component=key,
                            local_port=remote_port,
                            remote_port=local_port,
                        ))
                    continue

                if not include_unknown or not remote_ip or remote_port <= 0:
                    continue
                if remote_ep in socket_owner:
                    continue  # a watched component's own socket, handled elsewhere

                unknown_key = self._unknown_key(remote_ip, remote_port, own_ip)
                direction = self._classify_unknown(own_listen, local_port, ephemeral_min)
                # Connection pools open many sockets to the same endpoint; keep
                # one edge per peer rather than one per socket.
                if (unknown_key, direction) in seen_unknown:
                    continue
                seen_unknown.add((unknown_key, direction))

                edge = Edge(component=unknown_key, local_port=local_port, remote_port=remote_port)
                mirror = Edge(component=key, local_port=remote_port, remote_port=local_port)
                if direction == "upstream":
                    upstream.append(edge)
                    unknown_downstream[unknown_key].append(mirror)
                else:
                    downstream_by_key[key].append(edge)
                    unknown_upstream[unknown_key].append(mirror)

            upstream_by_key[key] = upstream

        for key in store_data:
            upstream = upstream_by_key.get(key, [])
            downstream = downstream_by_key.get(key, [])
            if upstream or downstream:
                result[key] = ComponentMap(upstream=upstream, downstream=downstream)

        for unknown_key in set(unknown_upstream) | set(unknown_downstream):
            result[unknown_key] = ComponentMap(
                upstream=unknown_upstream.get(unknown_key, []),
                downstream=unknown_downstream.get(unknown_key, []),
                kind="unknown",
            )

        return MapResponse(components=result)

    async def get_component_map(self, fresh: bool = False) -> MapResponse:
        now = time.monotonic()
        if not fresh and self._map_cache is not None and (now - self._map_cache_ts) < _ttl():
            return self._map_cache

        async with self._map_cache_lock:
            now = time.monotonic()
            if not fresh and self._map_cache is not None and (now - self._map_cache_ts) < _ttl():
                return self._map_cache

            snapshot = await self._fetch_store_snapshot()
            result = self._compute_component_map(snapshot)
            self._map_cache = result
            self._map_cache_ts = now
            return result

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
