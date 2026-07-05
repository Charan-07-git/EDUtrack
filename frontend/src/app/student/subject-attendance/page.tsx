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
          return (
            <div
              key={c.id}
              className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-md border border-slate-100 dark:border-slate-700"
              style={{ animation: `fadeUp 0.4s ease-out ${i * 0.08}s both` }}
            >
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
              <div className="flex justify-between mt-1.5">
                <span className="text-[10px] text-slate-400">{pct}%</span>
                <span className="text-[10px] text-slate-400">{isGood ? 'Above 75%' : 'Below 75%'}</span>
              </div>
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
