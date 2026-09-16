import React, { useState, useEffect } from 'react';
import {
  FileBarChart,
  Download,
  Terminal,
  Clock,
  Layers,
  CheckCircle2,
  AlertCircle,
  Filter,
  ArrowRight,
  Code2
} from 'lucide-react';
import { Course } from '../types';
import { exportToCsv } from '../utils/exportCsv';

interface ReportsViewProps {
  courses: Course[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({ courses }) => {
  const [selectedReport, setSelectedReport] = useState<string>('BR-01');
  const [reportResult, setReportResult] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [showSql, setShowSql] = useState<boolean>(false);

  const reportPills = [
    {
      id: 'BR-01',
      reportNum: 'Report 1',
      title: 'Course Enrollment Popularity',
      subtitle: 'Which courses have the highest number of enrolled students?',
      concept: 'Multi-table join with group aggregation and descending sort',
    },
    {
      id: 'BR-02',
      reportNum: 'Report 2',
      title: 'Faculty Teaching Workload',
      subtitle: 'How many courses is each faculty instructor currently leading?',
      concept: 'Faculty workload distribution across curriculum catalog',
    },
    {
      id: 'BR-03',
      reportNum: 'Report 3',
      title: 'Top Performing Student Honors',
      subtitle: 'Which students hold the highest academic evaluation marks?',
      concept: 'Ranked academic evaluation totals and letter grade honors',
    },
    {
      id: 'BR-04',
      reportNum: 'Report 4',
      title: 'Student Census & Status Breakdown',
      subtitle: 'Distribution of active, inactive, and suspended scholars across the institution',
      concept: 'Institutional student census and demographic breakdown',
    },
    {
      id: 'BR-05',
      reportNum: 'Report 5',
      title: 'Enrollment Lifecycle Pipeline',
      subtitle: 'How many course enrollments are actively in progress, completed, or dropped?',
      concept: 'Enrollment lifecycle completion and retention metrics',
    },
    {
      id: 'BR-06',
      reportNum: 'Report 6',
      title: 'Unenrolled / Dormant Courses',
      subtitle: 'Which courses currently have zero student registrations?',
      concept: 'Curriculum catalog courses with zero active enrollments',
    },
  ];

  const currentPill = reportPills.find((r) => r.id === selectedReport) || reportPills[0];

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/${selectedReport}`);
      const result = await res.json();
      if (res.ok) {
        setReportResult(result);
      } else {
        setReportResult(null);
      }
    } catch (err) {
      console.error(err);
      setReportResult(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [selectedReport]);

  const handleExportCsv = () => {
    if (reportResult && reportResult.data) {
      exportToCsv(`report_${selectedReport.toLowerCase()}`, reportResult.data);
    }
  };

  const data = reportResult?.data || [];
  const columns: string[] = reportResult?.columns || (data.length > 0 ? Object.keys(data[0]) : []);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold text-slate-900">Institutional Analytics & Reports</h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                6 Standard Reports
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive operational reporting across course demand, faculty workloads, student honors, and completion rates
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSql(!showSql)}
              className={`inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                showSql
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Code2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>{showSql ? 'Hide SQL' : 'View SQL Query'}</span>
            </button>
            <button
              onClick={handleExportCsv}
              disabled={data.length === 0}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Report Selector Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mt-4 pt-4 border-t border-slate-100">
          {reportPills.map((rep) => {
            const isSelected = selectedReport === rep.id;
            return (
              <button
                key={rep.id}
                onClick={() => setSelectedReport(rep.id)}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-50/80 border-indigo-400 ring-1 ring-indigo-400/50 text-indigo-900'
                    : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="text-[11px] font-bold text-indigo-600">{rep.reportNum}</div>
                <div className="text-xs font-bold truncate mt-0.5">{rep.title}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Report Header & Description */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                {currentPill.reportNum}
              </span>
              <h2 className="text-sm font-bold text-slate-900">
                {reportResult?.title || currentPill.title}
              </h2>
            </div>
            <p className="text-xs text-slate-600 mt-1 font-medium">
              Objective: &ldquo;{reportResult?.question || currentPill.subtitle}&rdquo;
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200 font-medium">
              {data.length} {data.length === 1 ? 'Record Found' : 'Records Found'}
            </span>
          </div>
        </div>

        {/* Collapsible SQL Query Box */}
        {showSql && (
          <div className="p-3 bg-slate-950 text-slate-200 rounded-lg border border-slate-800 text-xs font-mono overflow-x-auto relative">
            <div className="flex items-center justify-between text-[10px] text-slate-400 pb-2 mb-2 border-b border-slate-800">
              <span className="font-semibold text-indigo-400">SQL QUERY DEFINITION</span>
              <span className="text-emerald-400">
                Execution time: {reportResult?.executionTimeMs || 1.2} ms • Rows: {data.length}
              </span>
            </div>
            <pre className="text-[11px] leading-relaxed text-indigo-200">
              {reportResult?.sql || 'SELECT ...'}
            </pre>
          </div>
        )}
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-3 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-700">Query ResultSet</span>
          <span className="font-mono text-[11px] text-slate-500">
            {data.length} {data.length === 1 ? 'row' : 'rows'} returned
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center space-y-2">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-slate-500">Running relational query on database...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No rows returned for this report query.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  {columns.map((col) => (
                    <th key={col} className="py-2.5 px-4 whitespace-nowrap">
                      {col.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {data.map((row: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                    {columns.map((col) => {
                      const val = row[col];
                      const isGrade = col === 'grade_letter';
                      const isTotal = col === 'total_mark';

                      return (
                        <td key={col} className="py-2.5 px-4 whitespace-nowrap">
                          {isGrade ? (
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-extrabold ${
                                val === 'A'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : val === 'B'
                                  ? 'bg-blue-100 text-blue-800'
                                  : val === 'C'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {val}
                            </span>
                          ) : isTotal ? (
                            <span className="font-mono font-bold text-slate-900">{val}%</span>
                          ) : val === null || val === undefined ? (
                            <span className="text-slate-400 italic">null</span>
                          ) : typeof val === 'number' ? (
                            <span className="font-mono text-slate-700">
                              {col.includes('fee') || col.includes('revenue')
                                ? `$${val.toLocaleString()}`
                                : col.includes('percentage')
                                ? `${val}%`
                                : val}
                            </span>
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
    </div>
  );
};
