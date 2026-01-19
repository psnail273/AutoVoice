"""
FastAPI dependencies for authentication and authorization.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.database import get_db
from src.services.auth import decode_access_token
from src.models.user import User

# HTTP Bearer token security scheme
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Dependency to get the current authenticated user.
    
    Extracts and validates the JWT token from the Authorization header,
    then fetches the corresponding user from the database.
    
    Args:
        credentials: Bearer token from Authorization header.
        db: Database session.
        
    Returns:
        The authenticated User object.
        
    Raises:
        HTTPException 401: If token is invalid or user not found.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token_data = decode_access_token(credentials.credentials)
    
    if token_data is None or token_data.user_id is None:
        raise credentials_exception
    
    result = await db.execute(select(User).where(User.id == token_data.user_id))
    user = result.scalar_one_or_none()
    
    if user is None:
        raise credentials_exception
    
    return user


async def require_pro_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Dependency to ensure the current user has a Pro subscription.
    
    Args:
        current_user: Authenticated user from get_current_user.
    
    Returns:
        The authenticated User object if subscription is Pro.
    
    Raises:
        HTTPException 403: If the user is not on the Pro tier.
    """
    if current_user.subscription_tier != "pro":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Pro subscription required"
        )
    return current_user

