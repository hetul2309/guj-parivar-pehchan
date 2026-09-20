from sqlalchemy import Column, String, Float, ForeignKey
from backend.app.core.db import Base

class Facility(Base):
    __tablename__ = "facility"
    __table_args__ = {'extend_existing': True}
    facility_id = Column(String(50), primary_key=True)

    type = Column(String(50), nullable=False, index=True)  # phc, school, anganwadi, ration_shop, bank
    name = Column(String(150), nullable=False)
    village_lgd = Column(String(50), nullable=True, index=True)
    district_code = Column(String(50), nullable=False, index=True)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
