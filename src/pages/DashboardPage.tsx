import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { store, UserSession } from '../lib/store';
import { Project } from '../types';
import { calculateFinancialSummary } from '../lib/report-snapshot';
import { formatINR, formatDate } from '../lib/formatters';
import { 
  Plus, 
  FolderGit2, 
  ArrowRight, 
  CheckCircle2, 
  ExternalLink, 
  Coins, 
  Receipt, 
  FileCheck2, 
  Building,
  ShieldCheck,
  Clock,
  Layers,
  Lock,
  Wallet
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserSession | null>(store.getCurrentUser());
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    setProjects(store.getProjects());
    return store.subscribe(() => {
      setUser(store.getCurrentUser());
      setProjects(store.getProjects());
    });
  }, [user, navigate]);

  if (!user) return null;

  // Aggregate totals across organization projects
  const totalInrReceived = projects.reduce((acc, p) => {
    const dons = store.getDonations(p.id);
    return acc + dons.reduce((sum, d) => sum + d.amount_received, 0);
  }, 0);

  const totalInrSpent = projects.reduce((acc, p) => {
    const exps = store.getExpenses(p.id);
    return acc + exps.reduce((sum, e) => sum + e.amount, 0);
  }, 0);

  const totalInrRemaining = totalInrReceived - totalInrSpent;

  // On-chain testnet POL totals
  const allMilestones = store.getAllMilestones();
  const totalPolAllocated = allMilestones.reduce((acc, m) => acc + m.allocated_pol, 0);
  const totalPolReleased = allMilestones.reduce((acc, m) => acc + m.released_pol, 0);
  const pendingAuditCount = allMilestones.filter(m => m.status === 'SUBMITTED').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1">
            <Building className="w-3.5 h-3.5" />
            <span>{user.organizationName || 'Seva Jyoti Foundation'} • Workspace</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Welcome back, {user.fullName}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Role: <strong>{user.role === 'ADMIN' ? 'Organisation Admin' : 'Programme Staff'}</strong> • Record donations, attach evidence, and manage milestone releases on Polygon Amoy.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/app/verifier"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition"
          >
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>Verifier Portal</span>
            {pendingAuditCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
                {pendingAuditCount}
              </span>
            )}
          </Link>

          <Link
            to="/app/projects/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-xs shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </Link>
        </div>
      </div>

      {/* DUAL FINANCIAL DASHBOARD: INR Accounting vs. Polygon Amoy Escrow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Module A: NGO Internal Financial Accounting (INR) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                ₹
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Off-Chain Financial Books (INR)</h3>
                <p className="text-[11px] text-slate-500">Internal NGO ledger for bank, UPI and cash expenditure</p>
              </div>
            </div>
            <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-sm border border-emerald-200">
              Operational
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-[10px] font-medium text-slate-500 block">Total Received</span>
              <span className="text-sm sm:text-base font-bold text-slate-900">{formatINR(totalInrReceived)}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-[10px] font-medium text-slate-500 block">Total Spent</span>
              <span className="text-sm sm:text-base font-bold text-slate-900">{formatINR(totalInrSpent)}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-[10px] font-medium text-slate-500 block">Remaining</span>
              <span className="text-sm sm:text-base font-bold text-emerald-600">{formatINR(totalInrRemaining)}</span>
            </div>
          </div>
        </div>

        {/* Module B: Polygon Amoy Smart Contract Escrow (POL) */}
        <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white p-6 rounded-2xl border border-indigo-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-indigo-800/60 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 flex items-center justify-center font-bold text-sm">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Milestone Smart Contract Escrow (Polygon Amoy)</h3>
                <p className="text-[11px] text-indigo-300">Testnet demonstration escrow with verifier sign-off</p>
              </div>
            </div>
            <span className="text-[10px] font-semibold text-indigo-200 bg-indigo-500/20 px-2 py-0.5 rounded-sm border border-indigo-400/30">
              Testnet POL
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10">
              <span className="text-[10px] font-medium text-indigo-200 block">Target Escrow</span>
              <span className="text-sm sm:text-base font-bold text-white">{totalPolAllocated} POL</span>
            </div>
            <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10">
              <span className="text-[10px] font-medium text-indigo-200 block">Released to NGO</span>
              <span className="text-sm sm:text-base font-bold text-emerald-400">{totalPolReleased} POL</span>
            </div>
            <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10">
              <span className="text-[10px] font-medium text-indigo-200 block">Locked in Escrow</span>
              <span className="text-sm sm:text-base font-bold text-amber-300">{totalPolAllocated - totalPolReleased} POL</span>
            </div>
          </div>
        </div>
      </div>

      {/* Projects List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FolderGit2 className="w-5 h-5 text-emerald-600" />
            <span>Active Organisation Projects ({projects.length})</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map((project) => {
            const donations = store.getDonations(project.id);
            const expenses = store.getExpenses(project.id);
            const evidence = store.getEvidenceFiles(project.id);
            const summary = calculateFinancialSummary(donations, expenses, evidence);
            const snapshots = store.getSnapshots(project.id);
            const latestSnapshot = snapshots[0];
            const percentGoal = Math.min(Math.round((summary.totalReceived / project.goal_amount) * 100), 100);

            const projectMilestones = store.getMilestones(project.id);
            const releasedCount = projectMilestones.filter(m => m.status === 'RELEASED').length;

            return (
              <div 
                key={project.id} 
                className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {project.status}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {formatDate(project.start_date)} – {project.end_date ? formatDate(project.end_date) : 'Ongoing'}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 mb-1">{project.title}</h3>
                  <p className="text-xs text-slate-600 line-clamp-2 mb-4 leading-relaxed">
                    {project.purpose}
                  </p>

                  {/* Financial Mini Bar */}
                  <div className="space-y-2 mb-4 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Off-Chain Receipts (INR)</span>
                      <span className="font-bold text-slate-900">{formatINR(summary.totalReceived)} / {formatINR(project.goal_amount, false)}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-2 rounded-full"
                        style={{ width: `${percentGoal}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                      <span>Total Spent: <strong>{formatINR(summary.totalSpent)}</strong></span>
                      <span>Remaining: <strong className={summary.remaining < 0 ? 'text-red-600' : 'text-slate-700'}>{formatINR(summary.remaining)}</strong></span>
                    </div>
                  </div>

                  {/* Milestone Progress Indicator */}
                  {projectMilestones.length > 0 && (
                    <div className="mb-4 bg-indigo-50/60 p-3 rounded-xl border border-indigo-100 text-xs">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="font-semibold text-indigo-900 flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Polygon Amoy Milestones</span>
                        </span>
                        <span className="text-[11px] font-bold text-indigo-700">
                          {releasedCount} of {projectMilestones.length} Released
                        </span>
                      </div>
                      <div className="flex gap-1.5">
                        {projectMilestones.map((m) => (
                          <div
                            key={m.id}
                            className={`flex-1 h-2 rounded-full ${
                              m.status === 'RELEASED'
                                ? 'bg-emerald-500'
                                : m.status === 'APPROVED'
                                ? 'bg-blue-500'
                                : m.status === 'SUBMITTED'
                                ? 'bg-amber-400 animate-pulse'
                                : 'bg-slate-200'
                            }`}
                            title={`${m.title}: ${m.status}`}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Mini Stats */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs border-t border-slate-100 pt-3 mb-4">
                    <div className="bg-slate-50 p-2 rounded-lg">
                      <span className="block text-[10px] uppercase font-semibold text-slate-400">Donations</span>
                      <span className="font-bold text-slate-800">{summary.totalDonationCount}</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg">
                      <span className="block text-[10px] uppercase font-semibold text-slate-400">Expenses</span>
                      <span className="font-bold text-slate-800">{summary.totalExpenseCount}</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg">
                      <span className="block text-[10px] uppercase font-semibold text-slate-400">Evidence</span>
                      <span className="font-bold text-slate-800">{evidence.length}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                  <Link
                    to={`/r/${project.public_slug || 'school-kit-support-2026-v1'}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-indigo-700 hover:text-indigo-900 font-medium flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Public Transparency Trail</span>
                  </Link>

                  <Link
                    to={`/app/projects/${project.id}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition shadow-xs"
                  >
                    <span>Manage Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
