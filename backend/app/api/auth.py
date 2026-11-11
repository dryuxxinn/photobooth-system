import base64
import hashlib
import hmac
import json
import time
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from pydantic import BaseModel, Field

router = APIRouter(prefix="/auth", tags=["Authentication"])

AUTH_SECRET = b"dryu-sweet-photobooth-secret-token-key-2026"
TOKEN_EXPIRY_SECONDS = 86400 * 7  # 7 days session

# In-memory user credentials as requested:
# admin / admin -> role: "admin"
# user / user -> role: "user"
USER_ACCOUNTS: Dict[str, Dict[str, Any]] = {
    "admin": {
        "username": "admin",
        "password": "admin",
        "role": "admin",
        "display_name": "Administrator (Owner)",
    },
    "user": {
        "username": "user",
        "password": "user",
        "role": "user",
        "display_name": "Petugas Booth (Kasir)",
    },
}


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)


def generate_auth_token(payload: Dict[str, Any]) -> str:
    raw = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    signature = hmac.new(AUTH_SECRET, raw, hashlib.sha256).digest()
    b64_payload = base64.urlsafe_b64encode(raw).decode("ascii")
    b64_sig = base64.urlsafe_b64encode(signature).decode("ascii")
    return f"{b64_payload}.{b64_sig}"


def verify_auth_token(token: str) -> Optional[Dict[str, Any]]:
    if not token or "." not in token:
        return None
    parts = token.split(".")
    if len(parts) != 2:
        return None
    try:
        raw = base64.urlsafe_b64decode(parts[0].encode("ascii"))
        sig = base64.urlsafe_b64decode(parts[1].encode("ascii"))
        expected = hmac.new(AUTH_SECRET, raw, hashlib.sha256).digest()
        if not hmac.compare_digest(sig, expected):
            return None
        payload = json.loads(raw.decode("utf-8"))
        if payload.get("exp", 0) < time.time():
            return None
        return payload
    except Exception:
        return None


def get_current_user_optional(request: Request) -> Optional[Dict[str, Any]]:
    """Extract and verify user from Bearer header or X-Auth-Token header."""
    auth_header = request.headers.get("authorization", "")
    token = ""
    if auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()
    elif request.headers.get("x-auth-token"):
        token = request.headers.get("x-auth-token", "").strip()

    if not token:
        return None

    decoded = verify_auth_token(token)
    if not decoded:
        return None

    username = decoded.get("username")
    account = USER_ACCOUNTS.get(username)
    if not account:
        return None

    return {
        "username": account["username"],
        "role": account["role"],
        "display_name": account["display_name"],
    }


def get_current_user(request: Request) -> Dict[str, Any]:
    user = get_current_user_optional(request)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autentikasi gagal: Silakan masuk terlebih dahulu.",
        )
    return user


def require_admin(request: Request) -> Dict[str, Any]:
    user = get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akses ditolak: Fitur ini hanya dapat dikonfigurasi oleh Administrator.",
        )
    return user


@router.post("/login")
def login(payload: LoginRequest):
    """Authenticate user with username and password."""
    account = USER_ACCOUNTS.get(payload.username.strip().lower())
    if not account or account["password"] != payload.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username atau password salah. Silakan coba lagi.",
        )

    token_payload = {
        "username": account["username"],
        "role": account["role"],
        "exp": time.time() + TOKEN_EXPIRY_SECONDS,
    }
    token = generate_auth_token(token_payload)

    return {
        "success": True,
        "token": token,
        "user": {
            "username": account["username"],
            "role": account["role"],
            "display_name": account["display_name"],
        },
    }


@router.get("/me")
def get_profile(request: Request):
    """Get the currently authenticated user's profile."""
    user = get_current_user(request)
    return {"success": True, "user": user}


@router.post("/logout")
def logout():
    """Sign out the current session."""
    return {"success": True, "message": "Berhasil keluar dari sistem."}
