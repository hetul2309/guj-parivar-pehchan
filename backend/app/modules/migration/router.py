from typing import Optional
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.core.db import get_db
from backend.app.core.auth import current_user, AppUser
from backend.app.modules.migration.models import MigrationTask, FamilyRationAssignment
from backend.app.modules.migration.service import process_migration

router = APIRouter(prefix="/migration", tags=["M8 Migration & Benefit Portability"])

class SimulateMigrationRequest(BaseModel):
    family_id: str
    from_lgd: str
    to_lgd: str
    temporary: bool = False

@router.get("/tasks")
def list_migration_tasks(
    family_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user: AppUser = Depends(current_user)
):
    q = db.query(MigrationTask)
    if family_id:
        q = q.filter(MigrationTask.family_id == family_id)
    if status:
        q = q.filter(MigrationTask.status == status)
    tasks = q.order_by(MigrationTask.created_at.desc()).all()
    return [
        {
            "id": t.id,
            "family_id": t.family_id,
            "kind": t.kind,
            "status": t.status,
            "details": t.details,
            "created_at": t.created_at.isoformat()
        }
        for t in tasks
    ]

@router.get("/ration-assignments/{family_id}")
def get_ration_assignments(
    family_id: str,
    db: Session = Depends(get_db),
    user: AppUser = Depends(current_user)
):
    assignments = db.query(FamilyRationAssignment).filter(
        FamilyRationAssignment.family_id == family_id
    ).order_by(FamilyRationAssignment.id.desc()).all()
    return [
        {
            "id": a.id,
            "family_id": a.family_id,
            "facility_id": a.facility_id,
            "facility_name": a.facility_name,
            "is_temporary": a.is_temporary,
            "active_from": a.active_from.isoformat() if a.active_from else None,
            "active_to": a.active_to.isoformat() if a.active_to else None
        }
        for a in assignments
    ]

@router.post("/simulate")
def simulate_migration(
    req: SimulateMigrationRequest,
    db: Session = Depends(get_db),
    user: AppUser = Depends(current_user)
):
    """Simulates address change and migration event."""
    return process_migration(req.dict(), db)
