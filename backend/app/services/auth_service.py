"""
Authentication service for OTP-based email authentication.
"""
import secrets
import hashlib
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from typing import Optional, Dict, Tuple
from app.config import settings
from app.core.dependencies import get_supabase_client
from app.core.security import create_access_token
from app.core.logging import get_logger

logger = get_logger("clarify.auth")


def generate_otp(length: int = 6) -> str:
    """Generate a secure random OTP code."""
    return "".join([str(secrets.randbelow(10)) for _ in range(length)])


def hash_token(token: str) -> str:
    """Hash a token for secure storage."""
    return hashlib.sha256(token.encode()).hexdigest()


async def create_otp(email: str) -> Tuple[bool, str]:
    """
    Create and store a new OTP for the given email.
    Returns (success, message/otp).
    """
    supabase = get_supabase_client()
    if not supabase:
        return False, "Database not configured"

    email = email.lower().strip()

    try:
        # Check rate limiting - max 5 OTPs per hour per email
        one_hour_ago = (datetime.utcnow() - timedelta(hours=1)).isoformat()
        recent_otps = supabase.table("otps").select("id").eq(
            "email", email
        ).gte("created_at", one_hour_ago).execute()

        if len(recent_otps.data) >= 5:
            logger.warning(f"Rate limit exceeded for {email}")
            return False, "Too many OTP requests. Please wait before trying again."

        # Generate new OTP
        otp_code = generate_otp()
        expires_at = datetime.utcnow() + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)

        # Store OTP
        supabase.table("otps").insert({
            "email": email,
            "code": otp_code,
            "expires_at": expires_at.isoformat()
        }).execute()

        logger.info(f"OTP created for {email}")
        return True, otp_code

    except Exception as e:
        logger.error(f"Failed to create OTP: {e}")
        return False, "Failed to create verification code"


async def verify_otp(email: str, code: str) -> Tuple[bool, str, Optional[Dict]]:
    """
    Verify an OTP code.
    Returns (success, message, user_data).
    """
    supabase = get_supabase_client()
    if not supabase:
        return False, "Database not configured", None

    email = email.lower().strip()

    try:
        # Find the most recent unused OTP for this email
        result = supabase.table("otps").select("*").eq(
            "email", email
        ).eq("used", False).order("created_at", desc=True).limit(1).execute()

        if not result.data:
            return False, "No verification code found. Please request a new one.", None

        otp_record = result.data[0]

        # Check if expired
        expires_at = datetime.fromisoformat(otp_record["expires_at"].replace("Z", "+00:00"))
        if datetime.utcnow().replace(tzinfo=expires_at.tzinfo) > expires_at:
            # Mark as used
            supabase.table("otps").update({"used": True}).eq("id", otp_record["id"]).execute()
            return False, "Verification code has expired. Please request a new one.", None

        # Check attempts
        attempts = otp_record.get("attempts", 0)
        if attempts >= settings.OTP_MAX_ATTEMPTS:
            supabase.table("otps").update({"used": True}).eq("id", otp_record["id"]).execute()
            return False, "Too many failed attempts. Please request a new code.", None

        # Verify code
        if otp_record["code"] != code:
            # Increment attempts
            supabase.table("otps").update({
                "attempts": attempts + 1
            }).eq("id", otp_record["id"]).execute()
            remaining = settings.OTP_MAX_ATTEMPTS - attempts - 1
            return False, f"Invalid code. {remaining} attempts remaining.", None

        # Mark OTP as used
        supabase.table("otps").update({"used": True}).eq("id", otp_record["id"]).execute()

        # Get or create user
        user_result = supabase.table("users").select("*").eq("email", email).execute()

        if user_result.data:
            user = user_result.data[0]
            # Update last login
            supabase.table("users").update({
                "last_login_at": datetime.utcnow().isoformat()
            }).eq("id", user["id"]).execute()
        else:
            # Create new user
            new_user_result = supabase.table("users").insert({
                "email": email
            }).execute()
            user = new_user_result.data[0]

        logger.info(f"User {email} authenticated successfully")
        return True, "Verification successful", user

    except Exception as e:
        logger.error(f"Failed to verify OTP: {e}")
        return False, "Failed to verify code", None


async def send_otp_email(email: str, otp_code: str) -> bool:
    """
    Send OTP code via SMTP.
    Returns True if sent successfully.
    """
    # Check if SMTP is configured
    if not settings.SMTP_HOST or not settings.SMTP_USER:
        logger.warning("SMTP not configured, OTP not sent via email")
        # In development, log the OTP for testing
        if settings.ENVIRONMENT == "development":
            logger.info(f"[DEV MODE] OTP for {email}: {otp_code}")
        return True  # Return True in dev mode to continue the flow

    try:
        # Create message
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"Your Clarify verification code: {otp_code}"
        msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
        msg["To"] = email

        # Plain text version
        text = f"""
Your Clarify verification code is: {otp_code}

This code will expire in {settings.OTP_EXPIRE_MINUTES} minutes.

If you didn't request this code, please ignore this email.

- The Clarify Team
"""

        # HTML version
        html = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .code {{ font-size: 32px; font-weight: bold; color: #1E3A5F; letter-spacing: 4px; padding: 20px; background: #f5f5f5; border-radius: 8px; text-align: center; margin: 20px 0; }}
        .footer {{ color: #666; font-size: 12px; margin-top: 30px; }}
    </style>
</head>
<body>
    <div class="container">
        <h2>Verify your email</h2>
        <p>Use the following code to sign in to Clarify:</p>
        <div class="code">{otp_code}</div>
        <p>This code will expire in {settings.OTP_EXPIRE_MINUTES} minutes.</p>
        <p class="footer">If you didn't request this code, please ignore this email.</p>
    </div>
</body>
</html>
"""

        msg.attach(MIMEText(text, "plain"))
        msg.attach(MIMEText(html, "html"))

        # Send email
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM_EMAIL, email, msg.as_string())

        logger.info(f"OTP email sent to {email}")
        return True

    except Exception as e:
        logger.error(f"Failed to send OTP email: {e}")
        return False


async def create_session(user_id: str, user_agent: str = None, ip_address: str = None) -> str:
    """
    Create a new session for a user and return the access token.
    """
    supabase = get_supabase_client()
    if not supabase:
        raise Exception("Database not configured")

    # Create access token
    access_token = create_access_token(user_id)
    token_hash = hash_token(access_token)

    expires_at = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    try:
        supabase.table("sessions").insert({
            "user_id": user_id,
            "token_hash": token_hash,
            "expires_at": expires_at.isoformat(),
            "user_agent": user_agent,
            "ip_address": ip_address
        }).execute()

        return access_token
    except Exception as e:
        logger.error(f"Failed to create session: {e}")
        raise


async def invalidate_session(token: str) -> bool:
    """Invalidate a session by token."""
    supabase = get_supabase_client()
    if not supabase:
        return False

    token_hash = hash_token(token)

    try:
        supabase.table("sessions").update({
            "is_valid": False
        }).eq("token_hash", token_hash).execute()
        return True
    except Exception:
        return False


async def get_user_by_id(user_id: str) -> Optional[Dict]:
    """Get user by ID."""
    supabase = get_supabase_client()
    if not supabase:
        return None

    try:
        result = supabase.table("users").select("id, email, created_at").eq(
            "id", user_id
        ).single().execute()
        return result.data
    except Exception:
        return None


async def get_user_analyses(user_id: str, limit: int = 20, offset: int = 0) -> list:
    """Get user's analysis history."""
    supabase = get_supabase_client()
    if not supabase:
        return []

    try:
        result = supabase.table("analyses").select(
            "id, document_names, domain, intent, overall_score, current_step, created_at"
        ).eq("user_id", user_id).eq("is_guest", False).order(
            "created_at", desc=True
        ).range(offset, offset + limit - 1).execute()

        return result.data
    except Exception as e:
        logger.error(f"Failed to get user analyses: {e}")
        return []
