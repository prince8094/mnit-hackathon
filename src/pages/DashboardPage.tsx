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
  Building
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1">
            <Building className="w-3.5 h-3.5" />
            <span>Seva Jyoti Foundation • Workspace</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Welcome back, {user.fullName}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Role: <strong>{user.role === 'ADMIN' ? 'Organisation Admin' : 'Programme Staff'}</strong> • Manage project donations, attach evidence, and anchor transparent reports.
          </p>
        </div>

        <Link
          to="/app/projects/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </Link>
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
                      <span className="text-slate-500">Recorded Receipts</span>
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
                  {latestSnapshot ? (
                    <Link
                      to={`/r/${latestSnapshot.public_slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Public Report v{latestSnapshot.version}</span>
                    </Link>
                  ) : (
                    <span className="text-[11px] text-slate-400">No published report</span>
                  )}

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

