from typing import Optional, Any, Dict
from loguru import logger
from redis.asyncio import Redis

from utils.config import load_config

_REDIS: Optional[Redis] = None

async def init_redis():
    global _REDIS
    if _REDIS is not None:
        return
    cfg = load_config()
    rcfg: Dict[str, Any] = cfg.get("redis_config", {})
    host = rcfg.get("host", "127.0.0.1")
    port = int(rcfg.get("port", 6379))
    db   = int(rcfg.get("db", 0))
    pwd  = rcfg.get("password", None)

    _REDIS = Redis(host=host, port=port, db=db, password=pwd, decode_responses=True)
    try:
        pong = await _REDIS.ping()
        if pong:
            logger.info(f"Connected to Redis {host}:{port}/{db}")
    except Exception:
        logger.exception("Failed connecting to Redis")
        raise

def get_redis() -> Optional[Redis]:
    return _REDIS

async def close_redis():
    global _REDIS
    if _REDIS is not None:
        await _REDIS.close()
        logger.info("Redis client closed")
        _REDIS = None
