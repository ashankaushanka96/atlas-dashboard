# logger_config.py
import os
from loguru import logger

class LoggerConfigurator:
    @classmethod
    def _is_debug_enabled(cls):
        return os.getenv("DEBUG", "").strip().lower() in {"1", "true", "yes", "on"}

    @classmethod
    def _resolve_log_level(cls):
        configured_level = os.getenv("LOG_LEVEL", "").strip().upper()
        if configured_level:
            return configured_level

        if cls._is_debug_enabled():
            return "DEBUG"

        return "INFO"

    @classmethod
    def configure(cls):
        # Remove default logger handlers
        logger.remove()
        log_level = cls._resolve_log_level()
        # Ensure the logs directory exists
        script_directory = os.path.dirname(os.path.abspath(__file__))
        os.makedirs(os.path.join(script_directory, "logs"), exist_ok=True)
        # Configure the logger with desired settings
        logger.add(
            f"logs/log_{{time:YYYYMMDDHHmmss}}_{os.getpid()}.txt",
            rotation="5 MB",       # Rotate file when it reaches 5 MB
            retention="10 days",     # Keep log files for 10 days
            compression="zip",       # Compress old files to zip format
            level=log_level,
            format="{time:YYYY-MM-DD HH:mm:ss.SSS} | {level: <5} | {name:<35} | {function:<30} | {line:<3} | {message}",
        )
        logger.info("Logger configured successfully. level={}", log_level)
