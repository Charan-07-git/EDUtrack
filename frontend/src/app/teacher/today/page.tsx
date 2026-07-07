'use client';
import Shell from '@/components/Shell';
import BackButton from '@/components/BackButton';
import { api } from '@/lib/api';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function Page() {
  const { refreshUser } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [semesters, setSemesters] = useState<{ department: string; semester: number }[]>([]);
  const [selectedSem, setSelectedSem] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    refreshUser();
    api('/api/teacher/my-subjects').then((subjects: any[]) => {
      const sems = Array.from(new Set(subjects.map((s: any) => s.semester))).sort((a: number, b: number) => a - b);
      const deptList = sems.map((sem: number) => ({ department: 'Computer Science', semester: sem }));
      setSemesters(deptList);
      const saved = localStorage.getItem('edutrack_teacher_semester');
      if (saved && sems.includes(Number(saved))) {
        setSelectedSem(Number(saved));
      } else if (sems.length > 0) {
        setSelectedSem(sems[0]);
      }
    });
  }, []);

  useEffect(() => {
    if (selectedSem) {
      setLoaded(false);
      localStorage.setItem('edutrack_teacher_semester', String(selectedSem));
      api(`/api/classes/today?semester=${selectedSem}`).then((d) => {
        setClasses(d);
        setLoaded(true);
      });
    }
  }, [selectedSem]);

  async function saveSemesterToServer(sem: number) {
    setSaving(true);
    try {
      await api('/api/me', {
        method: 'PUT',
        body: JSON.stringify({ semester: sem }),
      });
    } catch {}
    setSaving(false);
  }

  function handleSemesterChange(sem: number) {
    setSelectedSem(sem);
    saveSemesterToServer(sem);
  }

  const uniqueSems = Array.from(new Set(semesters.map((s) => s.semester))).sort((a, b) => a - b);

  return (
    <Shell role="teacher" title="Today's Classes">
      <BackButton href="/teacher/dashboard" label="Back to Dashboard" />

      <div className="mt-6 mb-8">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-5">Session Flow</h3>
        <div className="flex items-center gap-3 overflow-x-auto pb-2">
          {['📅 View Schedule', '▶️ Start Session', '📱 Generate QR', '✅ Students Scan', '🏁 End Session'].map((step, i) => (
            <div key={i} className="flex items-center gap-2" style={{ animation: `fadeUp 0.5s ease-out ${i * 150}ms both` }}>
              <div className="flex items-center gap-2 bg-white dark:bg-slate-800 shadow-md shadow-slate-200/60 dark:shadow-none text-slate-600 dark:text-slate-300 px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-700 min-w-max text-sm font-medium">
                <span className="text-lg">{step.split(' ')[0]}</span>
                <span>{step.split(' ').slice(1).join(' ')}</span>
              </div>
              {i < 4 && (
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Semester Selector */}
      <div className="card mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-slate-500 dark:text-slate-400">Semester</label>
            <div className="relative">
              <select
                value={selectedSem ?? ''}
                onChange={(e) => handleSemesterChange(Number(e.target.value))}
                className="appearance-none bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 pr-10 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 cursor-pointer"
              >
                <option value="" disabled>Select semester</option>
                {uniqueSems.map((sem) => (
                  <option key={sem} value={sem}>Semester {sem}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            {saving && <span className="text-xs text-slate-400">Saving...</span>}
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-500">
            Today • {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </div>
        </div>
      </div>

      {!selectedSem ? (
        <div className="card text-center py-16">
          <span className="text-5xl mb-4 block">👆</span>
          <p className="text-lg font-semibold text-slate-300">Select a semester above</p>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Choose which semester's classes to view today</p>
        </div>
      ) : !loaded ? (
        <div className="card text-center py-16">
          <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-muted">Loading today's classes...</p>
        </div>
      ) : classes.length === 0 ? (
        <div className="card text-center py-16">
          <span className="text-5xl mb-4 block">📭</span>
          <p className="text-lg font-semibold text-slate-300">No classes scheduled today</p>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Check back later or update your timetable</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {classes.map((c, i) => (
            <Link
              key={c.id}
              href={`/teacher/session/${c.id}`}
              className="group bg-white dark:bg-slate-800 shadow-md shadow-slate-200/60 dark:shadow-none hover:shadow-lg hover:shadow-blue-500/10 dark:hover:shadow-blue-500/5 transition-all duration-300 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-600 p-5"
              style={{ animation: `slideIn 0.4s ease-out ${i * 100}ms both` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-md group-hover:scale-105 transition-transform">
                    {c.code?.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors">{c.subject}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{c.code} • Room {c.timetable?.[0]?.room}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-base font-bold text-slate-800 dark:text-white">{c.timetable?.[0]?.startTime}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{c.timetable?.[0]?.endTime}</p>
                  </div>
                  <svg className="w-5 h-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </Shell>
  );
}
