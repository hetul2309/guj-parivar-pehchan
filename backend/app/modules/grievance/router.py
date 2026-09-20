import os
import random
import uuid
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
import httpx
from dotenv import load_dotenv

# Ensure .env is loaded
load_dotenv()
load_dotenv(os.path.join(os.path.dirname(__file__), "../../../.env"))
load_dotenv(os.path.join(os.path.dirname(__file__), "../../../../.env"))

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

def call_gemini_chat(messages: List[ChatMessage], lang: str, context: dict) -> Optional[str]:
    gemini_key = os.getenv("GEMINI_API_KEY")
    if not gemini_key:
        return None

    lang_name = "Gujarati (ગુજરાતી)" if lang == "gu" else ("Hindi (हिन्दी)" if lang == "hi" else "English")

    system_instruction = f"""You are "ગુજરાત સહાયક" (Gujarat Sahayak), the empathetic, knowledgeable official AI assistant for Gujarat Family ID Platform (ગુજરાત સરકાર).
Citizen Profile:
- Name: Kantaben Patel (કાન્તાબેન પટેલ)
- Family ID: {context.get('family_id', 'GJ-38915001')}
- Residence: Dahod Rural, Gujarat (ગામ: દાહોદ ગ્રામ્ય)
- Category: Scheduled Tribe (ST), Below Poverty Line (BPL), Widow (વિધવા)
- Annual Income: ₹45,000 (as per Talati certificate)

Family Members:
- Kantaben Patel (Head of Family, 62 yrs, Widow)
- Ramesh Patel (Son, 38 yrs, Daily wage laborer)
- Savita Patel (Daughter-in-law, 35 yrs, Homemaker)
- Bhavik Patel (Grandson, 14 yrs, 9th Class student)

Active Applications for this family:
{context.get('apps_summary', '- Application APP-2026-001 (Ganga Swarupa Widow Pension): REJECTED due to expired Talati income certificate (>3 years old).')}

Available Gujarat Welfare Schemes for them:
1. Ganga Swarupa Yojana (Widow Pension - ₹1,250/month)
2. Vrudh Pension Yojana (Indira Gandhi Old Age Pension for 60+ - ₹1,000/month)
3. NFSA Antyodaya / BPL Ration Card (Free food grains & essential commodities)
4. Saraswati Sadhana Yojna (Free bicycle & educational assistance for girl & tribal students)
5. PM Awas Yojana Gramin (₹1,20,000 for pucca house construction)
6. Shravan Tirth Yojna (Subsidized senior citizen pilgrimage tour)

Conversation Instructions:
- Answer directly, warmly, and helpfully in {lang_name}.
- Keep your reply concise (2-4 clear sentences or simple bullet points).
- If citizen asks why their application was rejected, explain gently that the Talati income certificate was expired (>3 years) and advise them how to renew it at the e-Gram kiosk/Talati office, or tell them you can register an appeal/grievance to the Dahod Social Welfare Officer.
- If citizen asks what schemes they or family members are eligible for, give specific advice tailored to Kantaben, her son, or grandson.
- Avoid technical jargon; maintain high warmth and respect (આદરપૂર્વક / respectful speech).
"""

    contents = []
    for idx, m in enumerate(messages[-5:]):
        role = "user" if m.role == "user" else "model"
        text = m.content
        if idx == 0 and role == "user":
            text = f"[Context: {system_instruction}]\n\nCitizen: {text}"
        contents.append({
            "role": role,
            "parts": [{"text": text}]
        })

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={gemini_key}"
    payload = {
        "contents": contents,
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 450
        }
    }

    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts and "text" in parts[0]:
                        return parts[0]["text"].strip()
            else:
                print(f"Gemini API returned status {resp.status_code}: {resp.text[:150]}")
    except Exception as e:
        print(f"Gemini API error: {e}")
    return None

# --- 1. Chatbot Engine (with intelligent Gemini AI + tool calling & deterministic fallback) ---
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
    fid = payload.family_id or "GJ-38915001"

    # Fetch user's applications
    apps = db.query(Application).filter(Application.family_id == fid).all()

    # Tool: Check if requesting to file grievance
    is_file_request = any(k in user_query_lower for k in ["ફરિયાદ નોંધો", "અપીલ નોંધો", "ફરિયાદ દાખલ", "ફરિયાદ કરો", "file grievance", "file complaint", "register grievance", "register complaint"])
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

    # Prepare context for Gemini
    apps_summary_list = []
    for a in apps:
        reason_text = REASON_EXPLANATIONS.get(a.reason_code, {}).get(lang, a.reason_code) if a.reason_code else ""
        apps_summary_list.append(f"- Application {a.application_id} (Scheme: {a.scheme_id}): Status {a.status.upper()} {f'(Reason: {reason_text})' if reason_text else ''}")
    apps_summary = "\n".join(apps_summary_list) if apps_summary_list else "No active applications currently."

    context = {
        "family_id": fid,
        "apps_summary": apps_summary
    }

    # 1. Attempt Gemini 2.5 Flash Dynamic Generation
    gemini_reply = call_gemini_chat(payload.messages, lang, context)
    if gemini_reply:
        suggested = "file_grievance" if any(k in gemini_reply.lower() for k in ["rejection", "અસ્વીકાર", "ફરિયાદ", "અપીલ", "grievance"]) else None
        return {
            "role": "assistant",
            "content": gemini_reply,
            "suggested_action": suggested
        }

    # 2. Fallback: Check if asking about rejection
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

    # 3. Fallback: Default friendly assistant response
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
