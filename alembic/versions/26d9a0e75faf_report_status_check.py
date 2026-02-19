"""report status check

Revision ID: 26d9a0e75faf
Revises: 5b33babd424f
Create Date: 2026-02-13 18:25:37.785918

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '26d9a0e75faf'
down_revision: Union[str, Sequence[str], None] = '5b33babd424f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_check_constraint(
        "ck_reports_status",
        "reports",
        "status IN ('DRAFT','FINAL')",
    )

def downgrade() -> None:
    op.drop_constraint("ck_reports_status", "reports", type_="check")