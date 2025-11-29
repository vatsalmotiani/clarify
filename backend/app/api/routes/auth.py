"""
Authentication API routes for OTP-based email authentication.
"""
from fastapi import APIRouter, Response, HTTPException, Request, Cookie
from typing import Optional
from pydantic import BaseModel, EmailStr
from app.services.auth_service import (
    create_otp,
    verify_otp,
    send_otp_email,
    create_session,
    invalidate_session,
    get_user_by_id,
    get_user_analyses
)
from app.core.dependencies import get_current_user_from_request
from app.core.logging import get_logger
from app.config import settings

router = APIRouter()
logger = get_logger("clarify.auth")


class OTPRequest(BaseModel):
    email: EmailStr


class OTPVerify(BaseModel):
    email: EmailStr
    code: str


class UserResponse(BaseModel):
    id: str
    email: str


class AuthResponse(BaseModel):
    user: UserResponse
    token: str


@router.post("/auth/request-otp")
async def request_otp(request: OTPRequest):
    """
    Request OTP for email authentication.
    Generates a 6-digit code and sends it via SMTP.
    """
    email = request.email.lower().strip()
    logger.info(f"OTP requested for {email}")

    # Create OTP
    success, result = await create_otp(email)

    if not success:
        raise HTTPException(status_code=429, detail=result)

    # Send OTP via email
    otp_code = result
    email_sent = await send_otp_email(email, otp_code)

    if not email_sent and settings.ENVIRONMENT != "development":
        raise HTTPException(
            status_code=500,
            detail="Failed to send verification email. Please try again."
        )

    return {
        "message": "Verification code sent",
        "email": email,
        "expires_in_minutes": settings.OTP_EXPIRE_MINUTES
    }


@router.post("/auth/verify-otp", response_model=AuthResponse)
async def verify_otp_route(request: OTPVerify, response: Response, req: Request):
    """
    Verify OTP and create session.
    Returns JWT token and user data.
    """
    email = request.email.lower().strip()
    code = request.code.strip()

    # Verify OTP
    success, message, user = await verify_otp(email, code)

    if not success:
        raise HTTPException(status_code=400, detail=message)

    # Get client info for session
    user_agent = req.headers.get("user-agent", "")
    ip_address = req.client.host if req.client else None

    # Create session
    try:
        access_token = await create_session(
            user["id"],
            user_agent=user_agent,
            ip_address=ip_address
        )
    except Exception as e:
        logger.error(f"Failed to create session: {e}")
        raise HTTPException(status_code=500, detail="Failed to create session")

    # Set cookie
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=settings.ENVIRONMENT == "production",
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )

    return AuthResponse(
        user=UserResponse(id=user["id"], email=user["email"]),
        token=access_token
    )


@router.post("/auth/logout")
async def logout(response: Response, request: Request):
    """
    Logout and invalidate session.
    """
    access_token = request.cookies.get("access_token")

    if access_token:
        await invalidate_session(access_token)

    response.delete_cookie("access_token")
    response.delete_cookie("guest_id")

    return {"success": True, "message": "Logged out successfully"}


@router.get("/auth/me")
async def get_current_user(request: Request):
    """
    Get current authenticated user.
    """
    user = await get_current_user_from_request(request)

    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    return {"user": UserResponse(id=user["id"], email=user["email"])}


@router.get("/auth/history")
async def get_user_history(
    request: Request,
    limit: int = 20,
    offset: int = 0
):
    """
    Get user's analysis history.
    """
    user = await get_current_user_from_request(request)

    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    analyses = await get_user_analyses(user["id"], limit=limit, offset=offset)

    return {
        "analyses": analyses,
        "has_more": len(analyses) == limit
    }


@router.post("/auth/guest")
async def create_guest_session(response: Response):
    """
    Create a guest session.
    Guest users can use the app but their data is not persisted.
    """
    # Generate a guest token (not stored in DB)
    import secrets
    guest_id = f"guest_{secrets.token_hex(16)}"

    # Set a guest cookie
    response.set_cookie(
        key="guest_id",
        value=guest_id,
        httponly=True,
        secure=settings.ENVIRONMENT == "production",
        samesite="lax",
        max_age=24 * 60 * 60  # 24 hours
    )

    return {
        "guest_id": guest_id,
        "message": "Guest session created. Your data will not be saved.",
        "expires_in_hours": 24
    }


@router.get("/auth/check")
async def check_auth_status(request: Request):
    """
    Check if the user is authenticated or in guest mode.
    """
    # Check for authenticated user
    user = await get_current_user_from_request(request)
    if user:
        return {
            "authenticated": True,
            "is_guest": False,
            "user": UserResponse(id=user["id"], email=user["email"])
        }

    # Check for guest session
    guest_id = request.cookies.get("guest_id")
    if guest_id:
        return {
            "authenticated": False,
            "is_guest": True,
            "guest_id": guest_id
        }

    return {
        "authenticated": False,
        "is_guest": False
    }
