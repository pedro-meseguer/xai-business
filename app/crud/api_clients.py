from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.api_client import ApiClient


def get_by_key_hash(db: Session, *, api_key_hash: str) -> ApiClient | None:
    stmt = select(ApiClient).where(ApiClient.api_key_hash == api_key_hash)
    return db.execute(stmt).scalars().first()
