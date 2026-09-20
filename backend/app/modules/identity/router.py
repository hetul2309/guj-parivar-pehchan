import hashlib
import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.core.db import get_db
from backend.app.core.models import (
    Person, Family, FamilyMember, AadhaarVault, IdLink, NameReview, Document, FraudFlag, AppUser
)
from backend.app.core.auth import current_user, require_role
from backend.app.modules.identity.vault import encrypt_and_vault_aadhaar
from backend.app.modules.identity.name_matching import match_name
from backend.app.mocks.uidai.make_test_qr import decode_secure_qr, generate_test_qr_payload

router = APIRouter(prefix="/identity", tags=["M2 Identity Resolution"])

class QRRequest(BaseModel):
    qr_data: str

class OTPRequest(BaseModel):
    mobile: str
    aadhaar_last4: Optional[str] = None

class OTPVerifyRequest(BaseModel):
    mobile: str
    otp: str

class BiometricRequest(BaseModel):
    person_id: Optional[str] = None
    modality: str # 'fingerprint', 'iris', 'face', 'attestation'

class PanVerifyRequest(BaseModel):
    person_id: str
    pan: str

class RationLinkRequest(BaseModel):
    family_id: str
    card_no: str

class DigiLockerImportRequest(BaseModel):
    person_id: str

class NameReviewDecision(BaseModel):
    decision: str # 'accept' | 'reject'

# --- 1. Aadhaar Offline QR ---
@router.post("/aadhaar/qr")
def process_aadhaar_qr(payload: QRRequest, db: Session = Depends(get_db)):
    decoded = decode_secure_qr(payload.qr_data)
    if not decoded.get("valid"):
        raise HTTPException(status_code=400, detail="Invalid Aadhaar QR Code")
        
    # Encrypt and store in vault (synthetic 12-digit number derived from last4)
    dummy_aadhaar = f"99990000{decoded.get('aadhaar_last4', '8921')}"
    token, last4 = encrypt_and_vault_aadhaar(db, dummy_aadhaar)
    
    return {
        "success": True,
        "aadhaar_token": token,
        "aadhaar_last4": last4,
        "person_prefill": {
            "name_en": decoded.get("name_en"),
            "name_gu": decoded.get("name_gu"),
            "dob": decoded.get("dob"),
            "dob_precision": decoded.get("dob_precision", "exact"),
            "gender": decoded.get("gender"),
            "address": decoded.get("address"),
            "aadhaar_last4": last4
        }
    }

@router.get("/aadhaar/sample-qr")
def get_sample_qr():
    """Generates a test QR code string for quick demo testing."""
    qr_b64 = generate_test_qr_payload()
    return {"qr_data": qr_b64, "name": "Kantaben Patel"}

# --- 2. Aadhaar OTP e-KYC Mock ---
@router.post("/aadhaar/otp/send")
def send_aadhaar_otp(payload: OTPRequest):
    return {"success": True, "message": "OTP sent to Aadhaar-linked mobile (Demo OTP: 123456)"}

@router.post("/aadhaar/otp/verify")
def verify_aadhaar_otp(payload: OTPVerifyRequest, db: Session = Depends(get_db)):
    if payload.otp != "123456":
        raise HTTPException(status_code=400, detail="Invalid OTP. Use demo OTP 123456.")
    
    token, last4 = encrypt_and_vault_aadhaar(db, "999900001234")
    return {
        "success": True,
        "aadhaar_token": token,
        "aadhaar_last4": last4,
        "person_prefill": {
            "name_en": "Kantaben Rameshbhai Patel",
            "name_gu": "કાન્તાબેન રમેશભાઈ પટેલ",
            "dob": "1964-01-01",
            "dob_precision": "year_only",
            "gender": "F",
            "address": "Dahod Rural, Dahod, Gujarat",
            "aadhaar_last4": last4
        }
    }

# --- 3. Biometric Mock (with bio_fail fallback) ---
@router.post("/aadhaar/biometric")
def verify_biometric(payload: BiometricRequest, db: Session = Depends(get_db)):
    if payload.person_id:
        person = db.query(Person).filter(Person.person_id == payload.person_id).first()
        if person and "elderly" in person.name_en.lower() and payload.modality == "fingerprint":
            return {
                "success": False,
                "error": "FINGERPRINT_NOT_MATCHED",
                "message": "Worn fingerprints detected. Please switch to Iris Scan or Face Recognition."
            }
            
    return {
        "success": True,
        "modality": payload.modality,
        "verified": True,
        "message": f"Biometric verification successful using {payload.modality}"
    }

# --- 4. PAN Verification Mock (Optional, flags ITR mismatch) ---
@router.post("/pan/verify")
def verify_pan(payload: PanVerifyRequest, db: Session = Depends(get_db)):
    pan_cleaned = payload.pan.strip().upper()
    pan_hash = hashlib.sha256(pan_cleaned.encode("utf-8")).hexdigest()
    
    person = db.query(Person).filter(Person.person_id == payload.person_id).first()
    if person:
        person.pan_hash = pan_hash
        db.commit()
        
    # Mock ITR check
    is_high_income = pan_cleaned.startswith("HIGH") or "999" in pan_cleaned
    if is_high_income and person:
        # Create fraud flag for income mismatch
        flag = FraudFlag(
            kind="income_mismatch",
            person_id=person.person_id,
            details={
                "pan_hash": pan_hash[:8] + "...",
                "declared_income": "Low/BPL",
                "itr_band": "Above ₹5,00,000"
            },
            status="open"
        )
        db.add(flag)
        db.commit()
        
    return {
        "verified": True,
        "pan_hash": pan_hash,
        "aadhaar_linked": True,
        "itr_filed": is_high_income,
        "income_band": "High (>5L)" if is_high_income else "Exempt/Nil"
    }

# --- 5. NFSA Ration Card Linking & Name Matching ---
@router.post("/ration/link")
def link_ration_card(payload: RationLinkRequest, db: Session = Depends(get_db)):
    # Mock NFSA database member names (mix of English and Gujarati)
    nfsa_members = [
        {"name": "Patel Rameshbhai Kanubhai", "relation": "Head"},
        {"name": "કાન્તાબેન રમેશભાઈ પટેલ", "relation": "Wife"},
        {"name": "પટેલ મહેશભાઈ રમેશભાઈ", "relation": "Son"}
    ]
    
    # Get current family members
    family_members = db.query(Person).join(
        FamilyMember, FamilyMember.person_id == Person.person_id
    ).filter(FamilyMember.family_id == payload.family_id).all()
    
    results = []
    for fm in family_members:
        best_score = 0
        best_match_name = None
        for rm in nfsa_members:
            score = match_name(fm.name_gu or fm.name_en, rm["name"])
            if score > best_score:
                best_score = score
                best_match_name = rm["name"]
                
        status_action = "auto_link" if best_score >= 85 else ("review" if best_score >= 70 else "reject")
        
        if status_action == "review":
            # Add to name_review queue for officer review
            review_entry = NameReview(
                person_id=fm.person_id,
                district_code="DAHOD",
                id_type="ration_card",
                name_a=fm.name_gu or fm.name_en,
                name_b=best_match_name or "",
                score=best_score,
                status="pending"
            )
            db.add(review_entry)
            
        # Store id_link
        link = IdLink(
            person_id=fm.person_id,
            id_type="ration_card",
            id_ref_hash=hashlib.sha256(payload.card_no.encode()).hexdigest(),
            verified=(status_action == "auto_link"),
            source="nfsa_mock",
            match_score=best_score
        )
        db.add(link)
        
        results.append({
            "person_id": fm.person_id,
            "person_name": fm.name_en,
            "ration_name": best_match_name,
            "score": best_score,
            "action": status_action
        })
        
    db.commit()
    return {"family_id": payload.family_id, "matches": results}

# --- 6. DigiLocker Import Mock ---
@router.post("/digilocker/import")
def import_digilocker_docs(payload: DigiLockerImportRequest, db: Session = Depends(get_db)):
    person = db.query(Person).filter(Person.person_id == payload.person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
        
    membership = db.query(FamilyMember).filter(FamilyMember.person_id == payload.person_id).first()
    family_id = membership.family_id if membership else "GJ-UNKNOWN"
    
    mock_docs = [
        {"doc_type": "income_cert", "file_path": "/mock/digilocker/income_cert_2026.pdf"},
        {"doc_type": "caste_cert", "file_path": "/mock/digilocker/caste_cert_sebc.pdf"}
    ]
    
    imported = []
    for md in mock_docs:
        doc = Document(
            person_id=person.person_id,
            family_id=family_id,
            doc_type=md["doc_type"],
            file_path=md["file_path"],
            status="verified",
            source="digilocker",
            name_match_score=98
        )
        db.add(doc)
        imported.append({"doc_type": md["doc_type"], "status": "verified", "source": "digilocker"})
        
    db.commit()
    return {"person_id": person.person_id, "imported_documents": imported}

# --- 7. Officer Name Review Queue ---
@router.get("/review-queue")
def get_name_review_queue(
    user: AppUser = Depends(require_role("officer", "super_admin")),
    db: Session = Depends(get_db)
):
    query = db.query(NameReview).filter(NameReview.status == "pending")
    if user.district_code:
        query = query.filter(NameReview.district_code == user.district_code)
    reviews = query.order_by(NameReview.created_at.desc()).all()
    return [
        {
            "id": r.id,
            "person_id": r.person_id,
            "id_type": r.id_type,
            "name_a": r.name_a,
            "name_b": r.name_b,
            "score": r.score,
            "status": r.status,
            "created_at": r.created_at.isoformat() if r.created_at else None
        }
        for r in reviews
    ]

@router.post("/review/{review_id}")
def decide_name_review(
    review_id: str,
    payload: NameReviewDecision,
    user: AppUser = Depends(require_role("officer", "super_admin")),
    db: Session = Depends(get_db)
):
    review = db.query(NameReview).filter(NameReview.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review entry not found")
        
    review.status = "accepted" if payload.decision == "accept" else "rejected"
    review.decided_by = user.user_id
    db.commit()
    return {"id": review.id, "status": review.status, "decided_by": user.user_id}
