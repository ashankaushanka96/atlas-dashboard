import os
import json
import copy
import yaml
import boto3
from typing import Dict, Any
from loguru import logger

_CONFIG_CACHE: Dict[str, Any] | None = None

def _deep_merge(base: Any, override: Any) -> Any:
    if isinstance(base, dict) and isinstance(override, dict):
        merged = dict(base)
        for key, value in override.items():
            if key in merged:
                merged[key] = _deep_merge(merged[key], value)
            else:
                merged[key] = value
        return merged

    return override


def _load_secret_payload(config: Dict[str, Any]) -> Dict[str, Any]:
    secret_cfg = config.get("aws_secrets_manager", {}) or {}
    if not secret_cfg.get("enabled", False):
        raise RuntimeError("AWS Secrets Manager is required for backend secrets, but aws_secrets_manager.enabled is false.")

    secret_name = secret_cfg.get("secret_name")
    region_name = secret_cfg.get("region_name")
    if not secret_name:
        raise RuntimeError("AWS Secrets Manager is enabled but no secret_name is configured.")

    try:
        client = boto3.client("secretsmanager", region_name=region_name or None)
        response = client.get_secret_value(SecretId=secret_name)
        secret_string = response.get("SecretString", "")
        payload = json.loads(secret_string) if secret_string else {}
        if not isinstance(payload, dict):
            raise ValueError("SecretString JSON must be an object at the top level.")
        logger.info("Loaded backend overrides from AWS Secrets Manager secret {}", secret_name)
        return payload
    except Exception as exc:
        logger.exception("Failed to load AWS Secrets Manager secret {}", secret_name)
        raise


def _require_nested(config: Dict[str, Any], path: str):
    current = config
    for part in path.split("."):
        if isinstance(current, list):
            if not current:
                raise RuntimeError(f"Required secret-backed config '{path}' is missing.")
            current = current[0]

        if not isinstance(current, dict) or part not in current:
            raise RuntimeError(f"Required secret-backed config '{path}' is missing.")
        current = current[part]

    if current in (None, "", [], {}):
        raise RuntimeError(f"Required secret-backed config '{path}' is empty.")


def _validate_secret_backed_config(config: Dict[str, Any]) -> None:
    required_paths = [
        "db_config.user",
        "db_config.password",
        "db_config.host",
        "db_config.database",
        "db_config.port",
        "datadog.dd_api_key",
        "datadog.dd_app_key",
        "api_keys.key",
    ]
    for path in required_paths:
        _require_nested(config, path)


def load_config(force_reload: bool = False) -> Dict[str, Any]:
    global _CONFIG_CACHE

    if _CONFIG_CACHE is not None and not force_reload:
        return copy.deepcopy(_CONFIG_CACHE)

    # project root / config / config.yaml
    base = os.path.dirname(os.path.abspath(__file__))  # utils/
    project_root = os.path.dirname(base)               # .
    cfg_path = os.path.join(project_root, "config", "config.yaml")

    if not os.path.isfile(cfg_path):
        logger.error(f"Config file not found: {cfg_path}")
        raise FileNotFoundError(f"Missing config at {cfg_path}")

    with open(cfg_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}

    secret_payload = _load_secret_payload(data)
    merged = _deep_merge(data, secret_payload)
    _validate_secret_backed_config(merged)
    _CONFIG_CACHE = merged
    return copy.deepcopy(_CONFIG_CACHE)
