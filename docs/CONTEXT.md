# PART 1 — SYSTEM OVERVIEW & ARCHITECTURE

## 1.1 Project in one paragraph

**Gujarat Family ID Platform.** Every family gets a unique Family ID (`GJ-XXXXXXXX`). Government departments use it to find eligible beneficiaries and manage scheme benefits. The platform is built for the **villager** who may have only an Aadhaar card, no PAN, no smartphone, and who enrolls through a village operator (VCE, ASHA worker or Talati). It integrates **Aadhaar** (offline Secure QR, masked storage), **PAN** (optional, income check only), and **PM Gati Shakti**-style geo layers (facility access gaps, camp planning).

## 1.2 Modular Architecture

| Component | Modules | Frontend Routes | Backend Folders | Seed Data |
|---|---|---|---|---|
| **Citizen & Villager Services** | M1 Family Registry & Graph, M2 Identity Resolution, M3 Assisted/QR Enrollment, M5 Applications & Documents, M9 Grievance Assistant | `/citizen/*`, `/operator/*`, `/officer/grievances`, `/officer/identity-review` | `modules/family`, `modules/identity`, `modules/enrollment`, `modules/applications`, `modules/grievance`, `mocks/uidai`, `mocks/digilocker`, `mocks/pan`, `mocks/nfsa` | `seed/families.py` (~500 families) |
| **Government & Schemes Platform** | M4 Eligibility Engine, M6 Gati Shakti Geo Layer, M7 Consent & Access Ledger, M10 Analytics & Text-to-SQL, M8 Migration, M11 Health Nudges | `/officer/*`, `/admin/*`, `/citizen/privacy` | `modules/eligibility`, `modules/geo`, `modules/ledger`, `modules/analytics`, `modules/migration`, `modules/health`, `mocks/gatishakti` | `seed/schemes.py` (~12 schemes), `seed/facilities.geojson` |

## 1.3 Implementation Roadmap & Verification Milestones

| Milestone | Focus | Key Deliverables | Verification Test |
|---|---|---|---|
| 0 | Core Foundation | Base schema, JWT auth, i18n, shared components | All demo personas log in successfully |
| 1 | Identity & Schemes Engine | M1 Registry, M2 Name matching, M4 Eligibility engine, M7 Ledger helper | Registering a family accurately evaluates eligible schemes with justification |
| 2 | Kiosk, Verification & Map | M3 Offline QR kiosk, M5 Decision API, M6 GIS heatmap, Officer approval screen | Offline QR enrollment → application submission → officer approval → SMS dispatch |
| 3 | AI Assistant & Analytics | M9 Multilingual Grievance voice/text, M10 Text-to-SQL, M8 Portability migration | End-to-end citizen grievance and collector text-to-SQL queries |
| 4 | Hardening & Polish | System audit, offline synchronization, accessibility | Full end-to-end integration and smoke testing |

## 1.4 Demo Storyline

1. **Beneficiary Profile**: Kantaben, 62, widow, Dahod village, no PAN, no smartphone.
2. **Kiosk Enrollment**: VCE (operator) scans her Aadhaar Secure QR offline → form auto-fills → name matches ration card despite Gujarati transliteration nuances (M3, M2).
3. **Proactive Entitlements**: Eligibility engine shows widow pension, old-age pension, and PM-JAY, each with transparent rule justifications. Operator submits application with her consent (M4, M5).
4. **Officer Review**: Verification officer approves the application on the officer dashboard → notification & mock SMS dispatched.
5. **GIS Gap Analysis**: Gati Shakti map calculates nearest PHC (14 km) and displays her village cluster on the access-gap heatmap (M6).
6. **Executive Intelligence**: Collector queries "widows in Dahod eligible but not receiving pension" via Text-to-SQL → receives instant, verified data table (M10).
7. **DPDP Auditability**: Citizen checks who accessed their family data; Department Admin verifies the tamper-evident cryptographic hash chain (M7).

---

# PART 2 — SHARED SPECIFICATION

## 2.1 Stack

| Layer | Choice |
|---|---|
| Backend | Python 3.11+, FastAPI, SQLAlchemy 2.x, Alembic, Pydantic v2 |
| DB | PostgreSQL 16 + PostGIS (`postgis/postgis:16-3.4` via docker-compose) / SQLite fallback |
| Frontend | React + Vite + TypeScript + Tailwind, react-router, i18next, react-leaflet, PWA |
| LLM | Gemini via `google-genai` SDK / fallback, key in `GEMINI_API_KEY` |
| Auth | JWT; roles: `citizen`, `operator`, `officer`, `dept_admin`, `super_admin`; officers carry `district_code` |
| Languages | `en`, `gu`, `hi` — Gujarati is the default for citizen/operator screens |

## 2.2 Core Schema

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

## 2.3 System APIs (Summary)
- **Family & Registry APIs**: `/api/families/{id}`, `/api/families`, `/api/families/{id}/documents`, `PATCH /api/families/{id}/address`, `/api/applications`, `POST /api/applications/{id}/decision`
- **Schemes & Spatial APIs**: `/api/families/{id}/eligibility`, `/api/schemes`, `/api/geo/facilities`, `/api/geo/access-gap`, `/api/geo/camps`, `/api/ledger/families/{id}`
- **Core Platform APIs**: `/api/villages`, `/api/notifications/me`
