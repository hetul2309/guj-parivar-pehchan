import datetime
from sqlalchemy import Column, String, Integer, Boolean, Text, DateTime, JSON, ForeignKey
from backend.app.core.db import Base

class Scheme(Base):
    __tablename__ = "scheme"
    __table_args__ = {'extend_existing': True}
    scheme_id = Column(String(50), primary_key=True)
    name_en = Column(String(200), nullable=False)
    name_gu = Column(String(200), nullable=False)
    name_hi = Column(String(200), nullable=False)
    department = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    level = Column(String(20), default="person")  # 'person' | 'family'
    rule = Column(JSON, nullable=False)           # json-logic structure
    required_docs = Column(JSON, default=list)    # list of doc_type strings
    benefit_value = Column(Integer, default=0)    # annual/monthly benefit in INR
    status = Column(String(20), default="draft")  # 'draft' | 'published'
    source_text = Column(Text, nullable=True)

class EligibilityResult(Base):
    __tablename__ = "eligibility_result"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, autoincrement=True)
    family_id = Column(String(50), nullable=False, index=True)
    person_id = Column(String(50), nullable=True, index=True)
    scheme_id = Column(String(50), ForeignKey("scheme.scheme_id"), nullable=False, index=True)
    eligible = Column(Boolean, default=False)
    reasons = Column(JSON, default=list)  # list of {text_en, text_gu, text_hi, passed}
    missing = Column(JSON, default=list)  # list of {doc_type, text_en, text_gu, text_hi}
    rank = Column(Integer, default=0)
    computed_at = Column(DateTime, default=datetime.datetime.utcnow)
