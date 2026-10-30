# FundTrail — Evidence-Backed NGO Project Reporting

> **Project specification for an AI coding IDE**  
> Working title: **FundTrail**  
> Hackathon problem area: Transparent Charity Donations on the Blockchain  
> Target market: India  
> Status: Product/MVP specification — **this file describes what to build; it is not an implemented application.**  
> Research and service-plan check: **30 October 2026**

---

## 1. Product in one sentence

**FundTrail helps small Indian NGOs turn scattered donation records, project expenses and supporting evidence into a clear, shareable project-utilisation report, then anchors a cryptographic fingerprint of that published report on Polygon Amoy so later changes can be detected.**

## 2. The problem we are solving

### 2.1 Validated problem hypothesis

Micro and small grassroots NGOs in India that collect recurring individual donations may struggle to compile timely, project-level reports connecting contributions received through UPI, bank transfers and crowdfunding campaigns to actual expenditure and beneficiary outcomes. This can create additional administrative work, delay donor updates and make it difficult for donors to understand how project funds were utilised.

Existing alternatives already provide receipts, KYC checks, campaign updates, invoice/document checks and, in some cases, utilisation reports or field verification. The opportunity is **not** to claim that donation tracking does not exist. The opportunity to test is whether a small NGO can produce a consistent, evidence-backed report across its own donation channels without adopting a costly or administratively heavy fundraising platform.

### 2.2 Primary user problem

The NGO operations/finance coordinator has to bring together:

1. Donation records — how much money the project actually received.
2. Expenditure records — what the project actually spent the money on.
3. Supporting documents — invoices, receipts or payment references.
4. Activity updates — what the project has done and what is still pending.
5. Donor communication — an understandable report that can be shared without exposing private information.

These records may be maintained by different staff in spreadsheets, bank exports, email, folders and messaging apps. The exact workflow and amount of friction must be confirmed by observing real NGOs; this specification treats it as a testable hypothesis, not a universal fact.

### 2.3 What the product must and must not claim

**The product must help users:**

- Keep project donations, expenses, evidence and progress updates in one structured workspace.
- Reconcile the project's recorded inflows and outflows.
- Identify expenses with missing supporting documents.
- Prepare a consistent, readable report from structured records.
- Share a public, read-only report with donors.
- Detect whether the published report snapshot has changed since it was anchored on-chain.

**The product must NOT claim:**

- That blockchain proves a receipt or invoice is genuine.
- That an uploaded photograph proves a beneficiary received an item.
- That a blockchain transaction proves a bank/UPI payment occurred.
- That the product independently audits an NGO.
- That the product prevents fraud or guarantees that money was used correctly.
- That funds are held, transferred or released by the smart contract.

The status of a record must always be explicit: `NGO_REPORTED`, `DOCUMENT_UPLOADED`, `NGO_REVIEWED`, or `INDEPENDENTLY_VERIFIED`. Only a real, named and authorised independent verification process may set the last status. The MVP does not provide independent audits.

---

## 3. Target users

### 3.1 Primary user — NGO operations / finance coordinator

**Who:** A staff member at a micro or small grassroots NGO who maintains project records, reconciles receipts and expenses, collects supporting documents from programme staff and prepares donor updates.

**Research archetype, not an interviewed person.**

| Dimension | Working assumption to validate |
|---|---|
| Organisation | Micro/small NGO; use annual budget below ₹3 crore as a recruitment criterion, not a market-wide fact |
| Team | Small administrative team; people may handle multiple responsibilities |
| Devices | Smartphone plus access to a laptop/desktop; confirm in interviews |
| Digital skills | Comfortable with basic forms, spreadsheets, email or messaging; test actual skill |
| Connectivity | Office connectivity may differ from field connectivity; product must tolerate slow connections |
| Current tools | Candidate tools include Excel/Google Sheets, bank exports, WhatsApp, email and paper receipts; do not assume all are used |
| Budget | Needs a free/very-low-cost workflow with no new hardware |
| Decision criteria | Less manual work, accurate totals, safe document handling, simple donor sharing and exportability |

**Primary job to be done:**

> When our NGO completes a fundraising project, I need to bring together donation records, expenses and supporting evidence so I can prepare an accurate project report without spending excessive time searching for information and coordinating with different team members.

### 3.2 Secondary users

| User | Need | Access in MVP |
|---|---|---|
| NGO founder/director | Oversight of projects, balances and donor confidence | NGO admin role |
| Field/programme worker | Submit project activities, delivery counts and evidence | Staff role if time permits; otherwise coordinator enters updates |
| Individual donor | Understand what was received, spent, documented and delivered | Public read-only report link; no account required |
| Independent auditor/reviewer | Inspect supporting evidence and record a verification decision | Not in P0; planned P1 reviewer workflow |

### 3.3 Initial pilot segment

Recruit 2–3 real NGOs that:

- Have completed at least one donation-funded project in the last six months.
- Receive donations from individual supporters.
- Record project expenses and retain at least some supporting evidence.
- Can demonstrate their current reporting workflow using redacted records.
- Do not already have a fully satisfactory project-level donor-reporting system.

Do not start with large national charities or organisations already operating mature donor-management platforms. They may have very different needs.

---

## 4. Solution approaches considered

| Approach | Mechanism | Main benefit | Limitation | Hackathon feasibility |
|---|---|---|---|---|
| **A. Evidence-backed project reporting workspace + report hash anchor** | NGO records donations, expenses, documents and project updates; system generates a public report; hash of the report is anchored on-chain | Addresses the NGO's reporting work and gives donors a simple report; hash makes later changes detectable | Does not independently prove that submitted records are true | **High — recommended** |
| B. Donor-only verification portal | Public portal displays reports uploaded by NGOs | Easy for donors to browse | Does not solve the upstream problem of collecting, connecting and maintaining the data | Medium; weak standalone value |
| C. Milestone escrow smart contract | Donors send crypto; smart contract releases it when milestones are approved | Can enforce predetermined crypto disbursement rules | Does not handle ordinary UPI/bank donations; requires custody/payment design, credible milestone oracles and legal/compliance work | Low for a short hackathon |
| D. AI receipt/document parser | OCR/LLM extracts amounts, dates and categories from receipts and drafts reports | Could reduce manual data entry | Extraction errors, document privacy, model quotas and false confidence; does not verify authenticity | Medium; defer until manual workflow is proven |
| E. Independent field-verification network | Authorised verifiers inspect invoices, purchases and delivery, then sign a report | Stronger evidence about real-world delivery | Expensive and operationally difficult to coordinate; cannot be built credibly as a hackathon MVP | Low |

### Selected approach

Choose **Approach A**. It completes the whole user journey and uses blockchain narrowly for a defensible purpose: integrity-checking the published report snapshot. Keep independent verification as a clearly labelled human process, not an automated feature.

---

## 5. Competitor and alternative-solution position

The product must acknowledge the capabilities that already exist.

| Alternative | Existing capability documented publicly | What FundTrail can test as a narrower differentiator |
|---|---|---|
| Give.do | Donation acknowledgements, periodic fundraiser updates and NGO due diligence are described in its public donor guidance | A project-reporting workspace intended for NGO-owned/direct and cross-channel records, rather than another fundraising marketplace |
| Ketto | KYC and campaign verification processes exist. Its support page says its Verified tag can mean a representative met the patient and funds go to the hospital, while explicitly stating that Ketto does not verify end-use of funds | Distinguish campaign/beneficiary verification from project-level expenditure and delivery reporting |
| Milaap | Its public guidance describes periodic campaign updates and fund transfers against relevant documents/bills/invoices; withdrawal requests are checked by its verification team | Offer an NGO-managed reporting layer for records that may originate outside one crowdfunding platform |
| FundCorps | Its FAQ says NGOs are encouraged to provide utilisation reports in a pre-agreed or NGO-defined format | Make report creation and supporting evidence linkage the central workflow; do not claim utilisation reports are absent from the market |
| Spreadsheets + WhatsApp + folders | Flexible, familiar, low-cost and already available | Reduce repeated consolidation and provide a donor-ready report from the same records |

**Differentiation statement:** FundTrail is not a crowdfunding marketplace and does not replace existing platforms. It is a lightweight, channel-agnostic project reporting layer for NGOs. The NGO records/imports its project data, connects each expense to supporting evidence, creates a standard report and anchors the final report fingerprint. This differentiator is a product hypothesis to test, not a claim that no competitor can perform similar functions.

Sources are listed in [Research and service references](#19-research-and-service-references).

---

## 6. USP and weighted evaluation

### 6.1 USP

> **For operations and finance coordinators at small Indian NGOs who struggle to compile project-level donation, expenditure and evidence records, FundTrail turns those records into a shareable, structured utilisation report and anchors its cryptographic fingerprint on Polygon Amoy. Unlike a conventional spreadsheet or a single-platform campaign update, it is designed to consolidate records from multiple donation channels and lets a donor independently check whether the published report snapshot matches its on-chain fingerprint.**

### 6.2 Measurable intended outcome

Pilot targets, not achieved results:

- Reduce median project-report preparation time by at least **30%** against the NGO's current process.
- Link at least **90%** of sampled project expenses to a supporting record or an explicitly labelled “evidence missing” status.
- Correctly assign at least **95%** of imported/manual donation entries to the selected project in the test dataset.
- Enable at least **80%** of test donors to answer four of five basic report-comprehension questions within two minutes.

### 6.3 Weighted USP score

Scale: 1 = weak, 5 = strong. For implementation effort, a higher score means lower effort / easier delivery.

| Criterion | Weight | Score | Weighted contribution | Reason |
|---|---:|---:|---:|---|
| Problem importance | 30% | 4/5 | 1.20 | NGO reporting constraints and donor demand for clearer impact are supported by desk research; exact cross-channel pain still needs interviews |
| Differentiation | 25% | 4/5 | 1.00 | Cross-channel NGO-owned reporting plus public report fingerprint is a focused combination, but not proven unique and not a substitute for platform verification |
| Friction reduction | 20% | 5/5 | 1.00 | A single structured record can generate totals, missing-evidence flags and the donor report; benefit must be measured against current workflow |
| Demo clarity | 15% | 5/5 | 0.75 | Judges can see a donation, expense, receipt, public report and on-chain hash check end to end |
| Implementation effort | 10% | 4/5 | 0.40 | Supabase and a small Solidity contract keep scope manageable; RLS and wallet integration still require testing |
| **Total** | **100%** | | **4.35/5 (87/100)** | Preliminary strategic judgment, not evidence of market demand |

**Uncertainty:** The score should be revised after observing real NGO reporting. If organisations already produce accurate, timely reports with little effort, lower the problem-importance and friction-reduction scores. If donors care primarily about independent field checks, this MVP alone will not meet their need.

---

## 7. MVP scope and feature backlog

### 7.1 P0 — must work end to end

| P0 feature | What it does | Pain point addressed | How to test success |
|---|---|---|---|
| NGO sign-in and organisation membership | Staff sign in; each record is scoped to their organisation | Access control and shared team workflow | User from NGO A cannot view or modify NGO B records |
| Project creation | Project name, purpose, time period, target amount and currency | No common project context for the records | Create a project and use it for donation, expense and update records |
| Manual donation entry | Record amount received, date, channel, optional source reference and private donor label | Fragmented contribution records | Entry appears in correct project's total; private donor information never appears publicly |
| CSV donation import | Import a simple documented CSV template; validate rows and detect duplicate source references | Repeated manual reconciliation | Valid rows import; invalid rows are reported; duplicates are not silently re-imported |
| Expense entry | Record amount, date, category, description, optional vendor/payment reference | Expense details are difficult to consolidate | Expense is included in totals and category breakdown |
| Evidence upload | Upload receipt/invoice or supporting file; compute SHA-256 fingerprint; store privately | Evidence is scattered or cannot be matched to an expense | File is linked to the right expense; unauthorized users cannot open it |
| Project activity update | Add a dated progress summary and optional aggregate beneficiary count | Financial totals alone do not explain what happened | Donor report clearly labels activity/beneficiary figures as NGO-reported |
| Reconciliation dashboard | Compute total received, total spent, remaining balance, categories and missing-evidence count | Manual report consolidation | Totals match the seeded ledger exactly; overspend is flagged |
| Publish report snapshot | Create a versioned, read-only, sanitised report from current records | Donors receive inconsistent or difficult-to-understand updates | Public link displays the correct totals and no private data |
| Polygon Amoy report anchor | Record project-key hash, version and report hash in a smart contract | Published content can be changed without an obvious audit signal | Transaction succeeds on Amoy and stored snapshot verifies against contract data |
| Public report verification | Recompute report hash and compare it with on-chain value | Donor cannot independently check report integrity | Matching snapshot shows “Integrity check passed”; changed snapshot shows “Mismatch” |
| Honest status labels | Clearly distinguish NGO-reported, document-uploaded, NGO-reviewed and independently verified | Prevents documents being misrepresented as proof | UI never describes an upload as independently verified by default |

### 7.2 P1 — only after all P0 paths work

- Field-worker role and mobile-first evidence submission.
- CSV export and print-friendly/PDF report.
- Optional redacted public copies of documents in a separate public bucket; private originals remain private.
- Reviewer role that can record a named human review, timestamp and scope.
- NGO approval workflow before report publication.
- Report version comparison and visible change history.
- Multiple projects per NGO with filters.
- Hindi and other local-language interface.
- Offline draft queue for field updates, with conflict handling on sync.
- Email notification when a new report is published (requires a mail provider and SMTP/API setup).

### 7.3 P2 — explicitly defer

- AI/OCR invoice extraction or AI-generated narratives.
- UPI/payment gateway integration or automatic bank connection.
- Custody, escrow or milestone release of real money.
- Per-donation on-chain transactions.
- Public storage of original receipts, identity documents or beneficiary photographs on IPFS.
- Token/reward system, DAO voting or cryptocurrency donations.
- Full independent audit network or automated fraud detection.
- Native Android/iOS application.
- Complex analytics, predictive impact scoring or multi-country tax handling.

**Scope rule:** Do not start P1/P2 work until one NGO user can complete the full P0 workflow and one donor can read and verify a published report.

---

## 8. Core workflow — end to end

### 8.1 NGO workflow

1. **Sign in.** NGO coordinator authenticates using Supabase Auth.
2. **Create/select organisation.** The user's membership determines access.
3. **Create project.** Enter title, purpose, date range, funding goal and currency (INR for MVP).
4. **Record donations.** Add one manually or import the supplied CSV template. The entered amount means **the amount actually received by the NGO**, after any platform/payment deductions. If the NGO wants to show gross donations and fees separately, represent fees as a separate expense/adjustment; do not mix gross and net figures.
5. **Record an expense.** Enter amount, date, category and description. Link it to the project.
6. **Attach evidence.** Upload a receipt/invoice into a private bucket. Compute and store the SHA-256 of the original file bytes. The system must not imply the file is genuine merely because it has a hash.
7. **Add progress update.** Record activity and optional aggregate count. Do not collect beneficiary names, Aadhaar, phone numbers or sensitive case details for the MVP.
8. **Review dashboard.** Show totals, remaining balance, expense categories and missing evidence. If expenses exceed recorded receipts, show an explicit warning; never silently cap the total.
9. **Generate report preview.** Create a sanitised JSON snapshot from project data and show exactly what donors will see.
10. **Publish version.** Insert an immutable snapshot row with version number and a random public slug or token. A correction creates a new version; do not overwrite a published snapshot.
11. **Anchor on Polygon Amoy.** NGO admin connects MetaMask, switches to Amoy and submits the report hash. Wait for a mined transaction receipt.
12. **Verify.** Public report page fetches the published snapshot, canonicalises it, recomputes SHA-256 and compares it with the contract's stored hash for that project/version.

### 8.2 Donor workflow

1. Donor opens a shareable URL such as `/r/<public-slug>`; no login or wallet is required.
2. Donor sees project purpose, report date/version, total received, total spent, balance, expenditure breakdown, progress summary and evidence/status labels.
3. Donor sees whether the report is anchored and the transaction link to PolygonScan Amoy.
4. Donor selects **Verify report integrity**.
5. The browser recomputes the snapshot hash and reads the expected hash from the smart contract using a public RPC.
6. The page returns one of:
   - `MATCH` — this snapshot matches the hash recorded on Amoy.
   - `MISMATCH` — the snapshot does not match the on-chain hash.
   - `UNAVAILABLE` — RPC/network/contract data could not be read; do not show this as a pass.
   - `NOT ANCHORED` — report exists but no successful anchor has been recorded.

### 8.3 Error and fallback behaviour

| Failure | Required behaviour |
|---|---|
| CSV contains invalid row | Show row number and reason; allow valid rows to be imported without silently dropping the rest |
| Duplicate source reference | Flag as duplicate and skip by default; allow a deliberate manual resolution |
| Donation amount missing/negative | Reject row with a clear message |
| Expense exceeds recorded donation total | Save if valid, but show “Expenses exceed recorded receipts” warning |
| Receipt upload fails | Keep expense draft; allow retry; never show the evidence as attached |
| User lacks organisation membership | Deny access at database policy layer, not only by hiding UI controls |
| Wallet not installed | Allow report publication but show `NOT ANCHORED`; provide setup guidance |
| Wrong network | Prompt user to switch to chain ID 80002; do not submit to mainnet |
| User rejects wallet request | Keep report published; show anchor as cancelled/not anchored; allow retry |
| RPC unavailable | Show `UNAVAILABLE`; show stored transaction hash if present; retry later |
| Anchor transaction reverts | Do not mark anchored; display error and allow retry |
| Report content is changed after publication | Publish a new version; old version remains immutable and its integrity check should fail if its stored snapshot is altered |

---

## 9. Information architecture and screens

### 9.1 NGO application

| Route | Screen | Main contents/actions |
|---|---|---|
| `/login` | Sign in | Email/password; clear demo login instructions |
| `/app` | Dashboard | Organisation projects, total recorded inflows/outflows, recent activity and actions |
| `/app/projects/new` | Create project | Project details and target |
| `/app/projects/:id` | Project overview | Received, spent, remaining, progress and data-quality warnings |
| `/app/projects/:id/donations` | Donations | Manual entry, CSV import, filters and duplicate warnings |
| `/app/projects/:id/expenses` | Expenses | Add/edit draft expense, category, amount and evidence link |
| `/app/projects/:id/updates` | Progress updates | Dated activity summaries and aggregate counts |
| `/app/projects/:id/report` | Report preview/publish | Donor-visible fields, privacy review, version and anchor action |

### 9.2 Donor-facing report

| Route | Screen | Main contents/actions |
|---|---|---|
| `/r/:slug` | Public report | Purpose, totals, expense breakdown, updates, evidence status, report date/version |
| `/r/:slug/verify` or modal | Integrity verification | Hash match status, network, contract, transaction link and limitations |

### 9.3 UX requirements

- Clean, trustworthy, restrained visual design; avoid crypto-trading visuals.
- Currency shown in INR with Indian number grouping (e.g. `₹1,00,000`).
- Mobile-first layouts and accessible labels.
- Never make a chart the only way to understand financial data; show the numbers and a table as well.
- Show “Last updated” and report version.
- Always distinguish `Self-reported by NGO` from `Independently verified`.
- Donor view must not require MetaMask, a crypto wallet or account creation.
- No fake live-updating counters or fabricated verification badges.

---

## 10. System architecture

### 10.1 Recommended architecture

```text
                     NGO coordinator / staff
                              |
                              v
                 React + TypeScript + Vite UI
                    |                     |
                    |                     +-------------------------------+
                    v                                                     v
          Supabase Auth + Postgres                              MetaMask wallet
          + private Supabase Storage                                    |
                    |                                                   | sign transaction
                    |                                                   v
                    |                                         Polygon Amoy testnet
                    |                                         ReportAnchor contract
                    |                                                   |
                    +---------------------+-----------------------------+
                                          |
                                          v
                              Public donor report URL
                              (sanitised snapshot only)
                                          |
                                          v
                              Recompute snapshot hash
                              and compare with contract
```

### 10.2 Why this architecture

- One managed backend reduces setup and integration work.
- Supabase provides Postgres, Auth and object storage in one project.
- RLS can enforce organisation-level data separation.
- The public report is a sanitised immutable snapshot, not a public view over private accounting tables.
- Polygon Amoy demonstrates the blockchain requirement without placing sensitive records or real donations on-chain.
- No separate Node/Express API is required for the P0 demo unless the coding IDE finds a specific server-side requirement.

### 10.3 Database entities

Use PostgreSQL UUID primary keys and foreign keys. Use `numeric(14,2)` for INR amounts, not floating-point values.

| Table | Important fields | Access |
|---|---|---|
| `organizations` | `id`, `name`, `created_by`, `created_at` | Members only |
| `organization_members` | `id`, `organization_id`, `user_id`, `role` (`ADMIN`, `STAFF`) | Organisation admin/member policies |
| `projects` | `id`, `organization_id`, `title`, `purpose`, `goal_amount`, `currency`, `start_date`, `end_date`, `public_slug`, `status` | Organisation members |
| `donations` | `id`, `organization_id`, `project_id`, `amount_received`, `received_at`, `channel`, `source_reference`, `private_donor_label`, `created_by` | Organisation members only |
| `expenses` | `id`, `organization_id`, `project_id`, `amount`, `spent_at`, `category`, `description`, `vendor_label`, `payment_reference`, `created_by` | Organisation members only |
| `evidence_files` | `id`, `organization_id`, `project_id`, `expense_id`, `private_storage_path`, `public_storage_path` nullable, `sha256`, `file_name_safe`, `evidence_type`, `visibility`, `review_status`, `uploaded_by` | Organisation members; public objects only through separately approved public bucket |
| `project_updates` | `id`, `organization_id`, `project_id`, `update_date`, `summary`, `beneficiary_count` nullable, `status` | Organisation members |
| `report_snapshots` | `id`, `organization_id`, `project_id`, `version`, `public_slug`, `snapshot_json`, `report_hash`, `published_at`, `published_by` | Immutable; public read only when published and sanitised |
| `report_anchors` | `id`, `report_snapshot_id`, `chain_id`, `contract_address`, `tx_hash`, `publisher_wallet`, `anchor_status`, `created_at` | Organisation members; only safe anchor metadata shown publicly |

**Database rules:**

- Every business table must carry `organization_id` directly or through a parent relationship that can be securely checked.
- Enable Row Level Security on all exposed tables and write policies for each operation.
- Public/anonymous users may read only the sanitised, published report snapshot and explicitly public evidence objects.
- Public users must not read donor names, donor references, original bank records, private invoices, organisation membership or private notes.
- Published report snapshots are immutable. A correction creates version `n+1`.
- Totals are calculated from rows in the database; do not accept user-entered “total received” or “total spent” as authoritative totals.
- Do not put a Supabase `service_role` key in frontend code. Prefer the publishable/anon key plus RLS.
- Never rely only on route guards or hidden buttons for authorisation.

### 10.4 Storage layout

Create a **private** bucket named `evidence-private` for original supporting documents.

Recommended object path:

```text
<organization_uuid>/<project_uuid>/<expense_uuid>/<random_file_name>
```

For P0, donors see evidence metadata and status, not the original private file. If a redacted copy is intentionally approved for public sharing, use a separate `evidence-public` bucket and a deliberate `public_storage_path` field. Never automatically expose the private original.

Allowed file types for MVP: PDF, JPG, JPEG, PNG. Set a conservative maximum upload size (for example 5 MB) and validate both MIME type and file size. Do not execute uploaded files. Use synthetic documents in the demo.

### 10.5 Report snapshot format

Generate a sanitised JSON object from database records. The snapshot should contain only donor-safe data, for example:

```json
{
  "schemaVersion": 1,
  "project": {
    "title": "School Kit Support",
    "purpose": "Provide educational kits to students",
    "reportVersion": 1,
    "currency": "INR"
  },
  "financials": {
    "totalReceived": "100000.00",
    "totalSpent": "65000.00",
    "remaining": "35000.00"
  },
  "expensesByCategory": [
    { "category": "Educational materials", "amount": "40000.00" },
    { "category": "Distribution and logistics", "amount": "15000.00" },
    { "category": "Other project expenses", "amount": "10000.00" }
  ],
  "evidenceSummary": [
    { "type": "invoice", "status": "DOCUMENT_UPLOADED", "sha256": "0x..." }
  ],
  "updates": [
    { "date": "2026-10-25", "summary": "Distribution activity reported", "beneficiaryCount": 60, "status": "NGO_REPORTED" }
  ],
  "publishedAt": "2026-10-30T12:00:00Z"
}
```

The exact values above are fabricated demo data. The real report must be generated from records.

**Hashing requirements:**

1. Use a deterministic JSON canonicalisation method (stable key ordering and stable number/date formatting).
2. Hash the canonical UTF-8 JSON bytes with SHA-256.
3. Represent the 32-byte result as a `bytes32` hex string.
4. The public page must run the same canonicalisation and hash function against the stored snapshot.
5. Never include donor names, phone numbers, email addresses, Aadhaar, bank account numbers, private file URLs or beneficiary identities in the public snapshot.
6. Changing the snapshot after publication must produce a hash mismatch. A correction must create a new report version and a new anchor.

---

## 11. Smart contract design

### 11.1 Why blockchain is used

The contract stores only:

- A pseudonymous project key hash.
- A report version.
- The SHA-256 hash of the sanitised report snapshot.
- Publisher wallet address and block timestamp via the transaction/event.

This creates a public, tamper-evident reference for a published report. It does **not** prove the truth of the data in the report.

### 11.2 Network

Use **Polygon Amoy testnet**, not Polygon mainnet.

| Setting | Value |
|---|---|
| Network | Polygon Amoy Testnet |
| Chain ID | `80002` |
| Currency | `POL` test token |
| RPC | `https://polygon-amoy.drpc.org` (public endpoint listed in Polygon developer documentation; may have rate limits) |
| Explorer | `https://amoy.polygonscan.com/` |
| Faucet | [Polygon faucet](https://faucet.polygon.technology/) or Polygon's official support instructions |

Testnet tokens have no intended monetary value. Faucet availability and delivery are not guaranteed; request test POL early. If faucet access is delayed, develop and test against Remix VM/local chain, then use Amoy for the final public-chain demonstration if tokens become available.

### 11.3 Contract interface

Create a small Solidity contract named `ReportAnchor`.

Required functions/events:

- Constructor sets deployer as owner and initial authorised publisher.
- `setPublisher(address publisher, bool allowed)` — owner can authorise/revoke NGO publishing wallets.
- `anchorReport(bytes32 projectKey, bytes32 reportHash, uint64 version)` — authorised publisher records a report version; require non-zero hashes and strictly increasing version for the project.
- `getReportHash(bytes32 projectKey, uint64 version)` — returns the stored report hash.
- `ReportAnchored(bytes32 indexed projectKey, uint64 indexed version, bytes32 reportHash, address indexed publisher)` event.

**Contract constraints:**

- Do not add donation collection, ERC-20 tokens, escrow, withdrawal, or transfer logic.
- Do not store raw personal data, documents, images, donor identities or exact bank references on-chain.
- Do not store an entire report on-chain; only its fingerprint and minimal project/version key.
- Only an authorised NGO publisher can create anchors.
- A published report is not “independently verified” merely because the transaction succeeded.

### 11.4 Deployment path — simplest option

Use **Remix IDE** for the first deployment; it runs in the browser and does not require a local Solidity toolchain.

1. Create a separate test-only MetaMask wallet. Do not use a wallet holding real assets.
2. Add Polygon Amoy using Polygon's official network instructions.
3. Request test POL from the official faucet.
4. Open [Remix IDE](https://remix.ethereum.org/), create `ReportAnchor.sol`, paste the generated contract and compile with a compatible Solidity 0.8.x compiler.
5. In Deploy & Run, select the injected/browser wallet provider, ensure MetaMask is on Polygon Amoy, and deploy.
6. Save the deployed contract address and ABI in the application configuration/repository.
7. Add the publishing wallet if it is not already authorised.
8. Test one anchor transaction and confirm it is visible on Amoy Polygonscan.

For automated contract unit tests, Hardhat may be added later; it is not mandatory for the first P0 implementation.

### 11.5 On-chain verification flow

- `projectKey = keccak256(UTF8(project UUID))` (or another stable, non-personal project identifier).
- `reportHash = SHA256(canonicalSnapshotBytes)`.
- NGO admin signs `anchorReport(projectKey, reportHash, version)` through MetaMask.
- After a successful receipt, save the transaction hash and contract metadata in Supabase.
- Donor page reads the corresponding `getReportHash(projectKey, version)` from Amoy and compares it to the locally recomputed snapshot hash.
- A transaction hash in the database is not enough by itself; the donor page must compare against contract state or the event.

If the network is unavailable, show `UNAVAILABLE`, not `MATCH`.

---

## 12. Recommended tech stack

| Layer | Recommended technology | Reason | Free-tier / cost note |
|---|---|---|---|
| Frontend | React + TypeScript + Vite | Fast client-side application; easy for coding IDEs to scaffold | Open source |
| Styling | Tailwind CSS | Fast responsive UI without a large design system | Open source |
| UI icons | Lucide React | Consistent lightweight icons | Open source |
| Charts | Recharts (optional) | Simple expense breakdown visualisation | Open source; show data table as well |
| Backend/database | Supabase Postgres | Managed relational DB, REST/Data API and SQL | Free plan currently lists 500 MB DB/project, 1 GB file storage, 5 GB egress and 50,000 MAU; verify limits before deployment |
| Authentication | Supabase Auth | Email/password for NGO staff; no separate auth provider required | Included within Supabase plan limits |
| File storage | Supabase Storage | Private evidence bucket with RLS policies | Free quota currently lists 1 GB storage; keep demo files small |
| CSV parsing | Papa Parse | Browser-side CSV validation/import; no Google Sheets API required | Open source |
| Blockchain client | ethers.js v6 | Connect to MetaMask and call the contract | Open source |
| Smart contract | Solidity 0.8.x | Small report hash registry | No cost to write code; testnet transactions need test POL |
| Contract IDE | Remix | Browser-based compile/deploy workflow | No paid API key required |
| Hosting | Cloudflare Pages | Static frontend deployment from Git | Free plan; documented limits include 500 builds/month; verify current terms |
| Source control | GitHub | Code repository and deployment integration | Free account is sufficient for a public/private hackathon repo within current limits |

### 12.1 Alternatives and why not to use them in P0

- **Separate Express/FastAPI backend:** avoid unless a concrete server-side requirement appears. Supabase already handles the initial database/auth/storage workload.
- **MySQL:** user may know MySQL, but Supabase is PostgreSQL-based. Use one database, not two.
- **Firebase:** viable alternative, but don't combine Firebase and Supabase. The relational project/donation/expense model maps naturally to Postgres.
- **IPFS/Pinata:** defer. Evidence documents can contain personal or financial data; public/permanent storage is the wrong default. Store files privately and anchor only hashes.
- **Google Sheets API:** not required. Accept a CSV export from an existing spreadsheet.
- **Gemini/OpenAI API:** not required. The MVP is deterministic data capture, calculations and reporting. Do not send private invoices to an LLM just to generate a demo feature.
- **Razorpay/PhonePe/UPI API:** not required. The MVP records/imports donations after they have been received; it does not take payments.
- **Paid RPC:** not required initially. Use a public Amoy RPC; if rate-limits block the demo, configure a free developer-tier provider only after checking its current terms and key quotas.

---

## 13. What the team must create or obtain

### 13.1 Required accounts / setup

| Item | Required? | What you must do | Key/secret required? |
|---|---|---|---|
| GitHub account | Yes | Create repository and push code | No API key for normal Git use |
| Supabase account | Yes | Create project, database, Auth and Storage | Project URL + publishable/anon key |
| Cloudflare account | Recommended | Connect GitHub repo and deploy frontend to Pages | No application API key for normal Git integration |
| MetaMask browser wallet | Yes for Amoy anchor demo | Create a separate test-only wallet and add Amoy | No API key; never give any IDE or teammate your recovery phrase |
| Polygon Amoy test POL | Yes for public-chain write demo | Request from official faucet | No API key; faucet request may be reviewed/delayed |
| Remix IDE | Yes for easiest contract deployment | Compile and deploy `ReportAnchor.sol` | No API key |
| Public Polygon Amoy RPC | Yes for on-chain reads | Use the public RPC URL listed above | No key for listed public endpoint; may be rate-limited |

### 13.2 Environment variables

Create `.env.example` with placeholders only:

```bash
# Supabase public browser configuration
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY

# Polygon Amoy configuration
VITE_AMOY_CHAIN_ID=80002
VITE_AMOY_RPC_URL=https://polygon-amoy.drpc.org
VITE_AMOY_EXPLORER_URL=https://amoy.polygonscan.com
VITE_REPORT_ANCHOR_CONTRACT_ADDRESS=0xYOUR_DEPLOYED_CONTRACT_ADDRESS

# Optional: public app URL, used when generating share links
VITE_PUBLIC_APP_URL=http://localhost:5173
```

Use the current Supabase **publishable key** for browser use. If your project dashboard still exposes a legacy `anon` key, use that only as the public browser key with RLS correctly configured. The key is designed to be public; it does not replace database and storage access policies.

**Never create or expose these in frontend environment variables:**

- `SUPABASE_SERVICE_ROLE_KEY`
- MetaMask secret recovery phrase
- Wallet private key
- Database password
- Any server-side secret

The P0 app should not need a service-role key or a deployment private key in its frontend. The NGO user signs report-anchor transactions in MetaMask.

### 13.3 API-key checklist — what is actually needed?

| Service | Key needed? | Use |
|---|---|---|
| Supabase | **Yes — URL + public anon/publishable key** | Database, authentication and file storage |
| Polygon Amoy public RPC | **No** | Read contract state; a public endpoint may rate-limit |
| MetaMask | **No API key** | Wallet connection and transaction signature |
| PolygonScan | **No API key** | Open transaction links; do not call its API in P0 |
| Remix | **No** | Compile and deploy Solidity contract |
| Cloudflare Pages | **No application key** | Host static frontend through Git integration |
| Gemini / OpenAI | **No — not used** | AI is not necessary for the validated MVP |
| IPFS / Pinata | **No — not used** | Avoid uploading sensitive source evidence publicly |
| UPI/payment gateway | **No — not integrated** | Donation payments happen outside this reporting MVP |
| Google Sheets API | **No — not used** | Import CSV exported from a spreadsheet |
| Email API | **No — defer** | Email notifications are P1, not required for the demo |

### 13.4 Free-tier constraints to plan around

As checked on 30 October 2026, Supabase's official billing documentation lists the Free plan with 500 MB database per project, 1 GB Storage, 5 GB egress, 50,000 monthly active users and 500,000 Edge Function invocations. The Free plan has two projects. Its pricing/billing documentation also warns that projects can be paused after inactivity; check the current dashboard and terms before the event. These allowances are sufficient for a small synthetic-data hackathon demo if files are compressed and usage is controlled, but they are not a production SLA.

Cloudflare Pages documents a Free-plan limit of 500 builds per month. Polygon lists public RPC options but notes public endpoints may have rate limits or traffic restrictions. Polygon Amoy test POL is requested through the faucet and may require review.

Free tiers can change. Re-check the provider pages immediately before the hackathon; do not promise perpetual free hosting or unlimited usage.

---

## 14. Security, privacy and trust model

This product handles NGO finances and potentially sensitive beneficiary context. Security is part of the MVP, not a later enhancement.

### Required controls

1. Enable RLS on every exposed table. Write separate SELECT/INSERT/UPDATE/DELETE policies and test them with two separate NGO accounts.
2. Organisation membership is the boundary for all private data. A staff member may only access projects belonging to an organisation where they have membership.
3. Keep source invoices/receipts private by default. Public reports expose only sanitised metadata and approved public copies.
4. Do not publish donor names, contact details, PAN, bank account numbers, transaction credentials or beneficiary identities.
5. Use aggregate beneficiary counts only. Do not collect child or patient names for the MVP.
6. Do not put personal data or original evidence on the blockchain or IPFS.
7. Limit upload file size and allowed MIME types; show upload failures clearly.
8. Use HTTPS deployment and environment variables. Never commit `.env` files.
9. Use a dedicated test wallet and testnet tokens only. Never ask a user to paste their seed phrase or private key into the application or coding IDE.
10. A public report link is shareable. Treat its content as public once published; require the NGO to review it before publication.
11. Provide a correction process: preserve old versions, publish a new version and show the relationship between versions.
12. Show the scope of each verification status. `DOCUMENT_UPLOADED` is not `INDEPENDENTLY_VERIFIED`.

### Threats to test

- User from one NGO guesses another project's URL.
- Anonymous visitor tries to read private donation/expense tables.
- Staff member attempts to upload into another organisation's storage folder.
- Public report includes a donor's private label or a private file path.
- Published report JSON is changed after its hash was anchored.
- Wrong chain ID or incorrect contract address is configured.
- Wallet transaction is rejected or remains pending.
- Unauthorised wallet attempts to anchor a report.

---

## 15. Demo dataset and judging story

Use synthetic data only. Make the UI visibly identify it as a **DEMO ORGANISATION / SYNTHETIC DATA**. Do not use a real NGO's donor or beneficiary information without permission.

### Demo project

**Project:** School Kit Support  
**Purpose:** Provide educational kits to students  
**Target:** ₹1,00,000

### Demo donations

| Date | Amount received | Channel | Reference |
|---|---:|---|---|
| 2026-10-01 | ₹40,000 | UPI | DEMO-UPI-001 |
| 2026-10-03 | ₹35,000 | Bank transfer | DEMO-BANK-002 |
| 2026-10-05 | ₹25,000 | Crowdfunding | DEMO-CF-003 |
| **Total** | **₹1,00,000** | | |

### Demo expenses

| Date | Category | Amount | Evidence |
|---|---|---:|---|
| 2026-10-12 | Educational materials | ₹40,000 | Synthetic invoice PDF |
| 2026-10-18 | Distribution/logistics | ₹15,000 | Synthetic receipt PDF |
| 2026-10-22 | Other project expenses | ₹10,000 | Synthetic bill PDF |
| **Total spent** | | **₹65,000** | |

**Remaining recorded balance:** ₹35,000.

**Demo update:** “Distribution activity reported; 60 kits distributed.” Status must read `NGO_REPORTED`, not independently verified.

### 3-minute demo script

1. **Problem (20 sec):** Explain that the NGO has donation records, expenses and proof spread across separate workflows; the product reduces reporting effort rather than claiming to eliminate fraud.
2. **NGO workspace (40 sec):** Sign in, open the School Kit Support project and show received/spent/remaining totals.
3. **Evidence link (30 sec):** Open one expense, show its attached synthetic invoice and file fingerprint; show that it is uploaded, not independently verified.
4. **Report publication (30 sec):** Preview and publish the sanitised project report.
5. **Blockchain anchor (30 sec):** Connect MetaMask on Amoy, anchor the report hash and open the transaction on Amoy Polygonscan.
6. **Donor view (30 sec):** Open the public link in an incognito window without login or wallet; review the totals and project update.
7. **Integrity check (20 sec):** Run the hash check and show `MATCH`. Explain that a changed snapshot would show `MISMATCH` and that a match proves integrity relative to the anchor, not truth of the underlying claim.

Have a pre-deployed contract, a funded test wallet and a previously tested transaction available. The live demo should not depend on waiting for a faucet or debugging contract deployment.

---

## 16. Build plan and ownership

Hackathon duration/team size were not provided. Use this as an adaptable **30-hour plan for a 3-person team**. For a shorter event, cut P1 and retain the same P0 sequence.

| Time | Workstream | Owner | Dependency / checkpoint |
|---|---|---|---|
| Hours 0–2 | Freeze scope, confirm data fields, set up GitHub, Supabase, Cloudflare | All / lead | One-page accepted scope; accounts ready |
| Hours 2–5 | Supabase schema, migrations, Auth, RLS, private storage | Backend/data owner | Two test users; cross-organisation access tests pass |
| Hours 5–10 | React layout, login, project creation, donation/expense forms, CSV import | Frontend owner | Can create project and record/import rows |
| Hours 10–14 | Evidence upload, SHA-256 fingerprints, project updates, dashboard calculations | Frontend + backend | End-to-end private NGO ledger works |
| Hours 14–18 | Sanitised report snapshot, immutable versions, donor page | Frontend + backend | Public link works without login and exposes no private data |
| Hours 18–21 | Solidity contract, deploy to Amoy, ethers/MetaMask integration | Blockchain owner | One confirmed anchor transaction and contract ABI/address stored |
| Hours 21–25 | Public integrity verification, error/fallback paths, integration tests | All | `MATCH`, `MISMATCH`, `UNAVAILABLE`, `NOT ANCHORED` states tested |
| Hours 25–27 | Deploy Cloudflare Pages, configure environment variables | Deployment owner | Public URL deployed, database reachable |
| Hours 27–29 | Security review, mobile check, seeded dataset, bug fixes | All | P0 acceptance tests pass |
| Hours 29–30 | Demo rehearsal and backup recording/screenshots | Presenter + all | 3-minute demo works twice in succession |

### Suggested responsibilities

- **Person 1 — Frontend/product:** screens, forms, dashboard, donor report, responsive UI.
- **Person 2 — Backend/data/security:** Supabase schema, RLS, Storage policies, imports and report snapshot.
- **Person 3 — Blockchain/integration/deployment:** contract, Amoy, wallet, verification, hosting and final integration.

If there are only two people, one should own Supabase + contract while the other owns frontend; freeze all database interfaces early. If solo, build the UI/data journey first and anchor the report only after report snapshots work locally.

### Mandatory integration checkpoint

By the middle of the hackathon, the team must be able to:

1. Sign in as an NGO user.
2. Create one project.
3. Add at least one donation and expense.
4. Attach one synthetic evidence file.
5. Load the project dashboard with correct totals.

If this checkpoint fails, stop adding features and fix the data path.

---

## 17. Acceptance tests and proof of success

### 17.1 Functional acceptance tests

| ID | Test | Expected result |
|---|---|---|
| T01 | NGO admin signs in | Dashboard loads for the user's organisation |
| T02 | Create a project | Project is stored and visible only to organisation members |
| T03 | Add a donation of ₹40,000 | Received total increases by ₹40,000 |
| T04 | Import a valid CSV with three donation rows | All valid rows appear with correct dates, channels and totals |
| T05 | Import malformed/duplicate CSV rows | Rows are flagged with reasons; duplicates are not silently counted twice |
| T06 | Add an expense of ₹15,000 | Spent total and category breakdown update correctly |
| T07 | Upload a synthetic invoice | Private file is stored and linked to the intended expense; hash is saved |
| T08 | Try to access another NGO's file/data | Access is denied by RLS/Storage policy |
| T09 | Publish a report | Sanitised, versioned snapshot and public slug are created |
| T10 | Open report in an incognito window | Only donor-safe published data is visible; no login required |
| T11 | Anchor snapshot on Amoy | Confirmed transaction and correct version/hash are recorded |
| T12 | Verify unchanged snapshot | UI reports `MATCH` and links to explorer transaction |
| T13 | Alter a test snapshot after anchoring | UI reports `MISMATCH`; never displays a passing badge |
| T14 | Disconnect RPC | UI reports `UNAVAILABLE`, not `MATCH` |
| T15 | Reject MetaMask transaction | Report remains published but is marked `NOT ANCHORED` or retryable |
| T16 | Record expenses greater than donations | Dashboard shows negative/overspend warning clearly |
| T17 | Inspect public JSON | Donor names, bank details, personal identifiers and private paths are absent |
| T18 | Open at 360px viewport | Main task and donor report are usable without horizontal overflow |

### 17.2 Outcome measurements

Record the baseline before the NGO uses FundTrail:

- Minutes/hours to prepare the last three comparable project reports.
- Number of manual copy/paste steps and tools used.
- Percentage of sampled expenses with a linked document or explicit missing status.
- Number of contribution rows that cannot be assigned to a project.
- Median time to answer a recent donor utilisation query.
- Donor comprehension score on five questions about the report.

Then measure the same indicators using the MVP. Pilot target: at least 30% reduction in median report-preparation time, at least 90% documented/explicitly flagged expense coverage and at least 80% donor comprehension success. These are targets, not promised results.

### 17.3 Evidence that would invalidate or change the product direction

- NGOs already generate accurate project reports quickly with current software.
- Multiple NGOs say the actual bottleneck is field delivery verification, not report preparation.
- Donors do not use or understand more detailed reports.
- Staff spend more time entering data into FundTrail than with their current process.
- The NGO cannot safely share the evidence donors require.
- A current fundraising/accounting platform already solves the exact cross-channel workflow for the chosen segment.

If these findings occur, revise the segment or problem before adding features.

---

## 18. Known limitations and next validation steps

### Known MVP limitations

1. Donation entries are manually entered or CSV-imported; the app does not connect to UPI, bank accounts or payment gateways.
2. A donation row is an NGO-recorded amount, not proof of bank settlement.
3. Expense evidence is uploaded by NGO staff; the system does not automatically authenticate an invoice.
4. Beneficiary counts and activity updates are self-reported unless a separate reviewer records a verifiable check.
5. The blockchain anchor proves that a particular hash was recorded and can reveal a later content mismatch; it does not prove the underlying report is truthful.
6. Polygon Amoy is a testnet. The demo does not establish production readiness or mainnet security.
7. Public RPC endpoints may throttle or become unavailable. The app must show an unavailable state and provide a transaction link when available.
8. Supabase and Cloudflare free plans have quotas, inactivity behaviour and terms that may change. This is a prototype deployment, not a production service commitment.
9. The first version is designed for INR and one NGO organisation per user's current membership context; complex accounting, tax, audit and FCRA workflows are out of scope.
10. No automated independent audit is included.

### Next validation steps

1. Interview 5–8 NGO finance/operations coordinators using the Step 2 interview script.
2. Observe one completed project per participating NGO from donation recording through final reporting.
3. Time the existing report preparation process and document actual tools, handoffs and rework.
4. Interview 8–10 recent donors and test their comprehension of existing project updates.
5. Review three competing workflows (for example, Give.do, Ketto and Milaap) against the same project and evidence requirements.
6. Run a small usability test with the P0 reporting prototype before adding AI, OCR, IPFS or payment integrations.

---

## 19. Research and service references

All links below were checked on or around **30 October 2026**. Product plans and service quotas can change; re-check before deployment.

### Problem and user research

- [CAF — World Giving Report 2025, India](https://www.worldgivingreport.org/partners/india) — Indian giving and donor transparency/impact preferences.
- [Artha Global — How India Gives 2025–26](https://artha.global/project/how-india-gives-2025-26/) — individual giving patterns in India; published 23 February 2026.
- [Dasra — India Nonprofit Report 2026](https://dasra.org/individual-resources/india-nonprofit-report-2026-state-of-the-sector-and-emerging-frontiers) — survey of 438 nonprofits; published 10 June 2026.
- [GivingTuesday India — UDARTA:EG](https://www.givingtuesday.org/india/udarta-eg/report/) — everyday fundraising capacity and nonprofit constraints.
- [India Development Review — It’s time to rethink MEL](https://idronline.org/article/monitoring-evaluation/its-time-to-rethink-mel/) — 12 November 2025; survey of 175 CSOs and 15 interviews; 73 of every 100 collected data points were used for donor reporting. This is broader MEL evidence, not a direct measure of donation-to-expense traceability.
- [India Development Review — Uncovering the productivity challenges of India’s fieldworkers](https://idronline.org/kn-in/article/leadership-talent/uncovering-the-productivity-challenges-of-indias-fieldworkers/) — 12 July 2024; 40 fieldworkers surveyed and seven interviewed; reports inconsistent reporting formats and report-writing burden. The sample is not specific to small NGOs.

### Competitor evidence

- [Give.do — NGO and donation guidance](https://give.do/ngos/city/mumbai) — describes donor acknowledgement, periodic campaign updates and NGO due diligence.
- [Ketto — Fundraiser Queries / Verified tag](https://customerhappiness.ketto.org/portal/en/kb/fundraiser-queries) — states the scope of its Verified tag and clarifies that it does not verify end-use of funds.
- [Milaap — How do I know my donation reaches the beneficiary?](https://milaap.zohodesk.in/portal/en/kb/articles/how-do-i-know-if-the-money-i-donated-reaches-the-beneficiary) — describes transfer against documents, bills/invoices and periodic updates.
- [Milaap — Fund withdrawal and expense documents](https://milaap.zohodesk.in/portal/en/kb/articles/how-do-i-withdraw-funds-from-my-fundraiser) — describes recipient documents, invoice requirements and verification before transfer.
- [FundCorps — FAQ](https://www.fundcorps.com/faqs) — describes NGO onboarding, donation updates and fund-utilisation reports.

### Technical services and official documentation

- [Supabase billing and quotas](https://supabase.com/docs/guides/platform/billing-on-supabase) — current Free-plan allowances and billing behaviour.
- [Supabase pricing](https://supabase.com/pricing) — plan comparison.
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) — required database access controls.
- [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control) — policies for private file access.
- [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/) — Free-plan build limits.
- [Polygon Amoy network setup](https://support.polygon.technology/support/solutions/articles/82000907114-how-to-add-amoy-network-in-your-wallet-) — Chain ID 80002, POL test token and network setup.
- [Polygon RPC endpoints](https://docs.polygon.technology/pos/reference/rpc-endpoints) — Amoy RPC, explorer and public endpoint notes.
- [Polygon Amoy faucet instructions](https://support.polygon.technology/support/solutions/articles/82000906072-how-can-i-get-pol-tokens-on-amoy-testnet-for-testing-purposes-) — test-token request process.
- [Remix documentation](https://remix-ide.readthedocs.io/en/latest/) — browser-based Solidity IDE and deployment workflow.
- [MetaMask wallet setup](https://support.metamask.io/start/creating-a-new-wallet) — wallet creation and recovery phrase handling.
- [ethers.js documentation](https://docs.ethers.org/v6/) — browser wallet and contract interaction.
- [Google Gemini API rate limits](https://ai.google.dev/gemini-api/docs/rate-limits) — referenced only to explain why an AI API is not required for this MVP; quotas vary by project/model.

---

## 20. Instructions for the AI coding IDE

**Use this README as the implementation contract. Build the application described here; do not invent a larger product.**

### 20.1 Required implementation order

1. Scaffold React + TypeScript + Vite + Tailwind.
2. Configure Supabase client from environment variables.
3. Create SQL migrations for tables, constraints, indexes, RLS policies and storage policies.
4. Implement NGO authentication and organisation-scoped access.
5. Implement project create/read/update.
6. Implement manual donation entry and CSV import with row validation and duplicate handling.
7. Implement expense records and private evidence upload with SHA-256 fingerprint.
8. Implement project updates and dashboard calculations.
9. Implement deterministic report snapshot creation, versioning and public report route.
10. Implement Solidity `ReportAnchor` contract source and ABI integration.
11. Implement MetaMask connection, Amoy network check, report anchor transaction and public verification.
12. Seed synthetic demo data and complete all P0 acceptance tests.
13. Deploy to Cloudflare Pages and document setup.

### 20.2 Coding rules

- Do not build a generic crowdfunding/payment app.
- Do not add donation payment collection, escrow or fund release.
- Do not add AI/OCR/IPFS unless all P0 acceptance tests pass and the team explicitly approves the extra scope.
- Do not use mock-only buttons for any P0 function. Every visible P0 action must work end to end.
- Do not hardcode demo totals into the dashboard; calculate them from database records.
- Keep synthetic demo data separate from real NGO data and label it clearly.
- Do not expose service-role keys or private wallet keys in browser code.
- Enforce organisation permissions in Postgres RLS and Storage policies.
- Keep original evidence private. Only explicitly approved redacted copies may be public.
- A report with no blockchain anchor must still be readable but must clearly show `NOT ANCHORED`.
- Blockchain verification must recompute the report hash and compare it with contract state; do not merely display a saved transaction hash.
- Do not label data `INDEPENDENTLY_VERIFIED` unless a real independent reviewer and review record exist.
- Use error messages and loading states. Handle cancelled wallet requests, wrong networks and RPC failures.
- Use accessible forms, responsive layouts, INR formatting and a public report that works without login.
- Add a concise `SETUP.md` only if needed, but keep this README as the source of truth.

### 20.3 Expected repository structure

```text
fundtrail/
├── README.md
├── .env.example
├── .gitignore
├── package.json
├── index.html
├── src/
│   ├── app/
│   │   ├── router.tsx
│   │   └── providers.tsx
│   ├── components/
│   │   ├── layout/
│   │   ├── forms/
│   │   ├── charts/
│   │   └── status/
│   ├── features/
│   │   ├── auth/
│   │   ├── organizations/
│   │   ├── projects/
│   │   ├── donations/
│   │   ├── expenses/
│   │   ├── evidence/
│   │   ├── updates/
│   │   ├── reports/
│   │   └── blockchain/
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── csv.ts
│   │   ├── hashing.ts
│   │   ├── report-snapshot.ts
│   │   └── formatters.ts
│   ├── pages/
│   ├── types/
│   └── main.tsx
├── supabase/
│   ├── migrations/
│   └── seed.sql
├── contracts/
│   └── ReportAnchor.sol
├── public/
└── tests/
    ├── calculations.test.ts
    ├── report-hash.test.ts
    └── rls-checklist.md
```

The coding IDE may adjust file names to match its conventions, but it must preserve the separation between UI, data access, hash/report utilities and contract logic.

### 20.4 Definition of done

The MVP is done only when a demo NGO can sign in, create a project, record/import donations, record expenses, attach private evidence, add a progress update, publish a sanitised report, anchor its hash on Amoy, and let an unauthenticated donor open and verify that exact report. All P0 tests, including cross-organisation access and public-data privacy checks, must pass.

**Do not add more features until this definition of done is satisfied.**

---

## Final product decision

Build **FundTrail as a project-accountability and reporting tool for small NGOs**, not as a new donation marketplace. The MVP should make an NGO's existing financial and project records easier to organise and communicate. Polygon Amoy should provide a transparent, tamper-evident fingerprint of each published report, while the interface remains honest that the underlying spending and delivery claims are NGO-reported unless a human verifier has actually checked them.
