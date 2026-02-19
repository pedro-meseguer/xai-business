from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_me_requires_key():
    r = client.get("/v1/me")
    assert r.status_code in (403, 401)

def test_me_ok_with_key():
    r = client.get("/v1/me", headers={"X-API-Key": "dev-secret"})
    assert r.status_code == 200
    assert "tenant_id" in r.json()
