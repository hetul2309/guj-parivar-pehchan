import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./family_id.db")

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




