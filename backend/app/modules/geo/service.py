import math
from typing import List, Dict, Any, Optional
try:
    from sklearn.cluster import DBSCAN
except ImportError:
    DBSCAN = None

from sqlalchemy.orm import Session
from backend.app.modules.geo.models import Facility
from backend.app.core.db import Village, Family, Application
from backend.app.modules.eligibility.models import EligibilityResult

ACTIVE_APPLICATION_STATUSES = {
    "draft", "submitted", "under_verification", "approved", "disbursed", "request_reupload"
}

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two points in km."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)

def get_nearest_facilities_for_coords(lat: float, lng: float, db: Session) -> List[Dict[str, Any]]:
    """Returns nearest facility for each facility type."""
    facilities = db.query(Facility).all()
    if not facilities:
        return []

    by_type: Dict[str, List[Facility]] = {}
    for f in facilities:
        by_type.setdefault(f.type, []).append(f)

    results = []
    for ftype, facs in by_type.items():
        best_fac = None
        min_dist = float("inf")
        for fac in facs:
            dist = haversine_km(lat, lng, fac.lat, fac.lng)
            if dist < min_dist:
                min_dist = dist
                best_fac = fac
        if best_fac:
            results.append({
                "facility_type": ftype,
                "facility_id": best_fac.facility_id,
                "name": best_fac.name,
                "distance_km": min_dist,
                "lat": best_fac.lat,
                "lng": best_fac.lng
            })

    return results

def get_nearest_facility_distance(lat: float, lng: float, facility_type: str, db: Session) -> float:
    """Helper for M4 rule variables (e.g. geo.nearest_school_km)."""
    facilities = db.query(Facility).filter(Facility.type == facility_type).all()
    if not facilities:
        return 0.0

    min_dist = float("inf")
    for f in facilities:
        dist = haversine_km(lat, lng, f.lat, f.lng)
        if dist < min_dist:
            min_dist = dist
    return min_dist if min_dist != float("inf") else 0.0

def compute_access_gap(district_code: str, facility_type: str, threshold_km: float, db: Session) -> List[Dict[str, Any]]:
    """Computes access gap score per village: eligible_count * max(0, distance_km - threshold_km)."""
    villages = db.query(Village)
    if district_code and district_code.upper() != "ALL":
        villages = villages.filter(Village.district_code == district_code)
    villages = villages.all()

    facilities = db.query(Facility).filter(Facility.type == facility_type).all()
    
    gap_results = []
    for v in villages:
        v_lat = float(v.lat) if v.lat else 22.83
        v_lng = float(v.lng) if v.lng else 74.25

        # Nearest facility distance from village centroid
        min_dist = float("inf")
        nearest_fac_name = "N/A"
        for f in facilities:
            d = haversine_km(v_lat, v_lng, f.lat, f.lng)
            if d < min_dist:
                min_dist = d
                nearest_fac_name = f.name
        
        distance_km = min_dist if min_dist != float("inf") else 0.0

        # Count distinct eligible families in this village
        family_ids = [
            fam.family_id for fam in db.query(Family).filter(Family.village_lgd == v.village_lgd).all()
        ]
        eligible_count = db.query(EligibilityResult.family_id).filter(
            EligibilityResult.family_id.in_(family_ids),
            EligibilityResult.eligible == True
        ).distinct().count() if family_ids else 0

        excess_km = max(0.0, distance_km - threshold_km)
        gap_score = round(eligible_count * excess_km, 2)

        gap_results.append({
            "village_lgd": v.village_lgd,
            "name_en": v.name_en,
            "name_gu": v.name_gu,
            "district_code": v.district_code,
            "lat": v_lat,
            "lng": v_lng,
            "nearest_facility": nearest_fac_name,
            "distance_km": distance_km,
            "eligible_beneficiaries": eligible_count,
            "threshold_km": threshold_km,
            "gap_score": gap_score,
            "priority": "HIGH" if gap_score > 50 else ("MEDIUM" if gap_score > 15 else "LOW")
        })

    return sorted(gap_results, key=lambda x: x["gap_score"], reverse=True)

def compute_camp_suggestions(district_code: str, scheme_id: Optional[str], db: Session) -> List[Dict[str, Any]]:
    """Clusters uncovered geotagged families using DBSCAN (or village grouping) to suggest camp locations."""
    # 1. Query families with valid lat/lng in the target district
    fam_query = db.query(Family).filter(Family.lat.isnot(None), Family.lng.isnot(None))
    if district_code and district_code.upper() != "ALL":
        fam_query = fam_query.filter(Family.district_code == district_code)
    families = fam_query.all()

    if not families:
        return []

    # 2. If scheme_id filter supplied, filter to eligible families only
    if scheme_id:
        eligible_fam_ids = set(
            r[0] for r in db.query(EligibilityResult.family_id).filter(
                EligibilityResult.scheme_id == scheme_id,
                EligibilityResult.eligible == True
            ).distinct().all()
        )
        families = [f for f in families if f.family_id in eligible_fam_ids]

    # 3. Exclude families already covered by an active application
    app_query = db.query(Application.family_id).filter(
        Application.status.in_(ACTIVE_APPLICATION_STATUSES)
    )
    if scheme_id:
        app_query = app_query.filter(Application.scheme_id == scheme_id)
    covered_fam_ids = set(r[0] for r in app_query.distinct().all())

    candidate_families = [f for f in families if f.family_id not in covered_fam_ids]

    # Fewer than two candidates returns an honest empty result
    if len(candidate_families) < 2:
        return []

    parsed_candidates = []
    for f in candidate_families:
        try:
            parsed_candidates.append({
                "family_id": f.family_id,
                "lat": float(f.lat),
                "lng": float(f.lng),
                "village_lgd": f.village_lgd or "UNKNOWN"
            })
        except (ValueError, TypeError):
            continue

    if len(parsed_candidates) < 2:
        return []

    camps: List[Dict[str, Any]] = []

    # 4. Attempt DBSCAN clustering if scikit-learn is available
    if DBSCAN is not None:
        try:
            import numpy as np
            coords = [[c["lat"], c["lng"]] for c in parsed_candidates]
            kms_per_radian = 6371.0088
            epsilon = 5.0 / kms_per_radian  # 5 km radius
            rad_coords = np.radians(coords)

            dbscan = DBSCAN(eps=epsilon, min_samples=2, metric='haversine')
            labels = dbscan.fit_predict(rad_coords)

            unique_labels = sorted(set(labels))
            camp_idx = 1
            for l in unique_labels:
                if l == -1:
                    continue  # noise
                cluster_indices = [idx for idx, val in enumerate(labels) if val == l]
                cluster_coords = [coords[idx] for idx in cluster_indices]
                centroid_lat = float(np.mean([c[0] for c in cluster_coords]))
                centroid_lng = float(np.mean([c[1] for c in cluster_coords]))

                camps.append({
                    "camp_id": f"CAMP-{camp_idx}",
                    "name": f"Suggested Outreach Camp #{camp_idx}",
                    "lat": round(centroid_lat, 5),
                    "lng": round(centroid_lng, 5),
                    "families_count": len(cluster_indices),
                    "status": "suggested"
                })
                camp_idx += 1
        except Exception:
            camps = []

    # 5. Fallback: Group real candidate families by village
    if not camps:
        by_village: Dict[str, List[Dict[str, Any]]] = {}
        for c in parsed_candidates:
            by_village.setdefault(c["village_lgd"], []).append(c)

        camp_idx = 1
        for v_code, fams in by_village.items():
            if len(fams) < 1:
                continue
            avg_lat = sum(f["lat"] for f in fams) / len(fams)
            avg_lng = sum(f["lng"] for f in fams) / len(fams)
            v_obj = db.query(Village).filter(Village.village_lgd == v_code).first()
            v_name = v_obj.name_en if v_obj else v_code

            camps.append({
                "camp_id": f"CAMP-{camp_idx}",
                "name": f"{v_name} Outreach Camp",
                "lat": round(avg_lat, 5),
                "lng": round(avg_lng, 5),
                "families_count": len(fams),
                "status": "suggested"
            })
            camp_idx += 1

    return sorted(camps, key=lambda x: x["families_count"], reverse=True)

def compute_coverage(district_code: str, scheme_id: Optional[str], db: Session) -> List[Dict[str, Any]]:
    """Village-level scheme coverage using persisted applications & distinct eligible families."""
    villages = db.query(Village)
    if district_code and district_code.upper() != "ALL":
        villages = villages.filter(Village.district_code == district_code)
    villages = villages.all()

    coverage_list = []
    for v in villages:
        v_families = db.query(Family).filter(Family.village_lgd == v.village_lgd).all()
        fam_ids = [f.family_id for f in v_families]

        if not fam_ids:
            coverage_list.append({
                "village_lgd": v.village_lgd,
                "name_en": v.name_en,
                "name_gu": v.name_gu,
                "district_code": v.district_code,
                "lat": float(v.lat or 22.83),
                "lng": float(v.lng or 74.25),
                "eligible": 0,
                "applied": 0,
                "disbursed": 0,
                "saturation_pct": 0.0
            })
            continue

        # 1. Distinct eligible families
        q_elig = db.query(EligibilityResult.family_id).filter(
            EligibilityResult.family_id.in_(fam_ids),
            EligibilityResult.eligible == True
        )
        if scheme_id:
            q_elig = q_elig.filter(EligibilityResult.scheme_id == scheme_id)
        eligible_fam_ids = set(r[0] for r in q_elig.distinct().all())
        eligible_count = len(eligible_fam_ids)

        if eligible_fam_ids:
            # 2. Applications submitted by eligible families
            q_app = db.query(Application).filter(
                Application.family_id.in_(eligible_fam_ids)
            )
            if scheme_id:
                q_app = q_app.filter(Application.scheme_id == scheme_id)
            applications = q_app.all()

            applied_count = len(set(a.family_id for a in applications))
            disbursed_count = len(set(a.family_id for a in applications if a.status == "disbursed"))
        else:
            applied_count = 0
            disbursed_count = 0

        saturation_pct = round((disbursed_count / eligible_count * 100) if eligible_count > 0 else 0.0, 1)

        coverage_list.append({
            "village_lgd": v.village_lgd,
            "name_en": v.name_en,
            "name_gu": v.name_gu,
            "district_code": v.district_code,
            "lat": float(v.lat or 22.83),
            "lng": float(v.lng or 74.25),
            "eligible": eligible_count,
            "applied": applied_count,
            "disbursed": disbursed_count,
            "saturation_pct": saturation_pct
        })

    return sorted(coverage_list, key=lambda x: x["eligible"], reverse=True)
