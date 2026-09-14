from typing import Optional, Any, Dict

import aiomysql
from loguru import logger
from utils.config import load_config

_DB_POOL: Optional[aiomysql.Pool] = None

async def init_db():
    global _DB_POOL
    if _DB_POOL is not None:
        return

    cfg = load_config()
    db_cfg: Dict[str, Any] = cfg.get("db_config", {})

    user = db_cfg.get("user")
    password = db_cfg.get("password")
    host = db_cfg.get("host")
    database = db_cfg.get("database")
    port = int(db_cfg.get("port", 3306))

    if not all([user, password, host, database]):
        logger.error("Invalid DB config. Check config/config.yaml under 'db_config'")
        raise RuntimeError("Database configuration missing required fields")

    logger.info(f"Creating aiomysql pool to {user}@{host}:{port}/{database}")
    _DB_POOL = await aiomysql.create_pool(
        host=host,
        port=port,
        user=user,
        password=password,
        db=database,
        minsize=1,
        maxsize=10,
        autocommit=False,
        charset="utf8mb4",
    )
    logger.info("DB pool ready")

def get_pool() -> Optional[aiomysql.Pool]:
    return _DB_POOL

async def close_db():
    global _DB_POOL
    if _DB_POOL is not None:
        _DB_POOL.close()
        await _DB_POOL.wait_closed()
        logger.info("DB pool closed")
        _DB_POOL = None
