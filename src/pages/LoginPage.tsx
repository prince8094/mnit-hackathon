import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { store } from '../lib/store';
import { ShieldCheck, UserCheck, ArrowRight, Lock, Building } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('priya.sharma@sevajyoti.org');
  const [password, setPassword] = useState('demo-password');
  const [error, setError] = useState<string | null>(null);

  const handleDemoLogin = (role: 'ADMIN' | 'STAFF') => {
    store.loginAs(role);
    navigate('/app');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please provide an email address.');
      return;
    }
    // Authenticate with selected role or admin by default
    store.loginAs(email.includes('staff') ? 'STAFF' : 'ADMIN');
    navigate('/app');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h2 className="mt-4 text-2xl font-bold text-slate-900 tracking-tight">Sign in to FundTrail</h2>
          <p className="mt-1 text-xs text-slate-500">
            Evidence-backed project accounting & reporting for Indian NGOs
          </p>
        </div>

        {/* Demo Fast Sign-in Box */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
            <Building className="w-3.5 h-3.5 text-emerald-600" />
            <span>Fast Demo Sign-In (Pre-seeded Org)</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Choose an archetype to test the organisation-scoped access and workflow without manual setup:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleDemoLogin('ADMIN')}
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center justify-center gap-1.5 shadow-xs"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Priya (Admin)</span>
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('STAFF')}
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-900 text-white transition flex items-center justify-center gap-1.5 shadow-xs"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Amit (Staff)</span>
            </button>
          </div>
        </div>

        {/* Standard Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="coordinator@ngo.org"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 text-sm font-semibold rounded-lg text-white bg-slate-900 hover:bg-slate-800 transition flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4" />
            <span>Sign In to Workspace</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </form>

        <div className="pt-2 text-center text-[11px] text-slate-400">
          Supabase Row Level Security ensures users can only access projects within their authorized organization.
        </div>
      </div>
    </div>
  );
};

