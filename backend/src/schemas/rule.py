"""
Pydantic schemas for rule CRUD operations.
"""

from datetime import datetime
from pydantic import BaseModel, Field


class RuleCreate(BaseModel):
    """Schema for creating a new rule."""
    url_pattern: str = Field(
        max_length=500,
        description="URL pattern to match (e.g., 'https://example.com/*')"
    )
    keep_selectors: list[str] = Field(
        default_factory=list,
        description="CSS selectors for elements to keep"
    )
    ignore_selectors: list[str] = Field(
        default_factory=list,
        description="CSS selectors for elements to ignore"
    )
    enabled: bool = Field(default=True, description="Whether the rule is active")
    auto_extract: bool = Field(
        default=True,
        description="Whether to automatically extract content"
    )


class RuleUpdate(BaseModel):
    """Schema for updating an existing rule."""
    url_pattern: str | None = Field(
        default=None,
        max_length=500,
        description="URL pattern to match"
    )
    keep_selectors: list[str] | None = Field(
        default=None,
        description="CSS selectors for elements to keep"
    )
    ignore_selectors: list[str] | None = Field(
        default=None,
        description="CSS selectors for elements to ignore"
    )
    enabled: bool | None = Field(default=None, description="Whether the rule is active")
    auto_extract: bool | None = Field(
        default=None,
        description="Whether to automatically extract content"
    )


class RuleResponse(BaseModel):
    """Schema for rule data in responses."""
    id: int
    user_id: int
    url_pattern: str
    keep_selectors: list[str]
    ignore_selectors: list[str]
    enabled: bool
    auto_extract: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

