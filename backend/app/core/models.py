import uuid
from datetime import datetime, date
from sqlalchemy import (
    Column, String, Boolean, Integer, Date, DateTime, Text, ForeignKey, JSON
)
from sqlalchemy.orm import relationship
from backend.app.core.db import Base

class Person(Base):
    __tablename__ = "person"

    person_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name_en = Column(String, nullable=False)
    name_gu = Column(String, nullable=False)
    dob = Column(Date, nullable=False)
    dob_precision = Column(String, default="exact")  # 'exact' | 'year_only'
    gender = Column(String, nullable=False)          # 'M' | 'F' | 'O'
    marital_status = Column(String, default="single") # 'single'|'married'|'widow'|'divorced'
    occupation = Column(String, nullable=True)
    education = Column(String, nullable=True)
    disability = Column(Boolean, default=False)
    social_category = Column(String, default="GEN")   # 'GEN'|'OBC'|'SC'|'ST'
    mobile = Column(String, nullable=True)
    mobile_shared = Column(Boolean, default=False)
    aadhaar_token = Column(String, nullable=True)     # UUID string
    aadhaar_last4 = Column(String(4), nullable=True)
    pan_hash = Column(String, nullable=True)
    is_deceased = Column(Boolean, default=False)
    created_via = Column(String, default="self")      # 'self'|'assisted'|'qr'
    created_by = Column(String, nullable=True)        # operator id when assisted


class Family(Base):
    __tablename__ = "family"

    family_id = Column(String, primary_key=True)      # 'GJ-' + 8 digits
    head_person_id = Column(String, nullable=False)
    address_text = Column(Text, nullable=False)
    village_lgd = Column(String, nullable=False)
    district_code = Column(String, nullable=False)
    lat = Column(String, nullable=True)
    lng = Column(String, nullable=True)
    ration_card_no = Column(String, nullable=True)
    annual_income = Column(Integer, default=0)
    income_source = Column(String, default="self_declared") # 'self_declared'|'talati_cert'|'pan_itr'
    status = Column(String, default="active")               # 'active'|'merged'|'inactive'


class FamilyMember(Base):
    __tablename__ = "family_member"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    family_id = Column(String, ForeignKey("family.family_id"), nullable=False)
    person_id = Column(String, ForeignKey("person.person_id"), nullable=False)
    relation_to_head = Column(String(50), default="member")
    active_from = Column(Date, default=date.today)
    active_to = Column(Date, nullable=True)
    sub_household = Column(String, nullable=True)



class Relationship(Base):
    __tablename__ = "relationship"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    from_person = Column(String, ForeignKey("person.person_id"), nullable=False)
    to_person = Column(String, ForeignKey("person.person_id"), nullable=False)
    type = Column(String, nullable=False)  # 'spouse' | 'parent_of' | 'dependent_of'


class Village(Base):
    __tablename__ = "village"

    village_lgd = Column(String, primary_key=True)
    name_en = Column(String, nullable=False)
    name_gu = Column(String, nullable=False)
    district_code = Column(String, nullable=False)
    lat = Column(String, nullable=True)
    lng = Column(String, nullable=True)


class Notification(Base):
    __tablename__ = "notification"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=True)
    district_code = Column(String, nullable=True)
    role = Column(String, nullable=True)
    text_key = Column(String, nullable=False)
    params = Column(JSON, default=dict)
    read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Events(Base):
    __tablename__ = "events"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    payload = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)


class AppUser(Base):
    __tablename__ = "app_user"

    user_id = Column(String, primary_key=True)
    role = Column(String, nullable=False) # citizen, operator, officer, dept_admin, super_admin
    district_code = Column(String, nullable=True)
    person_id = Column(String, nullable=True)
    password_hash = Column(String, nullable=False)
    display_name = Column(String, nullable=False)


class SmsOutbox(Base):
    __tablename__ = "sms_outbox"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    mobile = Column(String, nullable=False)
    text_key = Column(String, nullable=False)
    lang = Column(String, default="gu")
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class FraudFlag(Base):
    __tablename__ = "fraud_flag"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    kind = Column(String, nullable=False)  # duplicate_aadhaar, parent_younger_than_child, large_household, income_mismatch
    person_id = Column(String, nullable=True)
    family_ids = Column(JSON, default=list)
    details = Column(JSON, default=dict)
    status = Column(String, default="open") # open, resolved, ignored
    created_at = Column(DateTime, default=datetime.utcnow)


class AadhaarVault(Base):
    __tablename__ = "aadhaar_vault"

    aadhaar_token = Column(String, primary_key=True)
    enc_number = Column(Text, nullable=False) # encrypted base64 string
    created_at = Column(DateTime, default=datetime.utcnow)


class IdLink(Base):
    __tablename__ = "id_link"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    person_id = Column(String, nullable=False)
    id_type = Column(String, nullable=False) # ration_card, voter_id, digilocker, pan
    id_ref_hash = Column(String, nullable=False)
    verified = Column(Boolean, default=False)
    source = Column(String, default="manual")
    match_score = Column(Integer, nullable=True)
    verified_at = Column(DateTime, default=datetime.utcnow)


class NameReview(Base):
    __tablename__ = "name_review"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    person_id = Column(String, nullable=False)
    district_code = Column(String, nullable=True)
    id_type = Column(String, nullable=False)
    name_a = Column(String, nullable=False)
    name_b = Column(String, nullable=False)
    score = Column(Integer, nullable=False)
    status = Column(String, default="pending") # pending, accepted, rejected
    decided_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class EnrollmentConsent(Base):
    __tablename__ = "enrollment_consent"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    person_id = Column(String, nullable=False)
    method = Column(String, nullable=False) # aadhaar_otp, aadhaar_qr, thumb_mock
    proof = Column(Text, nullable=True)
    operator_id = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class SyncBatch(Base):
    __tablename__ = "sync_batch"

    client_uuid = Column(String, primary_key=True)
    operator_id = Column(String, nullable=False)
    received_at = Column(DateTime, default=datetime.utcnow)
    result = Column(JSON, default=dict)


class Application(Base):
    __tablename__ = "application"

    application_id = Column(String, primary_key=True, default=lambda: f"APP-{uuid.uuid4().hex[:8].upper()}")
    family_id = Column(String, nullable=False)
    scheme_id = Column(String, nullable=False)
    applicant_person_id = Column(String, nullable=False)
    status = Column(String, default="draft") # draft, submitted, under_verification, approved, disbursed, rejected
    reason_code = Column(String, nullable=True)
    note = Column(Text, nullable=True)
    created_via = Column(String, default="self")
    consent_id = Column(String, nullable=True)
    submitted_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Document(Base):
    __tablename__ = "document"

    doc_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    person_id = Column(String, nullable=False)
    family_id = Column(String, nullable=False)
    doc_type = Column(String, nullable=False)
    file_path = Column(String, nullable=True)
    status = Column(String, default="verified") # pending, verified, rejected
    source = Column(String, default="upload")   # upload, digilocker, id_link
    expires_on = Column(Date, nullable=True)
    name_match_score = Column(Integer, nullable=True)


class ApplicationHistory(Base):
    __tablename__ = "application_history"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    application_id = Column(String, nullable=False)
    from_status = Column(String, nullable=True)
    to_status = Column(String, nullable=False)
    actor_id = Column(String, nullable=False)
    reason_code = Column(String, nullable=True)
    note = Column(Text, nullable=True)
    ts = Column(DateTime, default=datetime.utcnow)


class Grievance(Base):
    __tablename__ = "grievance"

    grv_id = Column(String, primary_key=True) # 'GRV-' + 5 digits
    family_id = Column(String, nullable=False)
    application_id = Column(String, nullable=True)
    category = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    lang = Column(String, default="gu")
    status = Column(String, default="new") # new, assigned, under_investigation, resolved
    assigned_officer_id = Column(String, nullable=True)
    district_code = Column(String, nullable=True)
    sla_due = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class GrievanceHistory(Base):
    __tablename__ = "grievance_history"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    grv_id = Column(String, nullable=False)
    from_status = Column(String, nullable=True)
    to_status = Column(String, nullable=False)
    note = Column(Text, nullable=True)
    actor_id = Column(String, nullable=False)
    ts = Column(DateTime, default=datetime.utcnow)
