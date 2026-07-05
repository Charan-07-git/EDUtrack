'use client';

import Shell from '@/components/Shell';
import BackButton from '@/components/BackButton';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useParams } from 'next/navigation';
import Loader from '@/components/Loader';

export default function Page() {
  const { classId } = useParams() as { classId: string };
  const [data, setData] = useState<any>(null);
  const [filter, setFilter] = useState<'all' | 'below75' | 'above75'>('all');
  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    api(`/api/teacher/student-report/${classId}`).then(setData);
  }, [classId]);

  if (!data) return <Loader />;

  const above75 = data.students.filter((s: any) => s.percent >= 75).length;
  const below75 = data.students.filter((s: any) => s.percent < 75).length;
  const filtered = data.students.filter((s: any) => {
    if (filter === 'below75') return s.percent < 75;
    if (filter === 'above75') return s.percent >= 75;
    return true;
  });

  const handleExport = () => {
    window.open(`${process.env.NEXT_PUBLIC_API_URL}/api/export/${classId}`, '_blank');
  };

  const handleBulkCorrect = async () => {
    await api(`/api/sessions/${classId}/bulk-attendance`, {
      method: 'POST',
      body: JSON.stringify({ studentIds: selected }),
    });
    setBulkMode(false);
    setSelected([]);
    const updated = await api(`/api/teacher/student-report/${classId}`);
    setData(updated);
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <Shell role="teacher" title={`${data.class.subject} - Student Report`}>
      <div className="max-w-5xl">
        <BackButton href="/teacher/analytics" label="Back to Quick Analysis" />

        {/* Header */}
        <div className="mt-6 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 rounded-2xl p-6 mb-6 shadow-xl text-white" style={{ animation: 'fadeDown 0.5s ease-out' }}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">{data.class.subject}</h2>
              <p className="text-slate-300 mt-1">{data.class.code} • {data.class.department} • Sem {data.class.semester}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={handleExport} className="px-4 py-2 bg-white/10 rounded-xl hover:bg-white/20 transition-all text-sm font-medium flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Export CSV
              </button>
              <button onClick={() => setBulkMode(!bulkMode)} className={`px-4 py-2 rounded-xl transition-all text-sm font-medium ${bulkMode ? 'bg-blue-600 text-white' : 'bg-white/10 hover:bg-white/20'}`}>
                {bulkMode ? 'Done' : '✏️ Bulk Correct'}
              </button>
            </div>
          </div>
          <div className="flex gap-6 mt-4">
            <div className="bg-white/10 rounded-xl px-4 py-2 backdrop-blur-sm"><p className="text-xs text-slate-400 uppercase">Sessions</p><p className="text-2xl font-bold">{data.class.totalSessions}</p></div>
            <div className="bg-white/10 rounded-xl px-4 py-2 backdrop-blur-sm"><p className="text-xs text-slate-400 uppercase">Above 75%</p><p className="text-2xl font-bold text-emerald-400">{above75}</p></div>
            <div className="bg-white/10 rounded-xl px-4 py-2 backdrop-blur-sm"><p className="text-xs text-slate-400 uppercase">Below 75%</p><p className="text-2xl font-bold text-orange-400">{below75}</p></div>
          </div>
        </div>

        {bulkMode && (
          <div className="mb-4 flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl">
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{selected.length} selected</span>
            <button onClick={handleBulkCorrect} className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Mark Selected</button>
            <button onClick={() => setSelected([])} className="px-4 py-1.5 bg-white dark:bg-slate-800 text-slate-300 dark:text-slate-300 rounded-lg text-sm font-medium">Clear</button>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 mb-5" style={{ animation: 'fadeUp 0.5s ease-out 0.2s both' }}>
          {[{ key: 'all', label: `All (${data.students.length})` }, { key: 'above75', label: `Above 75% (${above75})` }, { key: 'below75', label: `Below 75% (${below75})` }].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key as any)} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${filter === f.key ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-300 hover:bg-slate-50 border border-slate-200 dark:border-slate-700'}`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="space-y-3">
          {filtered.map((s: any, i: number) => (
            <div key={s.id} className={`group bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-lg hover:border-blue-100 transition-all duration-300 ${bulkMode ? 'cursor-pointer' : ''}`}
              style={{ animation: `slideIn 0.4s ease-out ${i * 60}ms both` }}
              onClick={() => bulkMode && toggleSelect(s.id)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {bulkMode && (
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${selected.includes(s.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                      {selected.includes(s.id) && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                    </div>
                  )}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm transition-transform group-hover:scale-110 ${s.percent >= 75 ? 'bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-md' : 'bg-gradient-to-br from-orange-400 to-orange-500 text-white shadow-md'}`}>
                    {s.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">{s.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{s.attended} / {s.total} classes</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 w-1/2 max-w-xs">
                  <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                    <div className={`h-2.5 rounded-full transition-all duration-700 ${s.percent >= 75 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-orange-400 to-red-500'}`} style={{ width: `${Math.min(s.percent, 100)}%` }} />
                  </div>
                  <span className={`text-sm font-bold w-14 text-right ${s.percent >= 75 ? 'text-emerald-600' : 'text-orange-600'}`}>{s.percent}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes fadeDown { from { opacity: 0; transform: translateY(-15px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </Shell>
  );
}
