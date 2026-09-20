import pytest
from backend.app.modules.applications.router import VALID_TRANSITIONS

def test_application_valid_transitions():
    assert "submitted" in VALID_TRANSITIONS["draft"]
    assert "approved" in VALID_TRANSITIONS["submitted"]
    assert "rejected" in VALID_TRANSITIONS["submitted"]
    assert "disbursed" in VALID_TRANSITIONS["approved"]
    assert "submitted" in VALID_TRANSITIONS["rejected"]
    assert "disbursed" not in VALID_TRANSITIONS["draft"]
