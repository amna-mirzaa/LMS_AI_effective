import React, { useState } from 'react';
import {
  Terminal,
  Play,
  Sparkles,
  Download,
  RotateCcw,
  Clock,
  CheckCircle,
  AlertCircle,
  BookOpen,
  Send
} from 'lucide-react';
import { exportToCsv } from '../utils/exportCsv';

export const SqlStudioView: React.FC = () => {
  const [query, setQuery] = useState<string>(
    `SELECT 
  c.course_name,
  i.name AS instructor_name,
  COUNT(e.id) AS total_enrolled,
  ROUND(AVG(g.total_mark), 1) AS average_student_mark,
  SUM(c.fee) AS gross_revenue
FROM courses c
JOIN instructors i ON c.instructor_id = i.id
LEFT JOIN enrollments e ON c.id = e.course_id
LEFT JOIN grades g ON e.id = g.enrollment_id
GROUP BY c.id
ORDER BY total_enrolled DESC;`
  );

  const [results, setResults] = useState<any[] | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [executionTimeMs, setExecutionTimeMs] = useState<number | null>(null);

  // AI Text-to-SQL state
  const [nlPrompt, setNlPrompt] = useState<string>('');
  const [generatingSql, setGeneratingSql] = useState<boolean>(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);

  const presetQueries = [
    {
      label: 'Course Revenue & Avg Marks',
      sql: `SELECT 
  c.course_name,
  i.name AS instructor_name,
  COUNT(e.id) AS total_enrolled,
  ROUND(AVG(g.total_mark), 1) AS average_student_mark,
  SUM(c.fee) AS gross_revenue
FROM courses c
JOIN instructors i ON c.instructor_id = i.id
LEFT JOIN enrollments e ON c.id = e.course_id
LEFT JOIN grades g ON e.id = g.enrollment_id
GROUP BY c.id
ORDER BY total_enrolled DESC;`,
    },
    {
      label: 'Student Grade Performance Matrix',
      sql: `SELECT 
  s.name AS student_name,
  c.course_name,
  g.assignment_mark,
  g.quiz_mark,
  g.final_exam_mark,
  g.total_mark,
  g.grade_letter
FROM students s
JOIN enrollments e ON s.id = e.student_id
JOIN courses c ON e.course_id = c.id
JOIN grades g ON e.id = g.enrollment_id
ORDER BY g.total_mark DESC;`,
    },
    {
      label: 'Faculty Department Workload',
      sql: `SELECT 
  i.name AS instructor_name,
  i.specialization,
  COUNT(DISTINCT c.id) AS courses_assigned,
  COUNT(e.id) AS students_mentored
FROM instructors i
LEFT JOIN courses c ON i.id = c.instructor_id
LEFT JOIN enrollments e ON c.id = e.course_id
GROUP BY i.id
ORDER BY students_mentored DESC;`,
    },
    {
      label: 'Students at Risk (< 65% Marks)',
      sql: `SELECT 
  s.name AS student_name,
  s.email,
  c.course_name,
  g.total_mark,
  g.grade_letter,
  g.feedback
FROM students s
JOIN enrollments e ON s.id = e.student_id
JOIN courses c ON e.course_id = c.id
JOIN grades g ON e.id = g.enrollment_id
WHERE g.total_mark < 65
ORDER BY g.total_mark ASC;`,
    },
    {
      label: 'Foreign Key Integrity Verification',
      sql: `SELECT 
  'Enrollments missing valid Student' AS test_check,
  COUNT(*) AS violations_count
FROM enrollments e
LEFT JOIN students s ON e.student_id = s.id
WHERE s.id IS NULL
UNION ALL
SELECT 
  'Enrollments missing valid Course',
  COUNT(*)
FROM enrollments e
LEFT JOIN courses c ON e.course_id = c.id
WHERE c.id IS NULL
UNION ALL
SELECT 
  'Courses missing valid Instructor',
  COUNT(*)
FROM courses c
LEFT JOIN instructors i ON c.instructor_id = i.id
WHERE i.id IS NULL;`,
    },
  ];

  const handleExecute = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResults(null);
    const startTime = performance.now();

    try {
      const res = await fetch('/api/raw-sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      const data = await res.json();
      const endTime = performance.now();
      setExecutionTimeMs(Math.round(endTime - startTime));

      if (!res.ok) {
        throw new Error(data.error || 'SQL execution failed');
      }

      setResults(data.rows || []);
      setColumns(data.columns || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSql = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nlPrompt.trim()) return;
    setGeneratingSql(true);
    setAiExplanation(null);

    try {
      const res = await fetch('/api/ai/text-to-sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: nlPrompt }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate SQL');
      }

      setQuery(data.sql);
      setAiExplanation(data.explanation || null);
    } catch (err: any) {
      alert(`AI Error: ${err.message}`);
    } finally {
      setGeneratingSql(false);
    }
  };

  const handleExport = () => {
    if (results && results.length > 0) {
      exportToCsv('sql_query_result', results);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold text-slate-900">Database Query Studio</h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                Query Console
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Execute database queries, explore student & course records, or use natural language to generate queries
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleExport}
              disabled={!results || results.length === 0}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Results</span>
            </button>
            <button
              onClick={handleExecute}
              disabled={loading}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{loading ? 'Executing...' : 'Run Query (Ctrl+Enter)'}</span>
            </button>
          </div>
        </div>

        {/* Preset Query Chips */}
        <div className="flex flex-wrap items-center gap-1.5 mt-4 pt-4 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center">
            <BookOpen className="w-3.5 h-3.5 mr-1" />
            Presets:
          </span>
          {presetQueries.map((p, idx) => (
            <button
              key={idx}
              onClick={() => {
                setQuery(p.sql);
                setError(null);
              }}
              className="px-2.5 py-1 rounded text-[11px] font-medium bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* AI Text-to-SQL Assistant Card */}
      <div className="bg-gradient-to-r from-amber-500/10 via-indigo-500/5 to-purple-500/10 p-4 rounded-xl border border-amber-200/60 shadow-2xs">
        <form onSubmit={handleGenerateSql} className="flex flex-col sm:flex-row items-center gap-2">
          <div className="flex items-center space-x-2 text-amber-900 font-bold text-xs shrink-0">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Natural Language to SQL:</span>
          </div>
          <input
            type="text"
            value={nlPrompt}
            onChange={(e) => setNlPrompt(e.target.value)}
            placeholder='e.g. "Find instructors teaching more than 2 courses with student enrollments"'
            className="flex-1 w-full bg-white text-xs border border-amber-300/80 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          />
          <button
            type="submit"
            disabled={generatingSql || !nlPrompt.trim()}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 shrink-0"
          >
            <span>{generatingSql ? 'Translating...' : 'Generate Query'}</span>
            <Send className="w-3 h-3" />
          </button>
        </form>
        {aiExplanation && (
          <p className="text-[11px] text-amber-800 mt-2 bg-white/70 p-2 rounded border border-amber-200">
            <span className="font-semibold">AI Explains:</span> {aiExplanation}
          </p>
        )}
      </div>

      {/* SQL Code Editor & Stats */}
      <div className="bg-slate-950 rounded-xl border border-slate-800 shadow-md overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs">
          <div className="flex items-center space-x-2">
            <Terminal className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-mono font-bold text-slate-300">query.sql</span>
          </div>
          <div className="flex items-center space-x-3 text-[11px] text-slate-400">
            {executionTimeMs !== null && (
              <span className="flex items-center space-x-1 text-emerald-400 font-mono">
                <Clock className="w-3 h-3" />
                <span>{executionTimeMs} ms</span>
              </span>
            )}
            <button
              onClick={() => setQuery('')}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              Clear Editor
            </button>
          </div>
        </div>

        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              e.preventDefault();
              handleExecute();
            }
          }}
          rows={7}
          className="w-full p-4 bg-slate-950 text-indigo-200 font-mono text-xs focus:outline-none leading-relaxed resize-y selection:bg-indigo-700 selection:text-white"
          placeholder="SELECT * FROM students;"
        />
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-600" />
          <div className="space-y-1">
            <div className="font-bold">SQL Execution Error</div>
            <div className="font-mono text-[11px]">{error}</div>
          </div>
        </div>
      )}

      {/* Results View */}
      {results && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-800">Query Results</span>
              <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-mono text-[11px] font-semibold">
                {results.length} {results.length === 1 ? 'row' : 'rows'} returned
              </span>
            </div>
          </div>

          {results.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Statement executed successfully. No rows returned (empty result set).
            </div>
          ) : (
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-100 z-10">
                  <tr className="border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                    {columns.map((c) => (
                      <th key={c} className="py-2.5 px-4 whitespace-nowrap">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800 font-mono text-[11px]">
                  {results.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      {columns.map((c) => {
                        const val = row[c];
                        return (
                          <td key={c} className="py-2.5 px-4 whitespace-nowrap">
                            {val === null || val === undefined ? (
                              <span className="text-slate-400 italic">NULL</span>
                            ) : (
                              String(val)
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
