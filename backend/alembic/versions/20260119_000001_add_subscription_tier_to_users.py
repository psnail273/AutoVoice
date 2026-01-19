"""Add subscription tier to users

Revision ID: 002
Revises: 001
Create Date: 2026-01-19 00:00:01.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'users',
        sa.Column(
            'subscription_tier',
            sa.String(length=20),
            nullable=False,
            server_default=sa.text("'free'")
        )
    )


def downgrade() -> None:
    op.drop_column('users', 'subscription_tier')
