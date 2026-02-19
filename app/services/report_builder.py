from __future__ import annotations

from app.schemas.report_schema_v1 import ReportSchemaV1


def build_report_raw_v1(*, template_id: str, de, ex) -> dict:
    main_factors = (ex.evidence or {}).get("main_factors", [])

    evidence_items = [
        {"id": f"mf_{i}", "kind": "main_factor", "payload": f}
        for i, f in enumerate(main_factors)
    ]

    # Fallback para que el resumen no salga vacío si no hay label
    label = (de.final_decision or {}).get("label")
    if not label:
        label = str(de.final_decision)

    sections = [
        {
            "id": "summary",
            "title": "Resumen",
            "blocks": [
                {"type": "text", "text": f"Decisión: {label}.", "evidence_ids": []}
            ],
        },
        {
            "id": "main_factors",
            "title": "Factores principales",
            "blocks": [
                {
                    "type": "list",
                    "items": [
                        {
                            "text": f"{f.get('feature')} ({f.get('direction')}, importancia {f.get('importance')})",
                            "evidence_ids": [f"mf_{i}"],
                        }
                        for i, f in enumerate(main_factors)
                    ],
                }
            ],
        },
    ]

    return {
        "schema_version": "1.0",
        "template_id": template_id,
        "decision_event_id": de.id,
        "explanation_id": ex.id,
        "facts": {
            "decision_id": de.decision_id,
            "occurred_at": de.occurred_at,
            "model": {"model_id": de.model_id, "model_version": de.model_version},
            "final_decision": de.final_decision,
        },
        "explanation": ex.evidence,
        "sections": sections,
        "evidence_items": evidence_items,
    }


def build_report_schema_v1(*, template_id: str, de, ex) -> ReportSchemaV1:
    raw = build_report_raw_v1(template_id=template_id, de=de, ex=ex)
    return ReportSchemaV1.model_validate(raw)
