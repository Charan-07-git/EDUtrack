'use client';

import Shell from '@/components/Shell';
import BackButton from '@/components/BackButton';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useParams } from 'next/navigation';

export default function Page() {
  const { id } = useParams() as { id: string };
  const { user } = useAuth();
  const [classData, setClassData] = useState<any>(null);

  useEffect(() => {
    api('/api/student/dashboard').then((data) => {
      const cls = data.classes?.find((c: any) => c.id === id);
      if (cls) {
        const sessions = cls.sessions.map((s: any) => ({
          id: s.id,
          date: s.startTime ? new Date(s.startTime).toLocaleDateString() : 'Scheduled',
          attended: s.attendances.some((a: any) => a.studentId === user?.id),
        }));
        setClassData({ ...cls, sessions });
      }
    }).catch(() => {});
  }, [id, user?.id]);

  if (!classData) return <div className="ml-72 p-8">Loading...</div>;

  const attended = classData.sessions.filter((s: any) => s.attended).length;
  const total = classData.sessions.length;
  const percent = total ? Math.round((attended / total) * 100) : 0;

  return (
    <Shell role="student" title={classData.subject}>
      <div className="max-w-4xl">
        <BackButton href="/student/overview" label="Back to Attendance Overview" />

        {/* Subject Header */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm mb-6 border border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{classData.subject}</h2>
              <p className="text-gray-500 dark:text-gray-400">{classData.code} • {classData.department} • Sem {classData.semester}</p>
            </div>
            <div
              className={`px-6 py-3 rounded-2xl text-white font-bold text-2xl ${
                percent >= 75 ? 'bg-green-500' : 'bg-red-500'
              }`}
            >
              {percent}%
            </div>
          </div>

          <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-4">
            <div
              className={`h-4 rounded-full transition-all ${percent >= 75 ? 'bg-green-500' : 'bg-red-500'}`}
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {attended} out of {total} classes attended
          </p>
        </div>

        {/* Session History */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Session History</h3>
          <div className="space-y-3">
            {classData.sessions.map((s: any, i: number) => (
              <div
                key={s.id}
                className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-slate-900"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      s.attended ? 'bg-green-500' : 'bg-red-400'
                    }`}
                  />
                  <span className="font-medium text-slate-900 dark:text-white">Session {i + 1}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-400">{s.date}</span>
                  <span
                    className={`text-sm font-semibold px-3 py-1 rounded-full ${
                      s.attended
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-600'
                    }`}
                  >
                    {s.attended ? 'Present' : 'Absent'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}
