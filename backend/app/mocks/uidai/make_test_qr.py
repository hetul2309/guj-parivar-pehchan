"""
Mocks for UIDAI: Offline Secure QR generation & decoding, OTP e-KYC, and Biometrics.
"""

import base64
import json
import uuid

def generate_test_qr_payload(
    name_en: str = "Kantaben Patel",
    name_gu: str = "કાન્તાબેન પટેલ",
    dob: str = "1964-01-01",
    gender: str = "F",
    address: str = "Dahod Rural, Dahod, Gujarat - 389151",
    aadhaar_last4: str = "8921"
) -> str:
    """Generates a realistic base64-encoded mock UIDAI Secure QR payload."""
    data = {
        "uidai_signature": "MOCK_UIDAI_ED25519_SIG_VALID_2026",
        "reference_id": f"QR-{uuid.uuid4().hex[:12]}",
        "name": name_en,
        "name_local": name_gu,
        "dob": dob,
        "dob_precision": "year_only" if dob.endswith("-01-01") else "exact",
        "gender": gender,
        "address": address,
        "aadhaar_last4": aadhaar_last4,
        "pincode": "389151",
        "state": "Gujarat"
    }
    raw_bytes = json.dumps(data).encode("utf-8")
    return base64.b64encode(raw_bytes).decode("utf-8")

def decode_secure_qr(qr_data_str: str) -> dict:
    """Decodes UIDAI Secure QR or test QR payload."""
    try:
        raw = base64.b64decode(qr_data_str.strip())
        data = json.loads(raw.decode("utf-8"))
        return {
            "valid": True,
            "name_en": data.get("name"),
            "name_gu": data.get("name_local") or data.get("name"),
            "dob": data.get("dob"),
            "dob_precision": data.get("dob_precision", "exact"),
            "gender": data.get("gender", "F"),
            "address": data.get("address"),
            "aadhaar_last4": data.get("aadhaar_last4", "8921")
        }
    except Exception:
        # Fallback if json string passed directly
        try:
            data = json.loads(qr_data_str)
            return {
                "valid": True,
                "name_en": data.get("name", "Kantaben Patel"),
                "name_gu": data.get("name_local", "કાન્તાબેન પટેલ"),
                "dob": data.get("dob", "1964-01-01"),
                "dob_precision": data.get("dob_precision", "year_only"),
                "gender": data.get("gender", "F"),
                "address": data.get("address", "Dahod Rural, Dahod"),
                "aadhaar_last4": data.get("aadhaar_last4", "8921")
            }
        except Exception:
            return {
                "valid": False,
                "error": "Invalid Aadhaar QR Code structure"
            }
