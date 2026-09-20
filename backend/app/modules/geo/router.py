from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from backend.app.core.db import get_db, Family, Village
from backend.app.core.auth import current_user, AppUser
from backend.app.core.access_log import log_access
from backend.app.modules.geo.models import Facility
from backend.app.modules.geo.service import (
    get_nearest_facilities_for_coords,
    compute_access_gap,
    compute_camp_suggestions,
    compute_coverage
)

router = APIRouter(prefix="/geo", tags=["M6 PM Gati Shakti Geo Layer"])

@router.get("/families/{family_id}/nearest")
def get_nearest_facilities_for_family(
    family_id: str,
    db: Session = Depends(get_db),
    user: AppUser = Depends(current_user)
):
    """Contract: GET /geo/families/{id}/nearest -> nearest facilities per type."""
    family = db.query(Family).filter(Family.family_id == family_id).first()
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")

    lat = float(family.lat) if family.lat else 22.8340
    lng = float(family.lng) if family.lng else 74.2560

    log_access(user.user_id, family_id, "scheme_verification", ["lat", "lng", "nearest_facilities"])
    return get_nearest_facilities_for_coords(lat, lng, db)

@router.get("/layers/{facility_type}")
def get_facility_layer_geojson(
    facility_type: str,
    district_code: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Returns facility layer in standard GeoJSON format for Leaflet mapping."""
    q = db.query(Facility)
    if facility_type != "all":
        q = q.filter(Facility.type == facility_type)
    if district_code and district_code.upper() != "ALL":
        q = q.filter(Facility.district_code == district_code)
    
    facilities = q.all()
    features = [
        {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [f.lng, f.lat]
            },
            "properties": {
                "facility_id": f.facility_id,
                "name": f.name,
                "type": f.type,
                "district_code": f.district_code,
                "village_lgd": f.village_lgd
            }
        }
        for f in facilities
    ]
    return {
        "type": "FeatureCollection",
        "features": features
    }

@router.get("/access-gap")
def get_access_gap(
    district_code: str = Query("DAHOD"),
    facility_type: str = Query("phc"),
    threshold_km: float = Query(5.0),
    db: Session = Depends(get_db),
    user: AppUser = Depends(current_user)
):
    """Calculates access-gap scores per village."""
    return compute_access_gap(district_code, facility_type, threshold_km, db)

@router.get("/camps")
def get_camp_suggestions(
    district_code: str = Query("DAHOD"),
    scheme_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user: AppUser = Depends(current_user)
):
    """Calculates DBSCAN camp location suggestions."""
    return compute_camp_suggestions(district_code, scheme_id, db)

@router.get("/coverage")
def get_scheme_coverage(
    district_code: str = Query("DAHOD"),
    scheme_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user: AppUser = Depends(current_user)
):
    """Returns village-wise scheme saturation & coverage."""
    return compute_coverage(district_code, scheme_id, db)
