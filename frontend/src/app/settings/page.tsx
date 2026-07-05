'use client';
import Shell from '@/components/Shell';
import BackButton from '@/components/BackButton';
import { api } from '@/lib/api';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

const YEAR_SEMESTER_MAP: Record<number, number[]> = {
  1: [1, 2],
  2: [3, 4],
  3: [5, 6],
  4: [7, 8],
};

export default function Page() {
  const { user, logout } = useAuth();
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [semester, setSemester] = useState(5);
  const [year, setYear] = useState<number>(3);
  const [subject, setSubject] = useState('');
  const [subjects, setSubjects] = useState<Record<string, string>>({});
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!user) {
        setLoading(false);
        setMsg('Could not load user data. Please try logging in again.');
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [user]);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setDepartment(user.department || '');
      setSemester(user.semester || 5);
      setYear(Number(localStorage.getItem("edutrack_year")) || 3);
      setSemester(Number(localStorage.getItem("edutrack_semester")) || 5);
      setSubject(localStorage.getItem("edutrack_subject") || '');
      api("/api/timetable/semesters").then((list: any[]) => {
        const sem = list.find((s: any) => s.semester === (user.semester || Number(localStorage.getItem("edutrack_semester"))));
        if (sem) setSubjects(sem.subjects);
      }).catch(() => {});
      setLoading(false);
    }
  }, [user]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      await api('/api/me', {
        method: 'PUT',
        body: JSON.stringify({ name, department, semester }),
      });
      localStorage.setItem("edutrack_year", String(year));
      localStorage.setItem("edutrack_semester", String(semester));
      if (subject) localStorage.setItem("edutrack_subject", subject);
      setMsg('Profile updated successfully');
    } catch (err: any) {
      setMsg(err.message || 'Failed to update');
    }
    setSaving(false);
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      await api('/api/me/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword('');
      setNewPassword('');
      setMsg('Password changed successfully');
    } catch (err: any) {
      setMsg(err.message || 'Failed to change password');
    }
    setSaving(false);
  }

  return (
    <Shell role={user?.role === 'TEACHER' ? 'teacher' : 'student'} title="Settings">
      <BackButton href={`/${user?.role === 'TEACHER' ? 'teacher' : 'student'}/dashboard`} label="Back to Dashboard" />

      <div className="max-w-2xl space-y-6 mt-6">
        {loading ? (
          <div className="card text-center py-16">
              <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-muted dark:text-slate-400">Loading settings...</p>
          </div>
        ) : (
          <>
            {msg && (
              <div className={`p-4 rounded-xl text-sm font-medium ${msg.includes('success') ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'}`}>
                {msg}
              </div>
            )}

        {/* Profile Info */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-md border border-slate-100 dark:border-slate-700" style={{ animation: 'fadeUp 0.4s ease-out' }}>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Profile Information</h3>
          <form onSubmit={saveProfile} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1 block">Full Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name" className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1 block">Department</label>
              <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Department" className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" />
            </div>
            {user?.role === 'STUDENT' && (
              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1 block">Semester</label>
                <input type="number" value={semester} onChange={(e) => setSemester(parseInt(e.target.value))} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" />
              </div>
            )}
            <button type="submit" disabled={saving} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all disabled:opacity-50">
              Save Changes
            </button>
          </form>
        </div>

        {/* Academic Setup */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-md border border-slate-100 dark:border-slate-700" style={{ animation: 'fadeUp 0.4s ease-out 0.1s both' }}>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Academic Setup</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => {
                    setYear(y);
                    const sems = YEAR_SEMESTER_MAP[y];
                    if (!sems.includes(semester)) setSemester(sems[0]);
                    setSubject('');
                  }}
                  className={`p-3 rounded-xl border-2 text-center transition-all ${
                    year === y
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-blue-300'
                  }`}
                >
                  <span className="text-lg font-bold block">{y} Year</span>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              {(YEAR_SEMESTER_MAP[year] || []).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSemester(s)}
                  className={`flex-1 p-3 rounded-xl border-2 text-center transition-all ${
                    semester === s
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-blue-300'
                  }`}
                >
                  Sem {s}
                </button>
              ))}
            </div>
            {user?.role === 'TEACHER' && (
              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1 block">Subject</label>
                {Object.keys(subjects).length > 0 ? (
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select subject...</option>
                    {Object.entries(subjects).map(([code, name]) => (
                      <option key={code} value={code}>{name} ({code})</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-slate-400 dark:text-slate-500">No timetable data loaded for this semester.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-md border border-slate-100 dark:border-slate-700" style={{ animation: 'fadeUp 0.4s ease-out 0.15s both' }}>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Change Password</h3>
          <form onSubmit={changePassword} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1 block">Current Password</label>
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Enter current password" className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1 block">New Password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" />
            </div>
            <button type="submit" disabled={saving || !currentPassword || !newPassword} className="bg-slate-800 text-white px-6 py-3 rounded-xl font-semibold hover:bg-slate-900 transition-all disabled:opacity-50">
              Update Password
            </button>
          </form>
        </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </Shell>
  );
}
