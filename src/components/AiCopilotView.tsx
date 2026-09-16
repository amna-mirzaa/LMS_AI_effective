import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  GraduationCap,
  BookOpen,
  Send,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Brain,
  Lightbulb,
  Clock,
  UserCheck
} from 'lucide-react';
import { Student, Course } from '../types';

interface AiCopilotViewProps {
  students: Student[];
  courses: Course[];
  initialStudentId?: number | null;
  initialCourseId?: number | null;
}

export const AiCopilotView: React.FC<AiCopilotViewProps> = ({
  students,
  courses,
  initialStudentId,
  initialCourseId,
}) => {
  const [activeTab, setActiveTab] = useState<'diagnosis' | 'curriculum'>('diagnosis');

  // Student Diagnosis State
  const [selectedStudentId, setSelectedStudentId] = useState<number>(
    initialStudentId || students[0]?.id || 1
  );
  const [diagnosisLoading, setDiagnosisLoading] = useState<boolean>(false);
  const [diagnosisResult, setDiagnosisResult] = useState<any | null>(null);
  const [diagnosisError, setDiagnosisError] = useState<string | null>(null);

  // Curriculum Generator State
  const [selectedCourseId, setSelectedCourseId] = useState<number>(
    initialCourseId || courses[0]?.id || 1
  );
  const [targetAudience, setTargetAudience] = useState<string>('Undergraduate Computer Science Scholars');
  const [curriculumLoading, setCurriculumLoading] = useState<boolean>(false);
  const [curriculumResult, setCurriculumResult] = useState<any | null>(null);
  const [curriculumError, setCurriculumError] = useState<string | null>(null);

  useEffect(() => {
    if (initialStudentId) {
      setSelectedStudentId(initialStudentId);
      setActiveTab('diagnosis');
      handleRunDiagnosis(initialStudentId);
    }
  }, [initialStudentId]);

  useEffect(() => {
    if (initialCourseId) {
      setSelectedCourseId(initialCourseId);
      setActiveTab('curriculum');
    }
  }, [initialCourseId]);

  const handleRunDiagnosis = async (sid = selectedStudentId) => {
    setDiagnosisLoading(true);
    setDiagnosisError(null);
    setDiagnosisResult(null);

    try {
      const res = await fetch('/api/ai/analyze-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: sid }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Diagnosis failed');
      }

      setDiagnosisResult(data);
    } catch (err: any) {
      setDiagnosisError(err.message);
    } finally {
      setDiagnosisLoading(false);
    }
  };

  const handleGenerateCurriculum = async () => {
    const course = courses.find((c) => c.id === selectedCourseId);
    if (!course) return;

    setCurriculumLoading(true);
    setCurriculumError(null);
    setCurriculumResult(null);

    try {
      const res = await fetch('/api/ai/generate-curriculum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_name: course.course_name,
          duration_weeks: course.duration_weeks,
          target_audience: targetAudience,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Curriculum generation failed');
      }

      setCurriculumResult(data);
    } catch (err: any) {
      setCurriculumError(err.message);
    } finally {
      setCurriculumLoading(false);
    }
  };

  const selectedStudent = students.find((s) => s.id === selectedStudentId);
  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-purple-500/10 p-5 rounded-xl border border-amber-200/60 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h1 className="text-lg font-bold text-slate-900">AI Academic Assistant</h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                AI Powered
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Provides personalized student guidance, performance analysis, and automated curriculum planning
            </p>
          </div>

          <div className="flex space-x-1 bg-white/80 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('diagnosis')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                activeTab === 'diagnosis'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Academic Advisor
            </button>
            <button
              onClick={() => setActiveTab('curriculum')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                activeTab === 'curriculum'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Curriculum Designer
            </button>
          </div>
        </div>
      </div>

      {/* Tab 1: Student Academic Diagnosis */}
      {activeTab === 'diagnosis' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Student Performance & Academic Guidance</h2>
                <p className="text-xs text-slate-500">
                  Select a student to review performance trends, course progress, and personalized recommendations.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(Number(e.target.value))}
                  className="text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-semibold focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      #{s.id} {s.name} ({s.status})
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => handleRunDiagnosis()}
                  disabled={diagnosisLoading}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors shadow-2xs cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <Brain className="w-3.5 h-3.5" />
                  <span>{diagnosisLoading ? 'Analyzing...' : 'Generate Guidance'}</span>
                </button>
              </div>
            </div>

            {selectedStudent && (
              <div className="flex items-center space-x-4 p-3 bg-slate-50 rounded-lg text-xs text-slate-600">
                <div>
                  <span className="text-slate-400">Student:</span> <strong className="text-slate-900">{selectedStudent.name}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Email:</span> <span className="font-mono text-slate-700">{selectedStudent.email}</span>
                </div>
                <div>
                  <span className="text-slate-400">Status:</span>{' '}
                  <span className="font-semibold text-indigo-700">{selectedStudent.status}</span>
                </div>
                <div>
                  <span className="text-slate-400">Courses Enrolled:</span>{' '}
                  <span className="font-bold text-slate-900">{selectedStudent.enrollment_count || 0}</span>
                </div>
              </div>
            )}
          </div>

          {diagnosisError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>{diagnosisError}</div>
            </div>
          )}

          {diagnosisLoading && (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs font-medium text-slate-600">
                Analyzing student performance trends and academic milestones...
              </p>
            </div>
          )}

          {diagnosisResult && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-5 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-sm font-bold text-slate-900">Academic Evaluation Completed</h3>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-slate-500">Evaluated Risk:</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px] ${
                      diagnosisResult.analysis?.risk_level === 'High'
                        ? 'bg-rose-100 text-rose-800'
                        : diagnosisResult.analysis?.risk_level === 'Medium'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {diagnosisResult.analysis?.risk_level || 'Normal'}
                  </span>
                </div>
              </div>

              {/* Summary */}
              <div className="space-y-1">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">Executive Summary</h4>
                <p className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                  {diagnosisResult.analysis?.summary || diagnosisResult.raw}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Strengths */}
                <div className="p-4 rounded-lg bg-emerald-50/50 border border-emerald-100 space-y-2">
                  <h4 className="font-bold text-emerald-900 flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Identified Strengths</span>
                  </h4>
                  <ul className="space-y-1 text-slate-700">
                    {(diagnosisResult.analysis?.strengths || []).map((s: string, idx: number) => (
                      <li key={idx} className="flex items-start space-x-1.5">
                        <span className="text-emerald-500 font-bold">•</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Areas for Growth */}
                <div className="p-4 rounded-lg bg-amber-50/50 border border-amber-100 space-y-2">
                  <h4 className="font-bold text-amber-900 flex items-center space-x-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Areas for Improvement</span>
                  </h4>
                  <ul className="space-y-1 text-slate-700">
                    {(diagnosisResult.analysis?.areas_for_improvement || []).map((a: string, idx: number) => (
                      <li key={idx} className="flex items-start space-x-1.5">
                        <span className="text-amber-500 font-bold">•</span>
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Recommendations */}
              <div className="space-y-2 pt-2">
                <h4 className="font-bold text-slate-800 flex items-center space-x-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Advisor Action Plan & Interventions</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(diagnosisResult.analysis?.recommendations || []).map((r: string, idx: number) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-indigo-50/50 border border-indigo-100 text-slate-700">
                      <span className="font-bold text-indigo-900 mr-1.5">{idx + 1}.</span>
                      {r}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Curriculum & Syllabus Architect */}
      {activeTab === 'curriculum' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Curriculum & Syllabus Designer</h2>
              <p className="text-xs text-slate-500">
                Generate structured, week-by-week syllabi, learning outcomes, and assessment recommendations.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Course from Database</label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-800 font-semibold focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      #{c.id} {c.course_name} ({c.duration_weeks} Weeks)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Student Demographic</label>
                <input
                  type="text"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="e.g. Graduate Software Engineers, Beginners, Career Switchers"
                  className="w-full border border-slate-300 rounded-lg p-2 text-slate-800 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleGenerateCurriculum}
                disabled={curriculumLoading}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{curriculumLoading ? 'Designing Syllabus...' : 'Generate Curriculum'}</span>
              </button>
            </div>
          </div>

          {curriculumError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>{curriculumError}</div>
            </div>
          )}

          {curriculumLoading && (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs font-medium text-slate-600">
                Gemini AI is structuring modules, pedagogical milestones, laboratory exercises, and assessments...
              </p>
            </div>
          )}

          {curriculumResult && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-5 text-xs">
              <div className="pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">{curriculumResult.curriculum?.title}</h3>
                <p className="text-slate-600 mt-1">{curriculumResult.curriculum?.overview}</p>
              </div>

              {/* Learning Outcomes */}
              <div className="p-3 bg-indigo-50/60 rounded-lg border border-indigo-100 space-y-2">
                <h4 className="font-bold text-indigo-900 uppercase tracking-wider text-[11px]">
                  Core Learning Outcomes
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(curriculumResult.curriculum?.learning_outcomes || []).map((out: string, idx: number) => (
                    <div key={idx} className="flex items-start space-x-1.5 text-slate-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                      <span>{out}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Weekly Modules */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                  Weekly Instructional Roadmap
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(curriculumResult.curriculum?.weeks || []).map((w: any) => (
                    <div key={w.week} className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-indigo-700 font-mono">Week {w.week}</span>
                        <span className="font-bold text-slate-900 text-xs">{w.topic}</span>
                      </div>
                      <p className="text-[11px] text-slate-600">{w.description}</p>
                      {w.deliverable && (
                        <div className="pt-1.5 border-t border-slate-200/60 text-[11px] font-semibold text-slate-700">
                          Deliverable: <span className="text-indigo-600">{w.deliverable}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
