from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.routes import upload, analysis, auth
from app.core.logging import setup_logging, get_logger
import time

# Initialize logging
setup_logging()
logger = get_logger("clarify.main")

app = FastAPI(
    title="Clarify API",
    description="AI-powered document clarification platform",
    version="1.0.0"
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests and their response times."""
    start_time = time.time()

    # Skip logging for frequent status polling
    path = request.url.path
    if "/status" not in path:
        logger.info(f"→ {request.method} {path}")

    response = await call_next(request)

    duration = time.time() - start_time

    # Log response (skip frequent status polls)
    if "/status" not in path:
        logger.info(f"← {request.method} {path} - {response.status_code} ({duration:.3f}s)")
    elif response.status_code != 200:
        logger.warning(f"← {request.method} {path} - {response.status_code} ({duration:.3f}s)")

    return response

# CORS configuration
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

if settings.ENVIRONMENT == "production":
    origins = [
        "https://clarify.app",
        "https://www.clarify.app",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(upload.router, prefix="/api", tags=["Upload"])
app.include_router(analysis.router, prefix="/api", tags=["Analysis"])
app.include_router(auth.router, prefix="/api", tags=["Authentication"])


@app.on_event("startup")
async def startup_event():
    """Log application startup."""
    logger.info("=" * 60)
    logger.info("🚀 Clarify API starting up...")
    logger.info(f"   Environment: {settings.ENVIRONMENT}")
    logger.info(f"   Max file size: {settings.MAX_FILE_SIZE_MB}MB")
    logger.info("=" * 60)


@app.get("/")
async def root():
    return {"message": "Clarify API", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT
    }
