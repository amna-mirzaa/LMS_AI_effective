import React from 'react';
import {
  Users,
  GraduationCap,
  BookOpen,
  UserCheck,
  TrendingUp,
  DollarSign,
  Award,
  CheckCircle2,
  ArrowRight,
  Database,
  Sparkles,
  AlertTriangle,
  HelpCircle,
  BarChart3
} from 'lucide-react';
import { DashboardStats, ActiveTab } from '../types';

interface DashboardViewProps {
  stats: DashboardStats | null;
  loading: boolean;
  onNavigate: (tab: ActiveTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  loading,
  onNavigate,
}) => {
  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-medium text-slate-500">Querying live relational metrics from database...</p>
        </div>
      </div>
    );
  }

  const { students, instructors, courses, enrollments, academics, financials } = stats;

  return (
    <div className="space-y-6">
      {/* Welcome & Overview Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 text-white shadow-md border border-slate-800 relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-medium border border-indigo-400/30">
            <Database className="w-3.5 h-3.5" />
            <span>Academic Year 2025–2026 • Term Active</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Academic Operations & Institutional Dashboard
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Monitor real-time student registrations, faculty course loads, academic grading progress,
            and enrollment lifecycle metrics across all institutional departments.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={() => onNavigate('reports')}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              <span>View Reports</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onNavigate('students')}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            >
              <span>Student Directory</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onNavigate('ai_copilot')}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-xs font-semibold text-amber-300 border border-amber-500/30 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>AI Academic Assistant</span>
            </button>
          </div>
        </div>
        <div className="absolute right-0 bottom-0 translate-x-8 translate-y-8 opacity-10 pointer-events-none">
          <Database className="w-80 h-80 text-white" />
        </div>
      </div>

      {/* 4 Primary KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Students */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Students</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">{students.total}</div>
            <div className="flex items-center space-x-2 mt-1.5 text-xs text-slate-600">
              <span className="inline-flex items-center font-medium text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1"></span>
                {students.active} Active
              </span>
              <span>•</span>
              <span className="text-slate-500">{students.inactive} Inactive</span>
              {students.suspended > 0 && (
                <>
                  <span>•</span>
                  <span className="text-rose-600 font-medium">{students.suspended} Suspended</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* KPI 2: Faculty & Curriculum */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Faculty & Courses</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">{courses.total} <span className="text-sm font-normal text-slate-500">Courses</span></div>
            <div className="flex items-center space-x-2 mt-1.5 text-xs text-slate-600">
              <span className="text-indigo-600 font-medium">{instructors.total} Instructors</span>
              <span>•</span>
              <span className="text-slate-500">${courses.avgFee} Avg Fee</span>
            </div>
          </div>
        </div>

        {/* KPI 3: Enrollments */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Enrollments</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">{enrollments.total}</div>
            <div className="flex items-center space-x-2 mt-1.5 text-xs">
              <span className="font-semibold text-emerald-600">{enrollments.completionRate}% Completion</span>
              <span>•</span>
              <span className="text-slate-500">{enrollments.enrolled} Active</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Academic Quality & Revenue */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Academic Marks</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">{academics.averageGrade}% <span className="text-xs font-normal text-slate-500">Mean</span></div>
            <div className="flex items-center space-x-2 mt-1.5 text-xs text-slate-600">
              <span className="text-emerald-600 font-medium">Top: {academics.highestGrade}%</span>
              <span>•</span>
              <span className="text-slate-500">${financials.totalRevenue.toLocaleString()} Revenue</span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Analytics Grid: Grade Distribution & Enrollment Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Grade Distribution Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Grade Letter Distribution</h2>
              <p className="text-xs text-slate-500">Across {academics.gradedCount} graded student enrollments (Weighted: Assign 25%, Quiz 25%, Exam 50%)</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-mono">
              Avg: {academics.averageGrade}%
            </span>
          </div>

          <div className="grid grid-cols-5 gap-3 pt-2">
            {['A', 'B', 'C', 'D', 'F'].map((grade) => {
              const item = academics.distribution.find((d) => d.grade_letter === grade);
              const count = item ? item.count : 0;
              const maxCount = Math.max(...academics.distribution.map((d) => d.count), 1);
              const heightPercent = Math.max(Math.round((count / maxCount) * 100), 10);

              const colorMap: Record<string, string> = {
                A: 'bg-emerald-500 text-emerald-700',
                B: 'bg-blue-500 text-blue-700',
                C: 'bg-amber-500 text-amber-700',
                D: 'bg-orange-500 text-orange-700',
                F: 'bg-rose-500 text-rose-700',
              };

              return (
                <div key={grade} className="flex flex-col items-center">
                  <div className="h-36 w-full flex items-end justify-center bg-slate-50 rounded-lg p-2 border border-slate-100">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full max-w-[40px] rounded-t-md transition-all duration-500 ${
                        grade === 'A'
                          ? 'bg-emerald-500'
                          : grade === 'B'
                          ? 'bg-blue-500'
                          : grade === 'C'
                          ? 'bg-amber-500'
                          : grade === 'D'
                          ? 'bg-orange-500'
                          : 'bg-rose-500'
                      } flex items-center justify-center text-white text-[11px] font-bold shadow-2xs`}
                    >
                      {count > 0 ? count : ''}
                    </div>
                  </div>
                  <span className="mt-2 text-xs font-bold text-slate-800">Grade {grade}</span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {count} {count === 1 ? 'student' : 'students'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Enrollment Pipeline & Quick Business Inquiries */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Enrollment Lifecycle Breakdown</h2>
            <p className="text-xs text-slate-500">Live counts across student course states</p>
          </div>

          <div className="space-y-3">
            {/* Enrolled */}
            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-blue-700 font-semibold">Enrolled (In-Progress)</span>
                <span className="text-slate-600">{enrollments.enrolled} ({Math.round((enrollments.enrolled / (enrollments.total || 1)) * 100)}%)</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${(enrollments.enrolled / (enrollments.total || 1)) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Completed */}
            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-emerald-700 font-semibold">Completed (Graduated)</span>
                <span className="text-slate-600">{enrollments.completed} ({Math.round((enrollments.completed / (enrollments.total || 1)) * 100)}%)</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${(enrollments.completed / (enrollments.total || 1)) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Dropped */}
            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-rose-700 font-semibold">Dropped (Withdrawn)</span>
                <span className="text-slate-600">{enrollments.dropped} ({Math.round((enrollments.dropped / (enrollments.total || 1)) * 100)}%)</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-rose-500 rounded-full"
                  style={{ width: `${(enrollments.dropped / (enrollments.total || 1)) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 space-y-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Key Institutional Inquiries</h3>
            <div className="space-y-1 text-xs">
              <button
                onClick={() => onNavigate('reports')}
                className="w-full text-left p-2 rounded-lg bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-100 transition-colors flex items-center justify-between cursor-pointer"
              >
                <span>Most popular enrolled courses</span>
                <ArrowRight className="w-3 h-3 text-slate-400" />
              </button>
              <button
                onClick={() => onNavigate('reports')}
                className="w-full text-left p-2 rounded-lg bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-100 transition-colors flex items-center justify-between cursor-pointer"
              >
                <span>Highest academic honors & distinctions</span>
                <ArrowRight className="w-3 h-3 text-slate-400" />
              </button>
              <button
                onClick={() => onNavigate('reports')}
                className="w-full text-left p-2 rounded-lg bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-100 transition-colors flex items-center justify-between cursor-pointer"
              >
                <span>Courses with pending enrollments</span>
                <ArrowRight className="w-3 h-3 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Academic Term Operations & Administrative Status */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Academic Term Operations & Administrative Milestones</span>
            </h3>
            <p className="text-xs text-slate-500">Current cycle progress across admissions, grading, and curriculum</p>
          </div>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
            All Systems Operational
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1.5">
            <span className="font-semibold text-slate-900 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span>1. Student Enrollment & Admissions</span>
            </span>
            <p className="text-slate-600 leading-relaxed">
              Course registrations open. Real-time validation ensures unique active enrollments and conflict prevention.
            </p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1.5">
            <span className="font-semibold text-slate-900 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>2. Coursework & Grading Cycle</span>
            </span>
            <p className="text-slate-600 leading-relaxed">
              Formative assessments (assignments 25%, quizzes 25%) and summative final exams (50%) with automatic letter calculation.
            </p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1.5">
            <span className="font-semibold text-slate-900 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              <span>3. Faculty Workload & Diagnostics</span>
            </span>
            <p className="text-slate-600 leading-relaxed">
              Departmental faculty distributions and AI-assisted academic performance interventions for students needing guidance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
