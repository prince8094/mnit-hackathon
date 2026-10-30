import React from 'react';
import { FinancialSummary } from '../../types';
import { formatINR } from '../../lib/formatters';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Wallet, 
  AlertTriangle, 
  FileWarning, 
  CheckCircle,
  PieChart
} from 'lucide-react';

interface Props {
  summary: FinancialSummary;
  goalAmount?: number;
}

export const FinancialOverview: React.FC<Props> = ({ summary, goalAmount }) => {
  const isOverspent = summary.remaining < 0;
  const fundingGoalProgress = goalAmount && goalAmount > 0 
    ? Math.min(Math.round((summary.totalReceived / goalAmount) * 100), 100)
    : null;

  return (
    <div className="space-y-6">
      {/* Overspend Warning (Section 7.1 & 8.3) */}
      {isOverspent && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-300 text-red-900 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">Expenses Exceed Recorded Receipts</h4>
            <p className="text-xs text-red-700 mt-1">
              Total expenditure ({formatINR(summary.totalSpent)}) exceeds total recorded receipts ({formatINR(summary.totalReceived)}) by {formatINR(Math.abs(summary.remaining))}. 
              Please review your accounting records or add missing donation entries.
            </p>
          </div>
        </div>
      )}

      {/* Missing Evidence Warning */}
      {summary.missingEvidenceCount > 0 && (
        <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <FileWarning className="w-4 h-4 text-amber-600" />
            <span>
              <strong>{summary.missingEvidenceCount} {summary.missingEvidenceCount === 1 ? 'expense' : 'expenses'}</strong> are missing supporting receipts/invoices.
            </span>
          </div>
          <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-sm">
            Action Recommended
          </span>
        </div>
      )}

      {/* Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Received */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Received</span>
            <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {formatINR(summary.totalReceived)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>{summary.totalDonationCount} recorded {summary.totalDonationCount === 1 ? 'entry' : 'entries'}</span>
            {goalAmount && (
              <span className="text-emerald-700 font-medium">{fundingGoalProgress}% of {formatINR(goalAmount, false)} goal</span>
            )}
          </div>
        </div>

        {/* Total Spent */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Spent</span>
            <div className="w-7 h-7 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {formatINR(summary.totalSpent)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>{summary.totalExpenseCount} recorded {summary.totalExpenseCount === 1 ? 'expense' : 'expenses'}</span>
            <span className="text-slate-600 font-medium">
              {summary.totalReceived > 0 ? Math.round((summary.totalSpent / summary.totalReceived) * 100) : 0}% utilised
            </span>
          </div>
        </div>

        {/* Remaining Balance */}
        <div className={`p-5 rounded-xl border shadow-xs relative overflow-hidden ${
          isOverspent ? 'bg-red-50/50 border-red-300' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Remaining Balance</span>
            <div className={`w-7 h-7 rounded-md flex items-center justify-center ${
              isOverspent ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-600'
            }`}>
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-bold tracking-tight ${
            isOverspent ? 'text-red-700' : 'text-slate-900'
          }`}>
            {formatINR(summary.remaining)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {isOverspent ? (
              <span className="text-red-600 font-semibold">Deficit / Unbacked expenditure</span>
            ) : (
              <span>Available for ongoing project activities</span>
            )}
          </div>
        </div>
      </div>

      {/* Expense Breakdown Section (Visual + Table) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Expenditure by Category</h3>
          </div>
          <span className="text-xs text-slate-500">
            Total {summary.expensesByCategory.length} {summary.expensesByCategory.length === 1 ? 'category' : 'categories'}
          </span>
        </div>

        {summary.expensesByCategory.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">No expenses recorded yet.</p>
        ) : (
          <div className="space-y-4">
            {/* Visual Bar Distribution */}
            <div className="space-y-2.5">
              {summary.expensesByCategory.map((cat, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-700">{cat.category}</span>
                    <span className="font-semibold text-slate-900">
                      {formatINR(cat.amount)} <span className="text-slate-400 font-normal">({cat.percentage.toFixed(1)}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className={`h-2.5 rounded-full ${
                        idx === 0 ? 'bg-emerald-500' : idx === 1 ? 'bg-blue-500' : idx === 2 ? 'bg-purple-500' : 'bg-slate-400'
                      }`}
                      style={{ width: `${Math.max(cat.percentage, 3)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Accessible Data Table (as required by Section 9.3: never make charts the only way to understand data) */}
            <div className="mt-4 pt-4 border-t border-slate-100 overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-100">
                    <th className="pb-2 font-semibold">Category</th>
                    <th className="pb-2 font-semibold text-right">Amount (INR)</th>
                    <th className="pb-2 font-semibold text-right">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summary.expensesByCategory.map((cat, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="py-2 text-slate-700 font-medium">{cat.category}</td>
                      <td className="py-2 text-slate-900 font-semibold text-right">{formatINR(cat.amount)}</td>
                      <td className="py-2 text-slate-500 text-right">{cat.percentage.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

