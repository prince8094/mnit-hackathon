import { describe, it, expect } from 'vitest';
import { calculateFinancialSummary } from '../src/lib/report-snapshot';
import { canonicalizeJson, sha256Hex, computeProjectKey } from '../src/lib/hashing';
import { Donation, Expense, EvidenceFile, Project } from '../src/types';

describe('Financial Calculations & Summaries', () => {
  const donations: Donation[] = [
    {
      id: 'd1',
      organization_id: 'org1',
      project_id: 'proj1',
      amount_received: 40000,
      received_at: '2026-10-01',
      channel: 'UPI',
      created_at: '2026-10-01'
    },
    {
      id: 'd2',
      organization_id: 'org1',
      project_id: 'proj1',
      amount_received: 35000,
      received_at: '2026-10-03',
      channel: 'Bank transfer',
      created_at: '2026-10-03'
    },
    {
      id: 'd3',
      organization_id: 'org1',
      project_id: 'proj1',
      amount_received: 25000,
      received_at: '2026-10-05',
      channel: 'Crowdfunding',
      created_at: '2026-10-05'
    }
  ];

  const expenses: Expense[] = [
    {
      id: 'e1',
      organization_id: 'org1',
      project_id: 'proj1',
      amount: 40000,
      spent_at: '2026-10-12',
      category: 'Educational materials',
      description: 'School kits',
      created_at: '2026-10-12'
    },
    {
      id: 'e2',
      organization_id: 'org1',
      project_id: 'proj1',
      amount: 15000,
      spent_at: '2026-10-18',
      category: 'Distribution and logistics',
      description: 'Van hire',
      created_at: '2026-10-18'
    },
    {
      id: 'e3',
      organization_id: 'org1',
      project_id: 'proj1',
      amount: 10000,
      spent_at: '2026-10-22',
      category: 'Other project expenses',
      description: 'Waterproof covers',
      created_at: '2026-10-22'
    }
  ];

  const evidenceFiles: EvidenceFile[] = [
    {
      id: 'ev1',
      organization_id: 'org1',
      project_id: 'proj1',
      expense_id: 'e1',
      private_storage_path: 'path1',
      sha256: '0x123',
      file_name_safe: 'inv1.pdf',
      file_size_bytes: 1000,
      mime_type: 'application/pdf',
      evidence_type: 'INVOICE',
      visibility: 'PRIVATE',
      review_status: 'DOCUMENT_UPLOADED',
      created_at: '2026-10-12'
    },
    {
      id: 'ev2',
      organization_id: 'org1',
      project_id: 'proj1',
      expense_id: 'e2',
      private_storage_path: 'path2',
      sha256: '0x456',
      file_name_safe: 'rec1.pdf',
      file_size_bytes: 2000,
      mime_type: 'application/pdf',
      evidence_type: 'RECEIPT',
      visibility: 'PRIVATE',
      review_status: 'DOCUMENT_UPLOADED',
      created_at: '2026-10-18'
    }
  ];

  it('accurately sums received and spent amounts', () => {
    const summary = calculateFinancialSummary(donations, expenses, evidenceFiles);
    expect(summary.totalReceived).toBe(100000);
    expect(summary.totalSpent).toBe(65000);
    expect(summary.remaining).toBe(35000);
  });

  it('correctly calculates expense category breakdown', () => {
    const summary = calculateFinancialSummary(donations, expenses, evidenceFiles);
    expect(summary.expensesByCategory.length).toBe(3);
    expect(summary.expensesByCategory[0].category).toBe('Educational materials');
    expect(summary.expensesByCategory[0].amount).toBe(40000);
    expect(summary.expensesByCategory[1].category).toBe('Distribution and logistics');
    expect(summary.expensesByCategory[1].amount).toBe(15000);
  });

  it('flags missing evidence for expenses without uploaded files', () => {
    const summary = calculateFinancialSummary(donations, expenses, evidenceFiles);
    // e1 and e2 have evidence, e3 does not
    expect(summary.missingEvidenceCount).toBe(1);
  });

  it('detects overspend when expenses exceed donations', () => {
    const bigExpense: Expense = {
      id: 'e4',
      organization_id: 'org1',
      project_id: 'proj1',
      amount: 80000,
      spent_at: '2026-10-25',
      category: 'Extra emergency',
      description: 'Emergency flood relief',
      created_at: '2026-10-25'
    };
    const summary = calculateFinancialSummary(donations, [...expenses, bigExpense], evidenceFiles);
    expect(summary.totalSpent).toBe(145000);
    expect(summary.remaining).toBe(-45000);
    expect(summary.remaining < 0).toBe(true);
  });

  it('handles decimal donations like ₹10.50 with precision', () => {
    const decimalDonation: Donation = {
      id: 'd-dec',
      organization_id: 'org1',
      project_id: 'proj1',
      amount_received: 10.50,
      received_at: '2026-10-06',
      channel: 'UPI',
      created_at: '2026-10-06'
    };
    const summary = calculateFinancialSummary([...donations, decimalDonation], expenses, evidenceFiles);
    expect(summary.totalReceived).toBe(100010.50);
    expect(summary.remaining).toBe(35010.50);
  });
});
