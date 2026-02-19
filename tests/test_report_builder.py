from types import SimpleNamespace
from app.services.report_builder import build_report_schema_v1

def test_report_builder_fills_sections_and_evidence():
    de = SimpleNamespace(
        id="de_1",
        decision_id="dec_1",
        occurred_at="2026-02-12T20:00:00Z",
        model_id="m1",
        model_version="1.0.0",
        final_decision={"label": "denied"},
    )
    ex = SimpleNamespace(
        id="ex_1",
        evidence={
            "type": "stub",
            "main_factors": [{"feature": "income", "direction": "positive", "importance": 0.3}],
        },
    )

    rpt = build_report_schema_v1(template_id="generic_v1", de=de, ex=ex)
    assert len(rpt.sections) > 0
    assert len(rpt.evidence_items) > 0
