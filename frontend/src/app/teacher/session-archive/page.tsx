'use client';
import Shell from '@/components/Shell';
import BackButton from '@/components/BackButton';
import { api } from '@/lib/api';
import { useEffect, useState } from 'react';

export default function Page() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api('/api/teacher/session-archive').then((d) => {
      setSessions(d);
      setLoaded(true);
    });
  }, []);

  return (
    <Shell role="teacher" title="Session Archive">
      <BackButton href="/teacher/dashboard" label="Back to Dashboard" />

      <div className="mt-6 max-w-4xl">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 rounded-2xl p-6 shadow-xl text-white mb-6" style={{ animation: 'fadeDown 0.5s ease-out' }}>
          <h2 className="text-2xl font-bold">Past Sessions</h2>
          <p className="text-slate-300 text-sm mt-1">{sessions.length} completed sessions</p>
        </div>

        <div className="space-y-3">
          {sessions.map((s, i) => (
            <div
              key={s.id}
              className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-lg dark:hover:shadow-slate-900 transition-all duration-300"
              style={{ animation: `slideIn 0.4s ease-out ${i * 80}ms both` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-white font-bold text-sm shadow-md">
                    {s.class?.code?.slice(0, 2).toUpperCase() || 'SE'}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{s.class?.subject || 'Unknown'}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{s.class?.code} • {s.attendanceCount || 0} students attended</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{s.startTime ? new Date(s.startTime).toLocaleDateString() : '—'}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {s.startTime ? new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    {' — '}
                    {s.endTime ? new Date(s.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {sessions.length === 0 && loaded && (
            <div className="card text-center py-16">
              <span className="text-5xl mb-4 block">📁</span>
              <p className="text-lg font-semibold text-slate-300">No completed sessions yet</p>
              <p className="text-slate-500 dark:text-slate-400 mt-2">Completed sessions will appear here</p>
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
      `}</style>
    </Shell>
  );
}
