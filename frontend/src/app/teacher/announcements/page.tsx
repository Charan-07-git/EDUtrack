'use client';
import Shell from '@/components/Shell';
import BackButton from '@/components/BackButton';
import { api } from '@/lib/api';
import { useEffect, useState } from 'react';

export default function Page() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [expiresInHours, setExpiresInHours] = useState(24);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    Promise.all([
      api('/api/announcements'),
      api('/api/teacher/classes'),
    ]).then(([anns, cls]) => {
      setAnnouncements(anns);
      setClasses(cls);
      if (cls.length > 0) setSelectedClassId(cls[0].id);
    }).catch((e) => {
      console.error('Failed to load announcements:', e);
      setErr(e?.message || 'Failed to load');
    }).finally(() => setFetching(false));
  }, []);

  async function createAnnouncement(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClassId) return;
    setLoading(true);
    try {
      const ann = await api('/api/announcements', {
        method: 'POST',
        body: JSON.stringify({ classId: selectedClassId, title, content, expiresInHours }),
      });
      setAnnouncements([ann, ...announcements]);
      setTitle('');
      setContent('');
    } catch {
      setErr('Failed to create announcement');
    }
    setLoading(false);
  }

  async function deleteAnnouncement(id: string) {
    try {
      await api(`/api/announcements/${id}`, { method: 'DELETE' });
      setAnnouncements(announcements.filter((a) => a.id !== id));
      setErr('');
    } catch {
      setErr('Failed to delete announcement');
    }
  }

  return (
    <Shell role="teacher" title="Announcements">
      <BackButton href="/teacher/dashboard" label="Back to Dashboard" />

      <div className="mt-6 max-w-3xl space-y-6">
        {fetching ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-md border border-slate-100 dark:border-slate-700 text-center py-16">
            <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-muted">Loading announcements...</p>
          </div>
        ) : err ? (
          <div className="card bg-red-50 border border-red-200 text-center py-8">
            <p className="text-red-600 font-medium">{err}</p>
          </div>
        ) : (
          <>
          {/* Create Form */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-md border border-slate-100 dark:border-slate-700" style={{ animation: 'fadeUp 0.4s ease-out' }}>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Create Announcement</h3>
          <form onSubmit={createAnnouncement} className="space-y-4">
            <input type="text" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" required />
            <textarea placeholder="Content" value={content} onChange={(e) => setContent(e.target.value)} rows={3} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 resize-none" required />
            <div className="flex items-center gap-3">
              <label className="text-sm text-slate-600 dark:text-slate-400">Expires in:</label>
              <select value={expiresInHours} onChange={(e) => setExpiresInHours(Number(e.target.value))} className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-slate-50 dark:bg-slate-900">
                <option value={1}>1 hour</option>
                <option value={6}>6 hours</option>
                <option value={24}>24 hours</option>
                <option value={168}>7 days</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-600 dark:text-slate-400 block mb-2">Target Subject:</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              >
                {classes.length === 0 && <option value="">No subjects available</option>}
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.subject} ({c.code}) • Sem {c.semester}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" disabled={loading} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all disabled:opacity-50">
              Post Announcement
            </button>
          </form>
        </div>

        {/* List */}
        <div className="space-y-3">
          {announcements.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center shadow-sm border border-slate-100 dark:border-slate-700">
              <span className="text-4xl block mb-3">📢</span>
              <p className="text-slate-500 dark:text-slate-400 font-medium">No announcements yet</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Create your first announcement above</p>
            </div>
          ) : announcements.map((a, i) => (
            <div key={a.id} className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md dark:hover:shadow-slate-900 transition-all" style={{ animation: `slideIn 0.4s ease-out ${i * 80}ms both` }}>
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">{a.title}</h4>
                  <p className="text-sm text-slate-500 mt-1">{a.content}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{new Date(a.createdAt).toLocaleString()}</p>
                  {a.class && <span className="inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium">{a.class.subject}</span>}
                </div>
                <button onClick={() => deleteAnnouncement(a.id)} className="text-slate-500 dark:text-slate-400 hover:text-red-500 transition-colors p-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes slideIn {
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
