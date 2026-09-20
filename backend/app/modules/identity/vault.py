import os
import uuid
import base64
from cryptography.fernet import Fernet
from sqlalchemy.orm import Session
from backend.app.core.models import AadhaarVault

# Generate or use fixed Fernet key from env
_ENV_KEY = os.getenv("AADHAAR_VAULT_KEY")
if _ENV_KEY:
    try:
        _CIPHER = Fernet(_ENV_KEY.encode() if isinstance(_ENV_KEY, str) else _ENV_KEY)
    except Exception:
        # Pad or generate consistent key
        _KEY = Fernet.generate_key()
        _CIPHER = Fernet(_KEY)
else:
    # Deterministic test key
    _KEY = b"OqJ9mZ-c8y0K4m_vKqH2-n7P2o3Q4R5S6T7U8V9W0X="
    try:
        _CIPHER = Fernet(_KEY)
    except Exception:
        _KEY = Fernet.generate_key()
        _CIPHER = Fernet(_KEY)

def encrypt_and_vault_aadhaar(db: Session, full_aadhaar: str) -> tuple[str, str]:
    """
    Encrypts full 12-digit Aadhaar number with Fernet into aadhaar_vault table.
    Returns (aadhaar_token, aadhaar_last4).
    Full Aadhaar is NEVER returned or stored in plaintext.
    """
    cleaned = full_aadhaar.replace(" ", "").replace("-", "")
    last4 = cleaned[-4:] if len(cleaned) >= 4 else "0000"
    
    enc_number = _CIPHER.encrypt(cleaned.encode("utf-8")).decode("utf-8")
    token = str(uuid.uuid4())
    
    vault_entry = AadhaarVault(aadhaar_token=token, enc_number=enc_number)
    db.add(vault_entry)
    db.commit()
    
    return token, last4
