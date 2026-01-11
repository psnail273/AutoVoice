"""
Pydantic schemas for user authentication.
"""

from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    """Schema for user registration."""
    username: str = Field(
        min_length=3,
        max_length=50,
        pattern=r"^[a-zA-Z0-9_]+$",
        description="Username (alphanumeric and underscores only)"
    )
    email: EmailStr = Field(description="User email address")
    password: str = Field(
        min_length=8,
        max_length=100,
        description="Password (minimum 8 characters)"
    )


class UserLogin(BaseModel):
    """Schema for user login."""
    username: str = Field(description="Username or email")
    password: str = Field(description="User password")


class UserResponse(BaseModel):
    """Schema for user data in responses."""
    id: int
    username: str
    email: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    """Schema for JWT token response."""
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Schema for decoded JWT token data."""
    user_id: int | None = None

