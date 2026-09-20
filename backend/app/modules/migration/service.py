import datetime
import logging
from typing import Dict, Any, List
from sqlalchemy.orm import Session

from backend.app.core.db import SessionLocal, Family, Person, FamilyMember, Village
from backend.app.core.events import subscribe, publish
from backend.app.core.notify import notify
from backend.app.core.sms import send_sms
from backend.app.modules.geo.models import Facility
from backend.app.modules.geo.service import haversine_km
from backend.app.modules.migration.models import FamilyRationAssignment, MigrationTask
from backend.app.modules.eligibility.service import evaluate_family_eligibility, calculate_age

logger = logging.getLogger("migration")

def process_migration(payload: Dict[str, Any], db: Session) -> Dict[str, Any]:
    """Handles migration portability when a family moves."""
    family_id = payload.get("family_id")
    from_lgd = payload.get("from_lgd")
    to_lgd = payload.get("to_lgd")
    temporary = payload.get("temporary", False)

    family = db.query(Family).filter(Family.family_id == family_id).first()
    if not family:
        logger.error(f"Migration failed: family {family_id} not found")
        return {"status": "error", "message": "Family not found"}

    dest_village = db.query(Village).filter(Village.village_lgd == to_lgd).first()
    dest_district = dest_village.district_code if dest_village else family.district_code
    lat = float(dest_village.lat) if (dest_village and dest_village.lat) else float(family.lat or 22.83)
    lng = float(dest_village.lng) if (dest_village and dest_village.lng) else float(family.lng or 74.25)


    # 1. Reassign Ration Shop
    ration_shops = db.query(Facility).filter(Facility.type == "ration_shop").all()
    best_shop = None
    min_dist = float("inf")
    for s in ration_shops:
        d = haversine_km(lat, lng, s.lat, s.lng)
        if d < min_dist:
            min_dist = d
            best_shop = s

    # End-date previous active assignment if permanent
    if not temporary:
        db.query(FamilyRationAssignment).filter(
            FamilyRationAssignment.family_id == family_id,
            FamilyRationAssignment.active_to == None
        ).update({"active_to": datetime.date.today()})

    new_assignment = FamilyRationAssignment(
        family_id=family_id,
        facility_id=best_shop.facility_id if best_shop else "RATION-DEFAULT",
        facility_name=best_shop.name if best_shop else "Local FPS",
        is_temporary=temporary,
        active_from=datetime.date.today()
    )
    db.add(new_assignment)

    # 2. Recompute Eligibility in new location
    eval_results = evaluate_family_eligibility(family_id, db, actor_id="migration_worker")

    # 3. Create school transfer migration tasks for school-age children (6 to 18)
    members = db.query(Person).join(
        FamilyMember, Person.person_id == FamilyMember.person_id
    ).filter(FamilyMember.family_id == family_id).all()

    school_tasks_created = 0
    for m in members:
        age = calculate_age(m.dob)
        if 6 <= age <= 18:
            task = MigrationTask(
                family_id=family_id,
                kind="school_transfer",
                status="open",
                details={
                    "child_name": m.name_en,
                    "child_age": age,
                    "from_village": from_lgd,
                    "to_village": to_lgd,
                    "to_district": dest_district,
                    "assigned_ration_shop": best_shop.name if best_shop else "FPS"
                }
            )
            db.add(task)
            school_tasks_created += 1

    # 4. In-app notifications to officers in both districts
    notify("migration_inbound", district_code=dest_district, role="officer", family_id=family_id)
    if from_lgd != to_lgd:
        from_village = db.query(Village).filter(Village.village_lgd == from_lgd).first()
        from_district = from_village.district_code if from_village else None
        if from_district:
            notify("migration_outbound", district_code=from_district, role="officer", family_id=family_id)

    # 5. SMS to citizen
    head = db.query(Person).filter(Person.person_id == family.head_person_id).first()
    if head and head.mobile and best_shop:
        send_sms(head.mobile, "migration_ration_updated", lang="gu", shop_name=best_shop.name)

    db.commit()

    return {
        "status": "completed",
        "family_id": family_id,
        "new_ration_shop": best_shop.name if best_shop else "FPS",
        "school_tasks_created": school_tasks_created,
        "eligible_schemes_count": len([r for r in eval_results if r.get("eligible")])
    }

@subscribe("family.migrated")
def on_family_migrated(payload: dict):
    db = SessionLocal()
    try:
        process_migration(payload, db)
    finally:
        db.close()
