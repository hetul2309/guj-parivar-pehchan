import logging
from backend.app.core.db import SessionLocal
from backend.app.core.models import Notification

logger = logging.getLogger("notify")

def notify(text_key: str, user_id: str | None = None, district_code: str | None = None,
           role: str | None = None, **params) -> None:
    db = SessionLocal()
    try:
        notif = Notification(
            user_id=user_id,
            district_code=district_code,
            role=role,
            text_key=text_key,
            params=params,
            read=False
        )
        db.add(notif)
        db.commit()
        logger.info(f"Notification queued: {text_key} for user={user_id} district={district_code} role={role}")
    except Exception as e:
        logger.error(f"Failed to record notification: {e}")
        db.rollback()
    finally:
        db.close()
