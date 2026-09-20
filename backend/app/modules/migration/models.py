import datetime
from sqlalchemy import Column, Integer, String, Boolean, Date, DateTime, JSON, ForeignKey
from backend.app.core.db import Base

class FamilyRationAssignment(Base):
    __tablename__ = "family_ration_assignment"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, autoincrement=True)
    family_id = Column(String(50), nullable=False, index=True)
    facility_id = Column(String(50), nullable=False)
    facility_name = Column(String(150), nullable=True)
    is_temporary = Column(Boolean, default=False)
    active_from = Column(Date, default=datetime.date.today)
    active_to = Column(Date, nullable=True)

class MigrationTask(Base):
    __tablename__ = "migration_task"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, autoincrement=True)
    family_id = Column(String(50), nullable=False, index=True)
    kind = Column(String(50), nullable=False)    # 'school_transfer' | 'ration_reassignment' | 'district_notification'
    status = Column(String(50), default="open")  # 'open' | 'in_progress' | 'completed'
    details = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
