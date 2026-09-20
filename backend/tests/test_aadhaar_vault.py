import re
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.core.db import Base
from backend.app.core.models import AadhaarVault, Person
from backend.app.modules.identity.vault import encrypt_and_vault_aadhaar

def test_aadhaar_vault_encryption():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    raw_aadhaar = "9999 1234 5678"
    token, last4 = encrypt_and_vault_aadhaar(db, raw_aadhaar)

    assert last4 == "5678"
    assert token is not None

    # Verify vault record has encrypted data, NOT the plaintext
    vault_entry = db.query(AadhaarVault).filter(AadhaarVault.aadhaar_token == token).first()
    assert vault_entry is not None
    assert "999912345678" not in vault_entry.enc_number
    assert "12345678" not in vault_entry.enc_number

    # Verify regex test ensuring 12-digit numbers are never exposed
    output_repr = f"token={token}, last4={last4}"
    twelve_digit_pattern = re.compile(r"\b\d{12}\b")
    assert not twelve_digit_pattern.search(output_repr)
