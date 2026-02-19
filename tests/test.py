from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_revisions_flow():
    r = client.post("/v1/reports", headers={"X-API-Key": "dev_secret"}, json={
        "decision_event_id": "...",
        "explanation_id": "...",
        "template_id": "generic_v1",
    })
    assert r.status_code == 200
    report_id = r.json()["report_id"]

    revs = client.get(f"/v1/reports/{report_id}/revisions", headers={"X-API-Key": "dev_secret"})
    assert revs.status_code == 200
    assert revs.json()["total"] >= 1
