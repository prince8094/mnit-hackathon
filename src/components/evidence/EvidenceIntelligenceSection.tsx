import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  FileCheck2,
  FileX2,
  Copy,
  DollarSign,
  TrendingDown,
  CheckCircle2,
  ExternalLink,
  Edit3,
  Filter,
  Check,
  Eye,
  Info
} from 'lucide-react';
import {
  Expense,
  EvidenceFile,
  Project,
  EvidenceIntelligenceFlag,
  EvidenceFlagStatus
} from '../../types';
import { store } from '../../lib/store';
import { EvidenceIntelligenceSummary } from '../../lib/evidence-intelligence';

interface EvidenceIntelligenceSectionProps {
  project: Project;
  expenses: Expense[];
  evidenceFiles: EvidenceFile[];
  flags: EvidenceIntelligenceFlag[];
  summary: EvidenceIntelligenceSummary;
  isVerifier?: boolean;
  onRefresh?: () => void;
}

export const EvidenceIntelligenceSection: React.FC<EvidenceIntelligenceSectionProps> = ({
  project,
  expenses,
  evidenceFiles,
  flags,
  summary,
  isVerifier = false,
  onRefresh
}) => {
  const [filter, setFilter] = useState<'ALL' | 'FLAGGED' | 'MISSING' | 'DUPLICATE' | 'MISMATCH' | 'NEEDS_REVIEW'>('ALL');
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editInvoiceAmount, setEditInvoiceAmount] = useState<string>('');
  const [editInvoiceDate, setEditInvoiceDate] = useState<string>('');
  const [resolvingFlagId, setResolvingFlagId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState<string>('');

  const evidenceMap = new Map<string, EvidenceFile>();
  for (const ev of evidenceFiles) {
    if (ev.expense_id) evidenceMap.set(ev.expense_id, ev);
  }

  // Filter expenses based on selected view
  const filteredExpenses = expenses.filter((exp) => {
    const attached = evidenceMap.get(exp.id);
    const hasFlags = flags.some((f) => f.expense_id === exp.id && f.status === 'OPEN');
    const isDup = flags.some((f) => f.expense_id === exp.id && f.flag_type === 'DUPLICATE_EVIDENCE' && f.status === 'OPEN');
    const isMismatch = flags.some((f) => f.expense_id === exp.id && f.flag_type === 'AMOUNT_MISMATCH' && f.status === 'OPEN');
    const isMissing = !attached || exp.evidence_status === 'MISSING_EVIDENCE';

    if (filter === 'FLAGGED') return hasFlags;
    if (filter === 'MISSING') return isMissing;
    if (filter === 'DUPLICATE') return isDup;
    if (filter === 'MISMATCH') return isMismatch;
    if (filter === 'NEEDS_REVIEW') return exp.evidence_status === 'NEEDS_REVIEW' || (attached && attached.review_status !== 'INDEPENDENTLY_VERIFIED');
    return true;
  });

  const handleSaveInvoiceAmount = async () => {
    if (!editingExpense) return;
    const parsedAmount = editInvoiceAmount ? parseFloat(editInvoiceAmount) : undefined;
    await store.updateExpenseMetadata(
      editingExpense.id,
      parsedAmount,
      editInvoiceDate || undefined
    );
    setEditingExpense(null);
    if (onRefresh) onRefresh();
  };

  const handleResolveFlag = async (flagId: string, status: EvidenceFlagStatus) => {
    await store.updateEvidenceFlagStatus(flagId, status, resolutionNotes || 'Reviewed by auditor');
    setResolvingFlagId(null);
    setResolutionNotes('');
    if (onRefresh) onRefresh();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Evidence Intelligence Engine</h2>
              <p className="text-xs text-slate-500">
                Automated invoice verification, duplicate detection & budget integrity assistance
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold">
            <Info className="w-3.5 h-3.5 text-slate-500" />
            Decision Support (Human-in-the-Loop)
          </span>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Card 1: Total Expenses */}
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/60">
          <span className="text-[11px] font-medium text-slate-500 block">Total Expenses</span>
          <span className="text-base font-bold text-slate-900 block mt-0.5">
            ₹{summary.totalExpensesAmount.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-slate-400">{summary.totalExpensesCount} records</span>
        </div>

        {/* Card 2: With Evidence */}
        <div className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-200/60">
          <span className="text-[11px] font-medium text-emerald-800 flex items-center gap-1">
            <FileCheck2 className="w-3 h-3 text-emerald-600" /> With Evidence
          </span>
          <span className="text-base font-bold text-emerald-950 block mt-0.5">
            {summary.withEvidenceCount}
          </span>
          <span className="text-[10px] text-emerald-700">
            {summary.totalExpensesCount > 0 ? Math.round((summary.withEvidenceCount / summary.totalExpensesCount) * 100) : 0}% verified
          </span>
        </div>

        {/* Card 3: Missing Evidence */}
        <div className={`rounded-xl p-3 border ${summary.missingEvidenceCount > 0 ? 'bg-amber-50/70 border-amber-200 text-amber-900' : 'bg-slate-50 border-slate-200/60'}`}>
          <span className="text-[11px] font-medium flex items-center gap-1">
            <FileX2 className="w-3 h-3 text-amber-600" /> Missing Proof
          </span>
          <span className="text-base font-bold block mt-0.5">
            {summary.missingEvidenceCount}
          </span>
          <span className="text-[10px] opacity-75">Pending upload</span>
        </div>

        {/* Card 4: Duplicate Warnings */}
        <div className={`rounded-xl p-3 border ${summary.duplicateWarningsCount > 0 ? 'bg-rose-50/70 border-rose-200 text-rose-900' : 'bg-slate-50 border-slate-200/60'}`}>
          <span className="text-[11px] font-medium flex items-center gap-1">
            <Copy className="w-3 h-3 text-rose-600" /> Duplicates
          </span>
          <span className="text-base font-bold block mt-0.5">
            {summary.duplicateWarningsCount}
          </span>
          <span className="text-[10px] opacity-75">SHA-256 match</span>
        </div>

        {/* Card 5: Amount Mismatches */}
        <div className={`rounded-xl p-3 border ${summary.amountMismatchCount > 0 ? 'bg-amber-50/70 border-amber-200 text-amber-900' : 'bg-slate-50 border-slate-200/60'}`}>
          <span className="text-[11px] font-medium flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-amber-600" /> Mismatches
          </span>
          <span className="text-base font-bold block mt-0.5">
            {summary.amountMismatchCount}
          </span>
          <span className="text-[10px] opacity-75">Inv vs Record</span>
        </div>

        {/* Card 6: Budget Overrun */}
        <div className={`rounded-xl p-3 border ${summary.isBudgetOverrun ? 'bg-rose-50 border-rose-300 text-rose-900' : 'bg-slate-50 border-slate-200/60'}`}>
          <span className="text-[11px] font-medium flex items-center gap-1">
            <TrendingDown className="w-3 h-3 text-rose-600" /> Budget Overrun
          </span>
          <span className="text-base font-bold block mt-0.5">
            {summary.isBudgetOverrun ? `₹${summary.budgetOverrunAmount.toLocaleString('en-IN')}` : '₹0'}
          </span>
          <span className="text-[10px] opacity-75">
            {summary.isBudgetOverrun ? 'Over allocation' : 'Within budget'}
          </span>
        </div>

        {/* Card 7: Awaiting Review */}
        <div className="bg-indigo-50/50 rounded-xl p-3 border border-indigo-200/60">
          <span className="text-[11px] font-medium text-indigo-800 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-indigo-600" /> Needs Review
          </span>
          <span className="text-base font-bold text-indigo-950 block mt-0.5">
            {summary.awaitingReviewCount}
          </span>
          <span className="text-[10px] text-indigo-700">Verifier queue</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filter === 'ALL' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Expenses ({expenses.length})
          </button>
          <button
            onClick={() => setFilter('FLAGGED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              filter === 'FLAGGED' ? 'bg-rose-600 text-white shadow-sm' : 'text-rose-700 hover:bg-rose-50'
            }`}
          >
            Flagged Warnings ({summary.openFlagsCount})
          </button>
          <button
            onClick={() => setFilter('MISMATCH')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filter === 'MISMATCH' ? 'bg-amber-600 text-white shadow-sm' : 'text-amber-800 hover:bg-amber-50'
            }`}
          >
            Amount Mismatch ({summary.amountMismatchCount})
          </button>
          <button
            onClick={() => setFilter('DUPLICATE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filter === 'DUPLICATE' ? 'bg-rose-600 text-white shadow-sm' : 'text-rose-800 hover:bg-rose-50'
            }`}
          >
            Duplicate Digest ({summary.duplicateWarningsCount})
          </button>
          <button
            onClick={() => setFilter('MISSING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filter === 'MISSING' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            Missing Evidence ({summary.missingEvidenceCount})
          </button>
        </div>

        <span className="text-xs text-slate-400 font-medium">
          Showing {filteredExpenses.length} entries
        </span>
      </div>

      {/* Filterable Expenses Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/50">
              <th className="py-3 px-3">Expense Item & Vendor</th>
              <th className="py-3 px-3">Recorded Amount</th>
              <th className="py-3 px-3">Invoice Amount</th>
              <th className="py-3 px-3">Supporting Evidence</th>
              <th className="py-3 px-3">Intelligence Status</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  No expense records match the selected intelligence filter.
                </td>
              </tr>
            ) : (
              filteredExpenses.map((exp) => {
                const attached = evidenceMap.get(exp.id);
                const expFlags = flags.filter((f) => f.expense_id === exp.id && f.status === 'OPEN');
                const hasMismatch = exp.invoice_amount != null && Math.abs(exp.invoice_amount - exp.amount) > 0.01;
                const mismatchDiff = exp.invoice_amount != null ? Math.abs(exp.amount - exp.invoice_amount) : 0;

                return (
                  <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Col 1: Expense Details */}
                    <td className="py-3 px-3 max-w-[240px]">
                      <div className="font-semibold text-slate-800 truncate">{exp.description}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{exp.category}</span>
                        <span>{exp.spent_at}</span>
                      </div>
                      <div className="text-[11px] text-slate-600 font-medium truncate mt-0.5">
                        {exp.vendor_label || <span className="text-amber-600 italic">No vendor specified</span>}
                      </div>
                    </td>

                    {/* Col 2: Recorded Amount */}
                    <td className="py-3 px-3 font-bold text-slate-900">
                      ₹{exp.amount.toLocaleString('en-IN')}
                    </td>

                    {/* Col 3: Invoice Amount */}
                    <td className="py-3 px-3">
                      {exp.invoice_amount != null ? (
                        <div>
                          <span className={`font-bold ${hasMismatch ? 'text-amber-700' : 'text-emerald-700'}`}>
                            ₹{exp.invoice_amount.toLocaleString('en-IN')}
                          </span>
                          {hasMismatch && (
                            <div className="text-[10px] text-amber-700 font-medium mt-0.5">
                              Diff: ₹{mismatchDiff.toLocaleString('en-IN')}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Not extracted</span>
                      )}
                    </td>

                    {/* Col 4: Supporting Evidence & Hash */}
                    <td className="py-3 px-3 max-w-[220px]">
                      {attached ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-medium text-slate-800 truncate">
                            <FileCheck2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="truncate">{attached.file_name_safe}</span>
                          </div>
                          {attached.sha256 && (
                            <div className="text-[10px] text-slate-400 font-mono truncate" title={attached.sha256}>
                              SHA: {attached.sha256.slice(0, 14)}...
                            </div>
                          )}
                          {attached.public_storage_path && (
                            <a
                              href={`https://gateway.pinata.cloud/ipfs/${attached.public_storage_path}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] text-emerald-700 hover:underline"
                            >
                              Inspect IPFS <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-400 text-xs">
                          <FileX2 className="w-3.5 h-3.5 text-slate-400" /> Missing Proof
                        </span>
                      )}
                    </td>

                    {/* Col 5: Intelligence Status & Reason */}
                    <td className="py-3 px-3">
                      {expFlags.length > 0 ? (
                        <div className="space-y-1">
                          {expFlags.map((flag) => (
                            <span
                              key={flag.id}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold block ${
                                flag.severity === 'CRITICAL' || flag.flag_type === 'DUPLICATE_EVIDENCE'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              {flag.message}
                            </span>
                          ))}
                        </div>
                      ) : attached ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-semibold">
                          <Check className="w-3 h-3" /> Passed Quality Checks
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium">
                          No Document Attached
                        </span>
                      )}
                    </td>

                    {/* Col 6: Actions */}
                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setEditingExpense(exp);
                            setEditInvoiceAmount(exp.invoice_amount != null ? String(exp.invoice_amount) : String(exp.amount));
                            setEditInvoiceDate(exp.invoice_date || exp.spent_at);
                          }}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium transition flex items-center gap-1"
                          title="Manually verify or edit invoice metadata"
                        >
                          <Edit3 className="w-3 h-3" /> Verify
                        </button>

                        {isVerifier && expFlags.length > 0 && (
                          <button
                            onClick={() => {
                              setResolvingFlagId(expFlags[0].id);
                              setResolutionNotes('');
                            }}
                            className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-xs font-medium transition"
                          >
                            Resolve
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Edit / Confirm Invoice Modal */}
      {editingExpense && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-900">
              Confirm Invoice Amount (OCR / Human Review)
            </h3>
            <p className="text-xs text-slate-500">
              Enter the exact amount printed on the physical or PDF invoice. The system compares this with recorded NGO expenditure to highlight discrepancies.
            </p>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1 text-xs text-slate-600">
              <div><span className="font-semibold text-slate-700">Expense:</span> {editingExpense.description}</div>
              <div><span className="font-semibold text-slate-700">Recorded Amount:</span> ₹{editingExpense.amount.toLocaleString('en-IN')}</div>
              <div><span className="font-semibold text-slate-700">Vendor:</span> {editingExpense.vendor_label || 'Unspecified'}</div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Actual Invoice / Receipt Amount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editInvoiceAmount}
                  onChange={(e) => setEditInvoiceAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:border-emerald-500 focus:outline-none"
                  placeholder="e.g. 40000"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Invoice Date
                </label>
                <input
                  type="date"
                  value={editInvoiceDate}
                  onChange={(e) => setEditInvoiceDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3">
              <button
                onClick={() => setEditingExpense(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveInvoiceAmount}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm"
              >
                Save & Update Check
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verifier Resolve Flag Modal */}
      {resolvingFlagId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-900">
              Independent Verifier Flag Resolution
            </h3>
            <p className="text-xs text-slate-500">
              Record your auditor note explaining whether the warning was verified, clarified with the NGO, or cleared.
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Auditor Resolution Notes
              </label>
              <textarea
                rows={3}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="e.g., Inspected revised invoice from Marwar Logistics. Minor discount explained in voucher."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setResolvingFlagId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={() => handleResolveFlag(resolvingFlagId, 'RESOLVED')}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
              >
                Mark Flag Resolved
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

