'use client';

import Shell from '@/components/Shell';
import BackButton from '@/components/BackButton';
import { api } from '@/lib/api';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function Page() {
  const [rows, setRows] = useState<any[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    api('/api/leaderboard').then(setRows).catch(() => {});
  }, []);

  const isOnLeaderboard = rows.some((r) => r.name === user?.name);
  const userRank = isOnLeaderboard ? rows.findIndex((r) => r.name === user?.name) + 1 : 0;
  const userStreak = rows.find((r) => r.name === user?.name)?.streak || 0;

  const podiumOrder = rows.length >= 3 ? [rows[1], rows[0], rows[2]] : rows;

  const podiumData: Record<number, { emoji: string; gradient: string; height: string; shadow: string }> = {
    1: { emoji: '🥇', gradient: 'bg-gradient-to-t from-amber-500 to-yellow-400', height: '200px', shadow: 'shadow-amber-500/30' },
    2: { emoji: '🥈', gradient: 'bg-gradient-to-t from-slate-400 to-slate-300', height: '160px', shadow: 'shadow-slate-400/30' },
    3: { emoji: '🥉', gradient: 'bg-gradient-to-t from-orange-600 to-orange-500', height: '130px', shadow: 'shadow-orange-500/30' },
  };

  return (
    <Shell role="student" title="Leaderboard">
      <BackButton href="/student/dashboard" label="Back to Dashboard" />
      <div className="max-w-4xl mx-auto">
        {/* Header Stats */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 rounded-2xl p-6 shadow-xl mb-8 text-white" style={{ animation: 'fadeDown 0.5s ease-out' }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Leaderboard</h2>
              <p className="text-slate-300 text-sm mt-1">Top performing students by attendance</p>
            </div>
            <div className="flex gap-4">
              {isOnLeaderboard && (
                <div className="bg-white/10 rounded-xl px-4 py-2 backdrop-blur-sm text-center">
                  <p className="text-xs text-slate-300 uppercase tracking-wide">Your Rank</p>
                  <p className="text-2xl font-extrabold">#{userRank}</p>
                </div>
              )}
              <div className="bg-white/10 rounded-xl px-4 py-2 backdrop-blur-sm text-center">
                <p className="text-xs text-slate-300 uppercase tracking-wide">Streak</p>
                <p className="text-2xl font-extrabold">🔥 {userStreak}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Podium */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-md border border-slate-100 dark:border-slate-700 mb-6" style={{ animation: 'fadeUp 0.5s ease-out 0.2s both' }}>
          <div className="flex items-end justify-center gap-4 mb-8">
            {/* 2nd Place */}
            {podiumOrder[0] && (
              <div className="flex flex-col items-center w-1/3" style={{ animation: `podiumIn 0.6s ease-out 0.3s both` }}>
                <div className={`w-full rounded-t-xl rounded-b-xl ${podiumData[2].gradient} shadow-lg ${podiumData[2].shadow} flex flex-col items-center justify-center text-white px-3`} style={{ height: podiumData[2].height }}>
                  <span className="text-3xl">🥈</span>
                  <p className="text-sm font-bold truncate w-full text-center mt-1">{podiumOrder[0].name}</p>
                  <p className="text-xs text-white/80">{podiumOrder[0].department || '—'}</p>
                  <p className="text-xs text-yellow-200 mt-1">🔥 {podiumOrder[0].streak || 0}</p>
                </div>
              </div>
            )}

            {/* 1st Place */}
            {podiumOrder[1] && (
              <div className="flex flex-col items-center w-1/3" style={{ animation: `podiumIn 0.6s ease-out both` }}>
                <div className={`w-full rounded-xl ${podiumData[1].gradient} shadow-xl ${podiumData[1].shadow} flex flex-col items-center justify-center text-white px-3`} style={{ height: podiumData[1].height }}>
                  <span className="text-4xl">🥇</span>
                  <p className="text-base font-bold truncate w-full text-center mt-1">{podiumOrder[1].name}</p>
                  <p className="text-xs text-white/80">{podiumOrder[1].department || '—'}</p>
                  <p className="text-xs text-yellow-200 mt-1">🔥 {podiumOrder[1].streak || 0}</p>
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {podiumOrder[2] && (
              <div className="flex flex-col items-center w-1/3" style={{ animation: `podiumIn 0.6s ease-out 0.5s both` }}>
                <div className={`w-full rounded-t-xl rounded-b-xl ${podiumData[3].gradient} shadow-lg ${podiumData[3].shadow} flex flex-col items-center justify-center text-white px-3`} style={{ height: podiumData[3].height }}>
                  <span className="text-3xl">🥉</span>
                  <p className="text-sm font-bold truncate w-full text-center mt-1">{podiumOrder[2].name}</p>
                  <p className="text-xs text-white/80">{podiumOrder[2].department || '—'}</p>
                  <p className="text-xs text-yellow-200 mt-1">🔥 {podiumOrder[2].streak || 0}</p>
                </div>
              </div>
            )}
          </div>

          {/* Full Rankings */}
          <div className="space-y-2 mt-6">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">All Rankings</h3>
            {rows.map((r: any, i: number) => (
              <div
                key={i}
                className={`flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
                  r.name === user?.name ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800' : 'bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                style={{ animation: `fadeUp 0.3s ease-out ${i * 50}ms both` }}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                    i === 0 ? 'bg-amber-500 text-white' : i === 1 ? 'bg-slate-400 text-white' : i === 2 ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white text-sm">{r.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{r.department}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-medium text-slate-500">🔥 {r.streak || 0}</span>
                  <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                    r.score >= 80 ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' : r.score >= 60 ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                  }`}>
                    {r.score}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes podiumIn {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </Shell>
  );
}
