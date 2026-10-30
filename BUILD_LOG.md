# FundTrail — Build and Progress Log

> **Note for the Developer/User:** This document tracks the automated, step-by-step implementation of the FundTrail project as specified in `README_FundTrail.md`.

---

## Log Entries

### [Phase 1: Project Initialization & Setup]
- **Status:** COMPLETED
- Initialized Node / Vite / TypeScript environment.
- Configured dependencies: React 18, React Router v7, Tailwind CSS, Lucide React, PapaParse, Ethers.js v6, Supabase JS client, Vitest.
- Created `BUILD_LOG.md` to document all technical changes and milestones.

### [Phase 2: Database Schema & Migration Script]
- **Status:** COMPLETED
- Created `supabase/migrations/001_initial_schema.sql`:
  - 8 core relational tables with `organization_id` tenant isolation.
  - Full PostgreSQL Row Level Security (RLS) policies for SELECT, INSERT, UPDATE, DELETE.
  - Helper functions `is_org_member` and `is_org_admin`.
  - Immutable report snapshots and public anchor policy.
  - Configured private and public storage buckets (`evidence-private`, `evidence-public`).
- Created `supabase/seed.sql` with exact synthetic dataset from Section 15 of `README_FundTrail.md`.
- Created `tests/rls-checklist.md` documenting security boundary checks.

### [Phase 3: Smart Contract Specification]
- **Status:** COMPLETED
- Created `contracts/ReportAnchor.sol` (Solidity 0.8.20):
  - Owner and authorized publisher access control.
  - Strictly increasing versions check per `projectKey`.
  - Non-zero SHA-256 hash validation.
  - `anchorReport`, `getReportHash`, and `getAnchorDetails` view functions.
  - `ReportAnchored` event.
- Created `src/features/blockchain/contract-abi.ts` with human-readable ABI.

### [Phase 4: Core Libraries & Unit Tests]
- **Status:** COMPLETED
- `src/types/index.ts`: Full TypeScript domain types.
- `src/lib/formatters.ts`: INR currency formatter (`₹1,00,000.00`), date formatters, hash truncator, byte size formatter.
- `src/lib/hashing.ts`: Recursive key-sorted JSON canonicalizer, Web Crypto SHA-256 (0x-prefixed 32-byte hex string), file hasher, keccak256 projectKey.
- `src/lib/report-snapshot.ts`: Sanitised JSON snapshot generator with zero private donor information.
- `src/lib/csv.ts`: Papa Parse CSV donation importer with date validation, positive amount checking, channel normalization, and duplicate reference detection.
- `src/lib/blockchain.ts`: Ethers.js v6 integration for Polygon Amoy (Chain ID 80002), MetaMask switcher, contract calls, and public RPC reader.
- `src/lib/supabase.ts` & `src/lib/store.ts`: Reactive store with pre-seeded demo state from Section 15 and local storage persistence.
- **Unit Tests:** `tests/calculations.test.ts` & `tests/report-hash.test.ts` — 11/11 tests passed in Vitest.

### [Phase 5: User Interface & Feature Screens]
- **Status:** COMPLETED
- `src/components/layout/Navbar.tsx`: Brand logo, synthetic data alert banner, user profile indicator, one-click demo role switcher (Admin / Staff), direct link to donor report.
- `src/components/layout/Footer.tsx`: Disclaimer, links to PolygonScan Amoy, Polygon faucet.
- `src/components/status/StatusBadge.tsx`: Honest status badges (`NGO_REPORTED`, `DOCUMENT_UPLOADED`, `NGO_REVIEWED`, `INDEPENDENTLY_VERIFIED`).
- `src/components/status/IntegrityBadge.tsx`: Integrity status badges (`MATCH`, `MISMATCH`, `NOT ANCHORED`, `UNAVAILABLE`).
- `src/components/charts/FinancialOverview.tsx`: INR metric cards, category progress bar distribution, accessible financial table, overspend warning, missing evidence alert.
- `src/pages/LoginPage.tsx`: Fast demo login buttons (Priya Sharma - Admin, Amit Verma - Staff) and standard form.
- `src/pages/DashboardPage.tsx`: Active projects overview, funding progress, mini stats, quick navigation.
- `src/pages/NewProjectPage.tsx`: Project creation form with automatic slug generator.
- `src/pages/ProjectDetailPage.tsx`: 5-tab workspace:
  - Tab 1: Overview & Totals
  - Tab 2: Donations (Manual entry form + CSV import modal with validation & duplicate detection)
  - Tab 3: Expenses & Evidence (Expense form + private file upload with live Web Crypto SHA-256 hashing)
  - Tab 4: Progress Updates (Narratives + aggregate beneficiary count with honest `NGO_REPORTED` status)
  - Tab 5: Publish & Amoy Anchor (Sanitisation checks, version generation, MetaMask Polygon Amoy anchoring)
- `src/pages/PublicReportPage.tsx`: Public donor view (`/r/:slug`):
  - No login or wallet required.
  - Complete financial breakdown, updates, and evidence registry.
  - Live recomputation of SHA-256 in browser.
  - Direct comparison with Polygon Amoy anchor.
  - **Interactive Tamper Simulation Button (Test T13)**: Demonstrates immediate detection of altered snapshot content (`MISMATCH`).

### [Phase 6: Verification & Production Build]
- **Status:** COMPLETED
- Executed `npm test`: 11/11 unit tests passed.
- Executed `npm run build`: Production bundle built cleanly with Vite + TypeScript compiler.
- Created `README.md` and `.env.example`.

---
*All project requirements from README_FundTrail.md successfully implemented and verified.*
