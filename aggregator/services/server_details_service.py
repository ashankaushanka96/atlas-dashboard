import json
from typing import Any, Dict

from loguru import logger

from models.server_details_models import ServerDetailsPayload
from subsystems.database import get_pool

UPSERT_SQL = """
INSERT INTO server_details (
    ts,
    region,
    hostname,
    fqdn,
    instance_id,
    primary_ip,
    all_ips,
    os_name,
    os_version,
    os_release,
    kernel_version,
    kernel_release,
    architecture,
    platform,
    python_version,
    current_username,
    home_directory,
    watcher_directory,
    apps_directory,
    boot_time,
    cpu_count_logical,
    cpu_count_physical,
    total_memory_mb,
    compliant_status,
    watcher_status,
    watcher_version,
    crons
) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
ON DUPLICATE KEY UPDATE
    ts = VALUES(ts),
    fqdn = VALUES(fqdn),
    primary_ip = VALUES(primary_ip),
    all_ips = VALUES(all_ips),
    os_release = VALUES(os_release),
    kernel_version = VALUES(kernel_version),
    kernel_release = VALUES(kernel_release),
    architecture = VALUES(architecture),
    platform = VALUES(platform),
    python_version = VALUES(python_version),
    current_username = VALUES(current_username),
    home_directory = VALUES(home_directory),
    watcher_directory = VALUES(watcher_directory),
    apps_directory = VALUES(apps_directory),
    boot_time = VALUES(boot_time),
    watcher_status = VALUES(watcher_status),
    watcher_version = VALUES(watcher_version),
    crons = VALUES(crons)
"""


class ServerDetailsService:
    async def ingest_server_details(self, payload: ServerDetailsPayload) -> Dict[str, Any]:
        pool = get_pool()
        if pool is None:
            raise RuntimeError("DB pool not initialized")

        async with pool.acquire() as conn:
            await conn.begin()
            try:
                async with conn.cursor() as cur:
                    await cur.execute(
                        UPSERT_SQL,
                        (
                            payload.ts,
                            payload.region,
                            payload.hostname,
                            payload.fqdn,
                            None,
                            payload.primary_ip,
                            json.dumps(payload.all_ips),
                            payload.os_name,
                            payload.os_version,
                            payload.os_release,
                            payload.kernel_version,
                            payload.kernel_release,
                            payload.architecture,
                            payload.platform,
                            payload.python_version,
                            payload.current_user,
                            payload.home_directory,
                            payload.watcher_directory,
                            payload.apps_directory,
                            payload.boot_time,
                            payload.cpu_count_logical,
                            payload.cpu_count_physical,
                            payload.total_memory_mb,
                            None,
                            "configured",
                            payload.watcher_version,
                            json.dumps(payload.crons),
                        ),
                    )
                await conn.commit()
            except Exception:
                await conn.rollback()
                logger.exception(
                    "Failed to ingest server details for region={} hostname={}",
                    payload.region,
                    payload.hostname,
                )
                raise

        logger.info(
            "Ingested server details for region={} hostname={} primary_ip={}",
            payload.region,
            payload.hostname,
            payload.primary_ip,
        )
        return {
            "status": "success",
            "region": payload.region,
            "hostname": payload.hostname,
            "primary_ip": payload.primary_ip,
        }
