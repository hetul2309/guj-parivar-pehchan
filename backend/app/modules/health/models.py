import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from backend.app.core.db import Base

class HealthConsent(Base):
    __tablename__ = "health_consent"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, autoincrement=True)
    person_id = Column(String(50), nullable=False, unique=True, index=True)
    consented_at = Column(DateTime, default=datetime.datetime.utcnow)

class FamilyHealthHistory(Base):
    __tablename__ = "family_health_history"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, autoincrement=True)
    family_id = Column(String(50), nullable=False, index=True)
    condition = Column(String(100), nullable=False)  # 'diabetes' | 'hypertension' | 'cardiac'
    relation = Column(String(50), nullable=False)   # 'father' | 'mother' | 'self'
    reported_at = Column(DateTime, default=datetime.datetime.utcnow)
