# error_handlers.py
from fastapi import Request
from fastapi.exceptions import RequestValidationError
from starlette.responses import JSONResponse
from models.response_models import ErrorResponse
from loguru import logger

class ErrorHandler:
    @classmethod
    def register(cls, app):
        @app.exception_handler(ValueError)
        async def value_error_handler(request: Request, exc: ValueError):
            logger.error(f"ValueError: {exc} | Path: {request.url}")
            return JSONResponse(
                status_code=400,
                content=ErrorResponse(
                    error_code=400, error_message=f"Invalid input: {str(exc)}"
                ).model_dump(),
                headers={"Access-Control-Allow-Origin": "*"},
            )

        @app.exception_handler(RequestValidationError)
        async def validation_exception_handler(request: Request, exc: RequestValidationError):
            logger.error(f"ValidationError: {exc} | Path: {request.url}")
            return JSONResponse(
                status_code=422,
                content=ErrorResponse(
                    error_code=422, error_message="Invalid request parameters"
                ).model_dump(),
                headers={"Access-Control-Allow-Origin": "*"},
            )

        @app.exception_handler(TimeoutError)
        async def timeout_exception_handler(request: Request, exc: TimeoutError):
            logger.error(f"TimeoutError: {exc} | Path: {request.url}")
            return JSONResponse(
                status_code=504,
                content=ErrorResponse(
                    error_code=504, error_message="Request to external service timed out"
                ).model_dump(),
                headers={"Access-Control-Allow-Origin": "*"},
            )

        @app.exception_handler(ConnectionError)
        async def connection_exception_handler(request: Request, exc: ConnectionError):
            logger.error(f"ConnectionError: {exc} | Path: {request.url}")
            return JSONResponse(
                status_code=502,
                content=ErrorResponse(
                    error_code=502, error_message="Failed to connect to the service"
                ).model_dump(),
                headers={"Access-Control-Allow-Origin": "*"},
            )

        @app.exception_handler(KeyError)
        async def key_error_handler(request: Request, exc: KeyError):
            logger.error(f"KeyError: {exc} | Path: {request.url}")
            return JSONResponse(
                status_code=500,
                content=ErrorResponse(
                    error_code=500, error_message="Unexpected response format"
                ).model_dump(),
                headers={"Access-Control-Allow-Origin": "*"},
            )

        @app.exception_handler(Exception)
        async def generic_exception_handler(request: Request, exc: Exception):
            logger.exception(f"Unhandled Exception: {exc} | Path: {request.url}")
            return JSONResponse(
                status_code=500,
                content=ErrorResponse(
                    error_code=500, error_message="An unexpected error occurred"
                ).model_dump(),
                headers={"Access-Control-Allow-Origin": "*"},
            )
