import re
import string
from rapidfuzz import fuzz

try:
    from indic_transliteration import sanscript
    from indic_transliteration.sanscript import transliterate
    HAS_INDIC = True
except ImportError:
    HAS_INDIC = False

GUJ_TO_LATIN = {
    'અ': 'a', 'આ': 'aa', 'ઇ': 'i', 'ઈ': 'ee', 'ઉ': 'u', 'ઊ': 'oo', 'ઋ': 'ru',
    'એ': 'e', 'ઐ': 'ai', 'ઓ': 'o', 'ઔ': 'au', 'અં': 'an', 'અઃ': 'ah',
    'ક': 'k', 'ખ': 'kh', 'ગ': 'g', 'ઘ': 'gh', 'ઙ': 'ng',
    'ચ': 'ch', 'છ': 'chh', 'જ': 'j', 'ઝ': 'jh', 'ઞ': 'ny',
    'ટ': 't', 'ઠ': 'th', 'ડ': 'd', 'ઢ': 'dh', 'ણ': 'n',
    'ત': 't', 'થ': 'th', 'દ': 'd', 'ધ': 'dh', 'ન': 'n',
    'પ': 'p', 'ફ': 'f', 'બ': 'b', 'ભ': 'bh', 'મ': 'm',
    'ય': 'y', 'ર': 'r', 'લ': 'l', 'ળ': 'l', 'વ': 'v',
    'શ': 'sh', 'ષ': 'sh', 'સ': 's', 'હ': 'h',
    'ા': 'a', 'િ': 'i', 'ી': 'ee', 'ુ': 'u', 'ૂ': 'oo', 'ૃ': 'ru',
    'ે': 'e', 'ૈ': 'ai', 'ો': 'o', 'ૌ': 'au', 'ં': 'n', 'ઃ': 'h', '્': ''
}

def transliterate_gujarati(text: str) -> str:
    if not text:
        return ""
    if HAS_INDIC:
        try:
            res = transliterate(text, sanscript.GUJARATI, sanscript.ITRANS)
            res = res.lower().replace("aa", "a").replace("ee", "i").replace("oo", "u")
            return res
        except Exception:
            pass
    chars = []
    for char in text:
        chars.append(GUJ_TO_LATIN.get(char, char))
    return "".join(chars)

def normalize_name(name: str) -> str:
    if not name:
        return ""
    
    if any('\u0a80' <= c <= '\u0aff' for c in name):
        name = transliterate_gujarati(name)
    
    name = name.lower()
    name = re.sub(f"[{re.escape(string.punctuation)}]", " ", name)
    
    suffixes = [r"\bbhai\b", r"\bben\b", r"\bkumar\b", r"\bkumari\b", r"\bba\b", r"\blal\b", r"\bdevi\b"]
    for s in suffixes:
        name = re.sub(s, "", name)
        
    tokens = [t.strip() for t in name.split() if t.strip()]
    return " ".join(tokens)

def match_name(a: str, b: str) -> int:
    norm_a = normalize_name(a)
    norm_b = normalize_name(b)
    
    if not norm_a or not norm_b:
        return 0
        
    if norm_a == norm_b:
        return 100
        
    base_score = fuzz.token_sort_ratio(norm_a, norm_b)
    
    tokens_a = norm_a.split()
    tokens_b = norm_b.split()
    
    # Check for initial abbreviation matching (e.g. 'Ramesh K Patel' vs 'Patel Rameshbhai Kanubhai')
    # If one has a 1-letter token that matches the initial of a token in the other
    shared_tokens = set(tokens_a).intersection(set(tokens_b))
    if len(shared_tokens) >= 2:
        return max(int(base_score), 85) # Auto-link threshold
        
    for t_short in tokens_a:
        if len(t_short) == 1:
            for t_long in tokens_b:
                if t_long.startswith(t_short) and len(shared_tokens) >= 1:
                    return max(int(base_score), 85)

    for t_short in tokens_b:
        if len(t_short) == 1:
            for t_long in tokens_a:
                if t_long.startswith(t_short) and len(shared_tokens) >= 1:
                    return max(int(base_score), 85)
            
    return int(round(base_score))
