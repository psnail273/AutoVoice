"""
Rule model for storing user-defined extraction rules.
"""

from datetime import datetime
from sqlalchemy import String, Boolean, ForeignKey, DateTime, func, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.database import Base


class Rule(Base):
    """
    Extraction rule model.
    
    Each rule belongs to a user and defines how to extract content
    from specific URL patterns.
    """
    __tablename__ = "rules"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    url_pattern: Mapped[str] = mapped_column(String(500), nullable=False)
    keep_selectors: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False, default=list)
    ignore_selectors: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False, default=list)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    auto_extract: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    # Relationship to the user who owns this rule
    user: Mapped["User"] = relationship("User", back_populates="rules")

    def __repr__(self) -> str:
        return f"<Rule(id={self.id}, url_pattern={self.url_pattern})>"

