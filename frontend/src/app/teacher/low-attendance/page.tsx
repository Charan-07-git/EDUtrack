'use client';
import Shell from '@/components/Shell';
import BackButton from '@/components/BackButton';
import { api } from '@/lib/api';
import { useEffect, useState } from 'react';

export default function Page() {
  const [rows, setRows] = useState<any[]>([]);
  const [sem, setSem] = useState('all');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api('/api/low-attendance').then((d) => {
      setRows(d);
      setLoaded(true);
    });
  }, []);

  const r = rows.filter((x) => sem === 'all' || String(x.semester) === sem);

  return (
    <Shell role="teacher" title="<75% Attendance">
      <BackButton href="/teacher/dashboard" label="Back to Dashboard" />

      <div className="mt-6 max-w-4xl">
        <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl p-6 shadow-lg shadow-red-500/20 mb-6 text-white" style={{ animation: 'fadeDown 0.5s ease-out' }}>
          <h2 className="text-2xl font-bold">⚠️ Low Attendance Alert</h2>
          <p className="text-red-100 text-sm mt-1">Students below 75% attendance threshold</p>
          <div className="flex items-center gap-3 mt-4">
            <div className="bg-white/20 rounded-xl px-4 py-2 backdrop-blur-sm">
              <p className="text-xs text-red-100 uppercase tracking-wide">Total Students</p>
              <p className="text-2xl font-extrabold">{rows.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-md border border-slate-100 dark:border-slate-700" style={{ animation: 'fadeUp 0.5s ease-out 0.2s both' }}>
          <select
            className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white mb-6"
            onChange={(e) => setSem(e.target.value)}
          >
            <option value="all">All Semesters</option>
            <option value="5">Semester 5</option>
          </select>

          {!loaded ? (
            <div className="text-center py-16">
              <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-4 text-muted">Loading attendance data...</p>
            </div>
          ) : r.length === 0 ? (
            <div className="text-center py-16">
              <span className="text-5xl mb-4 block">✅</span>
              <p className="text-lg font-semibold text-slate-300">All students are above 75%</p>
            </div>
          ) : (
          <div className="space-y-3">
            {r.map((x, i) => (
              <div
                key={x.name}
                className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-all duration-200"
                style={{ animation: `slideIn 0.4s ease-out ${i * 100}ms both` }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                    {x.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{x.name}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{x.subject} • Semester {x.semester}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xl font-extrabold text-red-600">{x.percent}%</span>
                  <p className="text-xs text-red-400 mt-0.5">{75 - x.percent}% below threshold</p>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </Shell>
  );
}
