from fastapi import Request, HTTPException
from typing import Optional, Dict
from app.core.security import verify_access_token
from supabase import create_client
from app.config import settings


def get_supabase_client():
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        return None
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)


async def get_current_user_from_request(request: Request) -> Optional[Dict]:
    """
    Extract and verify user from request cookies.
    """
    access_token = request.cookies.get("access_token")

    if not access_token:
        return None

    payload = verify_access_token(access_token)

    if not payload:
        return None

    user_id = payload.get("sub")

    # Get user from database
    supabase = get_supabase_client()
    if not supabase:
        return None

    try:
        result = supabase.table("users").select("id, email").eq("id", user_id).single().execute()
        return result.data if result.data else None
    except Exception:
        return None


async def get_current_user_required(request: Request) -> Dict:
    """
    Get current user or raise 401 error.
    """
    user = await get_current_user_from_request(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user
