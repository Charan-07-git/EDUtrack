'use client';
import Shell from '@/components/Shell';
import BackButton from '@/components/BackButton';
import { api } from '@/lib/api';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Page() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [attendanceDates, setAttendanceDates] = useState<Record<string, boolean>>({});
  const [currentDate] = useState(new Date());

  useEffect(() => {
    api('/api/student/dashboard').then((data) => {
      setClasses(data.classes || []);
      const dates: Record<string, boolean> = {};
      data.classes?.forEach((c: any) => {
        c.sessions?.forEach((s: any) => {
          if (s.attendances?.some((a: any) => a.studentId === user?.id) && s.startTime) {
            const date = new Date(s.startTime).toISOString().slice(0, 10);
            dates[date] = true;
          }
        });
      });
      setAttendanceDates(dates);
    }).catch(() => {});
  }, [user?.id]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <Shell role="student" title="Calendar">
      <BackButton href="/student/dashboard" label="Back" />
      <div className="mt-4 max-w-sm mx-auto">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-md border border-slate-100 dark:border-slate-700" style={{ animation: 'fadeUp 0.4s ease-out' }}>
          <h3 className="text-xs font-bold text-slate-900 dark:text-white mb-2 text-center">{monthName}</h3>
          <div className="grid grid-cols-7 gap-0.5 mb-0.5">
            {DAY_NAMES.map((d) => (
              <div key={d} className="text-center text-[9px] font-semibold text-slate-400 dark:text-slate-500 py-0.5">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isPresent = attendanceDates[dateStr];
              const isToday = dateStr === todayStr;
              return (
                <div
                  key={day}
                  className={`aspect-square rounded-md flex items-center justify-center text-[10px] font-medium transition-all ${
                    isPresent
                      ? 'bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-sm'
                      : isToday
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 ring-2 ring-blue-200 dark:ring-blue-700'
                      : 'bg-slate-50 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {day}
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-4 mt-2">
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded bg-emerald-500"></div>
              <span className="text-[9px] text-slate-500 dark:text-slate-400">Present</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded bg-slate-50 dark:bg-slate-700/50 ring-1 ring-slate-200 dark:ring-slate-600"></div>
              <span className="text-[9px] text-slate-500 dark:text-slate-400">No Session</span>
            </div>
          </div>
        </div>
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
