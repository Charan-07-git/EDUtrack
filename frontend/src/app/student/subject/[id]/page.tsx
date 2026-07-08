'use client';

import Shell from '@/components/Shell';
import BackButton from '@/components/BackButton';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useParams } from 'next/navigation';

// Page component: shows a single subject's details and session history for a student
export default function Page() {
  // Get the subject id from the URL parameter
  const { id } = useParams() as { id: string };
  // Get the currently logged-in user
  const { user } = useAuth();
  // Stores the full class data and its session list once fetched
  const [classData, setClassData] = useState<any>(null);

  // On mount or when id/user changes, fetch dashboard data and find the class matching this id
  useEffect(() => {
    api('/api/student/dashboard').then((data) => {
      // Find the class whose id matches the URL parameter
      const cls = data.classes?.find((c: any) => c.id === id);
      if (cls) {
        // Transform each session: extract date, and check if current user attended
        const sessions = cls.sessions.map((s: any) => ({
          id: s.id,
          date: s.startTime ? new Date(s.startTime).toLocaleDateString() : 'Scheduled',
          attended: s.attendances.some((a: any) => a.studentId === user?.id),
        }));
        // Store class data along with processed sessions
        setClassData({ ...cls, sessions });
      }
    }).catch(() => {});
  }, [id, user?.id]);

  // Show a loading placeholder while class data is being fetched
  if (!classData) return <div className="ml-72 p-8">Loading...</div>;

  // Calculate attendance stats from the session list
  const attended = classData.sessions.filter((s: any) => s.attended).length;
  const total = classData.sessions.length;
  const percent = total ? Math.round((attended / total) * 100) : 0;

  return (
    <Shell role="student" title={classData.subject}>
      <div className="max-w-4xl">
        {/* Button to go back to the attendance overview page */}
        <BackButton href="/student/overview" label="Back to Attendance Overview" />

        {/* Subject Header card with name, code, department, semester, and attendance percentage */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm mb-6 border border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{classData.subject}</h2>
              <p className="text-gray-500 dark:text-gray-400">{classData.code} • {classData.department} • Sem {classData.semester}</p>
            </div>
            {/* Show attendance percentage in a colored badge: green if >=75%, red otherwise */}
            <div
              className={`px-6 py-3 rounded-2xl text-white font-bold text-2xl ${
                percent >= 75 ? 'bg-green-500' : 'bg-red-500'
              }`}
            >
              {percent}%
            </div>
          </div>

          {/* Percentage progress bar: green if >=75%, red otherwise */}
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

        {/* Session History list: shows each session with an attended/unattended indicator */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Session History</h3>
          <div className="space-y-3">
            {classData.sessions.map((s: any, i: number) => (
              <div
                key={s.id}
                className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-slate-900"
              >
                <div className="flex items-center gap-3">
                  {/* Colored dot: green for attended, red for absent */}
                  <div
                    className={`w-3 h-3 rounded-full ${
                      s.attended ? 'bg-green-500' : 'bg-red-400'
                    }`}
                  />
                  <span className="font-medium text-slate-900 dark:text-white">Session {i + 1}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-400">{s.date}</span>
                  {/* Present/Absent label with matching color */}
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
