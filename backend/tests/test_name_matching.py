import pytest
from backend.app.modules.identity.name_matching import match_name, normalize_name

def test_name_matching_gujarati_english_variants():
    # Test pairs specified in Hackathon Spec Part 4 M2:
    # "Patel Rameshbhai Kanubhai" ↔ "Ramesh K Patel" ↔ "રમેશભાઈ પટેલ"
    name_full_en = "Patel Rameshbhai Kanubhai"
    name_initial_en = "Ramesh K Patel"
    name_guj = "રમેશભાઈ પટેલ"

    score_1 = match_name(name_full_en, name_initial_en)
    score_2 = match_name(name_guj, name_initial_en)
    score_3 = match_name(name_guj, name_full_en)

    print(f"Scores: Full vs Initial={score_1}, Guj vs Initial={score_2}, Guj vs Full={score_3}")

    # All these pairs should match with high confidence (>= 70 for review queue or >= 85 for auto-link)
    assert score_1 >= 70, f"Expected match >= 70, got {score_1}"
    assert score_2 >= 70, f"Expected match >= 70, got {score_2}"
    assert score_3 >= 70, f"Expected match >= 70, got {score_3}"

def test_name_normalization_suffix_stripping():
    assert "ramesh" in normalize_name("Rameshbhai")
    assert "kanta" in normalize_name("Kantaben")
    assert "mahesh" in normalize_name("Maheshkumar")
