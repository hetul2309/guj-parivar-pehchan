import os
import sys
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Ensure project root is in sys.path
_current_dir = Path(__file__).resolve().parent
_project_root = str(_current_dir.parent.parent.parent)
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

raw_url = os.getenv("DATABASE_URL", "sqlite:///./family_id.db") or "sqlite:///./family_id.db"
# Clean potential typos (e.g. DATABASE_URL=DATABASE_URL=... or postgres:// instead of postgresql://)
if "DATABASE_URL=" in raw_url:
    raw_url = raw_url.split("DATABASE_URL=")[-1].strip()
if raw_url.startswith("postgres://"):
    raw_url = raw_url.replace("postgres://", "postgresql://", 1)

DATABASE_URL = raw_url.strip() or "sqlite:///./family_id.db"

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    echo=False,
    future=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Alias app.core.db so all imports share the exact same Base, engine, and SessionLocal
sys.modules["app.core.db"] = sys.modules[__name__]


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Re-export core models so that modules importing from app.core.db work seamlessly
from backend.app.core.models import (
    AppUser, Village, Person, Family, FamilyMember, Relationship,
    Notification, Events, SmsOutbox, AadhaarVault,
    Application, Document, ApplicationHistory, Grievance, GrievanceHistory
)
EventRecord = Events
