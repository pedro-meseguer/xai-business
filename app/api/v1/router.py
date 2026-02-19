from fastapi import APIRouter
from app.api.v1.endpoints.decision_events import router as decision_events_router
from app.api.v1.endpoints.me import router as me_router
from app.api.v1.endpoints.explanations import router as explanations_router
from app.api.v1.endpoints.reports import router as reports_router
from app.api.v1.endpoints.report_render import router as report_render_router

router = APIRouter(prefix="/v1")
router.include_router(decision_events_router)
router.include_router(me_router)
router.include_router(explanations_router)
router.include_router(reports_router)
router.include_router(report_render_router)