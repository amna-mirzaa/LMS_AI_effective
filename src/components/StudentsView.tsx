import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Download,
  AlertCircle,
  CheckCircle,
  X,
  Sparkles,
  Phone,
  Mail,
  Calendar,
  BookOpen
} from 'lucide-react';
import { Student, StudentStatus } from '../types';
import { exportToCsv } from '../utils/exportCsv';

interface StudentsViewProps {
  students: Student[];
  onRefresh: () => void;
  onSelectAiStudent?: (studentId: number) => void;
}

export const StudentsView: React.FC<StudentsViewProps> = ({
  students,
  onRefresh,
  onSelectAiStudent,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Form Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Form inputs
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    enrollment_date: new Date().toISOString().split('T')[0],
    status: 'Active' as StudentStatus,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Filtered list
  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.phone.includes(searchTerm);
    const matchesStatus = statusFilter === 'All' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      enrollment_date: new Date().toISOString().split('T')[0],
      status: 'Active',
    });
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      name: student.name,
      email: student.email,
      phone: student.phone,
      enrollment_date: student.enrollment_date,
      status: student.status,
    });
    setFormError(null);
    setIsEditModalOpen(true);
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create student');
      }

      setIsAddModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch(`/api/students/${editingStudent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update student');
      }

      setIsEditModalOpen(false);
      setEditingStudent(null);
      onRefresh();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStudent = async (student: Student) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete student "${student.name}"? This action complies with foreign key cascade rules and will remove their enrollment records.`
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/students/${student.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete student');
      }
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleViewDetails = async (studentId: number) => {
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/students/${studentId}`);
      const data = await res.json();
      if (res.ok) {
        setSelectedStudent(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleExportCsv = () => {
    exportToCsv('students_master_data', filteredStudents);
  };

  return (
    <div className="space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-bold text-slate-900">Student Directory</h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {students.length} Records
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage student records, contact details, enrollment timeline, and academic status
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
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by student name, email, or phone..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 placeholder-slate-400"
          />
        </div>
        <div className="flex items-center space-x-2">
          <label className="text-xs font-medium text-slate-500 whitespace-nowrap">Filter Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active Only</option>
            <option value="Inactive">Inactive</option>
            <option value="Suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Students Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Contact Info</th>
                <th className="py-3 px-4">Enrolled Date</th>
                <th className="py-3 px-4">Courses / Avg</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No students match the current query or filter criteria.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-500">#{s.id}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <button
                        onClick={() => handleViewDetails(s.id)}
                        className="hover:text-indigo-600 hover:underline cursor-pointer text-left"
                      >
                        {s.name}
                      </button>
                    </td>
                    <td className="py-3 px-4 space-y-0.5">
                      <div className="text-slate-700 font-mono text-[11px]">{s.email}</div>
                      <div className="text-slate-500 text-[11px]">{s.phone}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">{s.enrollment_date}</td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-900">{s.enrollment_count || 0}</span> courses
                      {s.average_mark ? (
                        <span className="ml-1 text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-indigo-700 font-bold">
                          {Math.round(s.average_mark)}%
                        </span>
                      ) : null}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          s.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : s.status === 'Inactive'
                            ? 'bg-slate-100 text-slate-700 border border-slate-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => handleViewDetails(s.id)}
                        title="View Academic Transcript"
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(s)}
                        title="Edit Student"
                        className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteStudent(s)}
                        title="Delete Student"
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

      {/* Add / Edit Student Modal */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">
                {isAddModalOpen ? 'Add New Student' : `Edit Student (#${editingStudent?.id})`}
              </h2>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsEditModalOpen(false);
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={isAddModalOpen ? handleCreateStudent : handleUpdateStudent} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Jessica Sterling"
                  className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="jessica.s@student.edu"
                  className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1-555-0199"
                    className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Enrollment Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.enrollment_date}
                    onChange={(e) => setFormData({ ...formData, enrollment_date: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as StudentStatus })}
                  className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setIsEditModalOpen(false);
                  }}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : isAddModalOpen ? 'Create Student' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Transcript & Detail Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-base font-bold text-slate-900">{selectedStudent.name}</h2>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      selectedStudent.status === 'Active'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {selectedStudent.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-mono">ID #{selectedStudent.id} • {selectedStudent.email}</p>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick stats & AI trigger */}
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs">
              <div className="space-y-0.5">
                <span className="text-slate-500">Contact:</span>
                <span className="font-semibold text-slate-800 ml-1">{selectedStudent.phone}</span>
                <span className="text-slate-400 mx-2">•</span>
                <span className="text-slate-500">Since:</span>
                <span className="font-semibold text-slate-800 ml-1">{selectedStudent.enrollment_date}</span>
              </div>
              {onSelectAiStudent && (
                <button
                  onClick={() => {
                    const sid = selectedStudent.id;
                    setSelectedStudent(null);
                    onSelectAiStudent(sid);
                  }}
                  className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-bold hover:bg-amber-100 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>AI Academic Diagnosis</span>
                </button>
              )}
            </div>

            {/* Enrolled Courses & Academic Marks */}
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Enrolled Courses & Academic Evaluation ({selectedStudent.enrollments?.length || 0})
              </h3>
              {(!selectedStudent.enrollments || selectedStudent.enrollments.length === 0) ? (
                <p className="text-xs text-slate-400 py-3 text-center bg-slate-50 rounded-lg">
                  Student is not currently enrolled in any courses.
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedStudent.enrollments.map((en: any) => (
                    <div key={en.enrollment_id} className="p-3 rounded-lg border border-slate-200 bg-white space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{en.course_name}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          en.enrollment_status === 'Completed' ? 'bg-emerald-50 text-emerald-700' :
                          en.enrollment_status === 'Dropped' ? 'bg-rose-50 text-rose-700' : 'bg-blue-50 text-blue-700'
                        }`}>
                          {en.enrollment_status}
                        </span>
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        Instructor: <span className="text-slate-700 font-medium">{en.instructor_name}</span> • Enrolled: {en.enrollment_date}
                      </div>

                      {en.total_mark !== null && en.total_mark !== undefined ? (
                        <div className="pt-2 border-t border-slate-100 grid grid-cols-5 gap-2 text-center text-[11px]">
                          <div className="bg-slate-50 p-1 rounded">
                            <span className="text-slate-400 block text-[9px]">ASSIGN</span>
                            <span className="font-semibold">{en.assignment_mark}%</span>
                          </div>
                          <div className="bg-slate-50 p-1 rounded">
                            <span className="text-slate-400 block text-[9px]">QUIZ</span>
                            <span className="font-semibold">{en.quiz_mark}%</span>
                          </div>
                          <div className="bg-slate-50 p-1 rounded">
                            <span className="text-slate-400 block text-[9px]">EXAM</span>
                            <span className="font-semibold">{en.final_exam_mark}%</span>
                          </div>
                          <div className="bg-indigo-50 text-indigo-900 p-1 rounded">
                            <span className="text-indigo-500 block text-[9px]">TOTAL</span>
                            <span className="font-bold">{en.total_mark}%</span>
                          </div>
                          <div className="bg-slate-900 text-white p-1 rounded">
                            <span className="text-slate-400 block text-[9px]">GRADE</span>
                            <span className="font-extrabold">{en.grade_letter}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[11px] text-amber-700 italic bg-amber-50/50 p-1 rounded">
                          Marks pending submission by course instructor.
                        </p>
                      )}
                      {en.feedback && (
                        <p className="text-[11px] text-slate-600 italic bg-slate-50 p-2 rounded">
                          "{en.feedback}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedStudent(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-semibold hover:bg-slate-700 cursor-pointer"
              >
                Close Transcript
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
