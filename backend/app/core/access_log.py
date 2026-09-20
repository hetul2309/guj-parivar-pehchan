import logging
from datetime import datetime

from typing import List, Optional
from sqlalchemy.orm import Session

logger = logging.getLogger("access_log")

def log_access(
    actor_id: str,
    family_id: str,
    purpose: str,
    fields: List[str],
    actor_role: str = "officer",
    dept: str = "revenue",
    db: Optional[Session] = None
) -> None:
    """Public helper for logging data access into the tamper-evident ledger (M7).
    Called across modules on every read of family data.
    """
    timestamp = datetime.utcnow().isoformat()
    logger.info(f"[ACCESS LOG] actor={actor_id} family={family_id} purpose={purpose} fields={fields} at {timestamp}")
    try:
        from backend.app.modules.ledger.service import record_access_log
        record_access_log(
            actor_id=actor_id,
            family_id=family_id,
            purpose=purpose,
            fields=fields,
            actor_role=actor_role,
            dept=dept,
            db=db
        )
    except Exception as e:
        logger.warning(f"Could not record access log to cryptographic ledger: {e}")

