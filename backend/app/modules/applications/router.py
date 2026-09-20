import os
import uuid
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.core.db import get_db
from backend.app.core.models import (
    Application, Document, ApplicationHistory, Family, Person, FamilyMember, AppUser
)
from backend.app.core.auth import current_user, require_role
from backend.app.core.events import publish, subscribe
from backend.app.core.sms import send_sms
from backend.app.core.notify import notify
from backend.app.modules.identity.name_matching import match_name

router = APIRouter(tags=["M5 Applications & Documents"])


# Upload directory
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

class ApplicationCreate(BaseModel):
    family_id: str
    scheme_id: str
    applicant_person_id: str
    consent_id: Optional[str] = None

class ApplicationDecision(BaseModel):
    decision: str # "approve" | "reject" | "request_reupload" | "disburse"
    reason_code: Optional[str] = None # INCOME_CERT_EXPIRED, INCOME_ABOVE_LIMIT, DOC_NAME_MISMATCH, etc.
    note: Optional[str] = None

VALID_TRANSITIONS = {
    "draft": ["submitted"],
    "submitted": ["under_verification", "approved", "rejected"],
    "under_verification": ["approved", "rejected", "request_reupload"],
    "approved": ["disbursed"],
    "rejected": ["submitted"], # resubmit
    "request_reupload": ["submitted"],
    "disbursed": []
}

# --- Event Subscriber for Status Changes ---
@subscribe("application.status_changed")
def handle_application_status_changed(payload: dict):
    app_id = payload.get("application_id")
    status = payload.get("status")
    scheme_id = payload.get("scheme_id")
    mobile = payload.get("mobile")
    name_gu = payload.get("name_gu", "નાગરિક")
    reason_code = payload.get("reason_code")

    scheme_name = scheme_id
    for s in SAMPLE_SCHEMES:
        if s["scheme_id"] == scheme_id:
            scheme_name = s["name_gu"]
            break

    if status == "submitted":
        if mobile:
            send_sms(mobile, "sms.application_submitted", "gu", application_id=app_id, scheme_name=scheme_name)
    elif status == "approved":
        if mobile:
            send_sms(mobile, "sms.application_approved", "gu", application_id=app_id, scheme_name=scheme_name)
        notify("sms.application_approved", user_id=None, role="citizen", application_id=app_id, scheme_name=scheme_name)
    elif status == "disbursed":
        if mobile:
            send_sms(mobile, "sms.application_disbursed", "gu", scheme_name=scheme_name, amount="1,250")
    elif status == "rejected":
        reason_map = {
            "INCOME_CERT_EXPIRED": "આવકનો દાખલો જૂનો/અમાન્ય છે",
            "INCOME_ABOVE_LIMIT": "વાર્ષિક આવક યોજના મર્યાદા કરતા વધારે છે",
            "DOC_NAME_MISMATCH": "દસ્તાવેજમાં નામ અને આધાર નામમાં તફાવત છે",
            "DOC_ILLEGIBLE": "દસ્તાવેજ સ્પષ્ટ વંચાતો નથી",
            "NOT_ELIGIBLE_AGE": "ઉંમર પાત્રતા શરત પૂર્ણ કરતી નથી",
            "MISSING_DOCUMENT": "જરૂરી આધાર પુરાવા ખૂટે છે",
            "OTHER": "અન્ય શરતો પૂર્ણ થયેલ નથી"
        }
        reason_text = reason_map.get(reason_code, "શરતો પૂર્ણ થયેલ નથી")
        if mobile:
            send_sms(mobile, "sms.application_rejected", "gu", application_id=app_id, reason=reason_text)

# --- 1. Applications CRUD & Wizard ---
@router.post("/applications")
def create_application(
    payload: ApplicationCreate,
    user: AppUser = Depends(current_user),
    db: Session = Depends(get_db)
):
    # Verify applicant belongs to family
    applicant = db.query(Person).filter(Person.person_id == payload.applicant_person_id).first()
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant person not found")

    app_id = f"APP-{uuid.uuid4().hex[:8].upper()}"
    app_obj = Application(
        application_id=app_id,
        family_id=payload.family_id,
        scheme_id=payload.scheme_id,
        applicant_person_id=payload.applicant_person_id,
        status="draft",
        created_via="assisted" if user.role == "operator" else "self",
        consent_id=payload.consent_id
    )
    db.add(app_obj)

    # Auto-attach existing verified documents for this person/family
    existing_docs = db.query(Document).filter(
        (Document.person_id == payload.applicant_person_id) |
        (Document.family_id == payload.family_id)
    ).all()
    
    # Scheme required docs
    from backend.app.modules.eligibility.models import Scheme
    scheme_obj = db.query(Scheme).filter(Scheme.scheme_id == payload.scheme_id).first()
    req_docs = scheme_obj.required_docs if (scheme_obj and scheme_obj.required_docs) else []


    auto_attached = []
    for d in existing_docs:
        if d.doc_type in req_docs and d.status == "verified":
            auto_attached.append(d.doc_type)

    # Record history
    db.add(ApplicationHistory(
        application_id=app_id,
        from_status=None,
        to_status="draft",
        actor_id=user.user_id,
        note=f"Created application for {payload.scheme_id}"
    ))

    db.commit()
    return {
        "application_id": app_id,
        "status": "draft",
        "required_docs": req_docs,
        "auto_attached_docs": auto_attached,
        "missing_docs": [r for r in req_docs if r not in auto_attached]
    }

@router.post("/applications/{application_id}/submit")
def submit_application(
    application_id: str,
    user: AppUser = Depends(current_user),
    db: Session = Depends(get_db)
):
    app_obj = db.query(Application).filter(Application.application_id == application_id).first()
    if not app_obj:
        raise HTTPException(status_code=404, detail="Application not found")

    if app_obj.status not in ["draft", "rejected", "request_reupload"]:
        raise HTTPException(status_code=400, detail=f"Cannot submit application in status {app_obj.status}")

    prev_status = app_obj.status
    app_obj.status = "submitted"
    app_obj.submitted_at = datetime.utcnow()

    # Get applicant details for SMS
    applicant = db.query(Person).filter(Person.person_id == app_obj.applicant_person_id).first()

    db.add(ApplicationHistory(
        application_id=application_id,
        from_status=prev_status,
        to_status="submitted",
        actor_id=user.user_id,
        note="Application submitted for verification"
    ))
    db.commit()

    # Emit event
    publish("application.status_changed", {
        "application_id": application_id,
        "family_id": app_obj.family_id,
        "scheme_id": app_obj.scheme_id,
        "status": "submitted",
        "mobile": applicant.mobile if applicant else None,
        "name_gu": applicant.name_gu if applicant else "નાગરિક"
    })

    return {"application_id": application_id, "status": "submitted"}

# --- 2. Contract Decision Endpoint ---
@router.post("/applications/{application_id}/decision")
def decide_application(
    application_id: str,
    payload: ApplicationDecision,
    user: AppUser = Depends(require_role("officer", "super_admin")),
    db: Session = Depends(get_db)
):
    """
    Contract endpoint: POST /api/applications/{application_id}/decision
    body {decision: 'approve'|'reject'|'request_reupload'|'disburse', reason_code?, note?}
    """
    app_obj = db.query(Application).filter(Application.application_id == application_id).first()
    if not app_obj:
        raise HTTPException(status_code=404, detail="Application not found")

    decision_map = {
        "approve": "approved",
        "approved": "approved",
        "reject": "rejected",
        "rejected": "rejected",
        "request_reupload": "request_reupload",
        "disburse": "disbursed",
        "disbursed": "disbursed"
    }
    new_status = decision_map.get(payload.decision)

    if not new_status:
        raise HTTPException(status_code=400, detail="Invalid decision option")

    # Enforce state machine
    allowed = VALID_TRANSITIONS.get(app_obj.status, [])
    if new_status not in allowed and user.role != "super_admin":
        raise HTTPException(
            status_code=400,
            detail=f"Invalid transition from {app_obj.status} to {new_status}. Allowed: {allowed}"
        )

    prev_status = app_obj.status
    app_obj.status = new_status
    app_obj.reason_code = payload.reason_code
    app_obj.note = payload.note

    applicant = db.query(Person).filter(Person.person_id == app_obj.applicant_person_id).first()

    db.add(ApplicationHistory(
        application_id=application_id,
        from_status=prev_status,
        to_status=new_status,
        actor_id=user.user_id,
        reason_code=payload.reason_code,
        note=payload.note
    ))
    db.commit()

    # Emit event
    publish("application.status_changed", {
        "application_id": application_id,
        "family_id": app_obj.family_id,
        "scheme_id": app_obj.scheme_id,
        "status": new_status,
        "reason_code": payload.reason_code,
        "mobile": applicant.mobile if applicant else None,
        "name_gu": applicant.name_gu if applicant else "નાગરિક"
    })

    return {
        "application_id": application_id,
        "status": new_status,
        "reason_code": payload.reason_code,
        "note": payload.note
    }

# --- 3. Contract Applications List ---
@router.get("/applications")
def list_applications(
    district_code: Optional[str] = None,
    status: Optional[str] = None,
    scheme_id: Optional[str] = None,
    page: int = 1,
    size: int = 20,
    user: AppUser = Depends(current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Application)
    if status:
        query = query.filter(Application.status == status)
    if scheme_id:
        query = query.filter(Application.scheme_id == scheme_id)
    if district_code:
        # Join family
        query = query.join(Family, Family.family_id == Application.family_id).filter(
            Family.district_code.ilike(district_code)
        )

    total = query.count()
    apps = query.order_by(Application.updated_at.desc()).offset((page - 1) * size).limit(size).all()

    items = []
    for a in apps:
        docs = db.query(Document).filter(Document.family_id == a.family_id).all()
        items.append({
            "application_id": a.application_id,
            "family_id": a.family_id,
            "scheme_id": a.scheme_id,
            "applicant_person_id": a.applicant_person_id,
            "status": a.status,
            "reason_code": a.reason_code,
            "created_via": a.created_via,
            "submitted_at": a.submitted_at.isoformat() if a.submitted_at else None,
            "documents": [
                {
                    "doc_id": d.doc_id,
                    "type": d.doc_type,
                    "status": d.status,
                    "url": d.file_path,
                    "name_match_score": d.name_match_score
                }
                for d in docs
            ]
        })

    return {"items": items, "total": total, "page": page, "size": size}

@router.get("/citizen/applications")
def get_my_family_applications(
    family_id: Optional[str] = None,
    user: AppUser = Depends(current_user),
    db: Session = Depends(get_db)
):
    fid = family_id
    if not fid and user.person_id:
        fm = db.query(FamilyMember).filter(FamilyMember.person_id == user.person_id).first()
        if fm:
            fid = fm.family_id

    if not fid:
        # Default fallback to Kantaben's family
        kanta = db.query(Person).filter(Person.person_id == "p_kanta_ben").first()
        if kanta:
            fm = db.query(FamilyMember).filter(FamilyMember.person_id == kanta.person_id).first()
            if fm:
                fid = fm.family_id

    if not fid:
        return []

    apps = db.query(Application).filter(Application.family_id == fid).all()
    out = []
    for a in apps:
        hist = db.query(ApplicationHistory).filter(ApplicationHistory.application_id == a.application_id).order_by(ApplicationHistory.ts.asc()).all()
        out.append({
            "application_id": a.application_id,
            "family_id": a.family_id,
            "scheme_id": a.scheme_id,
            "status": a.status,
            "reason_code": a.reason_code,
            "note": a.note,
            "submitted_at": a.submitted_at.isoformat() if a.submitted_at else None,
            "history": [
                {"to_status": h.to_status, "note": h.note, "ts": h.ts.isoformat()}
                for h in hist
            ]
        })
    return out

# --- 4. Document Upload with Name Matching ---
@router.post("/applications/{application_id}/documents")
async def upload_document(
    application_id: str,
    doc_type: str = Form(...),
    doc_name: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    app_obj = db.query(Application).filter(Application.application_id == application_id).first()
    if not app_obj:
        raise HTTPException(status_code=404, detail="Application not found")

    file_ext = os.path.splitext(file.filename)[1] or ".pdf"
    saved_filename = f"{app_obj.family_id}_{doc_type}_{uuid.uuid4().hex[:6]}{file_ext}"
    saved_path = os.path.join(UPLOAD_DIR, saved_filename)

    content = await file.read()
    with open(saved_path, "wb") as f:
        f.write(content)

    # Calculate match score against applicant's name
    applicant = db.query(Person).filter(Person.person_id == app_obj.applicant_person_id).first()
    score = 95
    if doc_name and applicant:
        score = match_name(doc_name, applicant.name_gu or applicant.name_en)

    doc = Document(
        person_id=app_obj.applicant_person_id,
        family_id=app_obj.family_id,
        doc_type=doc_type,
        file_path=f"/uploads/{saved_filename}",
        status="verified" if score >= 85 else "pending",
        source="upload",
        name_match_score=score
    )
    db.add(doc)
    db.commit()

    return {
        "doc_id": doc.doc_id,
        "doc_type": doc_type,
        "status": doc.status,
        "name_match_score": score,
        "file_url": doc.file_path
    }
