from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.core.db import get_db, Family, Person, FamilyMember
from backend.app.core.auth import current_user, AppUser
from backend.app.core.sms import send_sms
from backend.app.core.access_log import log_access
from backend.app.modules.geo.service import get_nearest_facilities_for_coords
from backend.app.modules.health.models import HealthConsent, FamilyHealthHistory
from backend.app.modules.eligibility.service import calculate_age

router = APIRouter(prefix="/health", tags=["M11 Preventive-Health Nudges"])

class ConsentRequest(BaseModel):
    person_id: str

class HealthHistoryRequest(BaseModel):
    family_id: str
    condition: str
    relation: str

class TriggerNudgeRequest(BaseModel):
    person_id: str

@router.post("/consent")
def grant_health_consent(
    req: ConsentRequest,
    db: Session = Depends(get_db),
    user: AppUser = Depends(current_user)
):
    existing = db.query(HealthConsent).filter(HealthConsent.person_id == req.person_id).first()
    if not existing:
        c = HealthConsent(person_id=req.person_id)
        db.add(c)
        db.commit()
    return {"status": "success", "consented": True}

@router.post("/history")
def add_health_history(
    req: HealthHistoryRequest,
    db: Session = Depends(get_db),
    user: AppUser = Depends(current_user)
):
    h = FamilyHealthHistory(
        family_id=req.family_id,
        condition=req.condition.lower(),
        relation=req.relation.lower()
    )
    db.add(h)
    db.commit()
    return {"status": "success", "id": h.id}

@router.get("/nudges/{family_id}")
def check_health_nudges(
    family_id: str,
    db: Session = Depends(get_db),
    user: AppUser = Depends(current_user)
):
    """Evaluates rule-based health nudges for consented family members."""
    family = db.query(Family).filter(Family.family_id == family_id).first()
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")

    # Check health history
    history = db.query(FamilyHealthHistory).filter(FamilyHealthHistory.family_id == family_id).all()
    has_diabetes_hist = any(h.condition == "diabetes" for h in history)

    members = db.query(Person).join(
        FamilyMember, Person.person_id == FamilyMember.person_id
    ).filter(FamilyMember.family_id == family_id).all()

    lat = float(family.lat or 22.83)
    lng = float(family.lng or 74.25)
    nearest = get_nearest_facilities_for_coords(lat, lng, db)
    phc = next((f for f in nearest if f["facility_type"] == "phc"), None)
    phc_name = phc["name"] if phc else "Dahod Taluka PHC"

    nudges = []
    for m in members:
        consent = db.query(HealthConsent).filter(HealthConsent.person_id == m.person_id).first()
        if not consent:
            continue

        age = calculate_age(m.dob)
        if age >= 40 and has_diabetes_hist:
            nudges.append({
                "person_id": m.person_id,
                "name_en": m.name_en,
                "name_gu": m.name_gu,
                "nudge_type": "HBA1C_SCREENING",
                "nearest_phc": phc_name,
                "mock_slot": "Wednesday 10:00 AM - 12:00 PM",
                "message_gu": f"નમસ્તે {m.name_gu}, તમારી ઉંમર ({age}) અને પરિવારના ઈતિહાસ અનુસાર નજીકના પ્રાથમિક આરોગ્ય કેન્દ્ર ({phc_name}) ખાતે નિઃશુલ્ક ડાયાબિટીસ (HbA1c) તપાસ ઉપલબ્ધ છે."
            })

    return {"family_id": family_id, "nudges": nudges}

@router.post("/trigger-nudge")
def trigger_nudge(
    req: TriggerNudgeRequest,
    db: Session = Depends(get_db),
    user: AppUser = Depends(current_user)
):
    person = db.query(Person).filter(Person.person_id == req.person_id).first()
    if not person or not person.mobile:
        raise HTTPException(status_code=400, detail="Person or mobile not found")

    send_sms(person.mobile, "health_nudge_hba1c", lang="gu", name=person.name_gu, phc_name="Dahod PHC")
    return {"status": "dispatched", "mobile": person.mobile}
