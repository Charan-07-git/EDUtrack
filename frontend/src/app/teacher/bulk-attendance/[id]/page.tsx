'use client';
import Shell from '@/components/Shell';
import BackButton from '@/components/BackButton';
import { api } from '@/lib/api';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function Page() {
  const { id } = useParams();

  // Full list of students with their attendance status (isPresent toggled locally)
  const [students, setStudents] = useState<any[]>([]);
  // True while the save request is in progress
  const [loading, setLoading] = useState(false);
  // Whether the student list has been loaded from the server
  const [fetched, setFetched] = useState(false);

  // Fetch the current student list from the API on mount
  useEffect(() => {
    api(`/api/sessions/${id}/students`).then((d) => { setStudents(d); setFetched(true); }).catch(() => setFetched(true));
  }, [id]);

  // Toggle a single student's isPresent flag by ID
  function toggleStudent(studentId: string) {
    setStudents(students.map((s) => s.id === studentId ? { ...s, isPresent: !s.isPresent } : s));
  }

  // Mark all students as present
  function selectAll() {
    setStudents(students.map((s) => ({ ...s, isPresent: true })));
  }

  // Mark all students as absent
  function deselectAll() {
    setStudents(students.map((s) => ({ ...s, isPresent: false })));
  }

  // Save the current selection to the server via a POST request
  async function saveAttendance() {
    setLoading(true);
    const presentIds = students.filter((s) => s.isPresent).map((s) => s.id);
    await api(`/api/sessions/${id}/bulk-attendance`, {
      method: 'POST',
      body: JSON.stringify({ studentIds: presentIds }),
    });
    setLoading(false);
  }

  // Count how many students are currently toggled as present
  const presentCount = students.filter((s) => s.isPresent).length;

  return (
    <Shell role="teacher" title="Bulk Attendance Correction">
      <BackButton href="/teacher/session-archive" label="Back to Session Archive" />

      <div className="mt-6 max-w-3xl space-y-6">
        <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-100">
          {/* Header: title, present/total count, Select All / Deselect All buttons */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Mark Attendance</h3>
              <p className="text-sm text-slate-500">{presentCount} / {students.length} students present</p>
            </div>
            <div className="flex gap-2">
              <button onClick={selectAll} className="text-sm px-3 py-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-xl font-medium hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all">Select All</button>
              <button onClick={deselectAll} className="text-sm px-3 py-2 bg-slate-50 dark:bg-slate-900 text-slate-300 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">Deselect All</button>
            </div>
          </div>

          {/* Student list with checkboxes */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {!fetched ? (
              // Spinner while loading
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                <p className="mt-3 text-sm text-slate-400">Loading students...</p>
              </div>
            ) : students.length === 0 ? (
              // Empty state
              <div className="text-center py-8">
                <span className="text-4xl block mb-3">👥</span>
                <p className="text-slate-500 font-medium">No students found</p>
                <p className="text-xs text-slate-400 mt-1">No students are enrolled in this class</p>
              </div>
            ) : (
              // Render each student as a clickable row with a checkbox
              students.map((s) => (
                <button
                  key={s.id}
                  onClick={() => toggleStudent(s.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all duration-200 ${
                    s.isPresent
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Custom checkbox visual */}
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                      s.isPresent ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'
                    }`}>
                      {s.isPresent && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{s.name}</span>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Save button — disabled while the save request is in flight */}
          <button
            onClick={saveAttendance}
            disabled={loading}
            className="mt-6 w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all disabled:opacity-50"
          >
            Save Attendance ({presentCount} marked)
          </button>
        </div>
      </div>
    </Shell>
  );
}
