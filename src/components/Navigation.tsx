import React from 'react';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  UserCheck,
  Award,
  FileBarChart,
  Terminal,
  Network,
  Sparkles,
  Database,
  RotateCcw,
  Download,
  ShieldCheck,
  UserCog
} from 'lucide-react';
import { ActiveTab, UserRole } from '../types';

interface NavigationProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  onResetDb: () => void;
  onDownloadSql: () => void;
  isResetting: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  userRole,
  setUserRole,
  onResetDb,
  onDownloadSql,
  isResetting,
}) => {
  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'students', label: 'Students', icon: <Users className="w-4 h-4" /> },
    { id: 'instructors', label: 'Instructors', icon: <GraduationCap className="w-4 h-4" /> },
    { id: 'courses', label: 'Courses', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'enrollments', label: 'Enrollments', icon: <UserCheck className="w-4 h-4" /> },
    { id: 'grades', label: 'Grades & Marks', icon: <Award className="w-4 h-4" /> },
    { id: 'reports', label: 'Reports', icon: <FileBarChart className="w-4 h-4" /> },
    { id: 'sql_studio', label: 'SQL Studio', icon: <Terminal className="w-4 h-4" /> },
    { id: 'schema_erd', label: 'Schema & ERD', icon: <Network className="w-4 h-4" /> },
    { id: 'ai_copilot', label: 'AI Assistant', icon: <Sparkles className="w-4 h-4 text-amber-500" /> },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      {/* Top Banner & Global Meta */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Branding */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-md shadow-slate-900/10 ring-1 ring-slate-800">
              <Database className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-900 text-base tracking-tight">AcademiaPro LMS</span>
                <span className="hidden sm:inline-flex items-center space-x-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>System Online</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden md:block">
                Academic Administration & Student Learning Portal
              </p>
            </div>
          </div>

          {/* Right Header Actions: Role Switcher, SQL Dump, DB Reset */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Role Switcher */}
            <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
              <UserCog className="w-3.5 h-3.5 text-slate-500 ml-1.5 hidden sm:inline" />
              <label htmlFor="role-select" className="text-slate-600 font-medium hidden sm:inline">Role:</label>
              <select
                id="role-select"
                value={userRole}
                onChange={(e) => setUserRole(e.target.value as UserRole)}
                className="bg-white text-slate-800 font-semibold px-2 py-1 rounded shadow-2xs border-0 focus:ring-1 focus:ring-indigo-500 cursor-pointer text-xs"
              >
                <option value="Administrator">Administrator</option>
                <option value="Academic Coordinator">Academic Coordinator</option>
                <option value="Instructor">Instructor</option>
              </select>
            </div>

            {/* Download SQL script */}
            <button
              id="btn-download-sql"
              onClick={onDownloadSql}
              title="Export database SQL script"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:border-slate-400 transition-colors shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Export</span>
              <span className="font-mono text-[11px] text-slate-500">.sql</span>
            </button>

            {/* Reset Database with Demo Data */}
            <button
              id="btn-reset-db"
              onClick={onResetDb}
              disabled={isResetting}
              title="Reset to default sample data"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">Reset Demo Data</span>
            </button>
          </div>
        </div>

        {/* Primary Monolithic Tab Navigation */}
        <nav className="flex space-x-1 overflow-x-auto no-scrollbar py-2 border-t border-slate-100">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-tab-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                      isActive
                        ? 'bg-slate-800 text-indigo-300 border border-slate-700'
                        : 'bg-slate-200/80 text-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
