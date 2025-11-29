from fastapi import APIRouter, Response, HTTPException, Request, Cookie
from typing import Optional
from app.models.schemas import OTPRequest, OTPVerify, AuthResponse, UserResponse

router = APIRouter()


@router.post("/auth/request-otp")
async def request_otp(request: OTPRequest):
    """
    Request OTP for email authentication.
    Placeholder - will be implemented in Phase 6.
    """
    # TODO: Implement in Phase 6
    return {"message": "Verification code sent", "email": request.email}


@router.post("/auth/verify-otp")
async def verify_otp(request: OTPVerify, response: Response):
    """
    Verify OTP and create session.
    Placeholder - will be implemented in Phase 6.
    """
    # TODO: Implement in Phase 6
    return {"user": {"id": "placeholder", "email": request.email}}


@router.post("/auth/refresh")
async def refresh_token(response: Response, refresh_token: Optional[str] = Cookie(None)):
    """
    Refresh access token using refresh token.
    Placeholder - will be implemented in Phase 6.
    """
    # TODO: Implement in Phase 6
    return {"success": True}


@router.post("/auth/logout")
async def logout(response: Response, refresh_token: Optional[str] = Cookie(None)):
    """
    Logout and invalidate session.
    """
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"success": True}


@router.get("/auth/me")
async def get_current_user(request: Request):
    """
    Get current authenticated user.
    Placeholder - will be implemented in Phase 6.
    """
    from app.core.dependencies import get_current_user_from_request

    user = await get_current_user_from_request(request)

    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    return {"user": user}
