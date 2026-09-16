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
  UserCog,
  LogIn,
  User
} from 'lucide-react';
import { ActiveTab, UserRole, AuthUser } from '../types';

interface NavigationProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  currentUser: AuthUser;
  onOpenLogin: () => void;
  onResetDb: () => void;
  onDownloadSql: () => void;
  isResetting: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onOpenLogin,
  onResetDb,
  onDownloadSql,
  isResetting,
}) => {
  // Role-based Nav items
  let navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: string }[] = [];

  if (currentUser.role === 'student') {
    navItems = [
      { id: 'student_portal', label: 'My Student Portal', icon: <GraduationCap className="w-4 h-4 text-indigo-500" /> },
      { id: 'courses', label: 'Course Catalog', icon: <BookOpen className="w-4 h-4" /> },
      { id: 'instructors', label: 'Faculty Directory', icon: <Users className="w-4 h-4" /> },
    ];
  } else if (currentUser.role === 'instructor') {
    navItems = [
      { id: 'dashboard', label: 'Faculty Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
      { id: 'courses', label: 'Courses & Syllabus', icon: <BookOpen className="w-4 h-4" /> },
      { id: 'grades', label: 'Grading & Marks', icon: <Award className="w-4 h-4" /> },
      { id: 'enrollments', label: 'Class Enrollments', icon: <UserCheck className="w-4 h-4" /> },
      { id: 'ai_copilot', label: 'AI Assistant', icon: <Sparkles className="w-4 h-4 text-amber-500" /> },
    ];
  } else {
    // Administrator: Full access
    navItems = [
      { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
      { id: 'student_portal', label: 'Student Portal (Preview)', icon: <GraduationCap className="w-4 h-4 text-indigo-500" /> },
      { id: 'students', label: 'Students', icon: <Users className="w-4 h-4" /> },
      { id: 'instructors', label: 'Instructors', icon: <Users className="w-4 h-4" /> },
      { id: 'courses', label: 'Courses', icon: <BookOpen className="w-4 h-4" /> },
      { id: 'enrollments', label: 'Enrollments', icon: <UserCheck className="w-4 h-4" /> },
      { id: 'grades', label: 'Grades & Marks', icon: <Award className="w-4 h-4" /> },
      { id: 'reports', label: 'Reports', icon: <FileBarChart className="w-4 h-4" /> },
      { id: 'sql_studio', label: 'SQL Studio', icon: <Terminal className="w-4 h-4" /> },
      { id: 'schema_erd', label: 'Schema & ERD', icon: <Network className="w-4 h-4" /> },
      { id: 'ai_copilot', label: 'AI Assistant', icon: <Sparkles className="w-4 h-4 text-amber-500" /> },
    ];
  }

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

          {/* Right Header Actions: User Profile Badge, Switch Account, SQL Dump, DB Reset */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Logged in User Card */}
            <button
              onClick={onOpenLogin}
              title="Click to switch role or sign into another account"
              className="flex items-center space-x-2 bg-slate-50 hover:bg-slate-100 p-1.5 pr-3 rounded-xl border border-slate-200 text-xs transition-colors cursor-pointer group"
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs text-white ${
                currentUser.role === 'admin'
                  ? 'bg-slate-900'
                  : currentUser.role === 'instructor'
                  ? 'bg-indigo-600'
                  : 'bg-emerald-600'
              }`}>
                {currentUser.role === 'admin' ? (
                  <ShieldCheck className="w-4 h-4" />
                ) : currentUser.role === 'instructor' ? (
                  <GraduationCap className="w-4 h-4" />
                ) : (
                  <User className="w-4 h-4" />
                )}
              </div>
              <div className="text-left hidden sm:block">
                <div className="font-bold text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors">
                  {currentUser.name}
                </div>
                <div className="text-[10px] text-slate-500 capitalize">
                  {currentUser.role === 'admin' ? 'Administrator' : currentUser.role}
                </div>
              </div>
              <LogIn className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors ml-1" />
            </button>

            {/* Download SQL script */}
            <button
              id="btn-download-sql"
              onClick={onDownloadSql}
              title="Export database SQL script (MySQL / SQLite compatible)"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:border-slate-400 transition-colors shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Export</span>
              <span className="font-mono text-[11px] text-slate-500">.sql</span>
            </button>

            {/* Reset Database with Demo Data (Only for Admin) */}
            {currentUser.role === 'admin' && (
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
            )}
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

