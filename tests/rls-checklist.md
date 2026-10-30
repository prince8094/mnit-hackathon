# Row Level Security (RLS) Policy & Security Audit Checklist

## 1. Multi-Tenant Data Isolation
- [x] Every business table contains an `organization_id` foreign key referencing `organizations(id)` on delete cascade.
- [x] Security helper function `is_org_member(org_id)` runs in `SECURITY DEFINER` mode to verify membership without recursion.
- [x] `is_org_admin(org_id)` enforces administrative privileges (e.g., managing membership).
- [x] Cross-tenant test: Authenticated user from Organization A cannot view or mutate Organization B's donations, expenses, evidence files, or project updates.

## 2. Public vs Private Boundaries
- [x] `donations` table: RLS restricted exclusively to organization members. Public users cannot access donor identities or private donor notes.
- [x] `expenses` table: RLS restricted exclusively to organization members. Private vendor references and internal memos remain restricted.
- [x] `evidence_files` table: RLS restricts original file metadata to organization members.
- [x] Storage bucket `evidence-private`: RLS blocks unauthenticated access; download tokens are temporary.
- [x] `report_snapshots`: RLS allows public `SELECT` for published snapshots, but updates/deletions are blocked (snapshots are strictly immutable).
- [x] `report_anchors`: RLS allows public `SELECT` for safe verification metadata (chain ID, contract address, transaction hash, publisher wallet).

## 3. Blockchain Cryptographic Integrity
- [x] Only canonical UTF-8 JSON is hashed.
- [x] No personal identifiers, bank account numbers, or donor contact info are included in snapshot JSON.
- [x] Verification computes SHA-256 in browser and queries on-chain contract state directly via RPC.

