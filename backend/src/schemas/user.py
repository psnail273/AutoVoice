"""
Pydantic schemas for user authentication.
"""

from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, field_validator
from zxcvbn import zxcvbn


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

    @field_validator('password')
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        """Validate password strength using zxcvbn."""
        result = zxcvbn(v)
        if result['score'] < 2:  # 0-4 scale, require at least 2 (fair)
            feedback = result.get('feedback', {})
            suggestions = feedback.get('suggestions', [])
            warning = feedback.get('warning', '')

            error_msg = "Password is too weak. "
            if warning:
                error_msg += f"{warning}. "
            if suggestions:
                error_msg += f"Suggestions: {' '.join(suggestions)}"
            else:
                error_msg += "Use a longer password with mixed characters, or try a passphrase."

            raise ValueError(error_msg)
        return v


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

