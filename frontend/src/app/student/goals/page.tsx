'use client';
import Shell from '@/components/Shell';
import BackButton from '@/components/BackButton';
import { api } from '@/lib/api';
import { useEffect, useState } from 'react';

export default function Page() {
  const [g, setG] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api('/api/goals').then((d) => {
      setG(d);
      setLoaded(true);
    });
  }, []);

  return (
    <Shell role="student" title="Goals">
      <BackButton href="/student/dashboard" label="Back to Dashboard" />
      {!loaded ? (
        <div className="card text-center py-16">
          <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-muted">Loading goals...</p>
        </div>
      ) : g.length === 0 ? (
        <div className="card text-center py-16">
          <span className="text-5xl mb-4 block">🎯</span>
          <p className="text-lg font-semibold text-slate-300">No goals yet</p>
          <p className="text-muted mt-2">Goals will appear as you attend classes</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {g.map((x) => (
            <div key={x.subject} className="card">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{x.subject}</h3>
              <p className={x.percent < 65 ? 'text-red-400 font-bold' : 'text-yellow-400 font-bold'}>
                {x.percent}% attendance
              </p>
              <p className="text-slate-300">
                Classes needed to reach 75%: <b className="text-slate-900 dark:text-white">{x.classesNeeded}</b>
              </p>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}
