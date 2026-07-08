'use client';

import Shell from '@/components/Shell';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function Page() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, { total: number; attended: number; percent: number }>>({});
  const [attendedDates, setAttendedDates] = useState<number[]>([]);
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    api('/api/student/dashboard').then((data) => {
      setClasses(data.classes || []);
      const att: Record<string, any> = {};
      const dates: number[] = [];
      data.classes.forEach((c: any) => {
        const total = c.sessions.length;
        const attended = c.sessions.filter((s: any) =>
          s.attendances.some((a: any) => a.studentId === user?.id)
        ).length;
        att[c.id] = { total, attended, percent: total ? Math.round((attended / total) * 100) : 0 };
        c.sessions.forEach((s: any) => {
          if (s.attendances.some((a: any) => a.studentId === user?.id) && s.date) {
            const d = new Date(s.date);
            if (d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear()) {
              dates.push(d.getDate());
            }
          }
        });
      });
      setAttendance(att);
      setAttendedDates(dates);
    }).catch(() => {});
  }, [user?.id]);

  const summary = (Object.values(attendance) as { total: number; attended: number }[]).reduce(
    (acc, a) => ({ total: acc.total + a.total, attended: acc.attended + a.attended }),
    { total: 0, attended: 0 }
  );
  const overallPercent = summary.total ? Math.round((summary.attended / summary.total) * 100) : 0;

  const attendanceDateSet = new Set(attendedDates);

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getDay();
  const daysInMonth = getDaysInMonth(new Date());
  const today = new Date().getDate();

  const calendarCells = [];
  for (let i = 0; i < firstDayOfMonth; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);

  function piePath(ratio: number): string {
    if (ratio <= 0) return '';
    const cx = 60, cy = 60, r = 54;
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + 2 * Math.PI * Math.min(ratio, 1);
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const large = ratio > 0.5 ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
  }

  return (
    <Shell role="student" title="Attendance Overview">
      <div className="max-w-5xl space-y-6">
        {/* Summary with Pie Chart */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 rounded-2xl p-6 shadow-xl text-white" style={{ animation: 'fadeDown 0.5s ease-out' }}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div className="relative w-44 h-44 shrink-0">
                <svg className="w-44 h-44" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="54" fill="#1e293b" />
                  {overallPercent > 0 && (
                    <path
                      d={piePath(overallPercent / 100)}
                      fill={overallPercent >= 75 ? '#10B981' : '#F59E0B'}
                    />
                  )}
                  <circle cx="60" cy="60" r="30" fill="#1e293b" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center"><span className="text-3xl font-extrabold">{overallPercent}%</span></div>
              </div>
              <div>
                <p className="text-xl font-bold">{summary.attended} / {summary.total}</p>
                <p className="text-slate-300 text-sm">Classes attended</p>
                <p className={`text-sm font-semibold mt-1 ${overallPercent >= 75 ? 'text-emerald-400' : 'text-orange-400'}`}>
                  {overallPercent >= 75 ? '✓ Above 75%' : '⚠ Below 75%'}
                </p>
              </div>
            </div>
            <button onClick={() => setShowCalendar(!showCalendar)} className="px-4 py-2 bg-white/10 rounded-xl hover:bg-white/20 transition-all text-sm font-medium">
              {showCalendar ? 'Hide Calendar' : '📅 View Calendar'}
            </button>
          </div>
        </div>

        {/* Calendar */}
        {showCalendar && (
          <div className="card" style={{ animation: 'fadeUp 0.4s ease-out' }}>
            <h3 className="font-bold text-slate-900 dark:text-white mb-4">Attendance Heatmap - {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
            <div className="grid grid-cols-7 gap-1.5 text-center text-xs text-slate-500 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <span key={d}>{d}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {calendarCells.map((day, i) => {
                if (!day) return <div key={i} />;
                const isToday = day === today;
                const hasAttendance = attendanceDateSet.has(day);
                return (
                  <div key={i} className={`h-8 rounded-lg flex items-center justify-center text-xs font-medium transition-all ${
                    hasAttendance ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-300'
                  } ${isToday ? 'ring-2 ring-blue-500' : ''}`}>
                    {day}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Individual Subject Attendance */}
        {classes.length > 0 && (
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Subject-wise Attendance</h3>
            <div className="space-y-3">
              {classes.map((c, i) => {
                const a = attendance[c.id];
                if (!a || a.total === 0) return null;
                const pct = a.percent;
                const isGood = pct >= 75;
                return (
                  <div
                    key={c.id}
                    className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-md border border-slate-100 dark:border-slate-700"
                    style={{ animation: `fadeUp 0.4s ease-out ${i * 0.06}s both` }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{c.subject}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{c.code}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-extrabold ${isGood ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                          {pct}%
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{a.attended}/{a.total} classes</p>
                      </div>
                    </div>
                    <div className="relative h-4 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
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
                );
              })}
            </div>
          </div>
        )}

        {classes.length === 0 && (
          <div className="card text-center py-12">
            <p className="text-slate-400 dark:text-slate-500 text-sm">No attendance data available yet. Start attending classes to see your overview.</p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeDown { from { opacity: 0; transform: translateY(-15px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </Shell>
  );
}
