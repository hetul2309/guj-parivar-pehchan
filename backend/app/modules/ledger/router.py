from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.app.core.db import get_db
from backend.app.core.auth import current_user, require_role, AppUser
from backend.app.modules.ledger.models import AccessLog, ConsentRevocation
from backend.app.modules.ledger.service import verify_chain, revoke_family_consent, unrevoke_family_consent

router = APIRouter(prefix="/ledger", tags=["M7 Consent & Access Ledger"])

class RevokeRequest(BaseModel):
    dept: str
    purpose: str

@router.get("/families/{family_id}")
def get_family_ledger(
    family_id: str,
    db: Session = Depends(get_db),
    user: AppUser = Depends(current_user)
):
    """Returns access log and active revocations for a family."""
    logs = db.query(AccessLog).filter(AccessLog.family_id == family_id).order_by(AccessLog.ts.desc()).all()
    revocations = db.query(ConsentRevocation).filter(ConsentRevocation.family_id == family_id).all()
    
    return {
        "family_id": family_id,
        "logs": [
            {
                "id": l.id,
                "actor_id": l.actor_id,
                "actor_role": l.actor_role,
                "dept": l.dept,
                "purpose": l.purpose,
                "fields": l.fields,
                "ts": l.ts.isoformat(),
                "hash": l.hash
            }
            for l in logs
        ],
        "revocations": [
            {
                "dept": r.dept,
                "purpose": r.purpose,
                "revoked_at": r.revoked_at.isoformat()
            }
            for r in revocations
        ]
    }

@router.post("/families/{family_id}/revoke")
def revoke_consent(
    family_id: str,
    req: RevokeRequest,
    db: Session = Depends(get_db),
    user: AppUser = Depends(current_user)
):
    """Citizen revokes optional consent for purpose."""
    try:
        rev = revoke_family_consent(db, family_id, req.dept, req.purpose)
        return {
            "status": "success",
            "message": f"Consent for '{req.purpose}' to department '{req.dept}' has been revoked.",
            "revoked_at": rev.revoked_at.isoformat()
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/families/{family_id}/restore")
def restore_consent(
    family_id: str,
    req: RevokeRequest,
    db: Session = Depends(get_db),
    user: AppUser = Depends(current_user)
):
    """Citizen un-revokes consent."""
    success = unrevoke_family_consent(db, family_id, req.dept, req.purpose)
    return {"status": "success" if success else "not_found"}

@router.get("/verify")
def check_chain_integrity(
    db: Session = Depends(get_db),
    user: AppUser = Depends(require_role("super_admin", "dept_admin", "officer"))
):
    """Walks the full hash chain to verify tamper-evidence."""
    return verify_chain(db)

@router.get("")
def query_access_logs(
    actor_id: Optional[str] = Query(None),
    family_id: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
    user: AppUser = Depends(require_role("super_admin", "dept_admin"))
):
    """Admin endpoint to query ledger logs."""
    q = db.query(AccessLog)
    if actor_id:
        q = q.filter(AccessLog.actor_id == actor_id)
    if family_id:
        q = q.filter(AccessLog.family_id == family_id)
    logs = q.order_by(AccessLog.id.desc()).limit(limit).all()
    return [
        {
            "id": l.id,
            "actor_id": l.actor_id,
            "actor_role": l.actor_role,
            "dept": l.dept,
            "family_id": l.family_id,
            "purpose": l.purpose,
            "fields": l.fields,
            "ts": l.ts.isoformat(),
            "prev_hash": l.prev_hash,
            "hash": l.hash
        }
        for l in logs
    ]
