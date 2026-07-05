'use client';
import Shell from '@/components/Shell';
import BackButton from '@/components/BackButton';
import { api } from '@/lib/api';
import { useEffect, useState } from 'react';

export default function Page() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    api('/api/announcements').then(setAnnouncements).catch(() => {}).finally(() => setFetching(false));
  }, []);

  return (
    <Shell role="student" title="Announcements">
      <BackButton href="/student/dashboard" label="Back to Dashboard" />

      <div className="mt-6 max-w-3xl space-y-4">
        {fetching ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full" />
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38a.851.851 0 01-1.09-.273 12.345 12.345 0 01-1.208-2.59m2.433-3.811a12.309 12.309 0 012.384-4.39m-2.384 4.39a12.094 12.094 0 01-1.498 2.091m3.882-2.482a12.094 12.094 0 011.498-2.091m-1.498 2.091c.21.24.414.489.61.749m-2.433 3.811c.258.11.527.192.803.249 1.105.228 2.267.13 3.322-.29m-4.125-9.77a12.3 12.3 0 013.322-.29c1.105.228 2.048.822 2.688 1.626m-6.01 3.434c.47-.58.886-1.204 1.238-1.868m-1.238 1.868a11.97 11.97 0 01-1.238-1.868m3.882 2.482a12.03 12.03 0 012.347 2.168m-2.347-2.168a12.03 12.03 0 01-1.498 2.091m0 0a11.97 11.97 0 01-1.384.126" />
            </svg>
            <p className="font-medium">No announcements yet</p>
            <p className="text-sm mt-1">Check back later for updates from your teachers</p>
          </div>
        ) : (
          announcements.map((a, i) => (
            <div
              key={a.id}
              className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md dark:hover:shadow-slate-900 transition-all"
              style={{ animation: `slideIn 0.4s ease-out ${i * 80}ms both` }}
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0 mt-1">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38a.851.851 0 01-1.09-.273 12.345 12.345 0 01-1.208-2.59m2.433-3.811a12.309 12.309 0 012.384-4.39m-2.384 4.39a12.094 12.094 0 01-1.498 2.091m3.882-2.482a12.094 12.094 0 011.498-2.091m-1.498 2.091c.21.24.414.489.61.749m-2.433 3.811c.258.11.527.192.803.249 1.105.228 2.267.13 3.322-.29m-4.125-9.77a12.3 12.3 0 013.322-.29c1.105.228 2.048.822 2.688 1.626m-6.01 3.434c.47-.58.886-1.204 1.238-1.868m-1.238 1.868a11.97 11.97 0 01-1.238-1.868m3.882 2.482a12.03 12.03 0 012.347 2.168m-2.347-2.168a12.03 12.03 0 01-1.498 2.091m0 0a11.97 11.97 0 01-1.384.126" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-slate-900 dark:text-white">{a.title}</h4>
                    {a.class && (
                      <span className="shrink-0 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-full">{a.class.subject}</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">{a.content}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
                    {new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </Shell>
  );
}
