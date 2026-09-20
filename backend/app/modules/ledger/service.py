import hashlib
import json
import datetime
import threading
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from backend.app.core.db import SessionLocal
from backend.app.modules.ledger.models import AccessLog, ConsentRevocation

MANDATORY_PURPOSES = {"scheme_verification", "application_processing", "grievance"}
OPTIONAL_PURPOSES = {"analytics", "health_outreach"}

# Thread lock to serialize appends and prevent chain forks
_chain_lock = threading.Lock()

def canonical_json(data: dict) -> str:
    return json.dumps(data, sort_keys=True, separators=(",", ":"))

def compute_hash(prev_hash: str, row_dict: dict) -> str:
    serialized = prev_hash + canonical_json(row_dict)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

def record_access_log(
    actor_id: str,
    family_id: str,
    purpose: str,
    fields: List[str],
    actor_role: str = "officer",
    dept: str = "revenue",
    db: Optional[Session] = None
) -> AccessLog:
    """Core log_access function. Checks revocation, calculates SHA-256 hash chain, appends row."""
    with _chain_lock:
        should_close = False
        if db is None:
            db = SessionLocal()
            should_close = True
        try:
            # Check revocation for optional purposes
            if purpose in OPTIONAL_PURPOSES:
                revocation = db.query(ConsentRevocation).filter(
                    ConsentRevocation.family_id == family_id,
                    ConsentRevocation.purpose == purpose
                ).first()
                if revocation:
                    raise PermissionError(
                        f"Access denied: Citizen has revoked consent for '{purpose}' to department '{dept}'."
                    )

            # Get the latest entry to determine prev_hash
            last_entry = db.query(AccessLog).order_by(AccessLog.id.desc()).first()
            prev_hash = last_entry.hash if last_entry else ("0" * 64)
            now = datetime.datetime.utcnow()

            # Canonical row data (excluding hash)
            row_data = {
                "actor_id": actor_id,
                "actor_role": actor_role,
                "dept": dept,
                "family_id": family_id,
                "purpose": purpose,
                "fields": sorted(fields) if fields else [],
                "ts": now.strftime("%Y-%m-%dT%H:%M:%SZ")
            }

            row_hash = compute_hash(prev_hash, row_data)

            log_entry = AccessLog(
                actor_id=actor_id,
                actor_role=actor_role,
                dept=dept,
                family_id=family_id,
                purpose=purpose,
                fields=row_data["fields"],
                ts=now,
                prev_hash=prev_hash,
                hash=row_hash
            )
            db.add(log_entry)
            db.commit()
            db.refresh(log_entry)
            return log_entry
        finally:
            if should_close:
                db.close()

def verify_chain(db: Session) -> Dict[str, Any]:
    """Walks the entire access_log hash chain and returns verification status."""
    logs = db.query(AccessLog).order_by(AccessLog.id.asc()).all()
    if not logs:
        return {"valid": True, "total_records": 0, "broken_at_id": None, "message": "Ledger is empty"}

    expected_prev_hash = "0" * 64

    for log in logs:
        # Check prev_hash continuity
        if log.prev_hash != expected_prev_hash:
            return {
                "valid": False,
                "total_records": len(logs),
                "broken_at_id": log.id,
                "message": f"Broken chain at ID {log.id}: prev_hash mismatch"
            }

        # Recompute hash
        row_data = {
            "actor_id": log.actor_id,
            "actor_role": log.actor_role,
            "dept": log.dept,
            "family_id": log.family_id,
            "purpose": log.purpose,
            "fields": sorted(log.fields) if log.fields else [],
            "ts": log.ts.strftime("%Y-%m-%dT%H:%M:%SZ")
        }
        calculated_hash = compute_hash(expected_prev_hash, row_data)
        if log.hash != calculated_hash:
            return {
                "valid": False,
                "total_records": len(logs),
                "broken_at_id": log.id,
                "message": f"Tampering detected at ID {log.id}: calculated hash does not match stored hash"
            }

        expected_prev_hash = log.hash

    return {
        "valid": True,
        "total_records": len(logs),
        "broken_at_id": None,
        "message": "Chain integrity verified. All records are valid and untampered."
    }

def revoke_family_consent(db: Session, family_id: str, dept: str, purpose: str) -> ConsentRevocation:
    if purpose in MANDATORY_PURPOSES:
        raise ValueError(f"Cannot revoke mandatory purpose: {purpose}")
    
    existing = db.query(ConsentRevocation).filter(
        ConsentRevocation.family_id == family_id,
        ConsentRevocation.dept == dept,
        ConsentRevocation.purpose == purpose
    ).first()
    if existing:
        return existing
    
    rev = ConsentRevocation(family_id=family_id, dept=dept, purpose=purpose)
    db.add(rev)
    db.commit()
    db.refresh(rev)
    return rev

def unrevoke_family_consent(db: Session, family_id: str, dept: str, purpose: str) -> bool:
    rev = db.query(ConsentRevocation).filter(
        ConsentRevocation.family_id == family_id,
        ConsentRevocation.dept == dept,
        ConsentRevocation.purpose == purpose
    ).first()
    if rev:
        db.delete(rev)
        db.commit()
        return True
    return False
