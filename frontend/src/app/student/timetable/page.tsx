'use client';

import Shell from '@/components/Shell';
import BackButton from '@/components/BackButton';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';

const DAY_ORDER = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

export default function Page() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [semester, setSemester] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const sem = user?.semester || Number(localStorage.getItem("edutrack_semester"));
    if (sem) setSemester(sem);
  }, [user]);

  useEffect(() => {
    if (!semester) return;
    api(`/api/timetable/master?semester=${semester}`).then((d) => {
      setData(d);
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, [semester]);

  return (
    <Shell role="student" title="Timetable">
      <BackButton href="/student/dashboard" label="Back to Dashboard" />
      {!loaded ? (
        <div className="card text-center py-16">
          <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
          <p className="mt-4 text-muted">Loading timetable...</p>
        </div>
      ) : !data ? (
        <div className="card text-center py-16">
          <span className="text-5xl mb-4 block">📅</span>
          <p className="text-lg font-semibold">No timetable available for semester {semester}</p>
        </div>
      ) : (
        <div className="space-y-6 max-w-5xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Semester {semester} Timetable
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Academic Year {data.academicYear || 'N/A'} • Room: {data.room || 'N/A'}
              </p>
            </div>
            <span className="text-sm text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">{data.class}</span>
          </div>

          <div className="max-w-5xl mx-auto space-y-3">
            {DAY_ORDER.filter((day) => data.timetable?.[day]).map((day) => {
              const slots = data.timetable[day];
              return (
                <div key={day} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2.5">
                    <h3 className="font-bold text-white text-sm">{day}</h3>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-700">
                    {slots.map((slot: any, i: number) => (
                      <div key={i} className="px-4 py-3 flex items-start gap-4">
                        <div className="shrink-0 w-24 text-xs font-semibold text-slate-500 dark:text-slate-400 pt-0.5">
                          {slot.start} – {slot.end}
                        </div>
                        {slot.labs ? (
                          <div className="flex-1 space-y-1.5">
                            {slot.labs.map((lab: any, j: number) => (
                              <div key={j} className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{lab.subject}</p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">{lab.faculty}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-[11px] font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded-full">Lab</span>
                                  <span className="text-xs text-slate-400">{lab.room}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex-1 flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">{slot.subject}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{slot.faculty}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                                slot.type === 'Lab'
                                  ? 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30'
                                  : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30'
                              }`}>{slot.type || 'Theory'}</span>
                              <span className="text-xs text-slate-400">{slot.room}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Shell>
  );
}
