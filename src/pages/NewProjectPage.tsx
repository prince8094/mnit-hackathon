import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { store } from '../lib/store';
import { ArrowLeft, FolderPlus, Sparkles } from 'lucide-react';

export const NewProjectPage: React.FC = () => {
  const navigate = useNavigate();
  const user = store.getCurrentUser();

  const [title, setTitle] = useState('');
  const [purpose, setPurpose] = useState('');
  const [goalAmount, setGoalAmount] = useState('100000');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [publicSlug, setPublicSlug] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Auto-generate slug when title changes
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    if (!publicSlug || publicSlug === title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')) {
      const slug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setPublicSlug(slug);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }

    const goal = parseFloat(goalAmount);
    if (isNaN(goal) || goal <= 0) {
      setError('Funding goal must be a positive number in INR.');
      return;
    }

    if (!publicSlug.trim()) {
      setError('Please provide a unique public URL slug.');
      return;
    }

    try {
      const project = store.addProject({
        organization_id: user.organizationId,
        title: title.trim(),
        purpose: purpose.trim(),
        goal_amount: goal,
        currency: 'INR',
        start_date: startDate,
        end_date: endDate || null,
        public_slug: publicSlug.trim(),
        status: 'ACTIVE'
      });

      navigate(`/app/projects/${project.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create project.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link 
        to="/app" 
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-6 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Dashboard</span>
      </Link>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-8">
        <div className="flex items-center gap-3 pb-6 border-b border-slate-100 mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <FolderPlus className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Create New Project</h1>
            <p className="text-xs text-slate-500">
              Establish a structured reporting container for donations and expenses
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-700 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Project Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              placeholder="e.g. Flood Relief Mission 2026"
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Project Purpose & Objectives *
            </label>
            <textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Describe what activities this project funds, target beneficiaries, and expected outcomes..."
              rows={3}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Funding Goal (INR ₹) *
              </label>
              <input
                type="number"
                value={goalAmount}
                onChange={(e) => setGoalAmount(e.target.value)}
                placeholder="100000"
                min="1"
                step="any"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Public URL Slug *
              </label>
              <input
                type="text"
                value={publicSlug}
                onChange={(e) => setPublicSlug(e.target.value)}
                placeholder="school-kit-support-2026"
                className="w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Donors will view reports at /r/{publicSlug || 'slug'}-v1
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Completion Date (Optional)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <Link
              to="/app"
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-xs"
            >
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

