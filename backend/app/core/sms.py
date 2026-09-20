import logging
from backend.app.core.db import SessionLocal
from backend.app.core.models import SmsOutbox
from backend.app.core.i18n import translate

logger = logging.getLogger("sms")

def send_sms(mobile: str, text_key: str, lang: str = "gu", **params) -> None:
    message = translate(text_key, lang=lang, **params)
    logger.info(f"[SMS to {mobile} ({lang})]: {message}")
    print(f"📱 [SMS MOCK -> {mobile}]: {message}")
    
    db = SessionLocal()
    try:
        sms_entry = SmsOutbox(
            mobile=mobile,
            text_key=text_key,
            lang=lang,
            message=message
        )
        db.add(sms_entry)
        db.commit()
    except Exception as e:
        logger.error(f"Failed to record SMS in outbox: {e}")
        db.rollback()
    finally:
        db.close()
