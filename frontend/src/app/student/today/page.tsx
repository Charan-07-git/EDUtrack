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
    <Shell role="student" title="Today's Classes">
      <BackButton href="/student/dashboard" label="Back to Dashboard" />
      {!loaded ? (
        <div className="card text-center py-16">
          <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-muted">Loading today's classes...</p>
        </div>
      ) : classes.length === 0 ? (
        <div className="card text-center py-16">
          <span className="text-5xl mb-4 block">📭</span>
          <p className="text-lg font-semibold text-slate-300">No classes today</p>
          <p className="text-muted mt-2">Check your schedule for upcoming classes</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {classes.map((c) => (
            <div key={c.id} className="card flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{c.subject}</h3>
                <p className="text-muted">{c.code} • {c.timetable[0]?.startTime}</p>
              </div>
              <Link className="btn-primary" href={`/student/scan/${c.id}`}>
                Mark Attendance
              </Link>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}
