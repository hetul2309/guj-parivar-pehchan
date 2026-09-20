"""
Master Integrated Seeding Script for Gujarat Family ID Platform
Seeds:
1. All DB tables (Base.metadata.create_all)
2. Demo Users & Demo Villages (Phase 0)
3. Member B Gati Shakti Facilities (from facilities.geojson)
4. Member B Government Schemes (from schemes.py)
5. Member A Demo Families (Kantaben GJ-38915001, etc.)
6. Initializes Analytics Views
7. Precomputes Scheme Eligibility for Kantaben
"""
import json
import os
import sys
from pathlib import Path

# Add backend directory and project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BASE_DIR.parent
sys.path.insert(0, str(BASE_DIR))
sys.path.insert(0, str(ROOT_DIR))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")



from backend.app.core.db import engine, Base, SessionLocal
from backend.app.core.models import (
    AppUser, Village, Person, Family, FamilyMember, Relationship,
    Application, Document, Notification
)
from backend.app.modules.geo.models import Facility
from backend.app.modules.eligibility.models import Scheme
from backend.app.modules.eligibility.service import evaluate_family_eligibility
from backend.app.modules.analytics.service import init_analytics_views
from backend.seed.seed_phase0 import seed as seed_phase0
from backend.seed.families import seed_families
from backend.seed.schemes import SEED_SCHEMES


def seed_all():
    print("🚀 Starting Master Integrated Seeding...")
    # Ensure all models across all modules are imported before creating tables
    import backend.app.modules.eligibility.models
    import backend.app.modules.geo.models
    import backend.app.modules.ledger.models
    import backend.app.modules.migration.models
    import backend.app.modules.health.models

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()


    try:
        # 1. Seed Phase 0 (Users & Villages)
        print("📍 Seeding Phase 0 users & villages...")
        seed_phase0()

        # 2. Seed PM Gati Shakti Facilities
        print("🏥 Seeding PM Gati Shakti Facilities from facilities.geojson...")
        geojson_path = Path(__file__).resolve().parent / "facilities.geojson"
        if geojson_path.exists():
            with open(geojson_path, "r", encoding="utf-8") as f:
                geo_data = json.load(f)
                count = 0
                for feat in geo_data.get("features", []):
                    props = feat["properties"]
                    coords = feat["geometry"]["coordinates"] # [lng, lat]
                    fac_id = props["facility_id"]
                    existing_fac = db.query(Facility).filter(Facility.facility_id == fac_id).first()
                    if not existing_fac:
                        fac = Facility(
                            facility_id=fac_id,
                            name=props["name"],
                            type=props["type"],
                            district_code=props["district_code"],
                            village_lgd=props.get("village_lgd"),
                            lat=float(coords[1]),
                            lng=float(coords[0])
                        )
                        db.add(fac)
                        count += 1
                db.commit()
                print(f"   -> {count} facilities seeded.")

        # 3. Seed Government Schemes
        print("📋 Seeding Government Schemes from schemes.py...")
        s_count = 0
        for s_data in SEED_SCHEMES:
            existing_scheme = db.query(Scheme).filter(Scheme.scheme_id == s_data["scheme_id"]).first()
            if not existing_scheme:
                scheme = Scheme(**s_data)
                db.add(scheme)
                s_count += 1
        db.commit()
        print(f"   -> {s_count} schemes seeded.")

        # 4. Seed Member A Families (Kantaben GJ-38915001)
        print("👨‍👩‍👧 Seeding Member A Families & Demo Beneficiaries...")
        seed_families()


        # 5. Initialize Analytics Views
        print("📊 Initializing Analytics Views...")
        try:
            init_analytics_views(db)
            print("   -> Analytics views ready.")
        except Exception as e:
            print(f"   -> Note on analytics views: {e}")

        # 6. Precompute Scheme Eligibility for Kantaben
        print("⚡ Pre-computing scheme eligibility for Kantaben (GJ-38915001)...")
        try:
            res = evaluate_family_eligibility("GJ-38915001", db, actor_id="seed_runner")
            eval_count = len(res) if isinstance(res, list) else len(res.get('results', []))
            print(f"   -> Computed {eval_count} scheme evaluations for Kantaben!")
        except Exception as e:
            print(f"   -> Error pre-computing eligibility: {e}")


        print("✅ Master Integrated Seeding Completed Successfully!")

    except Exception as e:
        print(f"❌ Error during master seeding: {e}")
        db.rollback()
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_all()
