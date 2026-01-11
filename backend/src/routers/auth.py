"""
Authentication router for user signup, login, and profile endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from src.database import get_db
from src.models.user import User
from src.schemas.user import UserCreate, UserLogin, UserResponse, Token
from src.services.auth import hash_password, verify_password, create_access_token
from src.dependencies import get_current_user

router = APIRouter()


@router.post("/signup", response_model=Token, status_code=status.HTTP_201_CREATED)
async def signup(user_data: UserCreate, db: AsyncSession = Depends(get_db)) -> Token:
    """
    Register a new user account.
    
    Creates a new user with the provided credentials and returns
    an access token for immediate authentication.
    """
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
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already registered"
            )
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
    await db.refresh(new_user)
    
    # Generate access token
    access_token = create_access_token(user_id=new_user.id)
    
    return Token(access_token=access_token)


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, db: AsyncSession = Depends(get_db)) -> Token:
    """
    Authenticate a user and return an access token.
    
    Accepts username or email for the username field.
    """
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
    
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Generate access token
    access_token = create_access_token(user_id=user.id)
    
    return Token(access_token=access_token)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)) -> UserResponse:
    """
    Get the current authenticated user's profile.
    
    Requires a valid JWT token in the Authorization header.
    """
    return UserResponse.model_validate(current_user)

