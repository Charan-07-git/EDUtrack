'use client';
import Shell from '@/components/Shell';
import BackButton from '@/components/BackButton';
import { api } from '@/lib/api';
import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

const YEAR_SEMESTER_MAP: Record<number, number[]> = {
  1: [1, 2],
  2: [3, 4],
  3: [5, 6],
  4: [7, 8],
};

const DEPARTMENTS = ["CSE"];

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
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

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
      setYear(user.year || 3);
      setSubject(user.selectedSubject || '');
      api("/api/timetable/semesters").then((list: any[]) => {
        const sem = list.find((s: any) => s.semester === (user.semester || Number(localStorage.getItem("edutrack_semester"))));
        if (sem) setSubjects(sem.subjects);
      }).catch(() => {});
      setLoading(false);
      setMsg('');
    }
  }, [user]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      const body: any = { name, department };
      if (user?.role === 'STUDENT') {
        body.semester = semester;
        body.year = year;
      }
      await api('/api/me', {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      if (user?.role === 'STUDENT') {
        localStorage.setItem("edutrack_year", String(year));
        localStorage.setItem("edutrack_semester", String(semester));
      }
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

  function compressImage(dataUrl: string, maxW = 400, quality = 0.7): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        let { width, height } = img;
        if (width > maxW) { height = (maxW / width) * height; width = maxW; }
        canvas.width = width; canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = dataUrl;
    });
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setMsg('Photo must be under 10MB'); return; }
    if (!file.type.startsWith('image/')) { setMsg('Please select an image file'); return; }
    setUploading(true);
    setMsg('');
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const compressed = await compressImage(reader.result as string);
          const token = localStorage.getItem("edutrack_token");
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/upload-photo`, {
            method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ photoData: compressed, mimeType: 'image/jpeg' }),
          });
          if (!res.ok) { const d = await res.json(); setMsg(d.message || 'Failed to upload'); setUploading(false); return; }
          setMsg('Photo updated successfully');
          setUploading(false);
          window.location.reload();
        } catch { setMsg('Failed to upload'); setUploading(false); }
      };
      reader.onerror = () => { setMsg('Failed to read file'); setUploading(false); };
      reader.readAsDataURL(file);
    } catch { setMsg('Failed to upload'); setUploading(false); }
  }

  async function deleteAccount() {
    if (confirmDelete !== 'DELETE') return;
    setDeleting(true);
    setMsg('');
    try {
      await api('/api/me', { method: 'DELETE' });
      logout();
      router.push('/login');
    } catch (err: any) {
      setMsg(err.message || 'Failed to delete account');
      setDeleting(false);
    }
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
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            {user?.role === 'STUDENT' && (
              <p className="text-xs text-slate-400 dark:text-slate-500">Set your year and semester in the Academic Setup section below</p>
            )}
            <button type="submit" disabled={saving} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all disabled:opacity-50">
              Save Changes
            </button>
          </form>
        </div>

        {/* Academic Setup */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-md border border-slate-100 dark:border-slate-700" style={{ animation: 'fadeUp 0.4s ease-out 0.1s both' }}>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Academic Setup</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Select your current academic year and semester. This sets your registered semester across the application.</p>
          <div className="space-y-6">
            {user?.role === 'STUDENT' && (
              <>
              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 block">Academic Year</label>
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
              </div>
              <div className="border-t border-slate-100 dark:border-slate-700" />
              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 block">Current Semester</label>
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
              </div>
              </>
            )}
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

        {/* Profile Photo */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-md border border-slate-100 dark:border-slate-700" style={{ animation: 'fadeUp 0.4s ease-out 0.2s both' }}>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Profile Photo</h3>
          <div className="flex items-center gap-5">
            <div className="h-20 w-20 rounded-2xl overflow-hidden ring-2 ring-blue-400/30">
              <img src={user?.photoUrl || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='12' fill='%23e2e8f0'/%3E%3Ccircle cx='50' cy='35' r='18' fill='%2394a3b8'/%3E%3Cpath d='M12 82c0-22 17-38 38-38s38 16 38 38' fill='%2394a3b8'/%3E%3C/svg%3E"} className="h-full w-full object-cover" alt="Profile" />
            </div>
            <div>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 text-sm"
              >
                {uploading ? 'Uploading...' : 'Change Photo'}
              </button>
              <p className="text-xs text-slate-400 mt-1.5">Max 2MB, JPEG/PNG</p>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
            </div>
          </div>
        </div>

        {/* Delete Account */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-md border border-red-200 dark:border-red-900/50" style={{ animation: 'fadeUp 0.4s ease-out 0.25s both' }}>
          <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-2">Delete Account</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Permanently delete your account and all associated data. This cannot be undone.</p>
          {deleting ? (
            <div className="flex items-center gap-3 py-2">
              <div className="animate-spin w-5 h-5 border-4 border-red-500 border-t-transparent rounded-full" />
              <p className="text-sm font-medium text-red-600">Deleting account...</p>
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1 block">Type <strong>DELETE</strong> to confirm:</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={confirmDelete}
                  onChange={(e) => setConfirmDelete(e.target.value)}
                  placeholder="Type DELETE"
                  className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10"
                />
                <button
                  onClick={deleteAccount}
                  disabled={confirmDelete !== 'DELETE'}
                  className="bg-red-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-red-700 transition-all disabled:opacity-50 text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          )}
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