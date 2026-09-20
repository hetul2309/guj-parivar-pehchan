"""
Seed script: Generates ~500 synthetic families across Ahmedabad, Dahod, and Kutch
with deliberate hackathon storyline edge cases.
"""

import os
import sys
import random
import uuid
from datetime import date, datetime
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from backend.app.core.db import SessionLocal, Base, engine
from backend.app.core.models import Person, Family, FamilyMember, Relationship, FraudFlag, Document, Application

GUJ_FIRST_NAMES_M = [
    ("Ramesh", "રમેશ"), ("Suresh", "સુરેશ"), ("Mahesh", "મહેશ"), ("Bharat", "ભરત"),
    ("Dinesh", "દિનેશ"), ("Kishore", "કિશોર"), ("Pravin", "પ્રવીણ"), ("Jayesh", "જયેશ"),
    ("Mukesh", "મુકેશ"), ("Ashok", "અશોક"), ("Naresh", "નરેશ"), ("Hasmukh", "હસમુખ"),
    ("Kamlesh", "કમલેશ"), ("Jignesh", "જીગ્નેશ"), ("Chetan", "ચેતન"), ("Bhavesh", "ભાવેશ")
]

GUJ_FIRST_NAMES_F = [
    ("Kanta", "કાન્તા"), ("Shanta", "શાંતા"), ("Manju", "મંજુ"), ("Geeta", "ગીતા"),
    ("Meena", "મીના"), ("Rekha", "રેખા"), ("Pushpa", "પુષ્પા"), ("Savita", "સવિતા"),
    ("Bhavna", "ભાવના"), ("Leela", "લીલા"), ("Jamna", "જમના"), ("Urmila", "ઉર્મિલા"),
    ("Hansha", "હંસા"), ("Daksha", "દક્ષા"), ("Kokila", "કોકિલા"), ("Nayna", "નયના")
]

GUJ_SURNAMES = [
    ("Patel", "પટેલ"), ("Rathva", "રાઠવા"), ("Baria", "બારીયા"), ("Ninama", "નિનામા"),
    ("Muniya", "મુનિયા"), ("Damor", "ડામોર"), ("Chauhan", "ચૌહાણ"), ("Solanki", "સોલંકી"),
    ("Vankar", "વણકર"), ("Parmar", "પરમાર"), ("Jadeja", "જાડેજા"), ("Rabari", "રબારી")
]

OCCUPATIONS = ["ખેતીકામ (Farmer)", "ખેતમજૂરી (Agri Labour)", "પશુપાલન (Dairy)", "છૂટક મજૂરી (Daily Wage)", "ગૃહિણી (Homemaker)", "કારીગર (Artisan)"]
DISTRICTS = ["DAHOD", "AHMEDABAD", "KUTCH"]

def seed_families():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    print("Generating demo families...")

    # 1. SPECIAL HERO STORYLINE PERSON: Kantaben Patel (62, widow, Dahod, no PAN)
    kanta_id = "p_kanta_ben"
    kanta_fid = "GJ-38915001"
    
    # Check if already seeded
    existing_kanta = db.query(Person).filter(Person.person_id == kanta_id).first()
    if not existing_kanta:
        # Kantaben (Head)
        kanta = Person(
            person_id=kanta_id,
            name_en="Kantaben Rameshbhai Patel",
            name_gu="કાન્તાબેન રમેશભાઈ પટેલ",
            dob=date(1964, 1, 1),
            dob_precision="year_only",
            gender="F",
            marital_status="widow",
            occupation="ખેતમજૂરી (Agri Labour)",
            education="પ્રાથમિક (5th pass)",
            disability=False,
            social_category="ST",
            mobile="9876543210",
            mobile_shared=True,
            aadhaar_token="aa-kanta-token-uuid-001",
            aadhaar_last4="8921",
            pan_hash=None, # NO PAN (villager reality)
            is_deceased=False,
            created_via="assisted"
        )
        db.add(kanta)

        # Deceased husband: Rameshbhai Kanubhai Patel
        ramesh = Person(
            person_id="p_ramesh_patel",
            name_en="Ramesh K Patel",
            name_gu="રમેશભાઈ કાનુભાઈ પટેલ",
            dob=date(1960, 5, 12),
            dob_precision="exact",
            gender="M",
            marital_status="married",
            is_deceased=True,
            aadhaar_last4="4129"
        )
        db.add(ramesh)

        # Son: Maheshbhai Rameshbhai Patel (32)
        mahesh = Person(
            person_id="p_mahesh_patel",
            name_en="Maheshbhai Rameshbhai Patel",
            name_gu="મહેશભાઈ રમેશભાઈ પટેલ",
            dob=date(1994, 7, 15),
            dob_precision="exact",
            gender="M",
            marital_status="married",
            occupation="છૂટક મજૂરી",
            social_category="ST",
            mobile="9876543210", # Shared phone!
            mobile_shared=True,
            aadhaar_token="aa-mahesh-token-002",
            aadhaar_last4="3319",
            pan_hash=None
        )
        db.add(mahesh)

        # Daughter-in-law: Gitaben Maheshbhai Patel (28)
        gita = Person(
            person_id="p_gita_patel",
            name_en="Gitaben Maheshbhai Patel",
            name_gu="ગીતાબેન મહેશભાઈ પટેલ",
            dob=date(1998, 3, 22),
            gender="F",
            marital_status="married",
            social_category="ST",
            mobile="9876543210",
            mobile_shared=True,
            aadhaar_last4="7741"
        )
        db.add(gita)

        # Granddaughter: Diksha Maheshbhai Patel (6)
        diksha = Person(
            person_id="p_diksha_patel",
            name_en="Diksha Maheshbhai Patel",
            name_gu="દિક્ષા મહેશભાઈ પટેલ",
            dob=date(2020, 10, 5),
            gender="F",
            marital_status="single",
            social_category="ST",
            aadhaar_last4="1022"
        )
        db.add(diksha)

        # Kantaben's Family Record
        kanta_family = Family(
            family_id=kanta_fid,
            head_person_id=kanta_id,
            address_text="મકાન નં. ૪૨, ફળિયું ૨, દાહોદ ગ્રામ્ય, જિ. દાહોદ - ૩૮૯૧૫૧",
            village_lgd="VIL-DAH-001",
            district_code="DAHOD",
            lat="22.833",
            lng="74.255",
            ration_card_no="022409812345",
            annual_income=45000,
            income_source="talati_cert",
            status="active"
        )
        db.add(kanta_family)

        # Family Memberships
        for pid in [kanta_id, "p_mahesh_patel", "p_gita_patel", "p_diksha_patel"]:
            db.add(FamilyMember(family_id=kanta_fid, person_id=pid))

        # Relationships
        db.add(Relationship(from_person=kanta_id, to_person="p_ramesh_patel", type="spouse"))
        db.add(Relationship(from_person=kanta_id, to_person="p_mahesh_patel", type="parent_of"))
        db.add(Relationship(from_person="p_mahesh_patel", to_person="p_gita_patel", type="spouse"))
        db.add(Relationship(from_person="p_mahesh_patel", to_person="p_diksha_patel", type="parent_of"))

        # Pre-attach Kantaben's verified DigiLocker Income & Caste Cert
        db.add(Document(
            person_id=kanta_id,
            family_id=kanta_fid,
            doc_type="income_cert",
            file_path="/mock/digilocker/income_kanta.pdf",
            status="verified",
            source="digilocker",
            name_match_score=98
        ))
        db.add(Document(
            person_id=kanta_id,
            family_id=kanta_fid,
            doc_type="aadhaar",
            file_path="/mock/uidai/aadhaar_kanta.pdf",
            status="verified",
            source="id_link",
            name_match_score=100
        ))

        # Add initial Widow Pension Application in Draft
        db.add(Application(
            application_id="APP-WIDOW-DEMO1",
            family_id=kanta_fid,
            scheme_id="SCH-WIDOW-PEN",
            applicant_person_id=kanta_id,
            status="draft",
            created_via="assisted"
        ))

    # 2. EDGE CASE 2: Duplicate Aadhaar across two families (Fraud flag)
    dup_token = "aa-duplicate-fraud-token-99"
    f_dup1 = "GJ-77110001"
    f_dup2 = "GJ-77110002"
    if not db.query(Family).filter(Family.family_id == f_dup1).first():
        p_f1 = Person(
            name_en="Solanki Bharatbhai",
            name_gu="સોલંકી ભરતભાઈ",
            dob=date(1982, 4, 10),
            gender="M",
            aadhaar_token=dup_token,
            aadhaar_last4="9009"
        )
        p_f2 = Person(
            name_en="Bharat Kumar Solanki",
            name_gu="ભરતકુમાર સોલંકી",
            dob=date(1982, 4, 10),
            gender="M",
            aadhaar_token=dup_token,
            aadhaar_last4="9009"
        )
        db.add(p_f1)
        db.add(p_f2)
        db.flush()

        db.add(Family(family_id=f_dup1, head_person_id=p_f1.person_id, address_text="Dholka Rural", village_lgd="VIL-AHM-003", district_code="AHMEDABAD", annual_income=60000))
        db.add(Family(family_id=f_dup2, head_person_id=p_f2.person_id, address_text="Sanand Rural", village_lgd="VIL-AHM-001", district_code="AHMEDABAD", annual_income=55000))
        db.add(FamilyMember(family_id=f_dup1, person_id=p_f1.person_id))
        db.add(FamilyMember(family_id=f_dup2, person_id=p_f2.person_id))

        db.add(FraudFlag(
            kind="duplicate_aadhaar",
            person_id=p_f1.person_id,
            family_ids=[f_dup1, f_dup2],
            details={"aadhaar_token": dup_token, "families": [f_dup1, f_dup2], "msg": "Same Aadhaar enrolled in two active families"},
            status="open"
        ))

    # 3. EDGE CASE 3: Elderly Person with bio_fail
    if not db.query(Person).filter(Person.name_en.contains("Elderly")).first():
        p_elder = Person(
            name_en="Elderly Jivabhai Rathva",
            name_gu="જીવાભાઈ રાઠવા (વૃદ્ધ)",
            dob=date(1948, 1, 1),
            dob_precision="year_only",
            gender="M",
            marital_status="widow",
            occupation="વૃદ્ધ પેન્શનર",
            aadhaar_last4="5512",
            mobile="9825012345"
        )
        db.add(p_elder)

    # 4. Generate Remaining Families to reach ~500
    current_count = db.query(Family).count()
    needed = max(0, 500 - current_count)
    print(f"Generating {needed} synthetic rural and semi-urban families...")

    for i in range(needed):
        dist = random.choice(DISTRICTS)
        v_code = f"VIL-{'DAH' if dist=='DAHOD' else ('AHM' if dist=='AHMEDABAD' else 'KUT')}-{random.randint(1, 20):03d}"
        
        sur_en, sur_gu = random.choice(GUJ_SURNAMES)
        head_first_en, head_first_gu = random.choice(GUJ_FIRST_NAMES_M if random.random() > 0.2 else GUJ_FIRST_NAMES_F)
        
        birth_year = random.randint(1955, 1995)
        is_year_only = random.random() < 0.35
        dob = date(birth_year, 1, 1) if is_year_only else date(birth_year, random.randint(1, 12), random.randint(1, 28))
        
        has_pan = random.random() < 0.15 # Only 15% villagers have PAN
        pan_h = uuid.uuid4().hex if has_pan else None
        
        token = str(uuid.uuid4())
        last4 = f"{random.randint(1000, 9999)}"

        head_p = Person(
            name_en=f"{head_first_en} {sur_en}",
            name_gu=f"{head_first_gu} {sur_gu}",
            dob=dob,
            dob_precision="year_only" if is_year_only else "exact",
            gender="M" if head_first_en in [x[0] for x in GUJ_FIRST_NAMES_M] else "F",
            marital_status=random.choice(["married", "married", "married", "widow"]),
            occupation=random.choice(OCCUPATIONS),
            social_category=random.choice(["ST", "OBC", "SC", "GEN"]),
            mobile=f"9{random.randint(100000000, 999999999)}",
            aadhaar_token=token,
            aadhaar_last4=last4,
            pan_hash=pan_h,
            created_via="assisted" if dist == "DAHOD" else "self"
        )
        db.add(head_p)
        db.flush()

        fid = f"GJ-{random.randint(10000000, 99999999)}"
        inc = random.randint(30000, 180000)
        fam = Family(
            family_id=fid,
            head_person_id=head_p.person_id,
            address_text=f"ગામ - {v_code}, જિલ્લો - {dist}",
            village_lgd=v_code,
            district_code=dist,
            lat=str(round(22.8 + random.uniform(-0.4, 0.4), 4)),
            lng=str(round(74.2 + random.uniform(-0.4, 0.4), 4)),
            annual_income=inc,
            income_source="self_declared" if not has_pan else "pan_itr",
            status="active"
        )
        db.add(fam)
        db.add(FamilyMember(family_id=fid, person_id=head_p.person_id))

        # Add 1 to 4 additional family members
        num_extra = random.randint(1, 4)
        for _ in range(num_extra):
            c_first_en, c_first_gu = random.choice(GUJ_FIRST_NAMES_M + GUJ_FIRST_NAMES_F)
            c_dob = date(random.randint(1996, 2022), random.randint(1, 12), random.randint(1, 28))
            c_p = Person(
                name_en=f"{c_first_en} {head_first_en} {sur_en}",
                name_gu=f"{c_first_gu} {head_first_gu} {sur_gu}",
                dob=c_dob,
                gender="M" if c_first_en in [x[0] for x in GUJ_FIRST_NAMES_M] else "F",
                marital_status="single",
                mobile=head_p.mobile, # shared phone
                mobile_shared=True,
                aadhaar_last4=f"{random.randint(1000, 9999)}"
            )
            db.add(c_p)
            db.flush()
            db.add(FamilyMember(family_id=fid, person_id=c_p.person_id))
            db.add(Relationship(from_person=head_p.person_id, to_person=c_p.person_id, type="parent_of"))

        if i % 100 == 0:
            db.commit()

    db.commit()
    print("Seeding completed successfully!")
    db.close()

if __name__ == "__main__":
    seed_families()
