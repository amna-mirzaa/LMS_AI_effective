import React, { useState, useEffect, useCallback } from 'react';
import { Navigation } from './components/Navigation';
import { DashboardView } from './components/DashboardView';
import { StudentsView } from './components/StudentsView';
import { InstructorsView } from './components/InstructorsView';
import { CoursesView } from './components/CoursesView';
import { EnrollmentsView } from './components/EnrollmentsView';
import { GradesView } from './components/GradesView';
import { ReportsView } from './components/ReportsView';
import { SqlStudioView } from './components/SqlStudioView';
import { SchemaErdView } from './components/SchemaErdView';
import { AiCopilotView } from './components/AiCopilotView';
import { StudentPortalView } from './components/StudentPortalView';
import { LoginModal } from './components/LoginModal';
import {
  ActiveTab,
  UserRole,
  AuthUser,
  DashboardStats,
  Student,
  Instructor,
  Course,
  Enrollment,
  Grade
} from './types';
import {
  Database,
  Layers,
  Server,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  X
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser>({
    id: 1,
    username: 'admin',
    role: 'admin',
    ref_id: null,
    name: 'Academic Administrator',
    email: 'admin@institute.edu',
  });
  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Master Relational Data State
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  // Cross-view deep link triggers (e.g. diagnosing student directly from student list)
  const [aiStudentId, setAiStudentId] = useState<number | null>(null);
  const [aiCourseId, setAiCourseId] = useState<number | null>(null);

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleLoginSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    if (user.role === 'student') {
      setActiveTab('student_portal');
    } else if (user.role === 'instructor') {
      setActiveTab('courses');
    } else {
      setActiveTab('dashboard');
    }
    showToast(`Signed in as ${user.name} (${user.role.toUpperCase()})`);
  };

  const loadAllData = useCallback(async () => {
    try {
      const [statsRes, studRes, instRes, courRes, enrRes, gradRes] = await Promise.all([
        fetch('/api/stats').then((r) => r.json()),
        fetch('/api/students').then((r) => r.json()),
        fetch('/api/instructors').then((r) => r.json()),
        fetch('/api/courses').then((r) => r.json()),
        fetch('/api/enrollments').then((r) => r.json()),
        fetch('/api/grades').then((r) => r.json()),
      ]);

      setStats(statsRes);
      setStudents(Array.isArray(studRes) ? studRes : []);
      setInstructors(Array.isArray(instRes) ? instRes : []);
      setCourses(Array.isArray(courRes) ? courRes : []);
      setEnrollments(Array.isArray(enrRes) ? enrRes : []);
      setGrades(Array.isArray(gradRes) ? gradRes : []);
    } catch (err) {
      console.error('Failed to load relational database entities:', err);
      showToast('Error syncing with database engine', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const handleResetDb = async () => {
    const confirmed = window.confirm(
      'Reset relational SQLite database with fresh institutional seed data (12 students, 6 faculty, 6 courses, enrollments, marks)?'
    );
    if (!confirmed) return;

    setIsResetting(true);
    try {
      const res = await fetch('/api/reset-database', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showToast('Database reset successfully with verified seed data');
        await loadAllData();
      } else {
        showToast(data.error || 'Failed to reset database', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsResetting(false);
    }
  };

  const handleDownloadSql = async () => {
    try {
      const res = await fetch('/api/download/sql');
      if (!res.ok) throw new Error('Failed to generate deliverable SQL dump');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'lms_database.sql';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast('Downloaded deliverable lms_database.sql');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleSelectAiStudent = (studentId: number) => {
    setAiStudentId(studentId);
    setActiveTab('ai_copilot');
  };

  const handleSelectAiCurriculum = (courseId: number) => {
    setAiCourseId(courseId);
    setActiveTab('ai_copilot');
  };

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-900 flex flex-col font-sans antialiased">
      {/* Top Monolithic Navigation */}
      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onOpenLogin={() => setIsLoginOpen(true)}
        onResetDb={handleResetDb}
        onDownloadSql={handleDownloadSql}
        isResetting={isResetting}
      />

      {/* Main Tab View Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'student_portal' && (
          <StudentPortalView
            currentUser={currentUser}
            onRefreshAll={loadAllData}
            showToast={showToast}
          />
        )}

        {activeTab === 'dashboard' && (
          <DashboardView
            stats={stats}
            loading={loading}
            onNavigate={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'students' && (
          <StudentsView
            students={students}
            onRefresh={loadAllData}
            onSelectAiStudent={handleSelectAiStudent}
          />
        )}

        {activeTab === 'instructors' && (
          <InstructorsView
            instructors={instructors}
            onRefresh={loadAllData}
          />
        )}

        {activeTab === 'courses' && (
          <CoursesView
            courses={courses}
            instructors={instructors}
            onRefresh={loadAllData}
            onSelectAiCurriculum={handleSelectAiCurriculum}
          />
        )}

        {activeTab === 'enrollments' && (
          <EnrollmentsView
            enrollments={enrollments}
            students={students}
            courses={courses}
            onRefresh={loadAllData}
            onNavigateToGrades={() => setActiveTab('grades')}
          />
        )}

        {activeTab === 'grades' && (
          <GradesView
            grades={grades}
            enrollments={enrollments}
            onRefresh={loadAllData}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsView courses={courses} />
        )}

        {activeTab === 'sql_studio' && (
          <SqlStudioView />
        )}

        {activeTab === 'schema_erd' && (
          <SchemaErdView onDownloadSql={handleDownloadSql} />
        )}

        {activeTab === 'ai_copilot' && (
          <AiCopilotView
            students={students}
            courses={courses}
            initialStudentId={aiStudentId}
            initialCourseId={aiCourseId}
          />
        )}
      </main>

      {/* Professional LMS Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-800">AcademiaPro LMS</span>
              <span>•</span>
              <span>Academic Management & Student Information System</span>
            </div>

            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Active Term: Fall 2025–2026</span>
              </span>
              <span>•</span>
              <span className="text-slate-400">All Systems Operational</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating Toast Alert */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center space-x-2 p-3.5 rounded-xl shadow-lg border text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200 bg-slate-900 text-white border-slate-800">
          {toast.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white ml-2 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Role Switcher & Login Modal */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        currentUser={currentUser}
      />
    </div>
  );
}
