export type Role = 'ADMIN' | 'STAFF';

export interface Organization {
  id: string;
  name: string;
  created_by?: string;
  created_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: Role;
  created_at: string;
}

export type ProjectStatus = 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';

export interface Project {
  id: string;
  organization_id: string;
  title: string;
  purpose: string;
  goal_amount: number;
  currency: string;
  start_date: string;
  end_date?: string | null;
  public_slug: string;
  status: ProjectStatus;
  contract_project_id?: string | null;
  onchain_escrow_address?: string | null;
  ngo_wallet?: string | null;
  verifier_wallet?: string | null;
  goal_amount_pol?: number | null;
  created_at: string;
}

export type OnchainMilestoneStatus = 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'RELEASED';

export type TransactionClassification = 'VERIFIED_ONCHAIN' | 'DEMO_SIMULATED' | 'PENDING' | 'INVALID';

export interface ProjectMilestone {
  id: string;
  organization_id: string;
  project_id: string;
  milestone_index: number;
  title: string;
  allocated_pol: number;
  released_pol: number;
  status: OnchainMilestoneStatus;
  ipfs_cid?: string | null;
  evidence_hash?: string | null;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  review_reason?: string | null;
  release_tx_hash?: string | null;
  tx_status?: TransactionClassification;
  created_at: string;
}

export interface OnchainContribution {
  id: string;
  organization_id: string;
  project_id: string;
  donor_wallet: string;
  amount_pol: number;
  tx_hash: string | null;
  tx_status?: TransactionClassification;
  contributed_at: string;
}

export interface MilestoneVerification {
  id: string;
  milestone_id: string;
  project_id: string;
  verifier_wallet: string;
  approved: boolean;
  review_reason: string;
  tx_hash?: string | null;
  tx_status?: TransactionClassification;
  reviewed_at: string;
}

export type DonationChannel = 'UPI' | 'Bank transfer' | 'Crowdfunding' | 'Cash' | 'Cheque' | 'Other';

export interface Donation {
  id: string;
  organization_id: string;
  project_id: string;
  amount_received: number;
  received_at: string;
  channel: DonationChannel;
  source_reference?: string | null;
  private_donor_label?: string | null; // PRIVATE: NEVER EXPOSED PUBLICLY
  created_by?: string;
  created_at: string;
}

export type EvidenceStatus = 'MISSING_EVIDENCE' | 'EVIDENCE_UPLOADED' | 'NEEDS_REVIEW' | 'REVIEWED' | 'FLAGGED';

export interface ExtractedMetadata {
  confidence?: number;
  extracted_amount?: number;
  extracted_vendor?: string;
  extracted_date?: string;
  extracted_invoice_number?: string;
  ocr_provider?: string;
  raw_text_snippet?: string;
}

export interface Expense {
  id: string;
  organization_id: string;
  project_id: string;
  amount: number;
  spent_at: string;
  category: string;
  description: string;
  vendor_label?: string | null;
  payment_reference?: string | null;
  invoice_amount?: number | null;
  invoice_date?: string | null;
  evidence_status?: EvidenceStatus;
  extracted_metadata?: ExtractedMetadata | null;
  created_by?: string;
  created_at: string;
}

export type EvidenceFlagType = 'DUPLICATE_EVIDENCE' | 'AMOUNT_MISMATCH' | 'MISSING_EVIDENCE' | 'BUDGET_OVERRUN' | 'MISSING_METADATA';
export type EvidenceFlagSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type EvidenceFlagStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED';

export interface EvidenceIntelligenceFlag {
  id: string;
  organization_id: string;
  project_id: string;
  expense_id: string;
  flag_type: EvidenceFlagType;
  severity: EvidenceFlagSeverity;
  message: string;
  details?: {
    recorded_amount?: number;
    invoice_amount?: number;
    difference?: number;
    duplicate_cid?: string;
    duplicate_expense_id?: string;
    duplicate_sha256?: string;
    allocated_budget?: number;
    total_spent?: number;
    overrun?: number;
    missing_fields?: string[];
  } | Record<string, any>;
  status: EvidenceFlagStatus;
  resolved_by?: string | null;
  resolution_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export type BatchStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';

export interface DistributionBatch {
  id: string;
  organization_id: string;
  project_id: string;
  batch_number: string;
  batch_name: string;
  distribution_date: string;
  location_or_institution: string;
  item_description: string;
  expected_quantity: number;
  acknowledged_count: number;
  public_description?: string | null;
  distribution_evidence_cid?: string | null;
  status: BatchStatus;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export type TokenStatus = 'ISSUED' | 'REDEEMED' | 'REVOKED' | 'EXPIRED';

export interface DeliveryToken {
  id: string;
  organization_id: string;
  project_id: string;
  batch_id: string;
  token_hash: string;
  recipient_index: number;
  status: TokenStatus;
  expires_at: string;
  redeemed_at?: string | null;
  created_at: string;
}

export type EvidenceType = 'INVOICE' | 'RECEIPT' | 'BILL' | 'VOUCHER' | 'OTHER';
export type EvidenceVisibility = 'PRIVATE' | 'PUBLIC_REDACTED';
export type ReviewStatus = 'NGO_REPORTED' | 'DOCUMENT_UPLOADED' | 'NGO_REVIEWED' | 'INDEPENDENTLY_VERIFIED';

export interface EvidenceFile {
  id: string;
  organization_id: string;
  project_id: string;
  expense_id?: string | null;
  private_storage_path: string;
  public_storage_path?: string | null;
  sha256: string;
  file_name_safe: string;
  file_size_bytes: number;
  mime_type: string;
  evidence_type: EvidenceType;
  visibility: EvidenceVisibility;
  review_status: ReviewStatus;
  uploaded_by?: string;
  created_at: string;
}

export interface ProjectUpdate {
  id: string;
  organization_id: string;
  project_id: string;
  update_date: string;
  summary: string;
  beneficiary_count?: number | null;
  status: ReviewStatus;
  created_by?: string;
  created_at: string;
}

export interface FinancialSummary {
  totalReceived: number;
  totalSpent: number;
  remaining: number;
  expensesByCategory: { category: string; amount: number; percentage: number }[];
  missingEvidenceCount: number;
  totalDonationCount: number;
  totalExpenseCount: number;
}

// Sanitised JSON Report Snapshot Structure
export interface ReportSnapshotFinancials {
  totalReceived: string; // "100000.00"
  totalSpent: string;    // "65000.00"
  remaining: string;     // "35000.00"
}

export interface ReportSnapshotCategoryExpense {
  category: string;
  amount: string;
}

export interface ReportSnapshotEvidenceSummary {
  type: string;
  status: ReviewStatus;
  sha256: string;
}

export interface ReportSnapshotProjectUpdate {
  date: string;
  summary: string;
  beneficiaryCount: number | null;
  status: ReviewStatus;
}

export interface ReportSnapshotData {
  schemaVersion: number;
  project: {
    id: string;
    title: string;
    purpose: string;
    reportVersion: number;
    currency: string;
    startDate: string;
    endDate?: string | null;
  };
  financials: ReportSnapshotFinancials;
  expensesByCategory: ReportSnapshotCategoryExpense[];
  evidenceSummary: ReportSnapshotEvidenceSummary[];
  updates: ReportSnapshotProjectUpdate[];
  proofOfDelivery?: {
    totalExpected: number;
    totalAcknowledged: number;
    batchesCount: number;
    acknowledgementRatePercent: number;
  };
  publishedAt: string;
}

export interface ReportSnapshot {
  id: string;
  organization_id: string;
  project_id: string;
  version: number;
  public_slug: string;
  snapshot_json: ReportSnapshotData;
  report_hash: string;
  published_at: string;
  published_by?: string;
  created_at: string;
}

export type AnchorStatus = 'PENDING' | 'MINED' | 'FAILED';

export interface ReportAnchorRecord {
  id: string;
  report_snapshot_id: string;
  chain_id: number;
  contract_address: string;
  tx_hash: string;
  publisher_wallet: string;
  anchor_status: AnchorStatus;
  created_at: string;
}

export type VerificationState = 'MATCH' | 'MISMATCH' | 'UNAVAILABLE' | 'NOT ANCHORED';

export interface CSVDonationRow {
  date: string;
  amount: string | number;
  channel: string;
  source_reference?: string;
  private_donor_label?: string;
}

export interface RowValidationError {
  rowNumber: number;
  raw: any;
  reason: string;
}

export interface CSVImportResult {
  validRows: {
    amount_received: number;
    received_at: string;
    channel: DonationChannel;
    source_reference?: string | null;
    private_donor_label?: string | null;
  }[];
  errors: RowValidationError[];
  duplicateCount: number;
  duplicatesSkipped: string[];
}

