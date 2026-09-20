import base64
import json
import time
import uuid
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

import nacl.signing
import nacl.encoding

from backend.app.core.db import get_db
from backend.app.core.models import (
    Family, Person, FamilyMember, EnrollmentConsent, SyncBatch, AppUser
)
from backend.app.core.auth import current_user, require_role
from backend.app.core.sms import send_sms
from backend.app.modules.family.router import FamilyCreate, create_family

router = APIRouter(tags=["M3 Assisted & QR Enrollment"])

# Fixed Ed25519 keypair for offline verification
# In production, seed is kept in HSM/secure env
_SEED = b"gujarat_family_id_seed_32bytes!!" # exactly 32 bytes
SIGNING_KEY = nacl.signing.SigningKey(_SEED)
VERIFY_KEY = SIGNING_KEY.verify_key
PUBLIC_KEY_HEX = VERIFY_KEY.encode(encoder=nacl.encoding.HexEncoder).decode("utf-8")

class OfflineSyncItem(BaseModel):
    client_uuid: str
    enrollment_data: FamilyCreate
    consent_method: str # 'aadhaar_otp' | 'aadhaar_qr' | 'thumb_mock'
    consent_proof: Optional[str] = None

class SyncBatchRequest(BaseModel):
    items: List[OfflineSyncItem]

class QRVerifyRequest(BaseModel):
    token: str

@router.get("/qr/public-key")
def get_qr_public_key():
    """Returns the Ed25519 public key in hex for offline client-side validation."""
    return {"public_key": PUBLIC_KEY_HEX, "algorithm": "Ed25519"}

def generate_signed_family_token(family_id: str) -> str:
    """Generates an Ed25519 signed token containing only {fid, iat}. Zero PII."""
    payload = {
        "fid": family_id,
        "iat": int(time.time()),
        "iss": "Gujarat-Family-ID-Authority"
    }
    raw_json = json.dumps(payload, separators=(',', ':')).encode("utf-8")
    signed = SIGNING_KEY.sign(raw_json)
    return base64.urlsafe_b64encode(signed).decode("utf-8")

def verify_family_token(token_str: str) -> tuple[bool, Optional[str]]:
    try:
        raw_signed = base64.urlsafe_b64decode(token_str.strip())
        verified_bytes = VERIFY_KEY.verify(raw_signed)
        data = json.loads(verified_bytes.decode("utf-8"))
        return True, data.get("fid")
    except Exception:
        return False, None

# --- 1. Offline Sync Batch Endpoint ---
@router.post("/enrollment/sync")
def sync_offline_enrollments(
    payload: SyncBatchRequest,
    user: AppUser = Depends(require_role("operator", "super_admin")),
    db: Session = Depends(get_db)
):
    results = []
    for item in payload.items:
        # Check idempotency
        existing_sync = db.query(SyncBatch).filter(SyncBatch.client_uuid == item.client_uuid).first()
        if existing_sync:
            results.append({
                "client_uuid": item.client_uuid,
                "status": "already_synced",
                "result": existing_sync.result
            })
            continue

        try:
            # Create family
            fam_result = create_family(item.enrollment_data, user=user, db=db)
            family_id = fam_result["family_id"]
            head_person_id = fam_result["head_person_id"]

            # Record assisted consent
            consent = EnrollmentConsent(
                person_id=head_person_id,
                method=item.consent_method,
                proof=item.consent_proof or f"Operator Verified: {user.user_id}",
                operator_id=user.user_id
            )
            db.add(consent)

            # Record sync batch
            sync_record = SyncBatch(
                client_uuid=item.client_uuid,
                operator_id=user.user_id,
                result={"family_id": family_id, "status": "success"}
            )
            db.add(sync_record)
            db.commit()

            # Send Gujarati SMS
            if item.enrollment_data.head.mobile:
                send_sms(
                    mobile=item.enrollment_data.head.mobile,
                    text_key="sms.enrollment_success",
                    lang="gu",
                    name=item.enrollment_data.head.name_gu,
                    family_id=family_id
                )

            results.append({
                "client_uuid": item.client_uuid,
                "status": "success",
                "family_id": family_id
            })
        except Exception as e:
            db.rollback()
            results.append({
                "client_uuid": item.client_uuid,
                "status": "conflict_or_error",
                "error": str(e)
            })

    return {"synced_count": len(results), "results": results}

# --- 2. QR Card Generation & Printable A6 View ---
@router.get("/families/{family_id}/card", response_class=HTMLResponse)
def get_printable_family_card(
    family_id: str,
    user: AppUser = Depends(current_user),
    db: Session = Depends(get_db)
):
    family = db.query(Family).filter(Family.family_id == family_id).first()
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")

    head = db.query(Person).filter(Person.person_id == family.head_person_id).first()
    head_name_gu = head.name_gu if head else "કુટુંબના વડા"
    head_name_en = head.name_en if head else "Family Head"

    token = generate_signed_family_token(family_id)

    # Return elegant A6 styled HTML card
    html_content = f"""
    <!DOCTYPE html>
    <html lang="gu">
    <head>
        <meta charset="UTF-8">
        <title>ગુજરાત ફેમિલી ઓળખપત્ર - {family_id}</title>
        <style>
            @page {{ size: A6 landscape; margin: 0; }}
            body {{
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                margin: 0;
                padding: 15px;
                background: #f8fafc;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 90vh;
            }}
            .card {{
                width: 140mm;
                height: 95mm;
                background: linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%);
                border: 2px solid #059669;
                border-radius: 12px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                padding: 12px 16px;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                position: relative;
            }}
            .header {{
                display: flex;
                align-items: center;
                justify-content: space-between;
                border-bottom: 2px solid #059669;
                padding-bottom: 6px;
            }}
            .title {{
                color: #065f46;
                font-size: 16px;
                font-weight: bold;
            }}
            .subtitle {{
                font-size: 11px;
                color: #4b5563;
            }}
            .content {{
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-top: 8px;
            }}
            .info {{
                flex: 1;
            }}
            .fid {{
                font-size: 22px;
                font-weight: 800;
                color: #047857;
                letter-spacing: 1px;
                margin: 6px 0;
            }}
            .field {{
                font-size: 12px;
                margin: 4px 0;
                color: #1f2937;
            }}
            .qr-box {{
                width: 100px;
                height: 100px;
                background: #ffffff;
                border: 1px solid #cbd5e1;
                border-radius: 8px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 4px;
            }}
            .qr-token {{
                font-size: 7px;
                word-break: break-all;
                color: #64748b;
                text-align: center;
                margin-top: 4px;
            }}
            .footer {{
                border-top: 1px dashed #94a3b8;
                padding-top: 4px;
                display: flex;
                justify-content: space-between;
                font-size: 9px;
                color: #64748b;
            }}
            @media print {{
                body {{ background: none; }}
                .no-print {{ display: none; }}
            }}
        </style>
    </head>
    <body>
        <div class="card">
            <div class="header">
                <div>
                    <div class="title">ગુજરાત ફેમિલી આઈડી પ્લેટફોર્મ</div>
                    <div class="subtitle">Government of Gujarat · Digital Identity Authority</div>
                </div>
                <div style="font-weight: bold; color: #b45309;">સત્તાવાર ઓળખપત્ર</div>
            </div>
            
            <div class="content">
                <div class="info">
                    <div class="field">કુટુંબ ઓળખ ક્રમાંક (Family ID):</div>
                    <div class="fid">{family_id}</div>
                    <div class="field"><strong>કુટુંબના વડા:</strong> {head_name_gu} ({head_name_en})</div>
                    <div class="field"><strong>ગામ કોડ:</strong> {family.village_lgd} · <strong>જિલ્લો:</strong> {family.district_code}</div>
                    <div class="field"><strong>સરનામું:</strong> {family.address_text}</div>
                </div>
                
                <div class="qr-box">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=90x90&data={token}" alt="QR Code" width="80" height="80" />
                    <div class="qr-token">Ed25519 Verified</div>
                </div>
            </div>
            
            <div class="footer">
                <div>આ કાર્ડમાં ફક્ત ડિજિટલ સહી કરેલ કુટુંબ નંબર છે. કોઈ અંગત ડેટા જાહેર નથી.</div>
                <div>તારીખ: {time.strftime('%d-%m-%Y')}</div>
            </div>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)

# --- 3. QR Verification Endpoint ---
@router.post("/qr/verify")
def verify_qr_token(
    payload: QRVerifyRequest,
    user: AppUser = Depends(require_role("operator", "officer", "super_admin")),
    db: Session = Depends(get_db)
):
    valid, family_id = verify_family_token(payload.token)
    if not valid or not family_id:
        raise HTTPException(status_code=400, detail="Invalid or tampered Family QR Code")

    family = db.query(Family).filter(Family.family_id == family_id).first()
    if not family:
        raise HTTPException(status_code=404, detail="Family record not found for this QR")

    head = db.query(Person).filter(Person.person_id == family.head_person_id).first()
    member_count = db.query(FamilyMember).filter(
        FamilyMember.family_id == family_id,
        FamilyMember.active_to.is_(None)
    ).count()

    return {
        "valid": True,
        "family_id": family_id,
        "head_name_gu": head.name_gu if head else "—",
        "head_name_en": head.name_en if head else "—",
        "district_code": family.district_code,
        "village_lgd": family.village_lgd,
        "active_members_count": member_count,
        "status": family.status
    }
