from typing import Any, Dict, List, Tuple

ALLOWED_VARIABLES = {
    "person.age", "person.age_approx", "person.gender", "person.marital_status",
    "person.occupation", "person.education", "person.disability", "person.social_category",
    "person.is_head",
    "family.annual_income", "family.size", "family.district_code", "family.has_ration_card",
    "family.children_under_6", "family.girls_under_18",
    "geo.nearest_school_km", "geo.nearest_phc_km"
}

def resolve_var(path: str, context: Dict[str, Any]) -> Any:
    parts = path.split(".")
    curr = context
    for p in parts:
        if isinstance(curr, dict):
            curr = curr.get(p)
        else:
            return None
    return curr

def validate_rule_variables(rule: Any) -> Tuple[bool, List[str]]:
    """Recursively validates that all 'var' accesses are within ALLOWED_VARIABLES."""
    errors = []
    def _walk(node):
        if isinstance(node, dict):
            if "var" in node:
                var_name = node["var"]
                if var_name not in ALLOWED_VARIABLES:
                    errors.append(f"Disallowed variable: '{var_name}'")
            for v in node.values():
                _walk(v)
        elif isinstance(node, list):
            for item in node:
                _walk(item)

    _walk(rule)
    return len(errors) == 0, errors

def format_clause_reason(op: str, var_name: str, actual_val: Any, target_val: Any, passed: bool) -> Dict[str, str]:
    """Generates multilingual explanation strings for a leaf comparison."""
    # Variable friendly labels
    labels = {
        "person.age": ("Age", "ઉંમર", "आयु"),
        "person.gender": ("Gender", "જાતિ", "लिंग"),
        "person.marital_status": ("Marital Status", "વૈવાહિક સ્થિતિ", "वैवाहिक स्थिति"),
        "person.disability": ("Disability", "દિવ્યાંગતા", "दिव्यांगता"),
        "person.social_category": ("Social Category", "સામાજિક શ્રેણી", "सामाजिक श्रेणी"),
        "family.annual_income": ("Annual Income", "વાર્ષિક આવક", "वार्षिक आय"),
        "family.size": ("Family Size", "કુટુંબનું કદ", "परिवार का आकार"),
        "family.has_ration_card": ("Ration Card", "રેશન કાર્ડ", "राशन कार्ड"),
        "geo.nearest_school_km": ("Nearest School", "નજીકની શાળા", "निकटतम विद्यालय"),
        "geo.nearest_phc_km": ("Nearest PHC", "નજીકનું પ્રાથમિક આરોગ્ય કેન્દ્ર", "निकटतम स्वास्थ्य केंद्र")
    }

    en_lbl, gu_lbl, hi_lbl = labels.get(var_name, (var_name, var_name, var_name))
    status_icon = "✓" if passed else "✗"

    # Currency format if income
    if "income" in var_name:
        act_fmt = f"₹{actual_val:,}" if isinstance(actual_val, (int, float)) else str(actual_val)
        tgt_fmt = f"₹{target_val:,}" if isinstance(target_val, (int, float)) else str(target_val)
    elif "km" in var_name:
        act_fmt = f"{actual_val} km"
        tgt_fmt = f"{target_val} km"
    elif "age" in var_name:
        act_fmt = f"{actual_val} yrs"
        tgt_fmt = f"{target_val} yrs"
    else:
        act_fmt = str(actual_val)
        tgt_fmt = str(target_val)

    # Friendly value translations
    val_translations = {
        "widow": ("Widow", "ગંગા સ્વરૂપા (વિધવા)", "विधवा"),
        "married": ("Married", "પરિણીત", "विवाहित"),
        "single": ("Single", "અપરિણીત", "अविवाहित"),
        "F": ("Female", "સ્ત્રી", "महिला"),
        "M": ("Male", "પુરુષ", "पुरुष"),
        "O": ("Other", "અન્ય", "अन्य")
    }

    act_en, act_gu, act_hi = (val_translations.get(actual_val, (act_fmt, act_fmt, act_fmt))
                              if isinstance(actual_val, (str, int, float, bool))
                              else (act_fmt, act_fmt, act_fmt))
    tgt_en, tgt_gu, tgt_hi = (val_translations.get(target_val, (tgt_fmt, tgt_fmt, tgt_fmt))
                              if isinstance(target_val, (str, int, float, bool))
                              else (tgt_fmt, tgt_fmt, tgt_fmt))

    if op in ("<", "<=", ">", ">="):
        text_en = f"{status_icon} {en_lbl} {act_fmt} {op} {tgt_fmt}"
        text_gu = f"{status_icon} {gu_lbl} {act_fmt} {op} {tgt_fmt}"
        text_hi = f"{status_icon} {hi_lbl} {act_fmt} {op} {tgt_fmt}"
    elif op == "==":
        text_en = f"{status_icon} {en_lbl} is '{tgt_en}' (found: {act_en})"
        text_gu = f"{status_icon} {gu_lbl}: {act_gu}"
        text_hi = f"{status_icon} {hi_lbl}: {act_hi}"
    elif op == "in":
        text_en = f"{status_icon} {en_lbl} '{act_fmt}' in {tgt_fmt}"
        text_gu = f"{status_icon} {gu_lbl} '{act_fmt}' માન્ય શ્રેણીમાં છે"
        text_hi = f"{status_icon} {hi_lbl} '{act_fmt}' मान्य श्रेणी में है"
    else:
        text_en = f"{status_icon} {en_lbl} {op} {tgt_fmt}"
        text_gu = f"{status_icon} {gu_lbl} {op} {tgt_fmt}"
        text_hi = f"{status_icon} {hi_lbl} {op} {tgt_fmt}"

    return {
        "text_en": text_en,
        "text_gu": text_gu,
        "text_hi": text_hi,
        "passed": passed
    }

class RuleEvaluator:
    """Custom JSON-Logic evaluator that tracks pass/fail for every leaf comparison."""

    def __init__(self, context: Dict[str, Any]):
        self.context = context
        self.explanations: List[Dict[str, Any]] = []

    def evaluate(self, node: Any) -> Any:
        if not isinstance(node, dict):
            return node

        for op, args in node.items():
            if op == "var":
                var_name = args if isinstance(args, str) else (args[0] if isinstance(args, list) else "")
                return resolve_var(var_name, self.context)

            elif op == "and":
                if not isinstance(args, list):
                    args = [args]
                result = True
                for item in args:
                    res = bool(self.evaluate(item))
                    if not res:
                        result = False
                return result

            elif op == "or":
                if not isinstance(args, list):
                    args = [args]
                result = False
                for item in args:
                    if bool(self.evaluate(item)):
                        result = True
                return result

            elif op == "!":
                inner = args[0] if isinstance(args, list) else args
                return not bool(self.evaluate(inner))

            elif op in ("==", "!=", "<", "<=", ">", ">=", "in"):
                left_node = args[0]
                right_node = args[1]
                left_val = self.evaluate(left_node)
                right_val = self.evaluate(right_node)

                # Determine variable name if present on left
                var_name = left_node.get("var") if isinstance(left_node, dict) and "var" in left_node else "condition"

                # Comparison logic
                passed = False
                try:
                    if op == "==":
                        passed = (left_val == right_val)
                    elif op == "!=":
                        passed = (left_val != right_val)
                    elif op == "<":
                        passed = (float(left_val) < float(right_val))
                    elif op == "<=":
                        passed = (float(left_val) <= float(right_val))
                    elif op == ">":
                        passed = (float(left_val) > float(right_val))
                    elif op == ">=":
                        passed = (float(left_val) >= float(right_val))
                    elif op == "in":
                        passed = (left_val in right_val) if right_val is not None else False
                except (ValueError, TypeError):
                    passed = False

                if var_name:
                    reason = format_clause_reason(op, var_name, left_val, right_val, passed)
                    self.explanations.append(reason)

                return passed

        return True

def evaluate_rule(rule: Dict[str, Any], context: Dict[str, Any]) -> Tuple[bool, List[Dict[str, Any]]]:
    """Evaluates rule and returns (is_eligible, list_of_clause_reasons)."""
    evaluator = RuleEvaluator(context)
    result = bool(evaluator.evaluate(rule))
    return result, evaluator.explanations
