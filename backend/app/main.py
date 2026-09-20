import sys
import os
from pathlib import Path

# Ensure project root is in sys.path
_current_dir = Path(__file__).resolve().parent
_project_root = str(_current_dir.parent.parent)
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

import importlib
import pkgutil
from typing import Optional, List
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from backend.app.core.db import engine, Base, get_db
from backend.app.core.models import AppUser, Village, Notification
from backend.app.core.auth import current_user, verify_password, create_access_token
from backend.app.core.i18n import translate

# Create all tables on startup (PostgreSQL or SQLite)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Gujarat Family ID Platform API",
    version="1.0.0",
    description="Official API for Gujarat Family ID Platform (Citizen, Operator, Officer, Schemes)"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok", "service": "gujarat-family-id"}

@app.get("/api/health")
def api_health():
    return {"status": "ok", "service": "gujarat-family-id"}

# --- Core Auth APIs ---
@app.post("/api/auth/login")
def login(payload: dict, db: Session = Depends(get_db)):
    username = payload.get("username")
    password = payload.get("password")
    user = db.query(AppUser).filter(AppUser.user_id == username).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    token = create_access_token(data={"sub": user.user_id, "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "user_id": user.user_id,
            "role": user.role,
            "display_name": user.display_name,
            "district_code": user.district_code,
            "person_id": user.person_id
        }
    }

@app.post("/api/auth/register")
def register(payload: dict, db: Session = Depends(get_db)):
    username = (payload.get("username") or "").strip()
    password = (payload.get("password") or "").strip()
    display_name = (payload.get("display_name") or "").strip()
    role = (payload.get("role") or "citizen").strip()
    district_code = (payload.get("district_code") or "DAHOD").strip().upper()

    if not username or not password or not display_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username, password, and full name are required."
        )

    existing = db.query(AppUser).filter(AppUser.user_id == username).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered. Please choose another or log in."
        )

    from backend.app.core.auth import get_password_hash
    pw_hash = get_password_hash(password)

    new_user = AppUser(
        user_id=username,
        role=role,
        district_code=district_code,
        display_name=display_name,
        password_hash=pw_hash
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token(data={"sub": new_user.user_id, "role": new_user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "user_id": new_user.user_id,
            "role": new_user.role,
            "display_name": new_user.display_name,
            "district_code": new_user.district_code,
            "person_id": new_user.person_id
        }
    }

# --- Core Villages API ---
@app.get("/api/villages")
def get_villages(district_code: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Village)
    if district_code:
        query = query.filter(Village.district_code.ilike(district_code))
    villages = query.all()
    return [
        {
            "village_lgd": v.village_lgd,
            "name_en": v.name_en,
            "name_gu": v.name_gu,
            "district_code": v.district_code,
            "lat": float(v.lat) if v.lat else 22.83,
            "lng": float(v.lng) if v.lng else 74.25
        }
        for v in villages
    ]

# --- Core Notifications API ---
@app.get("/api/notifications/me")
def get_my_notifications(user: AppUser = Depends(current_user), db: Session = Depends(get_db)):
    query = db.query(Notification).filter(
        (Notification.user_id == user.user_id) |
        (Notification.role == user.role) |
        (Notification.district_code == user.district_code)
    ).order_by(Notification.created_at.desc()).limit(20)
    
    results = []
    for n in query.all():
        text = translate(n.text_key, lang="gu", **(n.params or {}))
        results.append({
            "id": n.id,
            "text": text,
            "created_at": n.created_at.isoformat() if n.created_at else None,
            "read": n.read
        })
    return results

# --- Debug SMS Outbox API ---
@app.get("/api/sms/outbox")
def get_sms_outbox(db: Session = Depends(get_db)):
    from backend.app.core.models import SmsOutbox
    messages = db.query(SmsOutbox).order_by(SmsOutbox.created_at.desc()).limit(50).all()
    return [
        {
            "id": m.id,
            "mobile": m.mobile,
            "text_key": m.text_key,
            "lang": m.lang,
            "message": m.message,
            "created_at": m.created_at.isoformat() if m.created_at else None
        }
        for m in messages
    ]

# --- Router Auto-Discovery (Frozen Phase 0 specification) ---
def register_routers():
    modules_path = os.path.join(os.path.dirname(__file__), "modules")
    if not os.path.exists(modules_path):
        return

    # Check all subdirectories in modules_path
    for item in os.listdir(modules_path):
        sub_path = os.path.join(modules_path, item)
        if os.path.isdir(sub_path):
            router_file = os.path.join(sub_path, "router.py")
            if os.path.exists(router_file):
                try:
                    module_router_path = f"backend.app.modules.{item}.router"
                    mod = importlib.import_module(module_router_path)
                    if hasattr(mod, "router"):
                        app.include_router(mod.router, prefix="/api")
                        print(f"Loaded router: {item} -> /api")
                except Exception as e:
                    print(f"Failed to load router for {item}: {e}")

register_routers()
