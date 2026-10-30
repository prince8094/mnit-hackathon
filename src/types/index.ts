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
  created_at: string;
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
  created_by?: string;
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

