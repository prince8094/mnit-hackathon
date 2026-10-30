import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { store } from '../lib/store';
import { signInWithGoogle } from '../lib/supabase';
import { ShieldCheck, UserCheck, ArrowRight, Lock, Building, UserPlus, ShieldAlert } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  // Mode: 'login' or 'signup'
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  // Login form state
  const [email, setEmail] = useState('priya.sharma@sevajyoti.org');
  const [password, setPassword] = useState('demo-password');

  // Sign up form state
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupOrgName, setSignupOrgName] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleDemoLogin = (type: 'ADMIN' | 'STAFF' | 'NGO_B') => {
    store.loginAs(type);
    navigate('/app');
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(
        err.message || 
        'Google OAuth error. Please ensure Google Provider is enabled in your Supabase Dashboard under Authentication -> Providers.'
      );
      setGoogleLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await store.login(email, password);
      navigate('/app');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password. Please verify your credentials.');
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!signupName.trim() || !signupEmail.trim() || !signupPassword || !signupOrgName.trim()) {
      setError('Please fill in all registration fields.');
      return;
    }

    try {
      await store.signUp(signupName, signupEmail, signupPassword, signupOrgName);
      setSuccess('Account and organization created successfully!');
      setTimeout(() => {
        navigate('/app');
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h2 className="mt-4 text-2xl font-bold text-slate-900 tracking-tight">
            {mode === 'login' ? 'Sign in to FundTrail' : 'Register New NGO'}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Evidence-backed project accounting & reporting for Indian NGOs
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex rounded-lg bg-slate-100 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null); }}
            className={`w-1/2 py-1.5 rounded-md transition ${
              mode === 'login' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(null); }}
            className={`w-1/2 py-1.5 rounded-md transition ${
              mode === 'signup' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Register NGO (Sign Up)
          </button>
        </div>

        {/* Google OAuth Button */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full py-2.5 px-4 text-xs font-semibold rounded-xl text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition flex items-center justify-center gap-2.5 shadow-xs disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>{googleLoading ? 'Connecting to Google...' : 'Continue with Google (Supabase Auth)'}</span>
          </button>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-2 text-[10px] uppercase font-bold text-slate-400">or with email</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>
        </div>

        {/* Fast Demo Sign-In Box with NGO A vs NGO B */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-emerald-600" />
              <span>Fast Demo Switcher</span>
            </span>
            <span className="text-[10px] text-slate-400 font-normal">One-Click</span>
          </div>

          <div className="space-y-1.5">
            <div className="text-[10px] text-slate-500 font-semibold uppercase">NGO A (Seva Jyoti Foundation):</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoLogin('ADMIN')}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center justify-center gap-1 shadow-xs"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Priya (Admin)</span>
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('STAFF')}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-700 hover:bg-slate-800 text-white transition flex items-center justify-center gap-1 shadow-xs"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Amit (Staff)</span>
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200">
            <div className="text-[10px] text-purple-700 font-semibold uppercase mb-1">
              NGO B (Multi-Tenant Isolation Test):
            </div>
            <button
              type="button"
              onClick={() => handleDemoLogin('NGO_B')}
              className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-purple-700 hover:bg-purple-800 text-white transition flex items-center justify-center gap-1 shadow-xs"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Login as NGO B (Aarogya Seva Trust)</span>
            </button>
            <p className="text-[10px] text-slate-400 mt-1 leading-tight">
              Test isolation: NGO B cannot see NGO A&apos;s project or records.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg">
            {success}
          </div>
        )}

        {/* LOGIN FORM */}
        {mode === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Demo password: <code className="bg-slate-100 px-1 py-0.5 rounded">demo-password</code>
              </span>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 text-sm font-semibold rounded-lg text-white bg-slate-900 hover:bg-slate-800 transition flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>Sign In with Email</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </form>
        ) : (
          /* SIGN UP FORM */
          <form onSubmit={handleSignupSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Your Full Name *</label>
              <input
                type="text"
                value={signupName}
                onChange={(e) => setSignupName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g. Ramesh Patel"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">NGO / Organization Name *</label>
              <input
                type="text"
                value={signupOrgName}
                onChange={(e) => setSignupOrgName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g. Bharat Literacy Mission"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
              <input
                type="email"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="ramesh@literacymission.org"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password *</label>
              <input
                type="password"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 text-sm font-semibold rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 transition flex items-center justify-center gap-2 shadow-xs"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create NGO Account</span>
            </button>
          </form>
        )}

        <div className="pt-2 text-center text-[11px] text-slate-400">
          Supabase Row Level Security ensures strict isolation between organizations.
        </div>
      </div>
    </div>
  );
};
