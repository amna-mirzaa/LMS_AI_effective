import React, { useState } from 'react';
import {
  Award,
  Search,
  Plus,
  Edit2,
  Trash2,
  Download,
  AlertCircle,
  X,
  Calculator,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import { Grade, Enrollment } from '../types';
import { exportToCsv } from '../utils/exportCsv';

interface GradesViewProps {
  grades: Grade[];
  enrollments: Enrollment[];
  onRefresh: () => void;
}

export const GradesView: React.FC<GradesViewProps> = ({
  grades,
  enrollments,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [letterFilter, setLetterFilter] = useState<string>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<Grade | null>(null);

  // Form State
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<number>(
    enrollments[0]?.id || 1
  );
  const [assignmentMark, setAssignmentMark] = useState<number>(85);
  const [quizMark, setQuizMark] = useState<number>(85);
  const [finalExamMark, setFinalExamMark] = useState<number>(85);
  const [feedback, setFeedback] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Live client-side calculation preview
  const previewTotal = Number(
    ((assignmentMark * 0.25) + (quizMark * 0.25) + (finalExamMark * 0.5)).toFixed(1)
  );
  let previewLetter = 'F';
  if (previewTotal >= 90) previewLetter = 'A';
  else if (previewTotal >= 80) previewLetter = 'B';
  else if (previewTotal >= 70) previewLetter = 'C';
  else if (previewTotal >= 60) previewLetter = 'D';

  const filteredGrades = grades.filter((g) => {
    const matchesSearch =
      (g.student_name && g.student_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (g.course_name && g.course_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (g.instructor_name && g.instructor_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesLetter = letterFilter === 'All' || g.grade_letter === letterFilter;
    return matchesSearch && matchesLetter;
  });

  const handleOpenAdd = () => {
    setEditingGrade(null);
    setSelectedEnrollmentId(enrollments[0]?.id || 1);
    setAssignmentMark(85);
    setQuizMark(85);
    setFinalExamMark(85);
    setFeedback('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (g: Grade) => {
    setEditingGrade(g);
    setSelectedEnrollmentId(g.enrollment_id);
    setAssignmentMark(g.assignment_mark);
    setQuizMark(g.quiz_mark);
    setFinalExamMark(g.final_exam_mark);
    setFeedback(g.feedback || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch('/api/grades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enrollment_id: selectedEnrollmentId,
          assignment_mark: assignmentMark,
          quiz_mark: quizMark,
          final_exam_mark: finalExamMark,
          feedback,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to record grade');
      }

      setIsModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (g: Grade) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete grade record for student "${g.student_name}" in "${g.course_name}"?`
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/grades/${g.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete grade');
      }
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleExportCsv = () => {
    exportToCsv('academic_grades_evaluation', filteredGrades);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-bold text-slate-900">Academic Grading & Performance Marks</h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              {grades.length} Evaluated Records
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Formative & summative assessment grading (Assignment 25% + Quiz 25% + Final Exam 50%) with automatic letter tiers
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Grade</span>
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by student name, course title, or faculty member..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 placeholder-slate-400"
          />
        </div>
        <div className="flex items-center space-x-2">
          <label className="text-xs font-medium text-slate-500 whitespace-nowrap">Filter Letter:</label>
          <select
            value={letterFilter}
            onChange={(e) => setLetterFilter(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
          >
            <option value="All">All Grades</option>
            <option value="A">Grade A (90-100%)</option>
            <option value="B">Grade B (80-89%)</option>
            <option value="C">Grade C (70-79%)</option>
            <option value="D">Grade D (60-69%)</option>
            <option value="F">Grade F (&lt;60%)</option>
          </select>
        </div>
      </div>

      {/* Grades Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Student & Course</th>
                <th className="py-3 px-4 text-center">Assign (25%)</th>
                <th className="py-3 px-4 text-center">Quiz (25%)</th>
                <th className="py-3 px-4 text-center">Final Exam (50%)</th>
                <th className="py-3 px-4 text-center">Weighted Total</th>
                <th className="py-3 px-4 text-center">Grade</th>
                <th className="py-3 px-4">Instructor Feedback</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredGrades.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No grades match search or filter.
                  </td>
                </tr>
              ) : (
                filteredGrades.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{g.student_name}</div>
                      <div className="text-slate-500 text-[11px]">{g.course_name}</div>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-medium text-slate-700">
                      {g.assignment_mark}%
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-medium text-slate-700">
                      {g.quiz_mark}%
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-medium text-slate-700">
                      {g.final_exam_mark}%
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                        {g.total_mark}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-extrabold ${
                          g.grade_letter === 'A'
                            ? 'bg-emerald-100 text-emerald-800'
                            : g.grade_letter === 'B'
                            ? 'bg-blue-100 text-blue-800'
                            : g.grade_letter === 'C'
                            ? 'bg-amber-100 text-amber-800'
                            : g.grade_letter === 'D'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {g.grade_letter}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 italic max-w-xs truncate">
                      {g.feedback || '—'}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => handleOpenEdit(g)}
                        title="Edit Marks"
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(g)}
                        title="Delete Grade"
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record / Edit Grade Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">
                {editingGrade ? 'Edit Grade & Performance Marks' : 'Record Academic Marks'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Enrollment Record *</label>
                <select
                  disabled={!!editingGrade}
                  value={selectedEnrollmentId}
                  onChange={(e) => setSelectedEnrollmentId(Number(e.target.value))}
                  className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-600"
                >
                  {enrollments.map((e) => (
                    <option key={e.id} value={e.id}>
                      #{e.id}: {e.student_name} ➔ {e.course_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assignment (25%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={assignmentMark}
                    onChange={(e) => setAssignmentMark(Number(e.target.value))}
                    className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quiz (25%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={quizMark}
                    onChange={(e) => setQuizMark(Number(e.target.value))}
                    className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Final Exam (50%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={finalExamMark}
                    onChange={(e) => setFinalExamMark(Number(e.target.value))}
                    className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* Dynamic Calculation Live Box */}
              <div className="p-3 bg-slate-900 text-white rounded-lg flex items-center justify-between shadow-2xs">
                <div className="flex items-center space-x-2">
                  <Calculator className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs text-slate-300 font-medium">Calculated Total:</span>
                  <span className="font-mono text-base font-bold text-indigo-300">{previewTotal}%</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs text-slate-400">Letter:</span>
                  <span className="px-2 py-0.5 rounded bg-indigo-600 text-white font-extrabold text-xs font-mono">
                    Grade {previewLetter}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Instructor Qualitative Feedback</label>
                <textarea
                  rows={2}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="e.g. Excellent algorithmic optimization skills; improve database indexing analysis..."
                  className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Save Academic Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
