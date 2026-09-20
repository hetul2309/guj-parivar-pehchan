# 🏛️ Gujarat Parivar Pehchan (ગુજરાત પરિવાર ઓળખ)
### *Unified Social Registry & Welfare Delivery Platform — Government of Gujarat*

![Status](https://img.shields.io/badge/Status-Production%20Ready-emerald)
![Python](https://img.shields.io/badge/Python-3.11%2B-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-teal)
![React](https://img.shields.io/badge/React-18%20%2B%20Vite%20%2B%20TS-61dafb)
![Security](https://img.shields.io/badge/Security-Ed25519%20%7C%20SHA--256%20Ledger-indigo)
![Languages](https://img.shields.io/badge/i18n-Gujarati%20%7C%20English%20%7C%20Hindi-amber)

---

## 📌 Executive Summary

**Gujarat Parivar Pehchan** is an integrated citizen-centric social registry and welfare distribution platform developed for the Government of Gujarat. It provides every household with a unique **Gujarat Family ID** (`GJ-XXXXXXXX`), establishing a single source of truth that links family relationships, social entitlements, and proactive scheme delivery.

Built specifically for the rural reality of Gujarat, the platform ensures that villagers without smartphones, PAN cards, or reliable internet can seamlessly access government entitlements through assisted village kiosks (**VCEs**), offline cryptographic verification, and multi-modal identity options.

---

## 🌟 Key Platform Features

### 1. 📴 Offline-First Rural Inclusion
- **Assisted Kiosk Registration**: Gram Panchayat operators (VCEs, Talatis, ASHA workers) can enroll families offline using Aadhaar Secure QR decoding.
- **Biometric & Attestation Fallbacks**: Supports standard fingerprints, Iris scanning for worn fingerprints (farm workers/elderly), and verified **Operator Attestation** to guarantee that no eligible beneficiary is excluded.
- **Offline Card Verifier (Ed25519)**: Family Cards feature an Ed25519 cryptographically signed QR code that field officers and Fair Price Shops (FPS) can verify without internet or server access.

### 2. ⚡ Proactive Schemes & Eligibility Engine
- **Automated Rule Evaluation**: Built with an extensible JSON-Logic engine evaluating household income, demographic attributes, and land/social records against **12+ state and central welfare schemes** (e.g., Ganga Swaroopa Widow Pension, PM-JAY, Old Age Pension, Vrudh Sahay).
- **Transparent Justifications**: Gives plain-language reasons in Gujarati, English, and Hindi detailing exactly why a family qualifies and which documents are needed.

### 3. 🗺️ PM Gati Shakti Geospatial Analytics
- **Facility Access Gap Heatmaps**: Calculates geodesic distances from rural households to critical infrastructure (PHCs, Anganwadis, Schools, Ration Shops, and Banks).
- **Camp Suggestion Engine**: Uses spatial density clustering to recommend optimal mobile welfare camp locations based on unassisted beneficiary clusters.

### 4. 🔒 Privacy by Design & DPDP Compliance
- **Aadhaar Vaulting**: Zero raw 12-digit Aadhaar storage; all records use encrypted UUID tokens with only the last 4 digits displayed.
- **Tamper-Evident SHA-256 Ledger**: Cryptographically hash-chained audit log tracking every officer and department data access.
- **Consent Lock & Transparency**: Citizens can view who accessed their personal records and revoke department-level consent.

### 5. 🌐 Multilingual & Accessible UI
- Full native localization in **Gujarati (`ગુ`)**, **English**, and **Hindi**.
- Strictly role-based responsive navigation with mobile-optimized drawer views.

---

## 👥 Demo Personas & Pre-Seeded Accounts

The platform includes pre-configured personas to experience all role perspectives:

| Role | Username | Password | Purpose & Capabilities |
| :--- | :--- | :--- | :--- |
| **Citizen** | `citizen_kanta` | `password123` | View family cards, active benefits, DPDP consent logs, and file grievances. |
| **VCE Operator** | `vce_dahod` | `password123` | Village kiosk: offline enrollment, Aadhaar QR scan, biometrics, offline card verifier. |
| **Verification Officer** | `officer_dahod` | `password123` | Verify name transliterations, review & approve scheme applications, GIS mapping. |
| **Department Admin** | `admin_social` | `password123` | Scheme Studio (rule builder), tamper-evident audit ledger verification. |
| **Super Admin** | `superadmin` | `password123` | Statewide cross-district monitoring, system health, and master controls. |

---

## 🛠️ Technology Stack

```
├── Frontend:
│   ├── React 18 + Vite (TypeScript)
│   ├── Tailwind CSS + Vanilla CSS Responsive Architecture
│   ├── i18next (Gujarati, English, Hindi)
│   ├── Lucide React Icons
│   └── Leaflet & React-Leaflet (GIS Mapping)
│
├── Backend:
│   ├── Python 3.11+ & FastAPI
│   ├── SQLAlchemy 2.x & Pydantic v2
│   ├── SQLite / PostgreSQL 16 + PostGIS
│   ├── Cryptography (Ed25519 Signing & SHA-256 Hash Chaining)
│   └── Google Gemini SDK (Grievance Voice Assistant & Text-to-SQL Analytics)
```

---

## 📂 Project Structure

```
Pravi/
├── backend/
│   ├── app/
│   │   ├── core/               # Database, JWT auth, audit ledger, events, i18n
│   │   ├── modules/
│   │   │   ├── family/         # Family registry & household tree
│   │   │   ├── identity/       # Aadhaar QR, biometrics, name transliteration
│   │   │   ├── enrollment/     # Offline sync batch & Ed25519 card verification
│   │   │   ├── eligibility/    # JSON-Logic rules engine
│   │   │   ├── geo/            # Gati Shakti GIS spatial access & camp planner
│   │   │   ├── applications/   # Lifecycle & officer approval workflow
│   │   │   ├── ledger/         # Tamper-evident cryptographic access ledger
│   │   │   ├── grievance/      # AI grievance assistant
│   │   │   └── migration/      # Portability & inter-district migration
│   │   └── main.py             # FastAPI entrypoint & router discovery
│   ├── seed/                   # Demo families, schemes & facility geojson
│   └── tests/                  # Automated test suite
│
├── frontend/
│   ├── src/
│   │   ├── components/shared/  # Responsive Header, guards, status indicators
│   │   ├── pages/
│   │   │   ├── citizen/        # Citizen dashboard & DPDP privacy settings
│   │   │   ├── operator/       # VCE Kiosk, offline batch queue & QR card scanner
│   │   │   ├── officer/        # Approvals, identity review, GIS Gati Shakti map
│   │   │   ├── admin/          # Scheme Studio & cryptographic audit ledger
│   │   │   └── login/          # Role-based login & registration
│   │   ├── i18n/               # Localization strings (gu, en, hi)
│   │   ├── api/                # Typed REST API clients
│   │   └── App.tsx             # Route management & role-based access control
│
├── docs/                       # Architecture specifications and contracts
├── docker-compose.yml          # Container configuration
└── requirements.txt            # Python dependencies
```

---

## 🚀 Quickstart Guide

### Prerequisites
- Python 3.11 or higher
- Node.js (v18 or higher) and `npm`

---

### 1. Backend Setup

```bash
# Navigate to project root
cd Pravi

# Create and activate virtual environment
python -m venv p_env

# On Windows:
.\p_env\Scripts\activate
# On Linux/macOS:
# source p_env/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run master database seed (populates schemes, demo families, facilities & users)
python backend/seed/seed_all.py

# Start FastAPI server
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
*The API will be available at: `http://localhost:8000` (Interactive Docs: `http://localhost:8000/docs`)*

---

### 2. Frontend Setup

```bash
# Open a new terminal and navigate to frontend
cd Pravi/frontend

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```
*The application will be running at: `http://localhost:5173`*

---

## 🧪 Testing & Validation

```bash
# Run TypeScript compilation check
cd frontend
npx tsc --noEmit

# Run Backend Test Suite
cd ..
python -m pytest backend/tests
```

---

## 📜 License & Acknowledgements

Developed as a demonstration platform for the **Government of Gujarat** adhering to Digital India principles, the **DPDP Act 2023**, and UIDAI Aadhaar Vault specifications.
