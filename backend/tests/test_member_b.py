import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

class AssertRaises:
    def __init__(self, exc_type):
        self.exc_type = exc_type
    def __enter__(self):
        return self
    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is None:
            raise AssertionError(f"Expected {self.exc_type.__name__} was not raised")
        return issubclass(exc_type, self.exc_type)

raises = AssertRaises

from backend.app.core.db import SessionLocal, Family, Person
from backend.app.modules.eligibility.evaluator import evaluate_rule, validate_rule_variables
from backend.app.modules.eligibility.service import evaluate_family_eligibility
from backend.app.modules.ledger.models import AccessLog
from backend.app.modules.ledger.service import verify_chain, record_access_log, revoke_family_consent
from backend.app.modules.geo.service import haversine_km, get_nearest_facilities_for_coords, compute_access_gap, compute_camp_suggestions
from backend.app.modules.analytics.service import validate_and_sanitize_sql, ask_text_to_sql, get_analytics_summary
from backend.app.modules.migration.service import process_migration

def test_m4_evaluator():
    rule = {
        "and": [
            {"==": [{"var": "person.gender"}, "F"]},
            {"==": [{"var": "person.marital_status"}, "widow"]},
            {">=": [{"var": "person.age"}, 18]},
            {"<": [{"var": "family.annual_income"}, 120000]}
        ]
    }
    # Test valid variables
    valid, errors = validate_rule_variables(rule)
    assert valid is True
    assert len(errors) == 0

    # Test matching context (Kantaben: F, widow, 62, 85000)
    ctx_pass = {
        "person": {"gender": "F", "marital_status": "widow", "age": 62},
        "family": {"annual_income": 85000}
    }
    passed, reasons = evaluate_rule(rule, ctx_pass)
    assert passed is True
    assert len(reasons) == 4
    assert any("ગંગા સ્વરૂપા (વિધવા)" in r["text_gu"] for r in reasons)
    assert any("₹85,000 < ₹120,000" in r["text_gu"] for r in reasons)

    # Test failing context (income too high)
    ctx_fail = {
        "person": {"gender": "F", "marital_status": "widow", "age": 62},
        "family": {"annual_income": 150000}
    }
    passed_fail, reasons_fail = evaluate_rule(rule, ctx_fail)
    assert passed_fail is False
    assert any(r["passed"] is False for r in reasons_fail)

def test_m7_ledger_and_tamper_detection():
    db = SessionLocal()
    try:
        # Initial verify
        res = verify_chain(db)
        assert res["valid"] is True

        # Append a new log
        log_entry = record_access_log("officer_dahod", "GJ-20261001", "scheme_verification", ["annual_income"])
        res_after = verify_chain(db)
        assert res_after["valid"] is True

        # Simulate tampering: directly alter the purpose in the database without recalculating hash
        tampered_id = log_entry.id
        db.query(AccessLog).filter(AccessLog.id == tampered_id).update({"purpose": "tampered_purpose"})
        db.commit()

        # Chain verification must now fail and report tampered_id
        res_tampered = verify_chain(db)
        assert res_tampered["valid"] is False
        assert res_tampered["broken_at_id"] == tampered_id
        print(f"Tamper detection passed: detected breach at ID {tampered_id}")

        # Restore
        db.query(AccessLog).filter(AccessLog.id == tampered_id).update({"purpose": "scheme_verification"})
        db.commit()
        assert verify_chain(db)["valid"] is True

        # Test revocation
        revoke_family_consent(db, "GJ-20261001", "health_dept", "health_outreach")
        with raises(PermissionError):
            record_access_log("health_worker", "GJ-20261001", "health_outreach", ["history"], dept="health_dept")
    finally:
        db.close()

def test_m6_geo_nearest_and_camps():
    db = SessionLocal()
    try:
        # Kantaben's coords: 22.8340, 74.2560
        nearest = get_nearest_facilities_for_coords(22.8340, 74.2560, db)
        assert len(nearest) >= 3

        # Check PHC distance is ~13-15 km
        phc = next(f for f in nearest if f["facility_type"] == "phc")
        assert 10.0 <= phc["distance_km"] <= 16.0
        print(f"Kantaben nearest PHC distance: {phc['distance_km']} km")

        # Access gap
        gaps = compute_access_gap("DAHOD", "phc", 5.0, db)
        assert len(gaps) > 0
        assert gaps[0]["gap_score"] >= 0

        # DBSCAN Camp suggestions
        camps = compute_camp_suggestions("DAHOD", "SCH_GANGA_SWAROOPA", db)
        assert len(camps) > 0
    finally:
        db.close()

def test_m10_text_to_sql():
    db = SessionLocal()
    try:
        # Test 1: widows in Dahod
        res1 = ask_text_to_sql("How many widows in Dahod are eligible for widow pension but have no application?", "DAHOD", "officer_dahod", db)
        assert res1["row_count"] >= 1
        assert "unassisted_widows" in res1["columns"]

        # Test 2: approval rate by scheme
        res2 = ask_text_to_sql("Approval rate by scheme this month", "DAHOD", "officer_dahod", db)
        assert res2["chart_hint"] == "bar"
        assert "approval_rate_pct" in res2["columns"]

        # Test 3: SQL safety validation - blocking unauthorized table
        with raises(ValueError):
            validate_and_sanitize_sql("SELECT * FROM app_user")

        # Test 4: District security boundary - officer_kutch asking for Dahod
        with raises(PermissionError):
            validate_and_sanitize_sql("SELECT * FROM v_family WHERE district_code = 'DAHOD'", officer_district="KUTCH")

        # Test 5: Summary metrics
        summary = get_analytics_summary("DAHOD", db)
        assert summary["total_families"] >= 1
        assert summary["total_applications"] >= 1

    finally:
        db.close()

def test_m8_migration():
    db = SessionLocal()
    try:
        fam = db.query(Family).filter(Family.family_id == "GJ-20261002").first()
        if not fam:
            fam = Family(
                family_id="GJ-20261002",
                head_person_id="p_demo_head",
                address_text="Demo Migration Road",
                village_lgd="VIL-DAH-003",
                district_code="DAHOD",
                annual_income=75000,
                status="active"
            )
            db.add(fam)
            db.commit()

        payload = {
            "family_id": "GJ-20261002",
            "from_lgd": "VIL-DAH-003",
            "to_lgd": "VIL-SUR-001",
            "temporary": False
        }
        res = process_migration(payload, db)
        assert res["status"] == "completed"
        assert res.get("new_ration_shop") is not None
        print(f"Migration passed: newly assigned ration shop '{res['new_ration_shop']}'")
    finally:
        db.close()


if __name__ == "__main__":
    test_m4_evaluator()
    print("✓ M4 Evaluator Tests Passed")
    test_m7_ledger_and_tamper_detection()
    print("✓ M7 Ledger & Tamper Tests Passed")
    test_m6_geo_nearest_and_camps()
    print("✓ M6 Geo Tests Passed")
    test_m10_text_to_sql()
    print("✓ M10 Text-to-SQL Tests Passed")
    test_m8_migration()
    print("✓ M8 Migration Tests Passed")
    print("\n🎉 ALL MEMBER B BACKEND TESTS PASSED!")
