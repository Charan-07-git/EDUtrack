'use client';
import Shell from '@/components/Shell';
import BackButton from '@/components/BackButton';
import { api } from '@/lib/api';
import { useEffect, useState } from 'react';

export default function Page() {
  const [g, setG] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [targetPercent, setTargetPercent] = useState(85);

  useEffect(() => {
    api('/api/goals').then((d) => {
      setG(d);
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  const summary = g.filter((x) => x.total > 0).reduce(
    (acc, x) => ({ total: acc.total + x.total, attended: acc.attended + x.attended }),
    { total: 0, attended: 0 }
  );

  const overallPercent = summary.total ? Math.round((summary.attended / summary.total) * 100) : 0;

  const whatIf = () => {
    const target = targetPercent / 100;
    const needed = Math.ceil((target * summary.total - summary.attended) / (1 - target));
    return needed > 0 ? needed : 0;
  };

  return (
    <Shell role="student" title="Goals">
      <BackButton href="/student/dashboard" label="Back to Dashboard" />
      {!loaded ? (
        <div className="card text-center py-16 mt-6">
          <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-muted">Loading goals...</p>
        </div>
      ) : g.length === 0 ? (
        <div className="card text-center py-16 mt-6">
          <span className="text-5xl mb-4 block">🎯</span>
          <p className="text-lg font-semibold text-slate-300">No goals yet</p>
          <p className="text-muted mt-2">Goals will appear once sessions are conducted for your classes</p>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {/* What-if Calculator */}
          {summary.total > 0 && (
            <div className="card" style={{ animation: 'fadeUp 0.4s ease-out' }}>
              <h3 className="font-bold text-slate-900 dark:text-white mb-3">🎯 What-if Calculator</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Currently at <strong>{overallPercent}%</strong> ({summary.attended}/{summary.total} classes). Predict how many more classes you need to reach your target.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <label className="text-sm text-slate-600 dark:text-slate-400">Target %:</label>
                <input type="range" min="75" max="100" value={targetPercent} onChange={(e) => setTargetPercent(Number(e.target.value))} className="w-48 accent-blue-600" />
                <span className="text-lg font-bold text-blue-600">{targetPercent}%</span>
                <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                  <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Need {whatIf()} more consecutive classes</p>
                </div>
              </div>
            </div>
          )}

          {/* Subject Goals */}
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
        </div>
      )}

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </Shell>
  );
}