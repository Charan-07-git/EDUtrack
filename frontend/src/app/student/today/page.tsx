'use client';

import Shell from '@/components/Shell';
import BackButton from '@/components/BackButton';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import Link from 'next/link';

// Array mapping JS getDay() result (0-6) to a human-readable day name.
const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

/**
 * Takes the raw slot array from the timetable API and "flattens" lab slots.
 * A slot that has a `labs` array represents a lab session with multiple batches;
 * each lab batch is turned into its own individual slot so it renders as a separate card.
 * Regular (non-lab) slots are passed through unchanged.
 *
 * @param slots - Raw slot objects from the timetable endpoint.
 * @returns A flat array where every entry has subject, time, type etc.
 */
function flattenSlots(slots: any[]): any[] {
  const result: any[] = [];
  for (const slot of slots) {
    if (slot.labs) {
      // Expand each lab batch into its own slot, inheriting the parent's start/end time.
      for (const lab of slot.labs) {
        result.push({ ...lab, start: slot.start, end: slot.end, type: 'Lab' });
      }
    } else {
      result.push(slot);
    }
  }
  return result;
}

// Main page component for the "Today's Classes" feature.
// Shows the student a list of all classes scheduled for the current day,
// along with a "Mark Attendance" link for each.
export default function Page() {
  const { user } = useAuth();

  // Flattened list of today's class slots (after expanding lab batches).
  const [slots, setSlots] = useState<any[]>([]);
  // Whether the timetable data has finished loading.
  const [loaded, setLoaded] = useState(false);
  // The name of today, e.g. "Monday" – used in the UI.
  const [todayName, setTodayName] = useState('');

  // On mount (or when user changes), determine today's name and fetch the timetable
  // for the student's current semester.
  useEffect(() => {
    const today = DAY_NAMES[new Date().getDay()];
    setTodayName(today);
    // Read the semester from the user context or fall back to localStorage.
    const sem = user?.semester || Number(localStorage.getItem("edutrack_semester"));
    if (!sem) { setLoaded(true); return; }  // No semester set – nothing to fetch.
    // Fetch the master timetable for this semester and keep only today's slots.
    api(`/api/timetable/master?semester=${sem}`).then((d) => {
      const todaySlots = d.timetable?.[today] || [];
      setSlots(flattenSlots(todaySlots));
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, [user]);

  return (
    <Shell role="student" title="Today's Classes">
      <BackButton href="/student/dashboard" label="Back to Dashboard" />

      {!loaded ? (
        /* ---------- Loading spinner ---------- */
        <div className="card text-center py-16">
          <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-muted">Loading today's classes...</p>
        </div>
      ) : slots.length === 0 ? (
        /* ---------- Empty state – no classes today ---------- */
        <div className="card text-center py-16">
          <span className="text-5xl mb-4 block">📭</span>
          <p className="text-lg font-semibold text-slate-300">No classes today</p>
          <p className="text-muted mt-2">{todayName} — enjoy your day off!</p>
        </div>
      ) : (
        /* ---------- Class Cards ---------- */
        <div className="grid gap-3">
          {slots.map((slot, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                {/* Time column – shows slot.start and slot.end */}
                <div className="shrink-0 w-16 text-center">
                  <p className="text-xs font-bold text-blue-600">{slot.start}</p>
                  <p className="text-[10px] text-slate-400">to</p>
                  <p className="text-xs font-bold text-blue-600">{slot.end}</p>
                </div>
                {/* Subject details column */}
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">{slot.subject}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{slot.faculty}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {/* Badge showing type (Lab vs Theory) */}
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                      slot.type === 'Lab'
                        ? 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30'
                        : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30'
                    }`}>{slot.type || 'Theory'}</span>
                    {/* Room number */}
                    <span className="text-[10px] text-slate-400">{slot.room}</span>
                    {/* Batch name, if this is a lab batch */}
                    {slot.batch && <span className="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-full">{slot.batch}</span>}
                  </div>
                </div>
              </div>
              {/* Mark Attendance link – navigates to the QR scan page */}
              <Link
                href="/student/scan/today"
                className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all"
              >
                {/* QR-code-like SVG icon */}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                </svg>
                Mark Attendance
              </Link>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}
