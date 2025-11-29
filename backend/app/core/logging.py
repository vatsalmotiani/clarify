"""
Logging configuration for Clarify backend.
Provides structured logging with colored output for development.
"""
import logging
import sys
from datetime import datetime
from typing import Optional
from app.config import settings


class ColoredFormatter(logging.Formatter):
    """Custom formatter with colors for terminal output."""

    COLORS = {
        'DEBUG': '\033[36m',      # Cyan
        'INFO': '\033[32m',       # Green
        'WARNING': '\033[33m',    # Yellow
        'ERROR': '\033[31m',      # Red
        'CRITICAL': '\033[41m',   # Red background
    }
    RESET = '\033[0m'
    BOLD = '\033[1m'

    def format(self, record):
        # Add color based on level
        color = self.COLORS.get(record.levelname, '')

        # Format timestamp
        timestamp = datetime.fromtimestamp(record.created).strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]

        # Build the log message
        level = f"{color}{self.BOLD}{record.levelname:8}{self.RESET}"
        name = f"\033[35m{record.name}\033[0m"  # Purple for logger name

        # Add extra context if available
        extra = ""
        if hasattr(record, 'analysis_id'):
            extra += f" [analysis_id={record.analysis_id}]"
        if hasattr(record, 'step'):
            extra += f" [step={record.step}]"
        if hasattr(record, 'duration'):
            extra += f" [duration={record.duration:.2f}s]"

        message = f"{timestamp} | {level} | {name}{extra} | {record.getMessage()}"

        # Add exception info if present
        if record.exc_info:
            message += f"\n{self.formatException(record.exc_info)}"

        return message


def setup_logging():
    """Configure logging for the application."""
    # Create root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.DEBUG if settings.ENVIRONMENT == "development" else logging.INFO)

    # Remove existing handlers
    root_logger.handlers = []

    # Create console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.DEBUG)
    console_handler.setFormatter(ColoredFormatter())

    root_logger.addHandler(console_handler)

    # Set specific logger levels
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)  # Reduce noise
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("openai").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)

    return root_logger


def get_logger(name: str) -> logging.Logger:
    """Get a logger with the given name."""
    return logging.getLogger(name)


class LoggerAdapter(logging.LoggerAdapter):
    """Custom adapter to add context to log messages."""

    def process(self, msg, kwargs):
        # Add extra context from adapter's extra dict
        extra = kwargs.get('extra', {})
        extra.update(self.extra)
        kwargs['extra'] = extra
        return msg, kwargs


def get_analysis_logger(analysis_id: str) -> LoggerAdapter:
    """Get a logger with analysis_id context."""
    logger = logging.getLogger("clarify.analysis")
    return LoggerAdapter(logger, {'analysis_id': analysis_id})
