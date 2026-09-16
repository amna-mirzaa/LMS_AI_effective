import React, { useState } from 'react';
import {
  ShieldCheck,
  GraduationCap,
  User,
  KeyRound,
  Lock,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  X
} from 'lucide-react';
import { AuthUser } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: AuthUser) => void;
  currentUser: AuthUser;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  currentUser,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      onLoginSuccess(data.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Login failed. Check your username and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError(null);
    setLoading(true);

    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: u, password: p }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          onLoginSuccess(data.user);
          onClose();
        } else {
          setError(data.error || 'Login failed');
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Lock className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Access Control & Account Sign-In</h2>
          </div>
          <p className="text-xs text-slate-500">
            Sign in as an Administrator, Faculty Instructor, or Student to view role-tailored dashboards and permissions.
          </p>
        </div>

        {/* Quick Demo Credentials */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            1-Click Demo Profiles:
          </span>
          <div className="grid grid-cols-1 gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin', 'admin123')}
              className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 text-left transition-all cursor-pointer group shadow-2xs"
            >
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-slate-700" />
                <div>
                  <span className="font-bold text-slate-900 block leading-tight">Administrator</span>
                  <span className="text-[10px] text-slate-500">admin / admin123</span>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                Switch →
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('elena.rostova', 'instructor123')}
              className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 text-left transition-all cursor-pointer group shadow-2xs"
            >
              <div className="flex items-center space-x-2">
                <GraduationCap className="w-4 h-4 text-indigo-600" />
                <div>
                  <span className="font-bold text-slate-900 block leading-tight">Instructor: Dr. Elena Rostova</span>
                  <span className="text-[10px] text-slate-500">elena.rostova / instructor123</span>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                Switch →
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('aria.m', 'student123')}
              className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 text-left transition-all cursor-pointer group shadow-2xs"
            >
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-emerald-600" />
                <div>
                  <span className="font-bold text-slate-900 block leading-tight">Student: Aria Montgomery</span>
                  <span className="text-[10px] text-slate-500">aria.m / student123 (ID #1)</span>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                Switch →
              </span>
            </button>
          </div>
        </div>

        {/* Manual Login Form */}
        <form onSubmit={handleLogin} className="space-y-3 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Username</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. admin or aria.m"
                required
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 text-slate-800"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors shadow-2xs cursor-pointer flex items-center justify-center space-x-1.5 disabled:opacity-50"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
