'use client';

import Shell from '@/components/Shell';
import BackButton from '@/components/BackButton';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function Page() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, { total: number; attended: number; percent: number }>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    api('/api/student/dashboard').then((data) => {
      setClasses(data.classes || []);
      const att: Record<string, any> = {};
      data.classes.forEach((c: any) => {
        const total = c.sessions.length;
        const attended = c.sessions.filter((s: any) =>
          s.attendances.some((a: any) => a.studentId === user?.id)
        ).length;
        att[c.id] = { total, attended, percent: total ? Math.round((attended / total) * 100) : 0 };
      });
      setAttendance(att);
    });
  }, [user?.id]);

  return (
    <Shell role="student" title="Subject Attendance">
      <BackButton href="/student/overview" label="Back to Overview" />
      <div className="mt-6 max-w-3xl space-y-4">
        {classes.map((c, i) => {
          const a = attendance[c.id];
          if (!a) return null;
          const pct = a.percent;
          const isGood = pct >= 75;
          const isExpanded = expandedId === c.id;
          return (
            <div
              key={c.id}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-100 dark:border-slate-700 overflow-hidden"
              style={{ animation: `fadeUp 0.4s ease-out ${i * 0.08}s both` }}
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : c.id)}
                className="w-full p-5 text-left flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all"
              >
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{c.subject}</h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{c.code}</p>
                    </div>
                    <div className={`text-right ${isGood ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                      <p className="text-2xl font-extrabold">{pct}%</p>
                      <p className="text-[11px] font-medium">{a.attended}/{a.total} attended</p>
                    </div>
                  </div>
                  <div className="relative h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out ${
                        isGood
                          ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                          : 'bg-gradient-to-r from-red-400 to-red-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <svg
                  className={`w-5 h-5 ml-3 text-slate-400 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isExpanded && (
                <div className="border-t border-slate-100 dark:border-slate-700">
                  <div className="px-5 py-3 space-y-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Session History</p>
                    {c.sessions.length === 0 ? (
                      <p className="text-sm text-slate-400 py-4 text-center">No sessions yet</p>
                    ) : (
                      [...c.sessions].reverse().map((s: any) => {
                        const wasPresent = s.attendances?.some((a: any) => a.studentId === user?.id);
                        const attRecord = s.attendances?.find((a: any) => a.studentId === user?.id);
                        return (
                          <div
                            key={s.id}
                            className={`flex items-center justify-between px-3 py-2 rounded-xl ${
                              wasPresent
                                ? 'bg-emerald-50 dark:bg-emerald-900/20'
                                : 'bg-slate-50 dark:bg-slate-800/50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${wasPresent ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                              <div>
                                <p className="text-sm font-medium text-slate-900 dark:text-white">
                                  {s.startTime ? new Date(s.startTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '—'}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {s.startTime ? new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                  {s.endTime ? ` — ${new Date(s.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {wasPresent ? (
                                <>
                                  <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">Present</span>
                                  {attRecord?.markedAt && (
                                    <span className="text-[10px] text-slate-400">
                                      {new Date(attRecord.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="text-[10px] font-medium text-slate-400">Absent</span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {classes.length === 0 && (
          <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">
            No subjects found.
          </div>
        )}
      </div>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </Shell>
  );
}