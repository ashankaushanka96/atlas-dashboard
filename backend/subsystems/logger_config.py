# logger_config.py
import os
from loguru import logger

class LoggerConfigurator:
    @classmethod
    def configure(cls):
        # Remove default logger handlers
        logger.remove()
        # Ensure the logs directory exists
        os.makedirs("logs", exist_ok=True)
        # Configure the logger with desired settings
        logger.add(
            f"logs/log_{{time:YYYYMMDDHHmmss}}_{os.getpid()}.txt",
            rotation="5 MB",       # Rotate file when it reaches 5 MB
            retention="10 days",     # Keep log files for 10 days
            compression="zip",       # Compress old files to zip format
            format="{time:YYYY-MM-DD HH:mm:ss.SSS} | {level: <5} | {name:<25} | {function:<30} | {line:<3} | {message}",
        )
        logger.info("Logger configured successfully.")