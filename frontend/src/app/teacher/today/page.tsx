'use client';
import Shell from '@/components/Shell';
import BackButton from '@/components/BackButton';
import { api } from '@/lib/api';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Page() {
  const [classes, setClasses] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api('/api/classes/today').then((d) => {
      setClasses(d);
      setLoaded(true);
    });
  }, []);

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

      {!loaded ? (
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
