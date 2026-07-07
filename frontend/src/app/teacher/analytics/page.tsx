'use client';

import Shell from '@/components/Shell';
import BackButton from '@/components/BackButton';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Loader from '@/components/Loader';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import Link from 'next/link';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function Page() {
  const [data, setData] = useState<any>(null);
  const [classes, setClasses] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      api('/api/teacher/quick-analysis'),
      api('/api/teacher/classes'),
    ]).then(([analysis, cls]: [any, any[]]) => {
      setData(analysis);
      setClasses(cls);
    });
  }, []);

  if (!data) return <Loader />;

  const chartData = {
    labels: ['Classes Assigned', 'Classes Taken', 'Pending Classes'],
    datasets: [
      {
        data: [data.assigned, data.taken, data.pending],
        backgroundColor: ['#3B82F6', '#10B981', '#F59E0B'],
        borderWidth: 0,
        hoverOffset: 10,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    cutout: '65%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { padding: 20, usePointStyle: true, font: { size: 13, family: 'Inter' } },
      },
    },
  };

  return (
    <Shell role="teacher" title="Quick Analysis">
      <BackButton href="/teacher/dashboard" label="Back to Dashboard" />
      <div className="flex gap-6 max-w-6xl">
        {/* Sidebar - Assigned Classes */}
        <div className="w-72 bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-md border border-slate-100 dark:border-slate-700 h-fit" style={{ animation: 'slideRight 0.5s ease-out' }}>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">
            Assigned Classes
          </h3>
          <div className="space-y-2">
            {classes.map((c: any, i: number) => (
              <Link
                key={c.id}
                href={`/teacher/student-report/${c.id}`}
                className="group flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 hover:border-blue-100 dark:hover:border-blue-900 border border-transparent transition-all duration-200 cursor-pointer"
                style={{ animation: `fadeUp 0.4s ease-out ${i * 100}ms both` }}
              >
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white text-sm group-hover:text-blue-600 transition-colors">{c.subject}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {c.department} • Sem {c.semester}
                  </p>
                </div>
                <svg className="w-4 h-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-md border border-slate-100 dark:border-slate-700 flex flex-col items-center" style={{ animation: 'fadeUp 0.6s ease-out 0.2s both' }}>
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4 w-full max-w-lg mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-center shadow-lg shadow-blue-500/20">
              <p className="text-white/80 text-xs font-medium">Assigned</p>
              <p className="text-white text-3xl font-extrabold mt-1">{data.assigned}</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-center shadow-lg shadow-emerald-500/20">
              <p className="text-white/80 text-xs font-medium">Taken</p>
              <p className="text-white text-3xl font-extrabold mt-1">{data.taken}</p>
            </div>
            <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl p-4 text-center shadow-lg shadow-amber-500/20">
              <p className="text-white/80 text-xs font-medium">Pending</p>
              <p className="text-white text-3xl font-extrabold mt-1">{data.pending}</p>
            </div>
          </div>

          <div className="w-full max-w-sm">
            <Pie data={chartData} options={chartOptions} />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideRight {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </Shell>
  );
}
