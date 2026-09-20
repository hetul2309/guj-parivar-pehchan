"""
i18n translation strings and formatting for backend notifications and SMS
"""

TRANSLATIONS = {
    "sms.enrollment_success": {
        "gu": "નમસ્તે {name}, ગુજરાત ફેમિલી આઈડી {family_id} સફળતાપૂર્વક જનરેટ થઈ ગયું છે.",
        "hi": "नमस्ते {name}, गुजरात फैमिली आईडी {family_id} सफलतापूर्वक बन गया है।",
        "en": "Hello {name}, your Gujarat Family ID {family_id} has been successfully generated."
    },
    "sms.application_submitted": {
        "gu": "તમારી યોજના અરજી {application_id} ({scheme_name}) સફળતાપૂર્વક સ્વીકારાઈ છે.",
        "hi": "आपकी योजना अर्ज़ी {application_id} ({scheme_name}) सफलतापूर्वक जमा हो गई है।",
        "en": "Your scheme application {application_id} ({scheme_name}) has been submitted."
    },
    "sms.application_approved": {
        "gu": "અભિનંદન! તમારી અરજી {application_id} ({scheme_name}) મંજૂર કરવામાં આવી છે. ટૂંક સમયમાં સહાય ખાતામાં જમા થશે.",
        "hi": "बधाई! आपकी अर्ज़ी {application_id} ({scheme_name}) मंज़ूर हो गई है। जल्द ही सहायता जमा होगी।",
        "en": "Congratulations! Your application {application_id} ({scheme_name}) has been approved."
    },
    "sms.application_disbursed": {
        "gu": "યોજના {scheme_name} ની સહાય રકમ ₹{amount} તમારા બેંક ખાતામાં જમા થઈ ગઈ છે.",
        "hi": "योजना {scheme_name} की सहायता राशि ₹{amount} आपके बैंक खाते में जमा हो गई है।",
        "en": "Benefit amount of ₹{amount} for {scheme_name} has been disbursed to your account."
    },
    "sms.application_rejected": {
        "gu": "તમારી અરજી {application_id} અસ્વીકાર થઈ છે. કારણ: {reason}. વિગતો માટે અથવા અપીલ માટે સહાયકનો સંપર્ક કરો.",
        "hi": "आपकी अर्ज़ी {application_id} अस्वीकार हुई है। कारण: {reason}। विवरण के लिए शिकायत सहायक देखें।",
        "en": "Your application {application_id} was rejected. Reason: {reason}."
    },
    "sms.grievance_filed": {
        "gu": "તમારી ફરિયાદ નંબર {grv_id} નોંધાઈ છે. અધિકારી દ્વારા ૪૮ કલાકમાં તપાસ હાથ ધરાશે.",
        "hi": "आपकी शिकायत संख्या {grv_id} दर्ज हो गई है। 48 घंटे में जांच होगी।",
        "en": "Your grievance {grv_id} has been registered and assigned for review."
    },
    "notify.scheme_eligible": {
        "gu": "નવી યોજના ઉપલબ્ધ: {scheme_name}",
        "hi": "नई योजना उपलब्ध: {scheme_name}",
        "en": "New eligible scheme available: {scheme_name}"
    }
}

def translate(key: str, lang: str = "gu", **params) -> str:
    template_dict = TRANSLATIONS.get(key, {})
    template = template_dict.get(lang) or template_dict.get("en") or key
    try:
        return template.format(**params)
    except Exception:
        return template
