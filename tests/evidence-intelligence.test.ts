import { describe, it, expect } from 'vitest';
import { evaluateEvidenceIntelligence, extractDocumentMetadata } from '../src/lib/evidence-intelligence';
import { Project, Expense, EvidenceFile } from '../src/types';

describe('Feature 1: Evidence Intelligence Engine', () => {
  const mockProject: Project = {
    id: 'proj-001',
    organization_id: 'org-001',
    title: 'School Kit Drive',
    purpose: 'Education assistance',
    goal_amount: 50000,
    currency: 'INR',
    start_date: '2026-10-01',
    public_slug: 'school-kit-drive',
    status: 'ACTIVE',
    created_at: '2026-10-01T00:00:00Z'
  };

  it('detects duplicate evidence uploads by SHA-256 within the same organization', () => {
    const expenses: Expense[] = [
      {
        id: 'exp-1',
        organization_id: 'org-001',
        project_id: 'proj-001',
        amount: 20000,
        spent_at: '2026-10-05',
        category: 'Stationery',
        description: 'Bags & Notebooks',
        vendor_label: 'Vendor A',
        created_at: '2026-10-05T00:00:00Z'
      },
      {
        id: 'exp-2',
        organization_id: 'org-001',
        project_id: 'proj-001',
        amount: 15000,
        spent_at: '2026-10-10',
        category: 'Stationery',
        description: 'Duplicate claim attempt',
        vendor_label: 'Vendor B',
        created_at: '2026-10-10T00:00:00Z'
      }
    ];

    const duplicateHash = '0x111122223333444455556666777788889999aaaabbbbccccddddeeeeffff0000';

    const evidenceFiles: EvidenceFile[] = [
      {
        id: 'ev-1',
        organization_id: 'org-001',
        project_id: 'proj-001',
        expense_id: 'exp-1',
        private_storage_path: 'doc1.pdf',
        sha256: duplicateHash,
        file_name_safe: 'invoice_vendor_a.pdf',
        file_size_bytes: 12000,
        mime_type: 'application/pdf',
        evidence_type: 'INVOICE',
        visibility: 'PRIVATE',
        review_status: 'DOCUMENT_UPLOADED',
        created_at: '2026-10-05T00:00:00Z'
      },
      {
        id: 'ev-2',
        organization_id: 'org-001',
        project_id: 'proj-001',
        expense_id: 'exp-2',
        private_storage_path: 'doc2.pdf',
        sha256: duplicateHash, // EXACT SAME HASH
        file_name_safe: 'invoice_vendor_b_duplicate.pdf',
        file_size_bytes: 12000,
        mime_type: 'application/pdf',
        evidence_type: 'INVOICE',
        visibility: 'PRIVATE',
        review_status: 'DOCUMENT_UPLOADED',
        created_at: '2026-10-10T00:00:00Z'
      }
    ];

    const { flags, summary } = evaluateEvidenceIntelligence(
      expenses,
      evidenceFiles,
      mockProject,
      evidenceFiles
    );

    expect(summary.duplicateWarningsCount).toBeGreaterThanOrEqual(1);
    const dupFlag = flags.find((f) => f.flag_type === 'DUPLICATE_EVIDENCE');
    expect(dupFlag).toBeDefined();
    expect(dupFlag?.severity).toBe('HIGH');
    expect(dupFlag?.details?.duplicate_sha256).toBe(duplicateHash);
  });

  it('preserves organization isolation (cross-tenant evidence is never checked or leaked)', () => {
    const expenses: Expense[] = [
      {
        id: 'exp-org1',
        organization_id: 'org-001',
        project_id: 'proj-001',
        amount: 5000,
        spent_at: '2026-10-05',
        category: 'Travel',
        description: 'Local Transport',
        vendor_label: 'Marwar Transport',
        created_at: '2026-10-05T00:00:00Z'
      }
    ];

    const sharedHash = '0x9999888877776666555544443333222211110000aaaabbbbccccddddeeeeffff';

    const org1Evidence: EvidenceFile[] = [
      {
        id: 'ev-org1',
        organization_id: 'org-001',
        project_id: 'proj-001',
        expense_id: 'exp-org1',
        private_storage_path: 'transport.pdf',
        sha256: sharedHash,
        file_name_safe: 'transport.pdf',
        file_size_bytes: 5000,
        mime_type: 'application/pdf',
        evidence_type: 'RECEIPT',
        visibility: 'PRIVATE',
        review_status: 'DOCUMENT_UPLOADED',
        created_at: '2026-10-05T00:00:00Z'
      }
    ];

    // Only org1's evidence is passed to the engine for org-001
    const { flags, summary } = evaluateEvidenceIntelligence(
      expenses,
      org1Evidence,
      mockProject,
      org1Evidence
    );

    expect(summary.duplicateWarningsCount).toBe(0);
    expect(flags.find((f) => f.flag_type === 'DUPLICATE_EVIDENCE')).toBeUndefined();
  });

  it('detects amount mismatches between entered expense and invoice amount with exact difference', () => {
    const expenses: Expense[] = [
      {
        id: 'exp-mismatch',
        organization_id: 'org-001',
        project_id: 'proj-001',
        amount: 5000, // NGO entered 5000
        invoice_amount: 4500, // Actual invoice shows 4500
        spent_at: '2026-10-05',
        category: 'Materials',
        description: 'Math Kits',
        vendor_label: 'Vendor C',
        created_at: '2026-10-05T00:00:00Z'
      }
    ];

    const evidence: EvidenceFile[] = [
      {
        id: 'ev-mismatch',
        organization_id: 'org-001',
        project_id: 'proj-001',
        expense_id: 'exp-mismatch',
        private_storage_path: 'invoice.pdf',
        sha256: '0xabc123',
        file_name_safe: 'invoice.pdf',
        file_size_bytes: 4000,
        mime_type: 'application/pdf',
        evidence_type: 'INVOICE',
        visibility: 'PRIVATE',
        review_status: 'DOCUMENT_UPLOADED',
        created_at: '2026-10-05T00:00:00Z'
      }
    ];

    const { flags, summary } = evaluateEvidenceIntelligence(
      expenses,
      evidence,
      mockProject,
      evidence
    );

    expect(summary.amountMismatchCount).toBe(1);
    const mismatchFlag = flags.find((f) => f.flag_type === 'AMOUNT_MISMATCH');
    expect(mismatchFlag).toBeDefined();
    expect(mismatchFlag?.details?.recorded_amount).toBe(5000);
    expect(mismatchFlag?.details?.invoice_amount).toBe(4500);
    expect(mismatchFlag?.details?.difference).toBe(500);
  });

  it('detects expenses missing supporting evidence', () => {
    const expenses: Expense[] = [
      {
        id: 'exp-no-doc',
        organization_id: 'org-001',
        project_id: 'proj-001',
        amount: 8000,
        spent_at: '2026-10-12',
        category: 'Refreshments',
        description: 'Volunteer Snacks',
        vendor_label: 'Local Sweet Shop',
        created_at: '2026-10-12T00:00:00Z'
      }
    ];

    const { flags, summary } = evaluateEvidenceIntelligence(
      expenses,
      [], // No evidence uploaded
      mockProject,
      []
    );

    expect(summary.missingEvidenceCount).toBe(1);
    const missingFlag = flags.find((f) => f.flag_type === 'MISSING_EVIDENCE');
    expect(missingFlag).toBeDefined();
    expect(missingFlag?.severity).toBe('MEDIUM');
  });

  it('detects budget overruns when total expenditure exceeds project goal', () => {
    const expenses: Expense[] = [
      {
        id: 'exp-1',
        organization_id: 'org-001',
        project_id: 'proj-001',
        amount: 35000,
        spent_at: '2026-10-10',
        category: 'Kits',
        description: 'Batch A',
        vendor_label: 'Jaipur Supplies',
        created_at: '2026-10-10T00:00:00Z'
      },
      {
        id: 'exp-2',
        organization_id: 'org-001',
        project_id: 'proj-001',
        amount: 20000, // Total = 55,000, Goal = 50,000
        spent_at: '2026-10-15',
        category: 'Kits',
        description: 'Batch B',
        vendor_label: 'Jaipur Supplies',
        created_at: '2026-10-15T00:00:00Z'
      }
    ];

    const { flags, summary } = evaluateEvidenceIntelligence(
      expenses,
      [],
      mockProject,
      []
    );

    expect(summary.isBudgetOverrun).toBe(true);
    expect(summary.budgetOverrunAmount).toBe(5000); // 55000 - 50000
    const budgetFlag = flags.find((f) => f.flag_type === 'BUDGET_OVERRUN');
    expect(budgetFlag).toBeDefined();
    expect(budgetFlag?.severity).toBe('CRITICAL');
  });

  it('extractDocumentMetadata suggests OCR heuristic values without forcing automatic fraud claims', async () => {
    const meta = await extractDocumentMetadata(
      { name: 'jaipur_stationery_invoice_40000.pdf', size: 34000 },
      40000
    );

    expect(meta.extracted_amount).toBe(40000);
    expect(meta.extracted_vendor).toContain('Jaipur');
    expect(meta.confidence).toBeGreaterThan(0.7);
    expect(meta.ocr_provider).toContain('FundTrail');
  });
});

