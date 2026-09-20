# PART 1 — OVERALL PLAN

## 1.1 Project in one paragraph

**Gujarat Family ID Platform.** Every family gets a unique Family ID (`GJ-XXXXXXXX`). Government departments use it to find eligible beneficiaries and manage scheme benefits. The platform is built for the **villager** who may have only an Aadhaar card, no PAN, no smartphone, and who enrolls through a village operator (VCE, ASHA worker or Talati). It integrates **Aadhaar** (offline Secure QR, masked storage), **PAN** (optional, income check only), and **PM Gati Shakti**-style geo layers (facility access gaps, camp planning).

## 1.2 Team split

| | Member A — "Family & Villager" | Member B — "Schemes & Government" |
|---|---|---|
| Modules | M1 Family Registry & Graph, M2 Identity Resolution, M3 Assisted/QR Enrollment, M5 Applications & Documents, M9 Grievance Assistant | M4 Eligibility Engine, M6 Gati Shakti Geo Layer, M7 Consent & Access Ledger, M10 Analytics & Text-to-SQL, M8 Migration, M11 Health Nudges (stretch) |
| Frontend routes | `/citizen/*`, `/operator/*` + exceptions below | `/officer/*`, `/admin/*` + exceptions below |
| Backend folders | `modules/family`, `modules/identity`, `modules/enrollment`, `modules/applications`, `modules/grievance`, `mocks/uidai`, `mocks/digilocker`, `mocks/pan`, `mocks/nfsa` | `modules/eligibility`, `modules/geo`, `modules/ledger`, `modules/analytics`, `modules/migration`, `modules/health`, `mocks/gatishakti` |
| Seed data | `seed/families.py` (~500 families) | `seed/schemes.py` (~12 schemes), `seed/facilities.geojson` |

**Page ownership exceptions**:
- `pages/officer/grievances/`: Owner A (M9)
- `pages/officer/identity-review/`: Owner A (M2)
- `pages/citizen/privacy/`: Owner B (M7)
- `pages/citizen/health/`: Owner B (M11)

## 1.3 Phases and checkpoints

| Phase | Share of time | Member A | Member B | Joint checkpoint test |
|---|---|---|---|---|
| 0 | ~5% | Together: repo, core, schema, contract | Together | Both can run the app and log in as every demo role |
| 1 | ~20% | M1 + M2, stub for B's needs, family seed | M4 engine, M7 helper, scheme seed, stubs for A's needs | **CP1:** registering a family shows correct eligible schemes with reasons |
| 2 | ~30% | M3 + M5 (citizen + operator UI, decision API) | M6 map + gap heatmap, officer approval screen, M7 citizen/admin views | **CP2:** Kantaben enrolled offline → applies → officer approves on B's screen → SMS mock |
| 3 | ~25% | M9 grievance assistant, polish villager UX | M10 Text-to-SQL, M8 migration, dashboard | **CP3:** full demo storyline end to end |
| 4 | ~20% | Bug fixes only, rehearse | M11 if time, bug fixes, rehearse | Two full demo rehearsals, timed |

## 1.4 Demo storyline

1. Kantaben, 62, widow, Dahod village, no PAN, no smartphone.
2. VCE (operator) scans her Aadhaar Secure QR offline → form auto-fills → name matches ration card despite Gujarati spelling. (A: M3, M2)
3. Eligibility shows widow pension, old-age pension, PM-JAY, each with reasons. Operator applies with her consent. (B: M4, A: M5)
4. Officer approves on the officer screen → Gujarati SMS (mock). (B UI → A API)
5. Map: nearest PHC 14 km; her cluster lights up on the access-gap heatmap. (B: M6)
6. Collector asks "widows in Dahod eligible but not receiving pension" → instant answer. (B: M10)
7. Family sees who accessed their data; admin verifies the hash chain. (B: M7)

---

# PART 2 — SHARED CONTRACT

## 2.1 Stack

| Layer | Choice |
|---|---|
| Backend | Python 3.11+, FastAPI, SQLAlchemy 2.x, Alembic, Pydantic v2 |
| DB | PostgreSQL 16 + PostGIS (`postgis/postgis:16-3.4` via docker-compose) / SQLite fallback |
| Frontend | React + Vite + TypeScript + Tailwind, react-router, i18next, react-leaflet, PWA |
| LLM | Gemini via `google-genai` SDK / fallback, key in `GEMINI_API_KEY` |
| Auth | JWT; roles: `citizen`, `operator`, `officer`, `dept_admin`, `super_admin`; officers carry `district_code` |
| Languages | `en`, `gu`, `hi` — Gujarati is the default for citizen/operator screens |

## 2.2 Core schema

```sql
person(person_id UUID PK, name_en, name_gu, dob DATE, dob_precision TEXT,
       gender TEXT, marital_status TEXT, occupation, education, disability BOOL,
       social_category TEXT, mobile, mobile_shared BOOL, aadhaar_token UUID,
       aadhaar_last4 CHAR(4), pan_hash NULL, is_deceased BOOL, created_via TEXT,
       created_by UUID NULL)

family(family_id TEXT PK, head_person_id UUID, address_text, village_lgd TEXT,
       district_code TEXT, geom GEOGRAPHY(POINT), ration_card_no NULL,
       annual_income INT, income_source TEXT, status TEXT)

family_member(family_id, person_id, active_from DATE, active_to DATE NULL)
relationship(from_person, to_person, type)
village(village_lgd TEXT PK, name_en, name_gu, district_code, centroid GEOGRAPHY(POINT))
notification(id, user_id NULL, district_code NULL, role NULL, text_key, params JSONB, read BOOL, created_at)
events(id, name, payload JSONB, created_at)
app_user(user_id, role, district_code NULL, person_id NULL, password_hash, display_name)
```

## 2.3 Frozen APIs (Summary)
- A provides: `/api/families/{id}`, `/api/families`, `/api/families/{id}/documents`, `PATCH /api/families/{id}/address`, `/api/applications`, `POST /api/applications/{id}/decision`
- B provides: `/api/families/{id}/eligibility`, `/api/schemes`, `/api/geo/families/{id}/nearest`, `/api/ledger/families/{id}`
- Core provides: `/api/villages`, `/api/notifications/me`
