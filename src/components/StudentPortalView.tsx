import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  GraduationCap,
  Award,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Plus,
  Trash2,
  Calendar,
  DollarSign,
  Search,
  BookMarked,
  ArrowRight
} from 'lucide-react';
import { AuthUser, Course } from '../types';

interface StudentPortalViewProps {
  currentUser: AuthUser;
  onRefreshAll: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const StudentPortalView: React.FC<StudentPortalViewProps> = ({
  currentUser,
  onRefreshAll,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'my_courses' | 'register' | 'transcript'>('my_courses');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    student: any;
    enrollments: any[];
    availableCourses: any[];
  } | null>(null);

  const [searchCatalog, setSearchCatalog] = useState('');
  const [registeringCourseId, setRegisteringCourseId] = useState<number | null>(null);
  const [droppingEnrollmentId, setDroppingEnrollmentId] = useState<number | null>(null);

  const studentId = currentUser.ref_id || 1;

  const fetchPortalData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/student/portal/${studentId}`);
      if (!res.ok) throw new Error('Failed to load student portal data');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      showToast(err.message || 'Error loading student portal', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortalData();
  }, [studentId]);

  const handleRegister = async (course: any) => {
    setRegisteringCourseId(course.id);
    try {
      const res = await fetch('/api/student/register-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          course_id: course.id,
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Registration failed');
      }
      showToast(result.message || `Successfully registered for ${course.course_name}`);
      await fetchPortalData();
      onRefreshAll();
      setActiveTab('my_courses');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setRegisteringCourseId(null);
    }
  };

  const handleDrop = async (enrollment: any) => {
    const confirmed = window.confirm(
      `Are you sure you want to drop "${enrollment.course_name}"? You can re-register later if seats are available.`
    );
    if (!confirmed) return;

    setDroppingEnrollmentId(enrollment.enrollment_id);
    try {
      const res = await fetch('/api/student/drop-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          enrollment_id: enrollment.enrollment_id,
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Failed to drop course');
      }
      showToast(result.message || `Course "${enrollment.course_name}" dropped`);
      await fetchPortalData();
      onRefreshAll();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setDroppingEnrollmentId(null);
    }
  };

  if (loading && !data) {
    return (
      <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-3">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-xs text-slate-500 font-medium">Loading your student portal records...</p>
      </div>
    );
  }

  const student = data?.student;
  const enrollments = data?.enrollments || [];
  const activeEnrollments = enrollments.filter((e) => e.enrollment_status === 'Enrolled');
  const completedEnrollments = enrollments.filter((e) => e.enrollment_status === 'Completed');
  const droppedEnrollments = enrollments.filter((e) => e.enrollment_status === 'Dropped');
  const availableCourses = (data?.availableCourses || []).filter((c) =>
    c.course_name.toLowerCase().includes(searchCatalog.toLowerCase()) ||
    c.instructor_name?.toLowerCase().includes(searchCatalog.toLowerCase()) ||
    c.description?.toLowerCase().includes(searchCatalog.toLowerCase())
  );

  // Calculate GPA / Average
  const graded = enrollments.filter((e) => e.total_mark !== null && e.total_mark !== undefined);
  const averageMark = graded.length
    ? (graded.reduce((acc, curr) => acc + curr.total_mark, 0) / graded.length).toFixed(1)
    : 'N/A';

  return (
    <div className="space-y-6">
      {/* Student Profile & KPI Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-indigo-500/20 shrink-0">
              {currentUser.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h1 className="text-xl font-bold text-slate-900">{currentUser.name}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Student #{studentId}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                  student?.status === 'Active'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {student?.status || 'Active'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {currentUser.email} • Enrolled: {student?.enrollment_date || 'Fall 2025'}
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3">
            <div className="px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-center min-w-[100px]">
              <div className="text-xs font-semibold text-slate-400">Active Courses</div>
              <div className="text-lg font-bold text-indigo-600">{activeEnrollments.length}</div>
            </div>
            <div className="px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-center min-w-[100px]">
              <div className="text-xs font-semibold text-slate-400">Completed</div>
              <div className="text-lg font-bold text-emerald-600">{completedEnrollments.length}</div>
            </div>
            <div className="px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-center min-w-[100px]">
              <div className="text-xs font-semibold text-slate-400">Academic Avg</div>
              <div className="text-lg font-bold text-amber-600">{averageMark}{averageMark !== 'N/A' ? '%' : ''}</div>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center space-x-2 mt-6 pt-5 border-t border-slate-100">
          <button
            onClick={() => setActiveTab('my_courses')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center space-x-2 ${
              activeTab === 'my_courses'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BookMarked className="w-3.5 h-3.5" />
            <span>My Registered Courses ({enrollments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('register')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center space-x-2 ${
              activeTab === 'register'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register New Courses ({availableCourses.length} Available)</span>
          </button>

          <button
            onClick={() => setActiveTab('transcript')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center space-x-2 ${
              activeTab === 'transcript'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Grades & Transcript</span>
          </button>
        </div>
      </div>

      {/* Tab 1: My Courses */}
      {activeTab === 'my_courses' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Registered Course Schedule & Status</h2>
            <button
              onClick={() => setActiveTab('register')}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Enroll in More Courses</span>
            </button>
          </div>

          {enrollments.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-3">
              <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-semibold text-slate-800">No course registrations yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Explore available academic courses in the catalog and register with a single click.
              </p>
              <button
                onClick={() => setActiveTab('register')}
                className="mt-2 inline-flex items-center space-x-1 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 cursor-pointer"
              >
                <span>Browse Course Catalog</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {enrollments.map((enr) => {
                const isDropped = enr.enrollment_status === 'Dropped';
                const isCompleted = enr.enrollment_status === 'Completed';

                return (
                  <div
                    key={enr.enrollment_id}
                    className={`p-5 rounded-xl border transition-all ${
                      isDropped
                        ? 'bg-slate-50/70 border-slate-200 opacity-70'
                        : 'bg-white border-slate-200 shadow-2xs hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-bold text-slate-900 text-sm">{enr.course_name}</h3>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              isCompleted
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : isDropped
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}
                          >
                            {enr.enrollment_status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{enr.description}</p>
                      </div>

                      {/* Drop Course Button (for active enrollments) */}
                      {!isDropped && !isCompleted && (
                        <button
                          onClick={() => handleDrop(enr)}
                          disabled={droppingEnrollmentId === enr.enrollment_id}
                          className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors shrink-0 cursor-pointer disabled:opacity-50"
                        >
                          {droppingEnrollmentId === enr.enrollment_id ? 'Dropping...' : 'Drop Course'}
                        </button>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-600">
                      <div>
                        <span className="text-slate-400">Instructor:</span>{' '}
                        <strong className="text-slate-800 font-semibold">{enr.instructor_name}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Duration:</span>{' '}
                        <span className="font-semibold text-slate-700">{enr.duration_weeks} Weeks</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Enrolled On:</span>{' '}
                        <span className="font-mono text-slate-700">{enr.enrollment_date}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Tuition Fee:</span>{' '}
                        <span className="font-semibold text-emerald-700">${enr.fee}</span>
                      </div>
                    </div>

                    {/* Grade status pill if evaluated */}
                    {enr.total_mark !== null && enr.total_mark !== undefined && (
                      <div className="mt-3 p-2.5 rounded-lg bg-indigo-50/50 border border-indigo-100 flex items-center justify-between text-xs">
                        <span className="text-indigo-950 font-medium">Evaluation Result:</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-indigo-900 font-bold">{enr.total_mark}%</span>
                          <span className="px-2 py-0.5 rounded bg-indigo-600 text-white font-bold text-[11px]">
                            Grade {enr.grade_letter}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Register New Courses (Course Catalog) */}
      {activeTab === 'register' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Available Course Catalog</h2>
              <p className="text-xs text-slate-500">
                Browse upcoming and open courses. Click "Register" to add to your study term.
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchCatalog}
                onChange={(e) => setSearchCatalog(e.target.value)}
                placeholder="Search courses or faculty..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {availableCourses.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="text-sm font-bold text-slate-800">You are enrolled in all eligible active courses!</p>
              <p className="text-xs text-slate-500">Check back later for new terms and curriculum releases.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableCourses.map((c) => (
                <div
                  key={c.id}
                  className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-bold text-slate-900 text-sm">{c.course_name}</h3>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {c.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{c.description}</p>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Faculty Lead:</span>
                        <strong className="text-slate-800">{c.instructor_name}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Specialization:</span>
                        <span className="text-slate-600">{c.instructor_specialization}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Term Duration:</span>
                        <span className="font-semibold text-slate-700">{c.duration_weeks} Weeks</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Tuition Fee:</span>
                        <span className="font-bold text-emerald-700">${c.fee}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => handleRegister(c)}
                      disabled={registeringCourseId === c.id}
                      className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors shadow-2xs cursor-pointer flex items-center justify-center space-x-1.5 disabled:opacity-50"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{registeringCourseId === c.id ? 'Registering...' : 'Register for this Course'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Grades & Transcript */}
      {activeTab === 'transcript' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Official Student Academic Transcript</h2>
              <p className="text-xs text-slate-500">
                Detailed breakdown of formative assessment marks, exams, and letter tiers.
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block">Overall Performance</span>
              <span className="text-lg font-bold text-indigo-600">{averageMark}%</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold">
                  <th className="py-2.5 px-3">Course Name</th>
                  <th className="py-2.5 px-3">Instructor</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center">Assignment (25%)</th>
                  <th className="py-2.5 px-3 text-center">Quiz (25%)</th>
                  <th className="py-2.5 px-3 text-center">Exam (50%)</th>
                  <th className="py-2.5 px-3 text-center">Total Mark</th>
                  <th className="py-2.5 px-3 text-center">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {enrollments.map((enr) => {
                  const hasGrade = enr.total_mark !== null && enr.total_mark !== undefined;

                  return (
                    <tr key={enr.enrollment_id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-3 font-semibold text-slate-900">{enr.course_name}</td>
                      <td className="py-3 px-3 text-slate-600">{enr.instructor_name}</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          enr.enrollment_status === 'Completed'
                            ? 'bg-emerald-50 text-emerald-700'
                            : enr.enrollment_status === 'Dropped'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-blue-50 text-blue-700'
                        }`}>
                          {enr.enrollment_status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center text-slate-700">
                        {hasGrade ? `${enr.assignment_mark}/100` : '—'}
                      </td>
                      <td className="py-3 px-3 text-center text-slate-700">
                        {hasGrade ? `${enr.quiz_mark}/100` : '—'}
                      </td>
                      <td className="py-3 px-3 text-center text-slate-700">
                        {hasGrade ? `${enr.final_exam_mark}/100` : '—'}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-900">
                        {hasGrade ? `${enr.total_mark}%` : 'Pending'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {hasGrade ? (
                          <span className={`px-2 py-0.5 rounded font-bold text-xs ${
                            enr.grade_letter === 'A'
                              ? 'bg-emerald-100 text-emerald-800'
                              : enr.grade_letter === 'B'
                              ? 'bg-blue-100 text-blue-800'
                              : enr.grade_letter === 'C'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {enr.grade_letter}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
