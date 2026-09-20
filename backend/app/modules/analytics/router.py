from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.core.db import get_db
from backend.app.core.auth import current_user, AppUser
from backend.app.modules.analytics.service import ask_text_to_sql, get_analytics_summary

router = APIRouter(prefix="/analytics", tags=["M10 Officer Analytics & Text-to-SQL"])

class AskRequest(BaseModel):
    question: str

@router.post("/ask")
def ask_question(
    req: AskRequest,
    db: Session = Depends(get_db),
    user: AppUser = Depends(current_user)
):
    """Frozen Contract: POST /analytics/ask -> natural language to SQL with safety check and auto chart hint."""
    try:
        officer_district = user.district_code if user.role == "officer" else None
        return ask_text_to_sql(
            question=req.question,
            officer_district=officer_district,
            actor_id=user.user_id,
            db=db
        )
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query execution failed: {e}")

@router.get("/summary")
def get_summary(
    district_code: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user: AppUser = Depends(current_user)
):
    """Frozen Contract: GET /analytics/summary -> dashboard KPI stats."""
    scope_district = user.district_code if user.role == "officer" else district_code
    return get_analytics_summary(scope_district, db)
