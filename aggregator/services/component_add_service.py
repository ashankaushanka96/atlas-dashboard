from datetime import datetime, timezone
import json
from typing import Iterable, Tuple
from loguru import logger
from fastapi.encoders import jsonable_encoder
from subsystems.database import get_pool
from models.component_add_section_models import ComponentIn
from dateutil import parser

DELETE_SQL = "DELETE FROM components WHERE ip=%s AND region=%s"

INSERT_SQL = """
INSERT INTO components
(ip,region,component_name,platform,comp_path,comp_version,pipeline,
 last_run_time,last_updated_time,previous_tag,release_date,
 code_repo_url,config_repo_url,script_repo_url,description,watcher,config_meta,category)
VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
"""

SELECT_CONFIG_META_SQL = """
SELECT component_name, config_meta
FROM components
WHERE ip=%s AND region=%s AND config_meta IS NOT NULL
"""

SELECT_ALL_SQL = """
SELECT ip, region, component_name, platform, comp_path, comp_version, pipeline,
       last_run_time, previous_tag, release_date, code_repo_url, config_repo_url, script_repo_url, description, watcher, category
FROM components
"""

class ComponentAddService:
    """Handles DB writes and Redis cache for component inventory."""

    @staticmethod
    def _to_iso(dt):
        return dt.isoformat() if isinstance(dt, datetime) else (None if dt is None else str(dt))

    async def process_components(self, ip: str, region: str, components: Iterable[ComponentIn]) -> Tuple[int, int]:
        """
        Atomically delete then insert components for (ip, region), then write to Redis.
        """
        pool = get_pool()
        if pool is None:
            raise RuntimeError("DB pool not initialized")

        async with pool.acquire() as conn:
            await conn.begin()
            try:
                async with conn.cursor() as cur:
                    await cur.execute(SELECT_CONFIG_META_SQL, (ip, region))
                    config_meta_by_component = {
                        row[0]: row[1]
                        for row in await cur.fetchall()
                    }

                    # delete
                    await cur.execute(DELETE_SQL, (ip, region))
                    deleted = cur.rowcount or 0
                    logger.info(f"Deleted {deleted} components for ip={ip}, region={region}")

                    # insert
                    inserted = 0
                    now = datetime.now(timezone.utc)

                    for comp in components:
                        c = comp.dict(by_alias=True)
                        raw_lr = c.get('last_run_time')
                        if isinstance(raw_lr, str):
                            try:
                                last_run_time = parser.parse(raw_lr)
                            except ValueError:
                                last_run_time = None
                        else:
                            last_run_time = raw_lr  # assume it's already datetime or None

                        raw_rd = c.get('release_date')
                        if isinstance(raw_rd, str):
                            try:
                                release_date = parser.parse(raw_rd)
                            except ValueError:
                                release_date = None
                        else:
                            release_date = raw_rd
                        await cur.execute(INSERT_SQL, (
                            ip,
                            region,
                            c.get("comp_name"),
                            c.get("platform"),
                            c.get("path"),
                            c.get("version"),
                            c.get("pipeline"),
                            last_run_time,   # str/datetime
                            now,
                            c.get("previous_tag"),
                            release_date,    # str/datetime
                            c.get("code_repo_url"),
                            c.get("config_repo_url"),
                            c.get("script_repo_url"),
                            c.get("description"),
                            c.get("watcher", False),
                            (
                                json.dumps(jsonable_encoder(c.get("config_meta")))
                                if c.get("config_meta") is not None
                                else config_meta_by_component.get(c.get("comp_name"))
                            ),
                            c.get("category"),
                        ))
                        inserted += 1

                await conn.commit()
                logger.info(f"Inserted {inserted} components for ip={ip}, region={region}")
            except Exception:
                await conn.rollback()
                logger.exception("Transaction rolled back")
                raise

        return deleted, inserted
