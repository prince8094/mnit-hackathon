# FundTrail — Evidence-Backed NGO Project Reporting

> **Hackathon Problem Area:** Transparent Charity Donations on the Blockchain  
> **Target Market:** Grassroots Indian NGOs  
> **Network:** Polygon Amoy Testnet (Chain ID: `80002`)  
> **Smart Contract:** `contracts/ReportAnchor.sol`  

FundTrail helps small Indian NGOs turn scattered donation records (UPI, bank transfers, crowdfunding), project expenses, and supporting evidence into a clear, shareable project-utilisation report, and anchors a cryptographic fingerprint (SHA-256) of that published report on Polygon Amoy so post-publication alterations can be immediately detected.

---

## 🚀 Quick Start Guide

### 1. Install & Run Locally

```bash
# Install dependencies
npm install

# Run Vitest test suite (calculations, canonicalization, SHA-256, CSV validation)
npm test

# Build production bundle
npm run build

# Start local development server
npm run dev
```

Visit `http://localhost:5173` to explore the application!

### 2. Fast Demo Accounts (Pre-Seeded Dataset)

The application comes pre-loaded with the synthetic demo dataset specified in Section 15 of `README_FundTrail.md`:

- **Project:** School Kit Support
- **Goal:** ₹1,00,000
- **Recorded Donations:** ₹1,00,000 (UPI ₹40,000, Bank transfer ₹35,000, Crowdfunding ₹25,000)
- **Recorded Expenses:** ₹65,000 across 3 categories with attached synthetic invoices
- **Remaining Reserve:** ₹35,000
- **Progress Milestone:** "Distribution activity reported; 60 kits distributed." (Status: `NGO_REPORTED`)

Sign in with one click on the login screen:
- **Priya Sharma** (`priya.sharma@sevajyoti.org`) — NGO Admin
- **Amit Verma** (`amit.verma@sevajyoti.org`) — NGO Staff

### 3. Public Donor View & Live Integrity Verification

Donors require **no login** and **no crypto wallet**:
- Open `/r/school-kit-support-2026-v1`
- Review project purpose, itemized expenditure breakdown, and evidence files with cryptographic fingerprints.
- Click **"Verify report integrity"** to watch the browser deterministically re-calculate the report's SHA-256 hash and compare it with the Polygon Amoy blockchain record.
- Click **"Simulate Tamper (Test Integrity Check)"** to test acceptance test **T13** live — see the status badge turn to `MISMATCH: Tampered Content` immediately!

---

## 🏗 Architecture & Tech Stack

### System Flow & Verification Architecture

```text
+-----------------------------------------------------------------------------+
|                         1. MULTI-CHANNEL INGESTION                          |
|   * CSV Bulk Upload (UPI / Bank)   * Voice Assistant   * Invoice Evidence   |
+--------------------------------------|--------------------------------------+
                                       |
                                       v
+-----------------------------------------------------------------------------+
|                      2. PROCESSING & CANONICALIZATION                       |
|   * Evidence Intelligence (OCR & Duplicate Detection)                       |
|   * Deterministic JSON Key Sorting (RFC-8785 Canonicalization)              |
|   * Web Crypto SHA-256 Fingerprint Hash Generation (bytes32)                |
+--------------------------------------|--------------------------------------+
                                       |
                                       v
+-----------------------------------------------------------------------------+
|                       3. ON-CHAIN ANCHORING & ESCROW                        |
|                     [ Polygon Amoy Testnet - Chain 80002 ]                  |
|   * ReportAnchor.sol: Immutably anchors cryptographic snapshot hash         |
|   * FundTrailMilestoneEscrow.sol: Locks funds until verifier approves proof |
+--------------------------------------|--------------------------------------+
                                       |
                                       v
+-----------------------------------------------------------------------------+
|                     4. ZERO-FRICTION PUBLIC VERIFICATION                    |
|   * Public Donor View: /r/:slug (Zero Wallet / Zero Crypto Required)        |
|   * Real-Time Client Verification: Browser re-calculates SHA-256 live       |
|   * Tamper Detection: Status badge turns to MISMATCH if data is altered     |
|   * Proof-of-Delivery: Beneficiary QR / SMS token acknowledgement           |
+-----------------------------------------------------------------------------+
```

### Core Technologies

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide React
- **Blockchain:** Ethers.js v6, Solidity 0.8.20 (`ReportAnchor.sol`), Polygon Amoy Testnet (`80002`)
- **Backend / Database:** Supabase PostgreSQL with Row Level Security (RLS) policies (`supabase/migrations/001_initial_schema.sql`)
- **CSV Engine:** Papa Parse with row-by-row validation and duplicate reference detection
- **Cryptography:** Web Crypto API (`SHA-256`) with deterministic JSON key canonicalization
- **Testing:** Vitest suite covering calculations, report hashing, and milestone escrow (`tests/`)

---

## 📂 Repository Structure

```text
fundtrail/
├── README.md                      # Quick start & architecture summary
├── README_FundTrail.md            # Comprehensive project specification
├── BUILD_LOG.md                   # Step-by-step implementation log
├── package.json
├── index.html
├── api/
│   └── ipfs/upload.ts              # IPFS upload endpoint
├── contracts/
│   ├── FundTrailMilestoneEscrow.sol # Milestone escrow contract
│   └── ReportAnchor.sol            # Polygon Amoy report anchor smart contract
├── scripts/
│   ├── compile.cjs                 # Contract compilation
│   └── deploy-escrow.cjs           # Escrow deployment
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_rls_demo_and_auth_trigger.sql
│   │   └── 003_milestone_escrow_schema.sql
│   └── seed.sql                   # Synthetic demo dataset seed script
├── src/
│   ├── app/
│   │   └── router.tsx             # Application routing & layout
│   ├── components/
│   │   ├── charts/                # FinancialOverview & category breakdown
│   │   ├── layout/                # Navbar & Footer
│   │   └── status/                # StatusBadge & IntegrityBadge
│   ├── features/
│   │   └── blockchain/            # Smart contract ABI definition
│   ├── lib/
│   │   ├── blockchain.ts          # Polygon Amoy & MetaMask integration
│   │   ├── csv.ts                 # CSV parsing & duplicate checking
│   │   ├── formatters.ts          # INR currency & date formatting
│   │   ├── hashing.ts             # Canonical JSON & Web Crypto SHA-256
│   │   ├── report-snapshot.ts     # Sanitised snapshot generator & calculations
│   │   ├── store.ts               # State store with seed persistence
│   │   └── supabase.ts            # Supabase client connector
│   ├── pages/
│   │   ├── DashboardPage.tsx      # NGO project listing & stats
│   │   ├── LoginPage.tsx          # Fast demo sign-in & auth
│   │   ├── NewProjectPage.tsx     # Project creation form
│   │   ├── ProjectDetailPage.tsx  # Donations, Expenses, Evidence, Updates, Anchor
│   │   ├── PublicReportPage.tsx   # Public donor report & live integrity check
│   │   └── VerifierDashboardPage.tsx # Milestone review dashboard
│   └── types/                     # TypeScript domain models
└── tests/
    ├── calculations.test.ts       # Vitest financial summary tests
    ├── report-hash.test.ts        # Vitest hashing, canonicalization & CSV tests
    ├── milestone-escrow.test.ts   # Escrow contract tests
    └── rls-checklist.md           # Security audit & multi-tenant isolation checklist
```

---

## 📜 Honest Claims & Presentation Disclaimers

As specified in FundTrail's design principles and presentation guidelines:
1. **Report Anchoring Integrity:** Anchoring a report snapshot fingerprint on Polygon Amoy proves cryptographic integrity relative to publication date; it allows donors to detect if published records were tampered with.
2. **Real-World Invoices:** Anchoring does **not** physically prove an uploaded invoice was authentic in the physical world without audit verification.
3. **Tenant-Scoped Duplicate Detection:** Evidence Intelligence duplicate detection is strictly **tenant-scoped** within the authorized organization (safeguarding internal accounting from duplicate receipt claims while preventing cross-tenant privacy leakage); it is **not** a cross-organization collusion detector.
4. **Voice Assistant Integration:** The current "Ask FundTrail" voice implementation runs on client-side **browser Web Speech APIs** (`SpeechRecognition` & `SpeechSynthesis`) paired with a deterministic, **Bhashini-compatible interface**. We do **not** claim a live backend Bhashini cloud API integration unless configured with official Ministry of Electronics & IT (MeitY) API credentials.
5. **Activity Milestones:** All activity milestones are honestly labeled as `Self-Reported by NGO` unless independently signed off by a third-party verifier.
