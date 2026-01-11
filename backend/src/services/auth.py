"""
Authentication services for password hashing and JWT token management.
"""

from datetime import datetime, timedelta, timezone
import bcrypt
from jose import JWTError, jwt
from src.config import settings
from src.schemas.user import TokenData


def hash_password(password: str) -> str:
    """
    Hash a plain text password using bcrypt.
    
    Args:
        password: Plain text password to hash.
        
    Returns:
        Hashed password string.
    """
    password_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain text password against a hashed password.
    
    Args:
        plain_password: Plain text password to verify.
        hashed_password: Hashed password to compare against.
        
    Returns:
        True if password matches, False otherwise.
    """
    password_bytes = plain_password.encode("utf-8")
    hashed_bytes = hashed_password.encode("utf-8")
    return bcrypt.checkpw(password_bytes, hashed_bytes)


def create_access_token(user_id: int, expires_delta: timedelta | None = None) -> str:
    """
    Create a JWT access token for a user.
    
    Args:
        user_id: The user's database ID to encode in the token.
        expires_delta: Optional custom expiration time.
        
    Returns:
        Encoded JWT token string.
    """
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "sub": str(user_id),
        "exp": expire
    }
    
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> TokenData | None:
    """
    Decode and validate a JWT access token.
    
    Args:
        token: The JWT token string to decode.
        
    Returns:
        TokenData with user_id if valid, None if invalid or expired.
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id_str: str | None = payload.get("sub")
        
        if user_id_str is None:
            return None
            
        return TokenData(user_id=int(user_id_str))
        
    except JWTError:
        return None

