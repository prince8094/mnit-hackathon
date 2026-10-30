import {
  Project,
  Donation,
  Expense,
  EvidenceFile,
  ProjectUpdate,
  ReportSnapshotData,
  FinancialSummary
} from '../types';
import { canonicalizeJson, sha256Hex } from './hashing';

/**
 * Calculates accurate financial summaries from recorded donations and expenses.
 */
export function calculateFinancialSummary(
  donations: Donation[],
  expenses: Expense[],
  evidenceFiles: EvidenceFile[]
): FinancialSummary {
  const totalReceived = donations.reduce((sum, d) => sum + Number(d.amount_received || 0), 0);
  const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const remaining = totalReceived - totalSpent;

  // Group expenses by category
  const categoryMap: { [cat: string]: number } = {};
  for (const exp of expenses) {
    const cat = exp.category || 'Uncategorized';
    categoryMap[cat] = (categoryMap[cat] || 0) + Number(exp.amount || 0);
  }

  const expensesByCategory = Object.entries(categoryMap)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: totalSpent > 0 ? (amount / totalSpent) * 100 : 0
    }))
    .sort((a, b) => b.amount - a.amount);

  // Missing evidence count: expenses with no linked evidence file
  const expenseIdsWithEvidence = new Set(
    evidenceFiles.filter(f => f.expense_id).map(f => f.expense_id)
  );
  const missingEvidenceCount = expenses.filter(e => !expenseIdsWithEvidence.has(e.id)).length;

  return {
    totalReceived,
    totalSpent,
    remaining,
    expensesByCategory,
    missingEvidenceCount,
    totalDonationCount: donations.length,
    totalExpenseCount: expenses.length
  };
}

/**
 * Generates a strictly sanitised, donor-safe snapshot JSON.
 * ZERO private donor info, ZERO bank account details, ZERO private URLs.
 */
export function generateSanitisedSnapshot(
  project: Project,
  version: number,
  donations: Donation[],
  expenses: Expense[],
  evidenceFiles: EvidenceFile[],
  updates: ProjectUpdate[]
): ReportSnapshotData {
  const summary = calculateFinancialSummary(donations, expenses, evidenceFiles);

  const snapshot: ReportSnapshotData = {
    schemaVersion: 1,
    project: {
      id: project.id,
      title: project.title,
      purpose: project.purpose,
      reportVersion: version,
      currency: project.currency || 'INR',
      startDate: project.start_date,
      endDate: project.end_date || null
    },
    financials: {
      totalReceived: summary.totalReceived.toFixed(2),
      totalSpent: summary.totalSpent.toFixed(2),
      remaining: summary.remaining.toFixed(2)
    },
    expensesByCategory: summary.expensesByCategory.map(c => ({
      category: c.category,
      amount: c.amount.toFixed(2)
    })),
    evidenceSummary: evidenceFiles.map(e => ({
      type: e.evidence_type.toLowerCase(),
      status: e.review_status,
      sha256: e.sha256
    })),
    updates: updates
      .slice()
      .sort((a, b) => new Date(a.update_date).getTime() - new Date(b.update_date).getTime())
      .map(u => ({
        date: u.update_date,
        summary: u.summary,
        beneficiaryCount: u.beneficiary_count ?? null,
        status: u.status
      })),
    publishedAt: new Date().toISOString()
  };

  return snapshot;
}

/**
 * Computes canonical SHA-256 fingerprint of a snapshot data object.
 */
export async function computeReportHash(snapshotData: ReportSnapshotData): Promise<{
  canonicalJson: string;
  reportHash: string;
}> {
  const canonicalJson = canonicalizeJson(snapshotData);
  const reportHash = await sha256Hex(canonicalJson);
  return { canonicalJson, reportHash };
}

