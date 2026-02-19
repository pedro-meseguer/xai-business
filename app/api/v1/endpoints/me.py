from fastapi import APIRouter, Depends

from app.core.security import require_api_client

router = APIRouter(prefix="/me", tags=["me"])


@router.get("")
def me(client=Depends(require_api_client)):
    return {"tenant_id": client.tenant_id, "client_id": client.id, "enabled": client.enabled}
