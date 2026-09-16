import React, { useState } from 'react';
import {
  Network,
  Key,
  Link as LinkIcon,
  ShieldCheck,
  Download,
  Copy,
  Check,
  Database,
  ArrowRight
} from 'lucide-react';

interface SchemaErdViewProps {
  onDownloadSql: () => void;
}

export const SchemaErdView: React.FC<SchemaErdViewProps> = ({ onDownloadSql }) => {
  const [copied, setCopied] = useState(false);

  const schemaTables = [
    {
      name: 'students',
      label: 'Students Entity',
      description: 'Master record of enrolled institutional scholars',
      type: 'Core Dimension',
      columns: [
        { name: 'id', type: 'INTEGER', constraint: 'PRIMARY KEY AUTOINCREMENT', key: 'PK' },
        { name: 'name', type: 'VARCHAR(100)', constraint: 'NOT NULL' },
        { name: 'email', type: 'VARCHAR(150)', constraint: 'NOT NULL UNIQUE' },
        { name: 'phone', type: 'VARCHAR(25)', constraint: 'NOT NULL' },
        { name: 'enrollment_date', type: 'DATE', constraint: 'NOT NULL' },
        { name: 'status', type: 'TEXT', constraint: "CHECK IN ('Active', 'Inactive', 'Suspended')" },
      ],
      relationships: [
        '1:N with enrollments (One student enrolls in many courses)',
      ],
    },
    {
      name: 'instructors',
      label: 'Instructors Entity',
      description: 'Faculty professors and curriculum instructors',
      type: 'Core Dimension',
      columns: [
        { name: 'id', type: 'INTEGER', constraint: 'PRIMARY KEY AUTOINCREMENT', key: 'PK' },
        { name: 'name', type: 'VARCHAR(100)', constraint: 'NOT NULL' },
        { name: 'email', type: 'VARCHAR(150)', constraint: 'NOT NULL UNIQUE' },
        { name: 'specialization', type: 'VARCHAR(100)', constraint: 'NOT NULL' },
        { name: 'status', type: 'TEXT', constraint: "CHECK IN ('Active', 'On Leave', 'Inactive')" },
      ],
      relationships: [
        '1:N with courses (One instructor leads multiple academic courses)',
      ],
    },
    {
      name: 'courses',
      label: 'Courses Entity',
      description: 'Academic curriculum courses with faculty assignment',
      type: 'Master Catalog',
      columns: [
        { name: 'id', type: 'INTEGER', constraint: 'PRIMARY KEY AUTOINCREMENT', key: 'PK' },
        { name: 'course_name', type: 'VARCHAR(120)', constraint: 'NOT NULL' },
        { name: 'description', type: 'TEXT', constraint: '' },
        { name: 'instructor_id', type: 'INTEGER', constraint: 'REFERENCES instructors(id) ON DELETE RESTRICT', key: 'FK' },
        { name: 'duration_weeks', type: 'INTEGER', constraint: 'NOT NULL DEFAULT 12' },
        { name: 'fee', type: 'DECIMAL(10,2)', constraint: 'NOT NULL DEFAULT 0.00' },
        { name: 'status', type: 'TEXT', constraint: "CHECK IN ('Active', 'Archived', 'Upcoming')" },
      ],
      relationships: [
        'N:1 with instructors (Belongs to one faculty lead)',
        '1:N with enrollments (Many students enroll)',
      ],
    },
    {
      name: 'enrollments',
      label: 'Enrollments Junction Entity',
      description: 'Resolves Many-to-Many relationship between Students & Courses',
      type: 'Junction / Association',
      columns: [
        { name: 'id', type: 'INTEGER', constraint: 'PRIMARY KEY AUTOINCREMENT', key: 'PK' },
        { name: 'student_id', type: 'INTEGER', constraint: 'REFERENCES students(id) ON DELETE CASCADE', key: 'FK' },
        { name: 'course_id', type: 'INTEGER', constraint: 'REFERENCES courses(id) ON DELETE RESTRICT', key: 'FK' },
        { name: 'enrollment_date', type: 'DATE', constraint: 'NOT NULL' },
        { name: 'status', type: 'TEXT', constraint: "CHECK IN ('Enrolled', 'Completed', 'Dropped')" },
        { name: 'composite_constraint', type: 'CONSTRAINT', constraint: 'UNIQUE (student_id, course_id)', key: 'UQ' },
      ],
      relationships: [
        'N:1 with students (Foreign Key: student_id)',
        'N:1 with courses (Foreign Key: course_id)',
        '1:1 with grades (Foreign Key: enrollment_id)',
      ],
    },
    {
      name: 'grades',
      label: 'Grades Entity',
      description: 'Assessment scoring: assignment, quiz, exam, weighted total, letter',
      type: 'Fact / Evaluation',
      columns: [
        { name: 'id', type: 'INTEGER', constraint: 'PRIMARY KEY AUTOINCREMENT', key: 'PK' },
        { name: 'enrollment_id', type: 'INTEGER', constraint: 'REFERENCES enrollments(id) ON DELETE CASCADE UNIQUE', key: 'FK' },
        { name: 'assignment_mark', type: 'DECIMAL(5,2)', constraint: 'CHECK (0 <= 100)' },
        { name: 'quiz_mark', type: 'DECIMAL(5,2)', constraint: 'CHECK (0 <= 100)' },
        { name: 'final_exam_mark', type: 'DECIMAL(5,2)', constraint: 'CHECK (0 <= 100)' },
        { name: 'total_mark', type: 'DECIMAL(5,2)', constraint: 'GENERATED / COMPUTED (0 <= 100)' },
        { name: 'grade_letter', type: 'CHAR(2)', constraint: "CHECK IN ('A', 'B', 'C', 'D', 'F')" },
        { name: 'feedback', type: 'TEXT', constraint: '' },
      ],
      relationships: [
        '1:1 with enrollments (Evaluates single enrollment record)',
      ],
    },
  ];

  const fullDdl = `-- ============================================================================
-- INSTITUTIONAL LEARNING MANAGEMENT SYSTEM (LMS)
-- RELATIONAL DATABASE DDL & SCHEMA DEFINITION
-- ============================================================================

PRAGMA foreign_keys = ON;

-- 1. STUDENTS TABLE
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  phone VARCHAR(25) NOT NULL,
  enrollment_date DATE NOT NULL,
  status TEXT CHECK(status IN ('Active', 'Inactive', 'Suspended')) NOT NULL DEFAULT 'Active'
);

-- 2. INSTRUCTORS TABLE
CREATE TABLE IF NOT EXISTS instructors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  specialization VARCHAR(100) NOT NULL,
  status TEXT CHECK(status IN ('Active', 'On Leave', 'Inactive')) NOT NULL DEFAULT 'Active'
);

-- 3. COURSES TABLE
CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_name VARCHAR(120) NOT NULL,
  description TEXT,
  instructor_id INTEGER NOT NULL,
  duration_weeks INTEGER NOT NULL DEFAULT 12,
  fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status TEXT CHECK(status IN ('Active', 'Archived', 'Upcoming')) NOT NULL DEFAULT 'Active',
  FOREIGN KEY (instructor_id) REFERENCES instructors(id) ON DELETE RESTRICT
);

-- 4. ENROLLMENTS JUNCTION TABLE (Resolves M:N Student-Course Relationship)
CREATE TABLE IF NOT EXISTS enrollments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  enrollment_date DATE NOT NULL,
  status TEXT CHECK(status IN ('Enrolled', 'Completed', 'Dropped')) NOT NULL DEFAULT 'Enrolled',
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE RESTRICT,
  UNIQUE(student_id, course_id)
);

-- 5. GRADES TABLE (1:1 with Enrollment)
CREATE TABLE IF NOT EXISTS grades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  enrollment_id INTEGER NOT NULL UNIQUE,
  assignment_mark DECIMAL(5,2) CHECK (assignment_mark >= 0 AND assignment_mark <= 100),
  quiz_mark DECIMAL(5,2) CHECK (quiz_mark >= 0 AND quiz_mark <= 100),
  final_exam_mark DECIMAL(5,2) CHECK (final_exam_mark >= 0 AND final_exam_mark <= 100),
  total_mark DECIMAL(5,2) CHECK (total_mark >= 0 AND total_mark <= 100),
  grade_letter CHAR(2) CHECK (grade_letter IN ('A', 'B', 'C', 'D', 'F')),
  feedback TEXT,
  FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE
);

-- OPTIMIZED PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_courses_instructor ON courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_grades_enrollment ON grades(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_grades_letter ON grades(grade_letter);`;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullDdl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold text-slate-900">Database Schema & Data Architecture</h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                5 Core Entities
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Overview of data tables, attributes, relationship mappings, and data integrity safeguards
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied DDL' : 'Copy DDL'}</span>
            </button>
            <button
              onClick={onDownloadSql}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Schema (.sql)</span>
            </button>
          </div>
        </div>

        {/* Cardinality Flow Diagram */}
        <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <div className="font-bold text-slate-900 mb-2 flex items-center space-x-2">
            <Network className="w-4 h-4 text-indigo-600" />
            <span>Entity Relationships & Business Logic</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-1">
              <div className="font-bold text-slate-800 flex items-center justify-between">
                <span>Instructors ➔ Courses</span>
                <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-medium text-[11px]">1 to Many</span>
              </div>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                An instructor can lead multiple courses. Courses maintain a direct link to their designated faculty lead.
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-1">
              <div className="font-bold text-slate-800 flex items-center justify-between">
                <span>Students ⬌ Courses</span>
                <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-medium text-[11px]">Many to Many</span>
              </div>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Students enroll in multiple courses, managed via registrations with duplicate enrollment prevention.
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-1">
              <div className="font-bold text-slate-800 flex items-center justify-between">
                <span>Enrollments ➔ Grades</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium text-[11px]">1 to 1</span>
              </div>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Each completed enrollment record links to a comprehensive evaluation record with breakdown and grade tiers.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 5 Schema Entity Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {schemaTables.map((tbl) => (
          <div
            key={tbl.name}
            className="bg-white rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow flex flex-col overflow-hidden"
          >
            <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-1.5">
                  <Database className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="font-mono font-bold text-sm tracking-tight">{tbl.name}</span>
                </div>
                <span className="text-[10px] text-slate-400">{tbl.label}</span>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                {tbl.type}
              </span>
            </div>

            <div className="p-3.5 flex-1 space-y-3 text-xs">
              <p className="text-slate-500 text-[11px] leading-relaxed">{tbl.description}</p>

              <div className="space-y-1.5 border-t border-slate-100 pt-2 font-mono text-[11px]">
                {tbl.columns.map((col) => (
                  <div key={col.name} className="flex items-start justify-between py-0.5">
                    <div className="flex items-center space-x-1.5 truncate">
                      {col.key === 'PK' ? (
                        <Key className="w-3 h-3 text-amber-500 shrink-0" title="Primary Key" />
                      ) : col.key === 'FK' ? (
                        <LinkIcon className="w-3 h-3 text-indigo-500 shrink-0" title="Foreign Key" />
                      ) : col.key === 'UQ' ? (
                        <ShieldCheck className="w-3 h-3 text-emerald-500 shrink-0" title="Unique Constraint" />
                      ) : (
                        <span className="w-3 h-3 block"></span>
                      )}
                      <span className="font-semibold text-slate-900 truncate">{col.name}</span>
                    </div>
                    <span className="text-slate-500 text-[10px] ml-2 shrink-0">{col.type}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-1 text-[11px] text-slate-600">
                <span className="font-semibold text-slate-700 block">Relationships:</span>
                {tbl.relationships.map((rel, idx) => (
                  <div key={idx} className="flex items-center space-x-1 text-slate-500">
                    <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{rel}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* SQL DDL Code Viewer */}
      <div className="bg-slate-950 rounded-xl border border-slate-800 shadow-md overflow-hidden text-xs font-mono">
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800">
          <span className="font-bold text-slate-300">lms_database.sql (Executable DDL & Indexes)</span>
          <button
            onClick={handleCopy}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
          >
            {copied ? 'Copied to Clipboard!' : 'Copy Script'}
          </button>
        </div>
        <pre className="p-4 text-[11px] text-indigo-200 overflow-x-auto max-h-80 leading-relaxed">
          {fullDdl}
        </pre>
      </div>
    </div>
  );
};
