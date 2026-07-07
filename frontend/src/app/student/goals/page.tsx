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
          <p className="text-muted mt-2">Goals will appear once sessions are conducted for your classes</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {g.filter((x) => x.total > 0).map((x) => (
            <div key={x.subject} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{x.subject}</h3>
                  <p className="text-sm text-slate-500 mt-1">{x.attended} / {x.total} sessions attended</p>
                </div>
                <div className={`text-right px-4 py-2 rounded-xl font-bold text-lg ${
                  x.percent >= 75 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' :
                  x.percent >= 65 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' :
                  'bg-red-100 dark:bg-red-900/30 text-red-500'
                }`}>
                  {x.percent}%
                </div>
              </div>
              {x.percent < 75 && x.classesNeeded > 0 && (
                <p className="text-slate-500 text-sm mt-3">
                  Attend <b className="text-slate-900 dark:text-white">{x.classesNeeded}</b> more session{x.classesNeeded > 1 ? 's' : ''} to reach 75%
                </p>
              )}
              {x.percent >= 75 && (
                <p className="text-emerald-600 dark:text-emerald-400 text-sm mt-3 font-medium">✓ On track for 75% target</p>
              )}
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}
