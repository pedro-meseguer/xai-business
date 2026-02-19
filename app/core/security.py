# app/core/security.py
import hashlib
import hmac

from fastapi import Depends, HTTPException, Security, status
from fastapi.security import APIKeyHeader
from sqlalchemy.orm import Session

from app.crud.api_clients import get_by_key_hash
from app.db.session import SessionLocal

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


from typing import Generator
from sqlalchemy.orm import Session
from app.db.session import SessionLocal  # ajusta si tu SessionLocal está en otro sitio

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def hash_api_key(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def require_api_client(
    api_key: str | None = Security(api_key_header),
    db: Session = Depends(get_db),
):
    if not api_key:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Missing API key")

    key_hash = hash_api_key(api_key)
    client = get_by_key_hash(db, api_key_hash=key_hash)

    if not client or not client.enabled:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid API key")

    return client
