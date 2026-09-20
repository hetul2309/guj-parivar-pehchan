import os
import random
import uuid
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.core.db import get_db
from backend.app.core.models import (
    Grievance, GrievanceHistory, Application, Family, Person, FamilyMember, AppUser
)
from backend.app.core.auth import current_user, require_role
from backend.app.core.sms import send_sms
from backend.app.core.notify import notify

router = APIRouter(tags=["M9 Grievance & Appeal Assistant"])

class ChatMessage(BaseModel):
    role: str # 'user' | 'assistant'
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    lang: Optional[str] = "gu" # 'gu' | 'hi' | 'en'
    family_id: Optional[str] = None

class GrievanceCreate(BaseModel):
    category: str # 'wrong_rejection'|'delay'|'benefit_not_received'|'data_correction'|'officer_conduct'|'other'
    description: str
    application_id: Optional[str] = None
    lang: Optional[str] = "gu"
    family_id: Optional[str] = None

class GrievanceStatusUpdate(BaseModel):
    status: str # 'assigned' | 'under_investigation' | 'resolved'
    note: Optional[str] = None

REASON_EXPLANATIONS = {
    "INCOME_CERT_EXPIRED": {
        "gu": "તમારો આવકનો દાખલો જૂનો (એક્સપાયર) થઈ ગયો છે. નવો તલાટી કે મામલતદારનો દાખલો અપલોડ કરવો પડશે.",
        "hi": "आपका आय प्रमाण पत्र पुराना हो गया है। कृपया नया प्रमाण पत्र अपलोड करें।",
        "en": "Your income certificate has expired. Please upload a renewed certificate from the Talati or Mamlatdar."
    },
    "INCOME_ABOVE_LIMIT": {
        "gu": "તમારા કુટુંબની વાર્ષિક આવક યોજનાની નિર્ધારિત મર્યાદા (₹૧,૨૦,૦૦૦) કરતાં વધારે હોવાથી અરજી અમાન્ય છે.",
        "hi": "पारिवारिक आय योजना सीमा (₹1,20,000) से अधिक होने के कारण आवेदन अमान्य हुआ है।",
        "en": "Family annual income exceeds the maximum scheme ceiling of ₹1,20,000."
    },
    "DOC_NAME_MISMATCH": {
        "gu": "અપલોડ કરેલ દસ્તાવેજમાં લખેલ નામ અને આધાર કાર્ડના નામમાં તફાવત છે. કૃપા કરીને સુધારેલ દસ્તાવેજ મૂકો.",
        "hi": "दस्तावेज़ में दिए गए नाम और आधार नाम में अंतर है। कृपया सही दस्तावेज़ अपलोड करें।",
        "en": "Name mismatch between the uploaded document and Aadhaar record."
    },
    "DOC_ILLEGIBLE": {
        "gu": "દસ્તાવેજનો ફોટો ઝાંખો છે અને અક્ષરો વંચાતા નથી. કૃપા કરીને સ્પષ્ટ ફોટો ફરીથી અપલોડ કરો.",
        "hi": "दस्तावेज़ साफ़ नहीं दिख रहा है। कृपया स्पष्ट फ़ोटो दोबारा अपलोड करें।",
        "en": "The uploaded document is blurred or illegible. Please re-upload a clear copy."
    },
    "NOT_ELIGIBLE_AGE": {
        "gu": "અરજદારની ઉંમર યોજનાના નિયમ મુજબ લઘુત્તમ વય કરતાં ઓછી છે.",
        "hi": "आवेदक की आयु योजना के न्यूनतम नियम से कम है।",
        "en": "Applicant's age does not meet the minimum criteria for this scheme."
    }
}

def generate_grv_id(db: Session) -> str:
    for _ in range(20):
        digits = "".join([str(random.randint(0, 9)) for _ in range(5)])
        gid = f"GRV-{digits}"
        if not db.query(Grievance).filter(Grievance.grv_id == gid).first():
            return gid
    return f"GRV-{uuid.uuid4().hex[:5].upper()}"

# --- 1. Chatbot Engine (with intelligent deterministic fallback + tool calling) ---
@router.post("/grievance/chat")
def grievance_chat(
    payload: ChatRequest,
    user: AppUser = Depends(current_user),
    db: Session = Depends(get_db)
):
    lang = payload.lang or "gu"
    user_query = payload.messages[-1].content if payload.messages else ""
    user_query_lower = user_query.lower()

    # Determine user's family
    fid = payload.family_id
    if not fid:
        # Default fallback
        fid = "GJ-38915001"

    # Fetch user's applications
    apps = db.query(Application).filter(Application.family_id == fid).all()

    # Tool 1: Check if asking about rejection
    is_rejection_query = any(k in user_query_lower for k in ["reject", "અસ્વીકાર", "નામંજૂર", "રદ", "ખારિજ", "કેમ", "why"])
    if is_rejection_query:
        rejected_app = next((a for a in apps if a.status == "rejected"), None)
        if rejected_app and rejected_app.reason_code:
            explanation = REASON_EXPLANATIONS.get(rejected_app.reason_code, {}).get(lang) or rejected_app.note or "નિયમો અનુસાર શરતો પૂર્ણ નથી."
            if lang == "gu":
                bot_reply = f"તમારી અરજી ({rejected_app.application_id}) અસ્વીકાર થવાનું મુખ્ય કારણ:\n\n👉 {explanation}\n\nશું તમે આ નિર્ણય વિરુદ્ધ અપીલ અથવા ફરિયાદ નોંધાવવા માંગો છો? હું તમારી ફરિયાદ નોંધી આપું?"
            elif lang == "hi":
                bot_reply = f"आपकी अर्ज़ी ({rejected_app.application_id}) अस्वीकार होने का मुख्य कारण:\n\n👉 {explanation}\n\nक्या आप इसके ख़िलाफ़ अपील दर्ज करना चाहते हैं?"
            else:
                bot_reply = f"Your application ({rejected_app.application_id}) was rejected because:\n\n👉 {explanation}\n\nWould you like me to register an appeal/grievance for this?"
            
            return {
                "role": "assistant",
                "content": bot_reply,
                "suggested_action": "file_grievance",
                "application_id": rejected_app.application_id,
                "category": "wrong_rejection"
            }

    # Tool 2: Check if requesting to file grievance
    is_file_request = any(k in user_query_lower for k in ["ફરિયાદ", "અપીલ", "complaint", "grievance", "file", "yes", "હા", "નોંધો", "દર્જ"])
    if is_file_request:
        grv_id = generate_grv_id(db)
        app_id = apps[0].application_id if apps else None
        
        new_grv = Grievance(
            grv_id=grv_id,
            family_id=fid,
            application_id=app_id,
            category="wrong_rejection",
            description=user_query,
            lang=lang,
            status="assigned",
            assigned_officer_id="officer_dahod",
            district_code="DAHOD",
            sla_due=datetime.utcnow() + timedelta(hours=48)
        )
        db.add(new_grv)
        db.add(GrievanceHistory(
            grv_id=grv_id,
            from_status=None,
            to_status="assigned",
            note="Auto-assigned to Dahod District Social Welfare Officer via AI Assistant",
            actor_id="AI_ASSISTANT"
        ))
        db.commit()

        # Send SMS
        send_sms("9876543210", "sms.grievance_filed", lang=lang, grv_id=grv_id)

        if lang == "gu":
            reply = f"✅ તમારી ફરિયાદ સફળતાપૂર્વક નોંધાઈ ગઈ છે!\n\n📋 **ફરિયાદ નંબર (GRV ID): {grv_id}**\n👤 સોંપાયેલ અધિકારી: ડિસ્ટ્રિક્ટ સોશિયલ વેલ્ફેર ઓફિસર (દાહોદ)\n⏱️ નિરાકરણ સમય મર્યાદા: ૪૮ કલાક\n\nતમને SMS દ્વારા સ્થિતિ અપડેટ મળતી રહેશે."
        elif lang == "hi":
            reply = f"✅ आपकी शिकायत दर्ज हो गई है!\n\n📋 **शिकायत संख्या: {grv_id}**\n👤 ज़िम्मेदार अधिकारी: ज़िला कल्याण अधिकारी (दाहोद)\n⏱️ समय सीमा: 48 घंटे"
        else:
            reply = f"✅ Your grievance has been registered!\n\n📋 **Grievance ID: {grv_id}**\n👤 Assigned Officer: District Social Welfare Officer (Dahod)\n⏱️ SLA Target: 48 hours"

        return {
            "role": "assistant",
            "content": reply,
            "grv_id": grv_id,
            "status": "assigned"
        }

    # Default friendly Gujarati assistant response
    if lang == "gu":
        reply = "નમસ્તે! હું ગુજરાત ફેમિલી સહાયક છું. હું તમને:\n૧. યોજના અરજીની સ્થિતિ તપાસવામાં,\n૨. અરજી રદ થવાનું કારણ સમજાવવામાં, અથવા\n૩. અધિકારી સમક્ષ સીધી ફરિયાદ/અપીલ નોંધવામાં મદદ કરી શકું છું.\n\nતમે શું જાણવા માંગો છો?"
    elif lang == "hi":
        reply = "नमस्ते! मैं गुजरात फैमिली सहायक हूँ। मैं आपको योजना की स्थिति जानने या शिकायत दर्ज करने में मदद कर सकता हूँ।"
    else:
        reply = "Hello! I am your Gujarat Family Assistant. I can help you check application status, explain rejection reasons, or file an appeal directly to the district officer."

    return {"role": "assistant", "content": reply}

# --- 2. Direct Grievance Filing ---
@router.post("/grievance/file")
def file_grievance(
    payload: GrievanceCreate,
    user: AppUser = Depends(current_user),
    db: Session = Depends(get_db)
):
    fid = payload.family_id or "GJ-38915001"
    grv_id = generate_grv_id(db)

    grv = Grievance(
        grv_id=grv_id,
        family_id=fid,
        application_id=payload.application_id,
        category=payload.category,
        description=payload.description,
        lang=payload.lang or "gu",
        status="assigned",
        assigned_officer_id="officer_dahod",
        district_code="DAHOD",
        sla_due=datetime.utcnow() + timedelta(hours=48)
    )
    db.add(grv)
    db.add(GrievanceHistory(
        grv_id=grv_id,
        from_status=None,
        to_status="assigned",
        note="Assigned to District Officer",
        actor_id=user.user_id
    ))
    db.commit()

    send_sms("9876543210", "sms.grievance_filed", lang=payload.lang or "gu", grv_id=grv_id)

    return {"grv_id": grv_id, "status": "assigned", "message": "Grievance registered"}

# --- 3. Citizen Grievances List ---
@router.get("/citizen/grievances")
def get_my_grievances(
    family_id: Optional[str] = None,
    user: AppUser = Depends(current_user),
    db: Session = Depends(get_db)
):
    fid = family_id or "GJ-38915001"
    grvs = db.query(Grievance).filter(Grievance.family_id == fid).order_by(Grievance.created_at.desc()).all()
    
    return [
        {
            "grv_id": g.grv_id,
            "family_id": g.family_id,
            "application_id": g.application_id,
            "category": g.category,
            "description": g.description,
            "status": g.status,
            "assigned_officer_id": g.assigned_officer_id,
            "sla_due": g.sla_due.isoformat() if g.sla_due else None,
            "created_at": g.created_at.isoformat() if g.created_at else None
        }
        for g in grvs
    ]

# --- 4. Officer Grievance Management ---
@router.get("/grievances")
def list_officer_grievances(
    status: Optional[str] = None,
    district_code: Optional[str] = None,
    user: AppUser = Depends(require_role("officer", "super_admin")),
    db: Session = Depends(get_db)
):
    query = db.query(Grievance)
    if status:
        query = query.filter(Grievance.status == status)
    if user.district_code:
        query = query.filter(Grievance.district_code == user.district_code)

    grvs = query.order_by(Grievance.created_at.desc()).all()
    return [
        {
            "grv_id": g.grv_id,
            "family_id": g.family_id,
            "application_id": g.application_id,
            "category": g.category,
            "description": g.description,
            "status": g.status,
            "assigned_officer_id": g.assigned_officer_id,
            "district_code": g.district_code,
            "sla_due": g.sla_due.isoformat() if g.sla_due else None,
            "created_at": g.created_at.isoformat() if g.created_at else None
        }
        for g in grvs
    ]

@router.post("/grievances/{grv_id}/status")
def update_grievance_status(
    grv_id: str,
    payload: GrievanceStatusUpdate,
    user: AppUser = Depends(require_role("officer", "super_admin")),
    db: Session = Depends(get_db)
):
    grv = db.query(Grievance).filter(Grievance.grv_id == grv_id).first()
    if not grv:
        raise HTTPException(status_code=404, detail="Grievance not found")

    prev_status = grv.status
    grv.status = payload.status

    db.add(GrievanceHistory(
        grv_id=grv_id,
        from_status=prev_status,
        to_status=payload.status,
        note=payload.note or f"Updated to {payload.status}",
        actor_id=user.user_id
    ))
    db.commit()

    return {"grv_id": grv_id, "status": grv.status}
