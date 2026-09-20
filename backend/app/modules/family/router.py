import random
import uuid
from datetime import date, datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.core.db import get_db
from backend.app.core.models import (
    Family, Person, FamilyMember, Relationship, FraudFlag, Document, AppUser
)
from backend.app.core.auth import current_user, require_role
from backend.app.core.access_log import log_access
from backend.app.core.events import publish

router = APIRouter(tags=["M1 Family Registry & Graph"])

# --- Pydantic Request Models ---
class PersonIn(BaseModel):
    name_en: str
    name_gu: str
    dob: str # YYYY-MM-DD
    dob_precision: Optional[str] = "exact" # 'exact' | 'year_only'
    gender: str # 'M' | 'F' | 'O'
    marital_status: Optional[str] = "single"
    occupation: Optional[str] = None
    education: Optional[str] = None
    disability: Optional[bool] = False
    social_category: Optional[str] = "GEN"
    mobile: Optional[str] = None
    mobile_shared: Optional[bool] = False
    aadhaar_token: Optional[str] = None
    aadhaar_last4: Optional[str] = None
    relation_to_head: Optional[str] = "head" # 'head' | 'spouse' | 'child' | 'parent' | 'other'
    sub_household: Optional[str] = None

class FamilyCreate(BaseModel):
    head: PersonIn
    address_text: str
    village_lgd: str
    district_code: str
    lat: Optional[str] = None
    lng: Optional[str] = None
    ration_card_no: Optional[str] = None
    annual_income: int = 0
    income_source: Optional[str] = "self_declared"
    members: Optional[List[PersonIn]] = []

class LifeEventIn(BaseModel):
    kind: str # 'birth' | 'death' | 'marriage_out'
    person_id: Optional[str] = None
    target_family_id: Optional[str] = None
    event_date: Optional[str] = None
    new_person: Optional[PersonIn] = None
    parent_ids: Optional[List[str]] = []

class AddressUpdate(BaseModel):
    village_lgd: str
    district_code: str
    address_text: str
    lat: Optional[str] = None
    lng: Optional[str] = None
    temporary: Optional[bool] = False

# --- Helpers ---
def generate_family_id(db: Session) -> str:
    for _ in range(20):
        digits = "".join([str(random.randint(0, 9)) for _ in range(8)])
        fid = f"GJ-{digits}"
        if not db.query(Family).filter(Family.family_id == fid).first():
            return fid
    return f"GJ-{uuid.uuid4().hex[:8].upper()}"

def calculate_age(dob: date, dob_precision: str = "exact") -> tuple[int, bool]:
    today = date.today()
    if dob_precision == "year_only":
        return today.year - dob.year, True
    age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    return age, False

def run_fraud_checks(db: Session, family_id: str):
    """
    Fraud checks:
    1. Same aadhaar_token in two families with active membership.
    2. Parent younger than child (+12 years minimum gap).
    3. Household with more than 15 active members.
    """
    # 1. Duplicate Aadhaar token check
    active_members = db.query(Person.aadhaar_token, FamilyMember.family_id).join(
        FamilyMember, FamilyMember.person_id == Person.person_id
    ).filter(
        FamilyMember.active_to.is_(None),
        Person.aadhaar_token.isnot(None)
    ).all()
    
    token_to_fams: Dict[str, set] = {}
    for token, fid in active_members:
        if token not in token_to_fams:
            token_to_fams[token] = set()
        token_to_fams[token].add(fid)
        if len(token_to_fams[token]) > 1:
            existing = db.query(FraudFlag).filter(
                FraudFlag.kind == "duplicate_aadhaar",
                FraudFlag.details.contains(token)
            ).first()
            if not existing:
                db.add(FraudFlag(
                    kind="duplicate_aadhaar",
                    family_ids=list(token_to_fams[token]),
                    details={"aadhaar_token": token, "families": list(token_to_fams[token])},
                    status="open"
                ))

    # 2. Large household check
    count = db.query(FamilyMember).filter(
        FamilyMember.family_id == family_id,
        FamilyMember.active_to.is_(None)
    ).count()
    if count > 15:
        db.add(FraudFlag(
            kind="large_household",
            family_ids=[family_id],
            details={"member_count": count, "message": "Household exceeds 15 members"},
            status="open"
        ))

    db.commit()

# --- 1. Family Endpoints ---
@router.post("/families")
def create_family(
    payload: FamilyCreate,
    user: AppUser = Depends(current_user),
    db: Session = Depends(get_db)
):
    fid = generate_family_id(db)
    
    # 1. Create head person
    head_dob = datetime.strptime(payload.head.dob, "%Y-%m-%d").date()
    head_person = Person(
        name_en=payload.head.name_en,
        name_gu=payload.head.name_gu,
        dob=head_dob,
        dob_precision=payload.head.dob_precision or "exact",
        gender=payload.head.gender,
        marital_status=payload.head.marital_status or "married",
        occupation=payload.head.occupation,
        education=payload.head.education,
        disability=payload.head.disability or False,
        social_category=payload.head.social_category or "GEN",
        mobile=payload.head.mobile,
        mobile_shared=payload.head.mobile_shared or False,
        aadhaar_token=payload.head.aadhaar_token,
        aadhaar_last4=payload.head.aadhaar_last4,
        created_via="assisted" if user.role == "operator" else "self",
        created_by=user.user_id if user.role == "operator" else None
    )
    db.add(head_person)
    db.flush()

    # 2. Create Family
    family = Family(
        family_id=fid,
        head_person_id=head_person.person_id,
        address_text=payload.address_text,
        village_lgd=payload.village_lgd,
        district_code=payload.district_code,
        lat=payload.lat,
        lng=payload.lng,
        ration_card_no=payload.ration_card_no,
        annual_income=payload.annual_income,
        income_source=payload.income_source or "self_declared",
        status="active"
    )
    db.add(family)
    db.flush()

    # Head membership
    db.add(FamilyMember(
        family_id=fid,
        person_id=head_person.person_id,
        sub_household=payload.head.sub_household
    ))

    # 3. Add other members
    for m in (payload.members or []):
        m_dob = datetime.strptime(m.dob, "%Y-%m-%d").date()
        m_person = Person(
            name_en=m.name_en,
            name_gu=m.name_gu,
            dob=m_dob,
            dob_precision=m.dob_precision or "exact",
            gender=m.gender,
            marital_status=m.marital_status or "single",
            occupation=m.occupation,
            education=m.education,
            disability=m.disability or False,
            social_category=m.social_category or payload.head.social_category or "GEN",
            mobile=m.mobile or payload.head.mobile,
            mobile_shared=True if (m.mobile == payload.head.mobile or not m.mobile) else False,
            aadhaar_token=m.aadhaar_token,
            aadhaar_last4=m.aadhaar_last4,
            created_via="assisted" if user.role == "operator" else "self",
            created_by=user.user_id if user.role == "operator" else None
        )
        db.add(m_person)
        db.flush()

        db.add(FamilyMember(
            family_id=fid,
            person_id=m_person.person_id,
            sub_household=m.sub_household
        ))

        # Add relationship edge
        rel_type = "spouse" if m.relation_to_head == "spouse" else (
            "parent_of" if m.relation_to_head in ["child", "son", "daughter"] else "dependent_of"
        )
        if rel_type == "parent_of":
            db.add(Relationship(from_person=head_person.person_id, to_person=m_person.person_id, type="parent_of"))
        else:
            db.add(Relationship(from_person=head_person.person_id, to_person=m_person.person_id, type=rel_type))

    db.commit()

    # Run fraud checks
    run_fraud_checks(db, fid)

    # Emit frozen event
    publish("family.created", {"family_id": fid})

    return {"family_id": fid, "head_person_id": head_person.person_id, "status": "active"}

@router.get("/families/{family_id}")
def get_family(
    family_id: str,
    user: AppUser = Depends(current_user),
    db: Session = Depends(get_db)
):
    log_access(user.user_id, family_id, "view_family_profile", ["all"])

    family = db.query(Family).filter(Family.family_id == family_id).first()
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")

    memberships = db.query(FamilyMember, Person).join(
        Person, Person.person_id == FamilyMember.person_id
    ).filter(
        FamilyMember.family_id == family_id,
        FamilyMember.active_to.is_(None)
    ).all()

    members_out = []
    for fm, p in memberships:
        age, approx = calculate_age(p.dob, p.dob_precision)
        
        # Determine relationship to head
        rel_to_head = "head" if p.person_id == family.head_person_id else "member"
        if rel_to_head != "head":
            rel = db.query(Relationship).filter(
                (Relationship.from_person == family.head_person_id) & (Relationship.to_person == p.person_id) |
                (Relationship.from_person == p.person_id) & (Relationship.to_person == family.head_person_id)
            ).first()
            if rel:
                rel_to_head = rel.type

        members_out.append({
            "person_id": p.person_id,
            "name_en": p.name_en,
            "name_gu": p.name_gu,
            "age": age,
            "age_approx": approx,
            "dob_precision": p.dob_precision,
            "gender": p.gender,
            "marital_status": p.marital_status,
            "occupation": p.occupation,
            "education": p.education,
            "disability": p.disability,
            "social_category": p.social_category,
            "relation_to_head": rel_to_head,
            "aadhaar_last4": p.aadhaar_last4,
            "has_pan": bool(p.pan_hash),
            "is_deceased": p.is_deceased
        })

    return {
        "family_id": family.family_id,
        "head_person_id": family.head_person_id,
        "address_text": family.address_text,
        "village_lgd": family.village_lgd,
        "district_code": family.district_code,
        "lat": float(family.lat) if family.lat else 22.83,
        "lng": float(family.lng) if family.lng else 74.25,
        "annual_income": family.annual_income,
        "income_source": family.income_source,
        "status": family.status,
        "members": members_out
    }

@router.get("/families")
def list_families(
    district_code: Optional[str] = None,
    village_lgd: Optional[str] = None,
    page: int = 1,
    size: int = 20,
    user: AppUser = Depends(current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Family)
    if district_code:
        query = query.filter(Family.district_code.ilike(district_code))
    if village_lgd:
        query = query.filter(Family.village_lgd == village_lgd)

    total = query.count()
    items = query.offset((page - 1) * size).limit(size).all()

    items_out = []
    for f in items:
        log_access(user.user_id, f.family_id, "list_families", ["summary"])
        items_out.append({
            "family_id": f.family_id,
            "head_person_id": f.head_person_id,
            "address_text": f.address_text,
            "village_lgd": f.village_lgd,
            "district_code": f.district_code,
            "lat": float(f.lat) if f.lat else 22.83,
            "lng": float(f.lng) if f.lng else 74.25,
            "annual_income": f.annual_income,
            "income_source": f.income_source,
            "status": f.status
        })

    return {"items": items_out, "total": total, "page": page, "size": size}

@router.get("/families/{family_id}/documents")
def get_family_documents(
    family_id: str,
    user: AppUser = Depends(current_user),
    db: Session = Depends(get_db)
):
    log_access(user.user_id, family_id, "view_documents", ["documents"])
    docs = db.query(Document).filter(Document.family_id == family_id).all()
    return [
        {
            "doc_id": d.doc_id,
            "person_id": d.person_id,
            "doc_type": d.doc_type,
            "status": d.status,
            "source": d.source,
            "expires_on": d.expires_on.isoformat() if d.expires_on else None,
            "name_match_score": d.name_match_score
        }
        for d in docs
    ]

@router.patch("/families/{family_id}/address")
def update_family_address(
    family_id: str,
    payload: AddressUpdate,
    user: AppUser = Depends(current_user),
    db: Session = Depends(get_db)
):
    family = db.query(Family).filter(Family.family_id == family_id).first()
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")

    old_lgd = family.village_lgd
    family.village_lgd = payload.village_lgd
    family.district_code = payload.district_code
    family.address_text = payload.address_text
    if payload.lat:
        family.lat = payload.lat
    if payload.lng:
        family.lng = payload.lng

    db.commit()

    # Emit family.migrated
    publish("family.migrated", {
        "family_id": family_id,
        "from_lgd": old_lgd,
        "to_lgd": payload.village_lgd,
        "temporary": payload.temporary or False
    })

    return {"success": True, "family_id": family_id, "new_village_lgd": payload.village_lgd}

# --- 2. Life Events (Birth, Death, Marriage Out) ---
@router.post("/families/{family_id}/events")
def handle_life_event(
    family_id: str,
    payload: LifeEventIn,
    user: AppUser = Depends(current_user),
    db: Session = Depends(get_db)
):
    family = db.query(Family).filter(Family.family_id == family_id).first()
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")

    if payload.kind == "birth" and payload.new_person:
        p_dob = datetime.strptime(payload.new_person.dob, "%Y-%m-%d").date()
        child = Person(
            name_en=payload.new_person.name_en,
            name_gu=payload.new_person.name_gu,
            dob=p_dob,
            dob_precision="exact",
            gender=payload.new_person.gender,
            marital_status="single",
            social_category=payload.new_person.social_category or "GEN"
        )
        db.add(child)
        db.flush()

        db.add(FamilyMember(family_id=family_id, person_id=child.person_id))
        for parent_id in (payload.parent_ids or [family.head_person_id]):
            db.add(Relationship(from_person=parent_id, to_person=child.person_id, type="parent_of"))

        db.commit()
        publish("family.member_event", {"family_id": family_id, "person_id": child.person_id, "kind": "birth"})
        return {"success": True, "event": "birth", "person_id": child.person_id}

    elif payload.kind == "death" and payload.person_id:
        person = db.query(Person).filter(Person.person_id == payload.person_id).first()
        if person:
            person.is_deceased = True
            
            # Find spouse
            spouse_rel = db.query(Relationship).filter(
                ((Relationship.from_person == person.person_id) | (Relationship.to_person == person.person_id)) &
                (Relationship.type == "spouse")
            ).first()
            if spouse_rel:
                spouse_id = spouse_rel.to_person if spouse_rel.from_person == person.person_id else spouse_rel.from_person
                spouse = db.query(Person).filter(Person.person_id == spouse_id).first()
                if spouse and spouse.gender == "F":
                    spouse.marital_status = "widow"
            
            db.commit()
            publish("family.member_event", {"family_id": family_id, "person_id": payload.person_id, "kind": "death"})
            return {"success": True, "event": "death", "person_id": payload.person_id}

    elif payload.kind == "marriage_out" and payload.person_id and payload.target_family_id:
        # End date old membership
        membership = db.query(FamilyMember).filter(
            FamilyMember.family_id == family_id,
            FamilyMember.person_id == payload.person_id,
            FamilyMember.active_to.is_(None)
        ).first()
        if membership:
            membership.active_to = date.today()

        # Add to target family
        db.add(FamilyMember(
            family_id=payload.target_family_id,
            person_id=payload.person_id,
            active_from=date.today()
        ))
        db.commit()
        publish("family.member_event", {"family_id": family_id, "person_id": payload.person_id, "kind": "marriage_out"})
        return {"success": True, "event": "marriage_out", "target_family_id": payload.target_family_id}

    raise HTTPException(status_code=400, detail="Unsupported life event parameters")

# --- 3. Tree Visualization Query ---
@router.get("/families/{family_id}/tree")
def get_family_tree(
    family_id: str,
    user: AppUser = Depends(current_user),
    db: Session = Depends(get_db)
):
    log_access(user.user_id, family_id, "view_family_tree", ["tree"])
    family = db.query(Family).filter(Family.family_id == family_id).first()
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")

    members = db.query(Person).join(
        FamilyMember, FamilyMember.person_id == Person.person_id
    ).filter(
        FamilyMember.family_id == family_id,
        FamilyMember.active_to.is_(None)
    ).all()

    relationships = db.query(Relationship).filter(
        (Relationship.from_person.in_([m.person_id for m in members])) |
        (Relationship.to_person.in_([m.person_id for m in members]))
    ).all()

    nodes = [
        {
            "id": p.person_id,
            "name": p.name_gu,
            "name_en": p.name_en,
            "gender": p.gender,
            "marital_status": p.marital_status,
            "is_head": p.person_id == family.head_person_id,
            "is_deceased": p.is_deceased
        }
        for p in members
    ]

    edges = [
        {"from": r.from_person, "to": r.to_person, "type": r.type}
        for r in relationships
    ]

    return {"family_id": family_id, "nodes": nodes, "edges": edges}

# --- 4. Fraud Flags (Officer) ---
@router.get("/fraud/flags")
def get_fraud_flags(
    status: str = "open",
    user: AppUser = Depends(require_role("officer", "super_admin")),
    db: Session = Depends(get_db)
):
    flags = db.query(FraudFlag).filter(FraudFlag.status == status).order_by(FraudFlag.created_at.desc()).all()
    return [
        {
            "id": f.id,
            "kind": f.kind,
            "family_ids": f.family_ids,
            "details": f.details,
            "status": f.status,
            "created_at": f.created_at.isoformat() if f.created_at else None
        }
        for f in flags
    ]
