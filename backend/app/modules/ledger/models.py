import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, ForeignKey
from backend.app.core.db import Base

class AccessLog(Base):
    __tablename__ = "access_log"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, autoincrement=True)
    actor_id = Column(String(50), nullable=False, index=True)
    actor_role = Column(String(50), default="officer")
    dept = Column(String(50), default="revenue")
    family_id = Column(String(50), nullable=False, index=True)
    purpose = Column(String(50), nullable=False)
    fields = Column(JSON, default=list)  # list of field names accessed
    ts = Column(DateTime, default=datetime.datetime.utcnow)
    prev_hash = Column(String(64), nullable=False)
    hash = Column(String(64), nullable=False)

class ConsentRevocation(Base):
    __tablename__ = "consent_revocation"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, autoincrement=True)
    family_id = Column(String(50), nullable=False, index=True)
    dept = Column(String(50), nullable=False)
    purpose = Column(String(50), nullable=False)
    revoked_at = Column(DateTime, default=datetime.datetime.utcnow)
