import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { X, UserCheck, Shield, GraduationCap, Building2, Crown, Sparkles } from 'lucide-react';

export const DemoSwitcherModal = ({ isOpen, onClose }) => {
  const { demoAccounts, login, user } = useAuth();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleSelect = async (account) => {
    try {
      const loggedUser = await login(account.email, account.password);
      onClose();
      if (loggedUser?.role === 'STUDENT') {
        navigate('/student');
      } else if (loggedUser?.role === 'WARDEN' || loggedUser?.role === 'CHIEF_WARDEN') {
        navigate('/warden');
      } else if (loggedUser?.role === 'DEAN') {
        navigate('/dean');
      } else {
        navigate('/admin');
      }
    } catch (err) {
      alert('Login failed: ' + (err.response?.data?.detail || err.message));
    }
  };

  const getRoleIcon = (tag) => {
    switch (tag) {
      case 'STUDENT':
        return <GraduationCap className="w-5 h-5 text-blue-500" />;
      case 'WARDEN':
        return <Shield className="w-5 h-5 text-amber-500" />;
      case 'CHIEF_WARDEN':
        return <Crown className="w-5 h-5 text-purple-500" />;
      case 'HOSTEL_ADMIN':
        return <Building2 className="w-5 h-5 text-emerald-500" />;
      default:
        return <Sparkles className="w-5 h-5 text-indigo-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-500" />
              1-Click Demo Persona Switcher
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Instantly authenticate as any platform role to test multi-party cycle requests, warden approvals, and admin controls.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Account list */}
        <div className="overflow-y-auto py-4 space-y-2.5 flex-1 pr-1">
          {demoAccounts.map((account) => {
            const isCurrent = user?.email === account.email;
            return (
              <div
                key={account.email}
                onClick={() => handleSelect(account)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  isCurrent
                    ? 'bg-brand-50/70 dark:bg-brand-950/30 border-brand-500/50 ring-2 ring-brand-500/20'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-700/60 hover:border-brand-400 hover:bg-white dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700">
                    {getRoleIcon(account.tag)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                        {account.role}
                      </h4>
                      <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {account.tag}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{account.desc}</p>
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">{account.email}</p>
                  </div>
                </div>

                <button
                  type="button"
                  className={`text-xs font-semibold px-3.5 py-1.5 rounded-xl transition ${
                    isCurrent
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-brand-500 hover:text-white'
                  }`}
                >
                  {isCurrent ? 'Current' : 'Switch'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400 flex items-center justify-between">
          <span>Password for all demo accounts: <code className="text-brand-500 font-mono">Role@123</code></span>
          <button
            onClick={onClose}
            className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DemoSwitcherModal;
