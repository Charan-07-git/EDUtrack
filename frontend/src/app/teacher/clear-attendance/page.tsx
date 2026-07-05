'use client';

import Shell from '@/components/Shell';
import BackButton from '@/components/BackButton';
import { api } from '@/lib/api';
import { useState } from 'react';

export default function Page() {
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleClear() {
    setStatus('loading');
    try {
      const res = await api('/api/attendance/clear-semester', {
        method: 'POST',
        body: JSON.stringify({ confirm }),
      });
      setResult(res);
      setStatus('done');
    } catch (e: any) {
      setErrorMsg(e.message);
      setStatus('error');
    }
  }

  return (
    <Shell role="teacher" title="Clear Attendance">
      <BackButton href="/teacher/dashboard" label="Back to Dashboard" />
      <div className="max-w-2xl mx-auto mt-6">
        <div className="card border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">⚠️</span>
            <h2 className="text-xl font-bold text-red-700 dark:text-red-400">Clear Attendance Data</h2>
          </div>
          <p className="text-red-600 dark:text-red-300 mb-4">
            This will permanently delete all attendance records and sessions you have created.
            This action is typically performed at the end of a semester and cannot be undone.
          </p>

          {status === 'idle' && (
            <div>
              <p className="text-sm text-red-500 mb-2">Type <strong>CLEAR_ALL</strong> to confirm:</p>
              <input
                type="text"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Type CLEAR_ALL"
                className="input w-full mb-4"
              />
              <button
                onClick={handleClear}
                disabled={confirm !== 'CLEAR_ALL'}
                className="btn bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 disabled:opacity-50 shadow-lg"
              >
                🗑️ Delete All Attendance Data
              </button>
            </div>
          )}

          {status === 'loading' && (
            <div className="flex items-center gap-3 py-4">
              <div className="animate-spin w-6 h-6 border-4 border-red-500 border-t-transparent rounded-full" />
              <p className="font-semibold text-red-600">Clearing attendance data...</p>
            </div>
          )}

          {status === 'done' && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">✅</span>
                <div>
                  <p className="font-bold text-green-700 dark:text-green-400">Data cleared successfully</p>
                  <p className="text-sm text-green-600 dark:text-green-300">
                    {result?.message || 'All attendance records removed'}
                  </p>
                </div>
              </div>
              <button onClick={() => { setStatus('idle'); setConfirm(''); setResult(null); }} className="btn-soft">
                Done
              </button>
            </div>
          )}

          {status === 'error' && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">❌</span>
                <p className="font-bold text-red-600">{errorMsg}</p>
              </div>
              <button onClick={() => setStatus('idle')} className="btn-soft">
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
