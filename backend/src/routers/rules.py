"""
Rules router for CRUD operations on user extraction rules.

All endpoints require authentication and users can only access their own rules.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.database import get_db
from src.models.user import User
from src.models.rule import Rule
from src.schemas.rule import RuleCreate, RuleUpdate, RuleResponse
from src.dependencies import get_current_user

router = APIRouter()


@router.get("", response_model=list[RuleResponse])
async def get_rules(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> list[RuleResponse]:
    """
    Get all rules for the authenticated user.
    """
    result = await db.execute(
        select(Rule).where(Rule.user_id == current_user.id).order_by(
            Rule.created_at.desc())
    )
    rules = result.scalars().all()
    return [RuleResponse.model_validate(rule) for rule in rules]


@router.post("", response_model=RuleResponse, status_code=status.HTTP_201_CREATED)
async def create_rule(
    rule_data: RuleCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> RuleResponse:
    """
    Create a new rule for the authenticated user.
    """
    new_rule = Rule(
        user_id=current_user.id,
        url_pattern=rule_data.url_pattern,
        keep_selectors=rule_data.keep_selectors,
        ignore_selectors=rule_data.ignore_selectors,
        enabled=rule_data.enabled,
        auto_extract=rule_data.auto_extract
    )
    db.add(new_rule)
    await db.flush()
    await db.refresh(new_rule)

    return RuleResponse.model_validate(new_rule)


@router.get("/{rule_id}", response_model=RuleResponse)
async def get_rule(
    rule_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> RuleResponse:
    """
    Get a specific rule by ID (must be owned by the authenticated user).
    """
    result = await db.execute(select(Rule).where(Rule.id == rule_id))
    rule = result.scalar_one_or_none()

    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rule not found"
        )

    if rule.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this rule"
        )

    return RuleResponse.model_validate(rule)


@router.put("/{rule_id}", response_model=RuleResponse)
async def update_rule(
    rule_id: int,
    rule_data: RuleUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> RuleResponse:
    """
    Update a rule by ID (must be owned by the authenticated user).
    """
    result = await db.execute(select(Rule).where(Rule.id == rule_id))
    rule = result.scalar_one_or_none()

    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rule not found"
        )

    if rule.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this rule"
        )

    # Update only provided fields
    update_data = rule_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(rule, field, value)

    await db.flush()
    await db.refresh(rule)

    return RuleResponse.model_validate(rule)


@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rule(
    rule_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> None:
    """
    Delete a rule by ID (must be owned by the authenticated user).
    """
    result = await db.execute(select(Rule).where(Rule.id == rule_id))
    rule = result.scalar_one_or_none()

    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rule not found"
        )

    if rule.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this rule"
        )

    await db.delete(rule)
