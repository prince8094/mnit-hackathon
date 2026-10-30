import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { store, UserSession } from '../../lib/store';
import { 
  ShieldCheck, 
  LogOut, 
  RotateCcw, 
  ExternalLink,
  ChevronDown,
  Building
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const [user, setUser] = useState<UserSession | null>(store.getCurrentUser());
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    return store.subscribe(() => {
      setUser(store.getCurrentUser());
    });
  }, []);

  const handleRoleSwitch = (type: 'ADMIN' | 'STAFF' | 'NGO_B') => {
    store.loginAs(type);
    setDropdownOpen(false);
    navigate('/app');
  };

  const handleLogout = () => {
    store.logout();
    setDropdownOpen(false);
    navigate('/login');
  };

  const handleResetData = () => {
    if (confirm('Reset demo state to initial seed dataset? (₹1,00,000 donations, ₹65,000 expenses)')) {
      store.resetToSeed();
      window.location.reload();
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      {/* Top Banner: Synthetic Demo Data Warning */}
      <div className="bg-amber-500 text-white text-xs font-semibold py-1 px-4 text-center tracking-wide flex items-center justify-center gap-2">
        <span>⚠️ SYNTHETIC DEMO DATASET — {user?.organizationName || 'Seva Jyoti Foundation'}</span>
        <button
          onClick={handleResetData}
          className="underline hover:text-amber-100 flex items-center gap-1 text-[11px] ml-2"
          title="Reset to clean baseline data"
        >
          <RotateCcw className="w-3 h-3" /> Reset Data
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <Link to={user ? "/app" : "/login"} className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-lg text-slate-900 tracking-tight flex items-center gap-1.5">
                  FundTrail
                  <span className="text-[10px] font-medium bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-sm border border-emerald-200">
                    Polygon Amoy
                  </span>
                </span>
                <p className="text-[11px] text-slate-500 hidden sm:block">Evidence-Backed Project Reporting</p>
              </div>
            </Link>

            {user && (
              <nav className="hidden md:flex items-center gap-4 text-sm font-medium text-slate-600 ml-4">
                <Link 
                  to="/app" 
                  className={`px-3 py-1.5 rounded-md hover:text-slate-900 hover:bg-slate-100 transition-colors ${
                    location.pathname === '/app' ? 'bg-slate-100 text-slate-900 font-semibold' : ''
                  }`}
                >
                  Dashboard
                </Link>
                <Link 
                  to="/app/projects/11111111-1111-1111-1111-111111111111" 
                  className={`px-3 py-1.5 rounded-md hover:text-slate-900 hover:bg-slate-100 transition-colors ${
                    location.pathname.includes('/projects/11111111-1111-1111-1111-111111111111') ? 'bg-slate-100 text-slate-900 font-semibold' : ''
                  }`}
                >
                  School Kit Project
                </Link>
              </nav>
            )}
          </div>

          {/* Right Navigation & Actions */}
          <div className="flex items-center gap-3">
            {/* Direct Donor Report Preview Link */}
            <Link
              to="/r/school-kit-support-2026-v1"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors"
            >
              <span>Donor Report</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 p-1.5 pr-2.5 rounded-full hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs transition"
                >
                  <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                    {user.fullName.charAt(0)}
                  </div>
                  <div className="text-left hidden sm:block">
                    <div className="font-semibold text-slate-800 leading-tight">{user.fullName}</div>
                    <div className="text-[10px] text-slate-500 leading-none">
                      {user.organizationName || 'NGO'} ({user.role})
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50 text-xs">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <p className="font-semibold text-slate-800">{user.fullName}</p>
                      <p className="text-slate-500 text-[11px] truncate">{user.email}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-xs text-[10px] font-medium bg-slate-100 text-slate-700">
                        Org: {user.organizationName || 'NGO'}
                      </span>
                    </div>

                    <div className="py-1">
                      <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Switch Demo Archetype / Org
                      </div>
                      <button
                        onClick={() => handleRoleSwitch('ADMIN')}
                        className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-slate-50 ${
                          user.id === 'u-admin-1' ? 'font-bold text-emerald-700 bg-emerald-50/50' : 'text-slate-700'
                        }`}
                      >
                        <span>Priya Sharma (NGO A Admin)</span>
                        {user.id === 'u-admin-1' && <span className="text-[10px] text-emerald-600">Active</span>}
                      </button>
                      <button
                        onClick={() => handleRoleSwitch('STAFF')}
                        className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-slate-50 ${
                          user.id === 'u-staff-2' ? 'font-bold text-emerald-700 bg-emerald-50/50' : 'text-slate-700'
                        }`}
                      >
                        <span>Amit Verma (NGO A Staff)</span>
                        {user.id === 'u-staff-2' && <span className="text-[10px] text-emerald-600">Active</span>}
                      </button>
                      <button
                        onClick={() => handleRoleSwitch('NGO_B')}
                        className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-purple-50 ${
                          user.id === 'u-admin-ngo-b' ? 'font-bold text-purple-700 bg-purple-50' : 'text-purple-900'
                        }`}
                      >
                        <span>Vikram Malhotra (NGO B Admin)</span>
                        {user.id === 'u-admin-ngo-b' && <span className="text-[10px] text-purple-600">Active</span>}
                      </button>
                    </div>

                    <div className="border-t border-slate-100 py-1">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-3 py-1.5 text-red-600 hover:bg-red-50 flex items-center gap-1.5"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md shadow-xs transition"
              >
                NGO Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
