"""
Authentication router for user signup, login, and profile endpoints.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from slowapi import Limiter
from slowapi.util import get_remote_address
from src.database import get_db
from src.models.user import User
from src.schemas.user import UserCreate, UserLogin, UserResponse, Token
from src.services.auth import hash_password, verify_password, create_access_token
from src.dependencies import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


@router.post("/signup", response_model=Token, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/hour")
async def signup(
    request: Request,
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db)
) -> Token:
    """
    Register a new user account.

    Creates a new user with the provided credentials and returns
    an access token for immediate authentication.

    Rate limit: 5 signups per hour per IP address.
    """
    logger.info(f"Signup attempt for username: {user_data.username}, email: {user_data.email}")

    try:
        # Check if username or email already exists
        result = await db.execute(
            select(User).where(
                or_(
                    User.username == user_data.username,
                    User.email == user_data.email
                )
            )
        )
        existing_user = result.scalar_one_or_none()

        if existing_user:
            if existing_user.username == user_data.username:
                logger.warning(f"Failed signup attempt - username already exists: {user_data.username}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already registered"
                )
            logger.warning(f"Failed signup attempt - email already exists: {user_data.email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        # Create new user with hashed password
        new_user = User(
            username=user_data.username,
            email=user_data.email,
            hashed_password=hash_password(user_data.password)
        )

        db.add(new_user)
        await db.flush()  # Flush to get the user ID

        # Generate access token (if this fails, transaction will rollback)
        access_token = create_access_token(user_id=new_user.id)

        # Commit transaction only if token generation succeeded
        await db.commit()
        await db.refresh(new_user)

        logger.info(f"Successfully created user: {new_user.username} (ID: {new_user.id})")
        return Token(access_token=access_token)
    except HTTPException:
        # Re-raise HTTP exceptions (validation errors)
        raise
    except Exception as e:
        # Rollback on any unexpected error
        logger.error(f"Signup error for username {user_data.username}: {str(e)}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user account"
        )


@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
async def login(
    request: Request,
    credentials: UserLogin,
    db: AsyncSession = Depends(get_db)
) -> Token:
    """
    Authenticate a user and return an access token.

    Accepts username or email for the username field.

    Rate limit: 10 login attempts per minute per IP address.
    """
    logger.info(f"Login attempt for user: {credentials.username}")

    # Find user by username or email
    result = await db.execute(
        select(User).where(
            or_(
                User.username == credentials.username,
                User.email == credentials.username
            )
        )
    )
    user = result.scalar_one_or_none()

    # Always perform hash comparison to prevent timing attacks
    # Use a valid bcrypt dummy hash if user doesn't exist (bcrypt hash of "dummy_password")
    dummy_hash = "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU8HpbYvb7gO"
    password_hash = user.hashed_password if user else dummy_hash

    # Perform password verification with error handling
    try:
        is_valid = verify_password(credentials.password, password_hash)
    except (ValueError, Exception) as e:
        # If password verification fails (e.g., invalid hash format), treat as invalid
        logger.warning(f"Password verification error for {credentials.username}: {str(e)}")
        is_valid = False

    if not user or not is_valid:
        logger.warning(f"Failed login attempt for: {credentials.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Generate access token
    access_token = create_access_token(user_id=user.id)

    logger.info(f"Successful login for user: {user.username} (ID: {user.id})")
    return Token(access_token=access_token)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)) -> UserResponse:
    """
    Get the current authenticated user's profile.
    
    Requires a valid JWT token in the Authorization header.
    """
    return UserResponse.model_validate(current_user)

