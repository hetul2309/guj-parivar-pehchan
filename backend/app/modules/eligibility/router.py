from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.core.db import get_db, Family
from backend.app.core.auth import current_user, require_role, AppUser
from backend.app.modules.eligibility.models import Scheme
from backend.app.modules.eligibility.service import (
    evaluate_family_eligibility,
    draft_rule_with_gemini,
    get_family_eval_context
)
from backend.app.modules.eligibility.evaluator import evaluate_rule, validate_rule_variables

# Notice: we provide routes at both /schemes and /families/{id}/eligibility
router = APIRouter(tags=["M4 Eligibility Engine"])

class SchemeCreate(BaseModel):
    scheme_id: str
    name_en: str
    name_gu: str
    name_hi: str
    department: str
    description: Optional[str] = None
    level: str = "person"
    rule: Dict[str, Any]
    required_docs: List[str] = []
    benefit_value: int = 0
    status: str = "draft"
    source_text: Optional[str] = None

class SchemeUpdate(BaseModel):
    name_en: Optional[str] = None
    name_gu: Optional[str] = None
    name_hi: Optional[str] = None
    department: Optional[str] = None
    description: Optional[str] = None
    level: Optional[str] = None
    rule: Optional[Dict[str, Any]] = None
    required_docs: Optional[List[str]] = None
    benefit_value: Optional[int] = None
    status: Optional[str] = None

class DraftRuleRequest(BaseModel):
    source_text: str

class TestRuleRequest(BaseModel):
    family_id: str

@router.get("/families/{family_id}/eligibility")
def get_family_eligibility(
    family_id: str,
    db: Session = Depends(get_db),
    user: AppUser = Depends(current_user)
):
    """Frozen Contract: returns eligible schemes with bilingual explanations, missing docs, and rank."""
    return evaluate_family_eligibility(family_id, db, actor_id=user.user_id)

@router.get("/schemes")
def list_schemes(
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Frozen Contract: GET /schemes -> list schemes."""
    q = db.query(Scheme)
    if status:
        q = q.filter(Scheme.status == status)
    schemes = q.all()
    return [
        {
            "scheme_id": s.scheme_id,
            "name_en": s.name_en,
            "name_gu": s.name_gu,
            "name_hi": s.name_hi,
            "department": s.department,
            "description": s.description,
            "level": s.level,
            "benefit_value": s.benefit_value,
            "required_docs": s.required_docs,
            "rule": s.rule,
            "status": s.status
        }
        for s in schemes
    ]

@router.get("/schemes/{scheme_id}")
def get_scheme(
    scheme_id: str,
    db: Session = Depends(get_db)
):
    """Frozen Contract: GET /schemes/{scheme_id}."""
    scheme = db.query(Scheme).filter(Scheme.scheme_id == scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")
    return {
        "scheme_id": scheme.scheme_id,
        "name_en": scheme.name_en,
        "name_gu": scheme.name_gu,
        "name_hi": scheme.name_hi,
        "department": scheme.department,
        "description": scheme.description,
        "level": scheme.level,
        "benefit_value": scheme.benefit_value,
        "required_docs": scheme.required_docs,
        "rule": scheme.rule,
        "status": scheme.status,
        "source_text": scheme.source_text
    }

@router.post("/schemes")
def create_scheme(
    data: SchemeCreate,
    db: Session = Depends(get_db),
    user: AppUser = Depends(require_role("dept_admin", "super_admin"))
):
    valid, errors = validate_rule_variables(data.rule)
    if not valid:
        raise HTTPException(status_code=400, detail=f"Rule validation error: {errors}")

    existing = db.query(Scheme).filter(Scheme.scheme_id == data.scheme_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Scheme ID already exists")

    scheme = Scheme(**data.dict())
    db.add(scheme)
    db.commit()
    db.refresh(scheme)
    return {"status": "created", "scheme_id": scheme.scheme_id}

@router.patch("/schemes/{scheme_id}")
def update_scheme(
    scheme_id: str,
    data: SchemeUpdate,
    db: Session = Depends(get_db),
    user: AppUser = Depends(require_role("dept_admin", "super_admin"))
):
    scheme = db.query(Scheme).filter(Scheme.scheme_id == scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")

    update_dict = data.dict(exclude_unset=True)
    if "rule" in update_dict and update_dict["rule"]:
        valid, errors = validate_rule_variables(update_dict["rule"])
        if not valid:
            raise HTTPException(status_code=400, detail=f"Rule validation error: {errors}")

    for k, v in update_dict.items():
        setattr(scheme, k, v)

    db.commit()
    return {"status": "updated", "scheme_id": scheme_id}

@router.post("/schemes/{scheme_id}/publish")
def publish_scheme(
    scheme_id: str,
    db: Session = Depends(get_db),
    user: AppUser = Depends(require_role("dept_admin", "super_admin"))
):
    scheme = db.query(Scheme).filter(Scheme.scheme_id == scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")

    scheme.status = "published"
    db.commit()

    # Recompute all families in background/batch
    families = db.query(Family).all()
    for f in families:
        try:
            evaluate_family_eligibility(f.family_id, db, actor_id=user.user_id)
        except Exception:
            pass

    return {"status": "published", "scheme_id": scheme_id}

@router.post("/schemes/draft-rule")
def draft_rule(
    req: DraftRuleRequest,
    user: AppUser = Depends(require_role("dept_admin", "super_admin"))
):
    """Admin endpoint to draft a rule from official text using Gemini."""
    return draft_rule_with_gemini(req.source_text)

@router.post("/schemes/{scheme_id}/test")
def test_scheme_against_family(
    scheme_id: str,
    req: TestRuleRequest,
    db: Session = Depends(get_db),
    user: AppUser = Depends(current_user)
):
    """Tests a scheme's rule against a specific family and returns pass/fail for every clause."""
    scheme = db.query(Scheme).filter(Scheme.scheme_id == scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")

    family = db.query(Family).filter(Family.family_id == req.family_id).first()
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")

    ctx = get_family_eval_context(family, db)
    combined = {
        "family": ctx["family"],
        "geo": ctx["geo"],
        "person": ctx["members"][0] if ctx["members"] else {}
    }

    passed, reasons = evaluate_rule(scheme.rule, combined)
    return {
        "scheme_id": scheme_id,
        "family_id": req.family_id,
        "eligible": passed,
        "reasons": reasons,
        "context_snapshot": combined
    }
