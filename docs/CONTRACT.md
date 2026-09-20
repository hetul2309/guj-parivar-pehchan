# SHARED SYSTEM CONTRACT

## 2.1 Stack

| Layer | Choice |
|---|---|
| Backend | Python 3.11+, FastAPI, SQLAlchemy 2.x, Alembic, Pydantic v2 |
| DB | PostgreSQL 16 + PostGIS (`postgis/postgis:16-3.4` via docker-compose) / SQLite fallback |
| Frontend | React + Vite + TypeScript + Tailwind, react-router, i18next, react-leaflet, PWA |
| LLM | Gemini via `google-genai` SDK / fallback, key in `GEMINI_API_KEY` |
| Auth | JWT; roles: `citizen`, `operator`, `officer`, `dept_admin`, `super_admin`; officers carry `district_code` |
| Languages | `en`, `gu`, `hi` — Gujarati is the default for citizen/operator screens |

## 2.2 Repo structure

```
family-id/
  docker-compose.yml
  docs/CONTEXT.md          # Architecture, modules and storyline
  docs/CONTRACT.md         # The system contract and API specification
  backend/
    app/
      main.py              # auto-discovers routers
      core/                # db.py, auth.py, events.py, access_log.py, sms.py, i18n.py
      modules/<module>/    # router.py, models.py, schemas.py, service.py, tests/
      mocks/<system>/      # fake external systems
    migrations/            # Alembic
    seed/
  frontend/
    src/
      App.tsx              # Application routing & role guards
      pages/citizen/       # Citizen portal
      pages/operator/      # Operator kiosk
      pages/officer/       # Officer dashboard, map & verification
      pages/admin/         # Scheme studio & audit ledger
      api/<module>.ts      # Typed clients per module
      components/shared/   # Shared UI components
      i18n/                # Localization resources
```

## 2.3 Core schema

```sql
person(person_id UUID PK, name_en, name_gu, dob DATE, dob_precision TEXT, -- 'exact'|'year_only'
       gender TEXT,            -- 'M'|'F'|'O'
       marital_status TEXT,    -- 'single'|'married'|'widow'|'divorced'
       occupation, education, disability BOOL, social_category TEXT, -- 'GEN'|'OBC'|'SC'|'ST'
       mobile, mobile_shared BOOL, aadhaar_token UUID, aadhaar_last4 CHAR(4),
       pan_hash NULL, is_deceased BOOL, created_via TEXT, -- 'self'|'assisted'|'qr'
       created_by UUID NULL)   -- operator id when assisted

family(family_id TEXT PK,      -- 'GJ-' + 8 digits
       head_person_id UUID, address_text, village_lgd TEXT, district_code TEXT,
       geom GEOGRAPHY(POINT), ration_card_no NULL, annual_income INT,
       income_source TEXT,     -- 'self_declared'|'talati_cert'|'pan_itr'
       status TEXT)            -- 'active'|'merged'|'inactive'

family_member(family_id, person_id, active_from DATE, active_to DATE NULL)
relationship(from_person, to_person, type)  -- 'spouse'|'parent_of'|'dependent_of'
village(village_lgd TEXT PK, name_en, name_gu, district_code, centroid GEOGRAPHY(POINT))
notification(id, user_id NULL, district_code NULL, role NULL, text_key, params JSONB, read BOOL, created_at)
events(id, name, payload JSONB, created_at)
app_user(user_id, role, district_code NULL, person_id NULL, password_hash, display_name)
```

## 2.4 Core helpers

```python
# core/events.py — persisted + in-process
def publish(name: str, payload: dict) -> None
def subscribe(name: str):   # decorator: @subscribe("family.updated")

# core/access_log.py — Audit logging called across modules
def log_access(actor_id: str, family_id: str, purpose: str, fields: list[str]) -> None

# core/sms.py — mock; prints + stores in `sms_outbox` table, shown in a debug page
def send_sms(mobile: str, text_key: str, lang: str = "gu", **params) -> None

# core/notify.py — in-app notification to a user, or to all users of a role in a district
def notify(text_key: str, user_id: str | None = None, district_code: str | None = None,
           role: str | None = None, **params) -> None

# core/auth.py
def current_user() -> AppUser       # FastAPI dependency
def require_role(*roles)            # FastAPI dependency
```

## 2.5 System Events

| Event | Emitted by | Payload | Consumed by |
|---|---|---|---|
| `family.created` | M1 (Family Registry) | `{family_id}` | M4: eligibility recompute |
| `family.updated` | M1 (Family Registry) | `{family_id, changed: [fields]}` | M4: eligibility recompute |
| `family.member_event` | M1 (Family Registry) | `{family_id, person_id, kind}` — kind: `birth`,`death`,`marriage_out`,`marriage_in` | M4: eligibility recompute |
| `family.migrated` | M1 (Family Registry) | `{family_id, from_lgd, to_lgd, temporary: bool}` | M8: portability |
| `application.status_changed` | M5 (Applications) | `{application_id, family_id, scheme_id, status, reason_code}` | M5: SMS notification; Officer Dashboard |
| `eligibility.updated` | M4 (Eligibility) | `{family_id, newly_eligible: [scheme_id]}` | Notification + SMS |

## 2.6 System APIs

All under `/api`. JSON. Aadhaar is **always masked** (`aadhaar_last4` only) in every response.

### Family & Application APIs

```
GET  /api/families/{family_id}
  → {family_id, head_person_id, address_text, village_lgd, district_code,
     lat, lng, annual_income, income_source,
     members: [{person_id, name_en, name_gu, age, dob_precision, gender,
                marital_status, occupation, education, disability,
                social_category, relation_to_head, aadhaar_last4, has_pan, is_deceased}]}

GET  /api/families?district_code=&village_lgd=&page=&size=
  → {items: [<same as above without members>], total}

GET  /api/families/{family_id}/documents
  → [{doc_id, person_id, doc_type, status, source, expires_on}]   # status: pending|verified|rejected; source: upload|digilocker|id_link

PATCH /api/families/{family_id}/address   body {village_lgd, district_code, address_text, lat, lng, temporary}
  → emits family.migrated

GET  /api/applications?district_code=&status=&scheme_id=&page=
  → {items: [{application_id, family_id, scheme_id, applicant_person_id, status,
              reason_code, created_via, submitted_at,
              documents: [{doc_id, type, status, url, name_match_score?}]}], total}

POST /api/applications/{application_id}/decision
  body {decision: "approve"|"reject"|"request_reupload"|"disburse", reason_code?, note?}
  → updated application; emits application.status_changed
```

### Core Platform APIs

```
GET  /api/villages?district_code=   → [{village_lgd, name_en, name_gu, district_code, lat, lng}]
GET  /api/notifications/me          → [{id, text, created_at, read}]
```

### Schemes, Spatial & Ledger APIs

```
GET  /api/families/{family_id}/eligibility
  → [{scheme_id, name_en, name_gu, eligible: bool,
      reasons: [{text_en, text_gu}], missing: [{doc_type, text_en, text_gu}],
      benefit_value: int, rank: int}]

GET  /api/schemes            → [{scheme_id, name_en, name_gu, department, required_docs: [doc_type], rule}]
GET  /api/schemes/{scheme_id}

GET  /api/geo/facilities
GET  /api/geo/access-gap
GET  /api/geo/camps

GET  /api/ledger/families/{family_id}   → access history for the citizen view
```

## 2.7 Enums

- **Application status:** `draft` → `submitted` → `under_verification` → `approved` → `disbursed`; or `rejected` → (`submitted` on resubmit).
- **Reason codes:** `INCOME_CERT_EXPIRED`, `INCOME_ABOVE_LIMIT`, `DOC_NAME_MISMATCH`, `DOC_ILLEGIBLE`, `NOT_ELIGIBLE_AGE`, `DUPLICATE_BENEFICIARY`, `MISSING_DOCUMENT`, `OTHER`.
- **Doc types:** `aadhaar`, `ration_card`, `income_cert`, `caste_cert`, `bank_passbook`, `death_cert_spouse`, `disability_cert`, `education_cert`, `address_proof`.
- **Facility types:** `phc`, `school`, `anganwadi`, `ration_shop`, `bank`.

## 2.8 Demo Users

| Username | Role | District |
|---|---|---|
| `citizen_kanta` | citizen | Dahod |
| `vce_dahod` | operator | Dahod |
| `officer_dahod` | officer | Dahod |
| `officer_kutch` | officer | Kutch |
| `admin_social` | dept_admin | — |
| `superadmin` | super_admin | — |

Password for all: `demo123` / `password123`.
