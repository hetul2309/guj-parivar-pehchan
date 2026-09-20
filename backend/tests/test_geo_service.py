import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.core.models import Base, Village, Family, Application
from backend.app.modules.geo.models import Facility
from backend.app.modules.eligibility.models import EligibilityResult
from backend.app.modules.geo.service import (
    haversine_km,
    compute_access_gap,
    compute_coverage,
    compute_camp_suggestions
)

@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()

def test_haversine_km():
    # Distance between Dahod (22.834, 74.256) and nearby point
    d = haversine_km(22.834, 74.256, 22.834, 74.256)
    assert d == 0.0

    d2 = haversine_km(22.834, 74.256, 22.844, 74.256)
    assert 1.0 <= d2 <= 1.2

def test_access_gap_real_distance_and_eligible_count(db_session):
    # Setup village
    v = Village(
        village_lgd="VIL-001",
        district_code="DAHOD",
        subdistrict_code="DAHOD_TALUKA",
        name_en="Test Village",
        name_gu="ટેસ્ટ ગામ",
        lat=22.8300,
        lng=74.2500
    )
    db_session.add(v)

    # Setup facility 10 km away
    f = Facility(
        facility_id="FAC-001",
        name="Test PHC",
        type="phc",
        district_code="DAHOD",
        village_lgd="VIL-002",
        lat=22.9200,
        lng=74.2500
    )
    db_session.add(f)

    # Setup 2 families in VIL-001
    fam1 = Family(family_id="FAM-1", village_lgd="VIL-001", district_code="DAHOD", lat=22.83, lng=74.25)
    fam2 = Family(family_id="FAM-2", village_lgd="VIL-001", district_code="DAHOD", lat=22.83, lng=74.25)
    db_session.add_all([fam1, fam2])

    # Mark both eligible
    el1 = EligibilityResult(family_id="FAM-1", scheme_id="SCH-1", eligible=True)
    el2 = EligibilityResult(family_id="FAM-2", scheme_id="SCH-1", eligible=True)
    db_session.add_all([el1, el2])
    db_session.commit()

    # Threshold 5km
    results = compute_access_gap("DAHOD", "phc", 5.0, db_session)
    assert len(results) == 1
    row = results[0]
    assert row["village_lgd"] == "VIL-001"
    assert row["eligible_beneficiaries"] == 2
    assert row["distance_km"] > 5.0
    assert row["gap_score"] > 0
    assert row["priority"] in ["HIGH", "MEDIUM", "LOW"]

def test_coverage_uses_persisted_applications(db_session):
    v = Village(
        village_lgd="VIL-002",
        district_code="DAHOD",
        subdistrict_code="DAHOD_TALUKA",
        name_en="Coverage Village",
        name_gu="કવરેજ ગામ",
        lat=22.80,
        lng=74.20
    )
    db_session.add(v)

    fam = Family(family_id="FAM-COV-1", village_lgd="VIL-002", district_code="DAHOD", lat=22.80, lng=74.20)
    db_session.add(fam)

    el = EligibilityResult(family_id="FAM-COV-1", scheme_id="SCH-PENSION", eligible=True)
    db_session.add(el)
    db_session.commit()

    # Case 1: No applications submitted yet
    cov_no_app = compute_coverage("DAHOD", "SCH-PENSION", db_session)
    assert len(cov_no_app) == 1
    assert cov_no_app[0]["eligible"] == 1
    assert cov_no_app[0]["applied"] == 0
    assert cov_no_app[0]["disbursed"] == 0
    assert cov_no_app[0]["saturation_pct"] == 0.0

    # Case 2: One application submitted
    app = Application(
        application_id="APP-TEST-1",
        family_id="FAM-COV-1",
        scheme_id="SCH-PENSION",
        applicant_person_id="P-1",
        status="submitted"
    )
    db_session.add(app)
    db_session.commit()

    cov_submitted = compute_coverage("DAHOD", "SCH-PENSION", db_session)
    assert cov_submitted[0]["eligible"] == 1
    assert cov_submitted[0]["applied"] == 1
    assert cov_submitted[0]["disbursed"] == 0
    assert cov_submitted[0]["saturation_pct"] == 0.0

    # Case 3: Disbursed application produces 100% saturation for one eligible family
    app.status = "disbursed"
    db_session.commit()

    cov_disbursed = compute_coverage("DAHOD", "SCH-PENSION", db_session)
    assert cov_disbursed[0]["eligible"] == 1
    assert cov_disbursed[0]["applied"] == 1
    assert cov_disbursed[0]["disbursed"] == 1
    assert cov_disbursed[0]["saturation_pct"] == 100.0

def test_camp_suggestions_filters_covered_families(db_session):
    fam1 = Family(family_id="FAM-CAMP-1", district_code="DAHOD", village_lgd="VIL-1", lat=22.81, lng=74.21)
    fam2 = Family(family_id="FAM-CAMP-2", district_code="DAHOD", village_lgd="VIL-1", lat=22.82, lng=74.22)
    db_session.add_all([fam1, fam2])
    db_session.commit()

    # With 2 uncovered families, should return camp suggestion
    camps = compute_camp_suggestions("DAHOD", None, db_session)
    assert len(camps) >= 1
    assert camps[0]["families_count"] >= 2

    # Now cover fam1 and fam2 with active applications
    app1 = Application(application_id="APP-C1", family_id="FAM-CAMP-1", scheme_id="SCH-1", applicant_person_id="P1", status="approved")
    app2 = Application(application_id="APP-C2", family_id="FAM-CAMP-2", scheme_id="SCH-1", applicant_person_id="P2", status="submitted")
    db_session.add_all([app1, app2])
    db_session.commit()

    # Now fewer than 2 candidates remain -> honest empty result
    camps_after = compute_camp_suggestions("DAHOD", None, db_session)
    assert camps_after == []
