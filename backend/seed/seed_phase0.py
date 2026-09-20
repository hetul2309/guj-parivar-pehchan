"""
Phase 0 Seeding: Demo Users and Synthetic Villages (Ahmedabad, Dahod, Kutch)
"""
import os
import sys
from pathlib import Path

# Ensure root directory is in sys.path
BASE_DIR = Path(__file__).resolve().parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from backend.app.core.db import SessionLocal, Base, engine
from backend.app.core.models import AppUser, Village, Person, Family, FamilyMember
from backend.app.core.auth import get_password_hash

DEMO_USERS = [
    {
        "user_id": "citizen_kanta",
        "role": "citizen",
        "district_code": "DAHOD",
        "person_id": "p_kanta_ben",
        "display_name": "કાન્તાબેન પટેલ (Kantaben)",
        "password_hash": get_password_hash("demo123")
    },
    {
        "user_id": "vce_dahod",
        "role": "operator",
        "district_code": "DAHOD",
        "display_name": "વિષ્ણુભાઈ રાવળ (VCE Dahod)",
        "password_hash": get_password_hash("demo123")
    },
    {
        "user_id": "officer_dahod",
        "role": "officer",
        "district_code": "DAHOD",
        "display_name": "ડિસ્ટ્રિક્ટ સોશિયલ વેલ્ફેર ઓફિસર (Dahod)",
        "password_hash": get_password_hash("demo123")
    },
    {
        "user_id": "officer_kutch",
        "role": "officer",
        "district_code": "KUTCH",
        "display_name": "ડિસ્ટ્રિક્ટ ઓફિસર (Kutch/Bhuj)",
        "password_hash": get_password_hash("demo123")
    },
    {
        "user_id": "admin_social",
        "role": "dept_admin",
        "district_code": None,
        "display_name": "સામાજિક ન્યાય વિભાગ એડમિન (Dept Admin)",
        "password_hash": get_password_hash("demo123")
    },
    {
        "user_id": "superadmin",
        "role": "super_admin",
        "district_code": None,
        "display_name": "સ્ટેટ પોર્ટલ સુપર એડમિન (Super Admin)",
        "password_hash": get_password_hash("demo123")
    }
]

# ~20 villages per district with approximate coordinates:
# Dahod: 22.83N, 74.25E (tribal)
# Ahmedabad: 23.02N, 72.57E (urban/semi-urban)
# Kutch: 23.25N, 69.67E (remote)
DISTRICT_VILLAGES = [
    # Dahod
    ("VIL-DAH-001", "Dahod Rural", "દાહોદ ગ્રામ્ય", "DAHOD", 22.833, 74.255),
    ("VIL-DAH-002", "Garbada", "ગરબાડા", "DAHOD", 22.716, 74.316),
    ("VIL-DAH-003", "Limkheda", "લીમખેડા", "DAHOD", 22.833, 74.050),
    ("VIL-DAH-004", "Zalod", "ઝાલોદ", "DAHOD", 23.133, 74.150),
    ("VIL-DAH-005", "Fatepura", "ફતેપુરા", "DAHOD", 23.183, 74.000),
    ("VIL-DAH-006", "Devgadh Baria", "દેવગઢ બારીયા", "DAHOD", 22.700, 73.900),
    ("VIL-DAH-007", "Dhanpur", "ધાનપુર", "DAHOD", 22.650, 74.166),
    ("VIL-DAH-008", "Sanjeli", "સંજેલી", "DAHOD", 23.016, 74.033),
    ("VIL-DAH-009", "Chilakota", "ચીલાકોટા", "DAHOD", 22.780, 74.210),
    ("VIL-DAH-010", "Dungara", "ડુંગરા", "DAHOD", 22.880, 74.300),
    ("VIL-DAH-011", "Jekot", "જેકોટ", "DAHOD", 22.810, 74.180),
    ("VIL-DAH-012", "Mandavav", "માંડવાવ", "DAHOD", 22.840, 74.230),
    ("VIL-DAH-013", "Bavka", "બાવકા", "DAHOD", 22.790, 74.310),
    ("VIL-DAH-014", "Gamdi", "ગામડી", "DAHOD", 22.760, 74.220),
    ("VIL-DAH-015", "Rachhda", "રાછડા", "DAHOD", 22.820, 74.290),
    ("VIL-DAH-016", "Muvaliya", "મુવાલીયા", "DAHOD", 22.860, 74.210),
    ("VIL-DAH-017", "Raliati", "રળિયાતી", "DAHOD", 22.850, 74.240),
    ("VIL-DAH-018", "Bordal", "બોરદલ", "DAHOD", 22.900, 74.270),
    ("VIL-DAH-019", "Varod", "વરોડ", "DAHOD", 22.750, 74.350),
    ("VIL-DAH-020", "Piplod", "પીપલોદ", "DAHOD", 22.770, 73.950),

    # Ahmedabad
    ("VIL-AHM-001", "Sanand Rural", "સાણંદ ગ્રામ્ય", "AHMEDABAD", 22.980, 72.380),
    ("VIL-AHM-002", "Bavla", "બાવળા", "AHMEDABAD", 22.830, 72.360),
    ("VIL-AHM-003", "Dholka", "ધોળકા", "AHMEDABAD", 22.720, 72.460),
    ("VIL-AHM-004", "Viramgam", "વિરમગામ", "AHMEDABAD", 23.120, 72.030),
    ("VIL-AHM-005", "Dhandhuka", "ધંધુકા", "AHMEDABAD", 22.370, 71.980),
    ("VIL-AHM-006", "Daskroi", "દસ્ક્રોઈ", "AHMEDABAD", 22.950, 72.650),
    ("VIL-AHM-007", "Mandal", "માંડલ", "AHMEDABAD", 23.280, 71.920),
    ("VIL-AHM-008", "Detroj", "દેત્રોજ", "AHMEDABAD", 23.330, 72.180),
    ("VIL-AHM-009", "Dholera", "ધોલેરા", "AHMEDABAD", 22.250, 72.190),
    ("VIL-AHM-010", "Aslali", "અસલાલી", "AHMEDABAD", 22.940, 72.580),
    ("VIL-AHM-011", "Bareja", "બરેજા", "AHMEDABAD", 22.880, 72.580),
    ("VIL-AHM-012", "Jetalpur", "જેતલપુર", "AHMEDABAD", 22.910, 72.560),
    ("VIL-AHM-013", "Kasindra", "કાસિન્દ્રા", "AHMEDABAD", 22.900, 72.490),
    ("VIL-AHM-014", "Changodar", "ચાંગોદર", "AHMEDABAD", 22.920, 72.420),
    ("VIL-AHM-015", "Moraiya", "મોરૈયા", "AHMEDABAD", 22.940, 72.440),
    ("VIL-AHM-016", "Uvarsad", "ઉવારસદ", "AHMEDABAD", 23.180, 72.600),
    ("VIL-AHM-017", "Adalaj", "અડાલજ", "AHMEDABAD", 23.160, 72.580),
    ("VIL-AHM-018", "Chandkheda Rural", "ચાંદખેડા ગ્રામ્ય", "AHMEDABAD", 23.110, 72.590),
    ("VIL-AHM-019", "Gota Rural", "ગોટા ગ્રામ્ય", "AHMEDABAD", 23.100, 72.530),
    ("VIL-AHM-020", "Shilaj", "શીલજ", "AHMEDABAD", 23.050, 72.470),

    # Kutch
    ("VIL-KUT-001", "Bhuj Rural", "ભુજ ગ્રામ્ય", "KUTCH", 23.250, 69.670),
    ("VIL-KUT-002", "Anjar", "અંજાર", "KUTCH", 23.110, 70.020),
    ("VIL-KUT-003", "Mandvi Rural", "માંડવી ગ્રામ્ય", "KUTCH", 22.830, 69.350),
    ("VIL-KUT-004", "Mundra", "મુંદ્રા", "KUTCH", 22.840, 69.720),
    ("VIL-KUT-005", "Gandhidham Rural", "ગાંધીધામ ગ્રામ્ય", "KUTCH", 23.070, 70.130),
    ("VIL-KUT-006", "Nakhatrana", "નખત્રાણા", "KUTCH", 23.350, 69.260),
    ("VIL-KUT-007", "Abdasa", "અબડાસા", "KUTCH", 23.190, 68.830),
    ("VIL-KUT-008", "Lakhpat", "લખપત", "KUTCH", 23.830, 68.780),
    ("VIL-KUT-009", "Rapar", "રાપર", "KUTCH", 23.570, 70.630),
    ("VIL-KUT-010", "Bhachau", "ભચાઉ", "KUTCH", 23.290, 70.340),
    ("VIL-KUT-011", "Khavda", "ખાવડા", "KUTCH", 23.850, 69.730),
    ("VIL-KUT-012", "Dholavira", "ધોળાવીરા", "KUTCH", 23.880, 70.210),
    ("VIL-KUT-013", "Naliya", "નલિયા", "KUTCH", 23.260, 68.820),
    ("VIL-KUT-014", "Dhordo", "ધોરડો", "KUTCH", 23.800, 69.510),
    ("VIL-KUT-015", "Mahuva Kutch", "મહુવા", "KUTCH", 23.200, 69.450),
    ("VIL-KUT-016", "Kotda", "કોટડા", "KUTCH", 23.150, 69.550),
    ("VIL-KUT-017", "Kukma", "કુકમા", "KUTCH", 23.200, 69.800),
    ("VIL-KUT-018", "Ratnal", "રતનાલ", "KUTCH", 23.180, 69.900),
    ("VIL-KUT-019", "Dudhai", "દુધઈ", "KUTCH", 23.310, 70.130),
    ("VIL-KUT-020", "Samakhiali", "સામાખીયાળી", "KUTCH", 23.320, 70.520),
]

def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Seed users
        for u in DEMO_USERS:
            existing = db.query(AppUser).filter(AppUser.user_id == u["user_id"]).first()
            if not existing:
                db.add(AppUser(**u))
                print(f"Created demo user: {u['user_id']} ({u['role']})")

        # Seed villages
        for v_code, name_en, name_gu, dist, lat, lng in DISTRICT_VILLAGES:
            existing_v = db.query(Village).filter(Village.village_lgd == v_code).first()
            if not existing_v:
                db.add(Village(
                    village_lgd=v_code,
                    name_en=name_en,
                    name_gu=name_gu,
                    district_code=dist,
                    lat=str(lat),
                    lng=str(lng)
                ))
        
        db.commit()
        print(f"Successfully seeded {len(DEMO_USERS)} demo users and {len(DISTRICT_VILLAGES)} villages.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding phase 0: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
