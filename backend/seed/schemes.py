# ~12 Government Schemes for Gujarat Family ID Platform

SEED_SCHEMES = [
    {
        "scheme_id": "SCH_GANGA_SWAROOPA",
        "name_en": "Ganga Swaroopa Financial Assistance (Widow Pension)",
        "name_gu": "ગંગા સ્વરૂપા આર્થિક સહાય યોજના (વિધવા સહાય)",
        "name_hi": "गंगा स्वरूपा आर्थिक सहायता योजना (विधवा पेंशन)",
        "department": "Women & Child Development",
        "description": "Monthly direct benefit transfer pension for destitute widows.",
        "level": "person",
        "benefit_value": 15000,
        "status": "published",
        "required_docs": ["income_cert", "death_cert_spouse", "aadhaar", "bank_passbook"],
        "source_text": "Female widow residing in Gujarat with family annual income under ₹1,20,000.",
        "rule": {
            "and": [
                {"==": [{"var": "person.gender"}, "F"]},
                {"==": [{"var": "person.marital_status"}, "widow"]},
                {">=": [{"var": "person.age"}, 18]},
                {"<": [{"var": "family.annual_income"}, 120000]}
            ]
        }
    },
    {
        "scheme_id": "SCH_VAHALI_DIKRI",
        "name_en": "Vahali Dikri Yojana",
        "name_gu": "વહાલી દીકરી યોજના",
        "name_hi": "व्हाली दीकरी योजना",
        "department": "Women & Child Development",
        "description": "Financial incentives for girl children on school admission and turning 18.",
        "level": "family",
        "benefit_value": 110000,
        "status": "published",
        "required_docs": ["income_cert", "ration_card", "bank_passbook"],
        "source_text": "Families with girl children under 18 and annual income below ₹2,00,000.",
        "rule": {
            "and": [
                {">": [{"var": "family.girls_under_18"}, 0]},
                {"<=": [{"var": "family.annual_income"}, 200000]}
            ]
        }
    },
    {
        "scheme_id": "SCH_OLD_AGE_PENSION",
        "name_en": "Indira Gandhi National Old Age Pension Scheme",
        "name_gu": "ઈન્દિરા ગાંધી રાષ્ટ્રીય વૃદ્ધ પેન્શન યોજના",
        "name_hi": "इंदिरा गांधी राष्ट्रीय वृद्धावस्था पेंशन योजना",
        "department": "Social Justice & Empowerment",
        "description": "Monthly social security pension for senior citizens aged 60+.",
        "level": "person",
        "benefit_value": 12000,
        "status": "published",
        "required_docs": ["income_cert", "aadhaar", "bank_passbook"],
        "source_text": "Citizens aged 60 or above from BPL or low income families (income < ₹1,20,000).",
        "rule": {
            "and": [
                {">=": [{"var": "person.age"}, 60]},
                {"<": [{"var": "family.annual_income"}, 120000]}
            ]
        }
    },
    {
        "scheme_id": "SCH_PM_JAY",
        "name_en": "Ayushman Bharat PM-JAY / Mukhyamantri Amrutam",
        "name_gu": "આયુષ્માન ભારત પીએમ-જેવાય / મુખ્યમંત્રી અમૃતમ",
        "name_hi": "आयुष्मान भारत पीएम-जय / मुख्यमंत्री अमृतम",
        "department": "Health & Family Welfare",
        "description": "Secondary and tertiary cashless hospitalization cover up to ₹10 lakh per family.",
        "level": "family",
        "benefit_value": 1000000,
        "status": "published",
        "required_docs": ["ration_card", "income_cert", "aadhaar"],
        "source_text": "Families with valid ration card and annual income below ₹4,00,000.",
        "rule": {
            "and": [
                {"==": [{"var": "family.has_ration_card"}, True]},
                {"<=": [{"var": "family.annual_income"}, 400000]}
            ]
        }
    },
    {
        "scheme_id": "SCH_PMAY_G",
        "name_en": "Pradhan Mantri Awaas Yojana - Gramin",
        "name_gu": "પ્રધાનમંત્રી આવાસ યોજના - ગ્રામીણ",
        "name_hi": "प्रधानमंत्री आवास योजना - ग्रामीण",
        "department": "Panchayat, Rural Housing & Rural Dev",
        "description": "Financial assistance of ₹1,20,000 for construction of pucca house.",
        "level": "family",
        "benefit_value": 120000,
        "status": "published",
        "required_docs": ["income_cert", "ration_card", "bank_passbook"],
        "source_text": "Houseless or kutcha house rural households with income under ₹1,50,000.",
        "rule": {
            "and": [
                {"<": [{"var": "family.annual_income"}, 150000]},
                {"!=": [{"var": "family.district_code"}, "AHMEDABAD"]}
            ]
        }
    },
    {
        "scheme_id": "SCH_PM_KISAN",
        "name_en": "PM Kisan Samman Nidhi",
        "name_gu": "પીએમ કિસાન સન્માન નિધિ",
        "name_hi": "पीएम किसान सम्मान निधि",
        "department": "Agriculture, Farmers Welfare & Co-operation",
        "description": "Direct income support of ₹6,000 per year for farmer families.",
        "level": "person",
        "benefit_value": 6000,
        "status": "published",
        "required_docs": ["aadhaar", "bank_passbook"],
        "source_text": "Farmer households with agriculture land.",
        "rule": {
            "and": [
                {"==": [{"var": "person.occupation"}, "farmer"]},
                {"==": [{"var": "person.is_head"}, True]}
            ]
        }
    },
    {
        "scheme_id": "SCH_KUNVARBAI_MAMERU",
        "name_en": "Kunvarbai nu Mameru Yojana",
        "name_gu": "કુંવરબાઈનું મામેરું યોજના",
        "name_hi": "कुंवरबाई नु मामेरू योजना",
        "department": "Social Justice & Empowerment",
        "description": "Financial assistance of ₹12,000 on the marriage of girl child.",
        "level": "person",
        "benefit_value": 12000,
        "status": "published",
        "required_docs": ["caste_cert", "income_cert", "aadhaar"],
        "source_text": "Girls aged 18+ getting married from SC/ST/OBC categories with income under ₹1,50,000.",
        "rule": {
            "and": [
                {"==": [{"var": "person.gender"}, "F"]},
                {">=": [{"var": "person.age"}, 18]},
                {"in": [{"var": "person.social_category"}, ["SC", "ST", "OBC"]]},
                {"<": [{"var": "family.annual_income"}, 150000]}
            ]
        }
    },
    {
        "scheme_id": "SCH_DIVYANG_PENSION",
        "name_en": "Sant Surdas Divyang Pension",
        "name_gu": "સંત સૂરદાસ દિવ્યાંગ પેન્શન યોજના",
        "name_hi": "संत सूरदास दिव्यांग पेंशन योजना",
        "department": "Social Justice & Empowerment",
        "description": "Monthly pension support for persons with special abilities / disability.",
        "level": "person",
        "benefit_value": 12000,
        "status": "published",
        "required_docs": ["disability_cert", "income_cert", "aadhaar", "bank_passbook"],
        "source_text": "Person with disability living in low income family (< ₹1,50,000).",
        "rule": {
            "and": [
                {"==": [{"var": "person.disability"}, True]},
                {"<": [{"var": "family.annual_income"}, 150000]}
            ]
        }
    },
    {
        "scheme_id": "SCH_VIDYA_LAKSHMI_TRANSPORT",
        "name_en": "Saraswati Sadhana Bicycle / Remote School Transport",
        "name_gu": "સરસ્વતી સાધના સાયકલ યોજના / શાળા વાહન ભથ્થું",
        "name_hi": "सरस्वती साधना साइकिल योजना / सुदूर विद्यालय परिवहन",
        "department": "Education Department",
        "description": "Free bicycle or travel stipend for students living > 3 km from school.",
        "level": "person",
        "benefit_value": 4500,
        "status": "published",
        "required_docs": ["aadhaar"],
        "source_text": "Students aged 10-17 living more than 3 km from the nearest school.",
        "rule": {
            "and": [
                {">=": [{"var": "person.age"}, 10]},
                {"<=": [{"var": "person.age"}, 17]},
                {">": [{"var": "geo.nearest_school_km"}, 3.0]}
            ]
        }
    },
    {
        "scheme_id": "SCH_SCHOLARSHIP_POSTMATRIC",
        "name_en": "Post-Matric Scholarship for Reserved Categories",
        "name_gu": "પોસ્ટ મેટ્રિક શિષ્યવૃત્તિ યોજના",
        "name_hi": "पोस्ट-मैट्रिक छात्रवृत्ति योजना",
        "department": "Social Justice & Empowerment",
        "description": "Tuition and maintenance fee reimbursement for higher education.",
        "level": "person",
        "benefit_value": 24000,
        "status": "published",
        "required_docs": ["caste_cert", "income_cert", "aadhaar", "bank_passbook"],
        "source_text": "Students in higher education (age 16-25) from SC/ST/OBC with income < ₹2,50,000.",
        "rule": {
            "and": [
                {">=": [{"var": "person.age"}, 16]},
                {"<=": [{"var": "person.age"}, 25]},
                {"in": [{"var": "person.social_category"}, ["SC", "ST", "OBC"]]},
                {"<": [{"var": "family.annual_income"}, 250000]}
            ]
        }
    },
    {
        "scheme_id": "SCH_KISAN_SAHAY",
        "name_en": "Mukhyamantri Kisan Sahay Yojana",
        "name_gu": "મુખ્યમંત્રી કિસાન સહાય યોજના",
        "name_hi": "मुख्यमंत्री किसान सहाय योजना",
        "department": "Agriculture, Farmers Welfare & Co-operation",
        "description": "Crop loss protection compensation without premium payment for farmers.",
        "level": "family",
        "benefit_value": 20000,
        "status": "published",
        "required_docs": ["ration_card", "bank_passbook"],
        "source_text": "Farming families in rural districts with income under ₹3,00,000.",
        "rule": {
            "and": [
                {"<=": [{"var": "family.annual_income"}, 300000]},
                {"!=": [{"var": "family.district_code"}, "AHMEDABAD"]}
            ]
        }
    },
    {
        "scheme_id": "SCH_NFBS",
        "name_en": "National Family Benefit Scheme (NFBS)",
        "name_gu": "રાષ્ટ્રીય કુટુંબ સહાય યોજના (સંકટમોચન)",
        "name_hi": "राष्ट्रीय पारिवारिक लाभ योजना (संकटमोचन)",
        "department": "Social Justice & Empowerment",
        "description": "Lump-sum grant of ₹20,000 to BPL household upon death of primary breadwinner.",
        "level": "family",
        "benefit_value": 20000,
        "status": "published",
        "required_docs": ["death_cert_spouse", "income_cert", "bank_passbook"],
        "source_text": "Families whose annual income is under ₹1,00,000 with a deceased earning member.",
        "rule": {
            "and": [
                {"<": [{"var": "family.annual_income"}, 100000]}
            ]
        }
    }
]
