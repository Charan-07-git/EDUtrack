'use client';

import Shell from '@/components/Shell';
import BackButton from '@/components/BackButton';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';

const TIME_SLOTS = [
  { label: '09:00 - 10:00', startHour: 9 },
  { label: '10:00 - 11:00', startHour: 10 },
  { label: '11:00 - 12:00', startHour: 11 },
  { label: '12:00 - 13:00', startHour: 12 },
  { label: '13:00 - 14:00', startHour: 13 },
  { label: '14:00 - 15:00', startHour: 14 },
  { label: '15:00 - 16:00', startHour: 15 },
  { label: '16:00 - 17:00', startHour: 16 },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const GRADIENTS = [
  'from-blue-500 to-blue-600 shadow-blue-500/30',
  'from-purple-500 to-purple-600 shadow-purple-500/30',
  'from-amber-500 to-orange-500 shadow-amber-500/30',
  'from-emerald-500 to-emerald-600 shadow-emerald-500/30',
  'from-rose-500 to-rose-600 shadow-rose-500/30',
  'from-cyan-500 to-cyan-600 shadow-cyan-500/30',
  'from-violet-500 to-violet-600 shadow-violet-500/30',
  'from-pink-500 to-pink-600 shadow-pink-500/30',
  'from-teal-500 to-teal-600 shadow-teal-500/30',
  'from-indigo-500 to-indigo-600 shadow-indigo-500/30',
];

const LAB_GRADIENTS = [
  'from-orange-400 to-orange-500 shadow-orange-500/30',
  'from-lime-500 to-lime-600 shadow-lime-500/30',
  'from-sky-500 to-sky-600 shadow-sky-500/30',
  'from-fuchsia-500 to-fuchsia-600 shadow-fuchsia-500/30',
];

const GRADIENT_MAP: Record<string, string> = {};

function getGradient(code: string): string {
  if (!GRADIENT_MAP[code]) {
    GRADIENT_MAP[code] = GRADIENTS[Object.keys(GRADIENT_MAP).length % GRADIENTS.length];
  }
  return GRADIENT_MAP[code];
}

const ROMAN_MAP: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8 };

function getLabGradient(batch: string): string {
  const idx = (ROMAN_MAP[batch.toUpperCase()] || parseInt(batch) || 1) - 1;
  return LAB_GRADIENTS[idx % LAB_GRADIENTS.length];
}

function romanize(n: number): string {
  const map: Record<number, string> = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII' };
  return map[n] || String(n);
}

export default function Page() {
  const { user } = useAuth();
  const [master, setMaster] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [semester, setSemester] = useState<number | null>(null);

  useEffect(() => {
    const sem = user?.semester || Number(localStorage.getItem("edutrack_semester"));
    if (sem) setSemester(sem);
  }, [user]);

  useEffect(() => {
    if (!semester) return;
    setLoaded(false);
    setMaster(null);
    api(`/api/timetable/master?semester=${semester}`).then((d: any) => {
      setMaster(d);
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, [semester]);

  function getEntry(day: string, slotIndex: number) {
    if (!master?.timetable) return null;
    const dayData = master.timetable[day];
    if (!dayData) return null;
    const slot = TIME_SLOTS[slotIndex];
    return dayData.find((e: any) => {
      const startHour = parseInt(e.start.split(':')[0]);
      const endHour = parseInt(e.end.split(':')[0]);
      const slotHour = slot.startHour;
      return slotHour >= startHour && slotHour < endHour;
    }) || null;
  }

  const displaySlots = TIME_SLOTS;

  return (
    <Shell role="student" title="Timetable">
      <BackButton href="/student/dashboard" label="Back to Dashboard" />

      {!semester ? (
        <div className="card text-center py-16 mt-6">
          <span className="text-5xl mb-4 block">👆</span>
          <p className="text-lg font-semibold text-slate-300">Complete your academic setup first</p>
        </div>
      ) : !loaded ? (
        <div className="card text-center py-16 mt-6">
          <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-muted">Loading timetable...</p>
        </div>
      ) : !master ? (
        <div className="card text-center py-16 mt-6">
          <span className="text-5xl mb-4 block">📋</span>
          <p className="text-lg font-semibold text-slate-300">Timetable not available</p>
          <p className="text-muted mt-2">The timetable for your semester has not been loaded yet</p>
        </div>
      ) : (<>
      <div className="mt-6 bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-100 dark:border-slate-700 p-4 lg:p-6 overflow-auto" style={{ animation: 'fadeUp 0.5s ease-out' }}>
        <div className="flex items-center gap-3 mb-6">
          <img src="/logo.svg" alt="Logo" className="w-10 h-10" />
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{master.class} ({master.department}) {romanize(semester)}-Semester</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Academic Year {master.academicYear} • Room {master.room}</p>
          </div>
        </div>

        <table className="w-full border-collapse min-w-[700px] rounded-xl overflow-hidden text-xs">
          <thead>
            <tr>
              <th className="bg-slate-900 text-white px-2 py-2.5 text-[11px] font-bold uppercase tracking-wider w-24">Time</th>
              {DAYS.map((day) => (
                <th key={day} className="bg-blue-600 text-white px-2 py-2.5 text-[11px] font-bold uppercase tracking-wider border-l border-blue-500">{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displaySlots.map((slot, i) => (
              <tr key={i}>
                <td className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700 px-2 py-2 text-[11px] font-semibold text-slate-400 text-center whitespace-nowrap">
                  {slot.label}
                </td>
                {DAYS.map((day) => {
                  const entry = getEntry(day, i);
                  if (!entry) {
                    return <td key={day} className="border-b border-l border-slate-50 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-900/30"></td>;
                  }
                  if (entry.type === 'Lab' && entry.labs) {
                    return (
                      <td key={day} className="border-b border-l border-slate-50 dark:border-slate-700 p-1 align-top">
                        <div className="flex flex-col gap-1">
                          {entry.labs.map((lab: any, li: number) => {
                            const code = lab.subject.slice(0, 4).toUpperCase();
                            const initials = lab.faculty?.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || 'T';
                            return (
                              <div key={li} className={`rounded-lg bg-gradient-to-br ${getLabGradient(lab.batch)} px-2 py-1.5 text-center text-white`}>
                                <div className="text-[11px] font-bold leading-tight">{code}</div>
                                <div className="text-[9px] opacity-80">Batch {lab.batch}</div>
                                <div className="text-[9px] opacity-70">({initials})</div>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    );
                  }
                  const code = entry.code || entry.subject.slice(0, 4).toUpperCase();
                  const initials = entry.faculty?.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || 'T';
                  return (
                    <td key={day} className="border-b border-l border-slate-50 dark:border-slate-700 p-1">
                      <div className={`rounded-lg bg-gradient-to-br ${getGradient(code)} px-2 py-2 text-center text-white`}>
                        <div className="text-[11px] font-bold leading-tight">{code}</div>
                        <div className="text-[9px] opacity-80 mt-0.5">({initials})</div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5" style={{ animation: 'fadeUp 0.5s ease-out 0.3s both' }}>
        {master.subjects && Object.entries(master.subjects).map(([code, name]: any) => (
          <div key={code} className={`rounded-lg bg-gradient-to-br ${getGradient(code)} px-2.5 py-1 text-[11px] font-semibold text-white shadow-md`}>
            {code}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      </>)}
    </Shell>
  );
}