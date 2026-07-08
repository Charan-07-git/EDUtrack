'use client';
import Shell from '@/components/Shell';
import BackButton from '@/components/BackButton';
import { api } from '@/lib/api';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

/**
 * Settings page — lets the user edit their profile, set academic year/semester,
 * change password, upload a profile photo, register face photos for attendance,
 * and delete their account.
 */

// Maps academic year (1-4) to the semester numbers that belong to that year
const YEAR_SEMESTER_MAP: Record<number, number[]> = {
  1: [1, 2],
  2: [3, 4],
  3: [5, 6],
  4: [7, 8],
};

// Currently only CSE is available as a department
const DEPARTMENTS = ["CSE"];

export default function Page() {
  // User object and logout function from AuthContext
  const { user, logout } = useAuth();

  // ── Profile Information fields ──
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');

  // ── Academic Setup fields ──
  const [semester, setSemester] = useState(5);
  const [year, setYear] = useState<number>(3);
  const [subject, setSubject] = useState('');             // selected subject code (teacher)
  const [subjects, setSubjects] = useState<Record<string, string>>({}); // available subjects from API

  // ── Change Password fields ──
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // ── Saving / loading states ──
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAcademic, setSavingAcademic] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [loading, setLoading] = useState(true);

  // ── Feedback messages (one per section) ──
  const [profileMsg, setProfileMsg] = useState('');
  const [academicMsg, setAcademicMsg] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');

  // ── Profile photo ──
  const [uploading, setUploading] = useState(false);

  // ── Delete account ──
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(''); // must type "DELETE" to confirm

  // ── Face registration (student only) ──
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [facePhotos, setFacePhotos] = useState<string[]>([]);   // captured data URLs
  const [capturing, setCapturing] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [savingFacePhotos, setSavingFacePhotos] = useState(false);
  const [faceMsg, setFaceMsg] = useState('');
  const router = useRouter();

  /**
   * Fallback timeout — if user data hasn't loaded after 3 seconds, show an
   * error message instead of leaving the user staring at a spinner forever.
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!user) {
        setLoading(false);
        setProfileMsg('Could not load user data. Please try logging in again.');
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [user]);

  /**
   * Once user data is available, populate all form fields and fetch the list
   * of available subjects for the current semester from the API.
   */
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
    }
  }, [user]);

  /**
   * saveProfile — sends name and department to the backend via PUT /api/me.
   * Called when the user submits the "Profile Information" form.
   */
  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg('');
    try {
      await api('/api/me', {
        method: 'PUT',
        body: JSON.stringify({ name, department }),
      });
      setProfileMsg('Profile updated successfully');
    } catch (err: any) {
      setProfileMsg(err.message || 'Failed to update profile');
    }
    setSavingProfile(false);
  }

  /**
   * saveAcademic — saves semester/year (for students) or selectedSubject
   * (for teachers) via PUT /api/me. Also syncs the choices to localStorage
   * so they survive page reloads.
   */
  async function saveAcademic(e: React.FormEvent) {
    e.preventDefault();
    setSavingAcademic(true);
    setAcademicMsg('');
    try {
      const body: any = {};
      if (user?.role === 'STUDENT') {
        body.semester = semester;
        body.year = year;
      }
      if (subject) {
        body.selectedSubject = subject;
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
      setAcademicMsg('Academic info updated successfully');
    } catch (err: any) {
      setAcademicMsg(err.message || 'Failed to update academic info');
    }
    setSavingAcademic(false);
  }

  /**
   * changePassword — validates the three password fields, then sends
   * currentPassword and newPassword to PUT /api/me/password.
   */
  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMsg('');

    if (!currentPassword) {
      setPasswordMsg('Please enter your current password');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg('New passwords do not match');
      return;
    }

    setSavingPassword(true);
    try {
      await api('/api/me/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMsg('Password changed successfully');
    } catch (err: any) {
      setPasswordMsg(err.message || 'Failed to change password');
    }
    setSavingPassword(false);
  }

  /**
   * compressImage — takes a base64 data URL, draws it onto a canvas,
   * resizes it so the longest side is at most maxW, then exports as JPEG
   * at the given quality. Returns a Promise that resolves to the compressed
   * data URL.
   */
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

  /**
   * handlePhotoUpload — triggered when the user picks a file for their
   * profile photo. Validates file size (max 10 MB) and type (must be image),
   * reads it as a data URL, compresses it via compressImage(), then sends it
   * to POST /api/auth/upload-photo. Reloads the page on success so the new
   * photo appears everywhere.
   */
  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setProfileMsg('Photo must be under 10MB'); return; }
    if (!file.type.startsWith('image/')) { setProfileMsg('Please select an image file'); return; }
    setUploading(true);
    setProfileMsg('');
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
          if (!res.ok) { const d = await res.json(); setProfileMsg(d.message || 'Failed to upload'); setUploading(false); return; }
          setProfileMsg('Photo updated successfully');
          setUploading(false);
          window.location.reload();
        } catch { setProfileMsg('Failed to upload'); setUploading(false); }
      };
      reader.onerror = () => { setProfileMsg('Failed to read file'); setUploading(false); };
      reader.readAsDataURL(file);
    } catch { setProfileMsg('Failed to upload'); setUploading(false); }
  }

  /**
   * deleteAccount — sends DELETE /api/me to remove the user's account,
   * then calls logout() and redirects to the login page.
   * Only fires when confirmDelete === "DELETE".
   */
  async function deleteAccount() {
    if (confirmDelete !== 'DELETE') return;
    setDeleting(true);
    setProfileMsg('');
    try {
      await api('/api/me', { method: 'DELETE' });
      logout();
      router.push('/login');
    } catch (err: any) {
      setProfileMsg(err.message || 'Failed to delete account');
      setDeleting(false);
    }
  }

  // ── Camera helpers for face registration ──

  /** startCamera — requests the user's front-facing camera and shows the stream in the <video> element. */
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setCameraStream(stream);
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setFaceMsg('Could not access camera. Please allow camera permissions.');
    }
  }, []);

  /** stopCamera — stops every track of the active camera stream. */
  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }
  }, [cameraStream]);

  /** Cleanup on unmount: make sure the camera is turned off. */
  useEffect(() => {
    return () => { if (cameraStream) cameraStream.getTracks().forEach(t => t.stop()); };
  }, [cameraStream]);

  /** capturePhoto — draws the current video frame onto the hidden canvas and
   *  saves the resulting JPEG data URL into the facePhotos array. */
  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setFacePhotos(prev => [...prev, dataUrl]);
  }

  /** retakePhoto — removes a previously captured photo by its index so the user can try again. */
  function retakePhoto(index: number) {
    setFacePhotos(prev => prev.filter((_, i) => i !== index));
  }

  /**
   * saveFacePhotos — uploads each of the 6 captured face photos to the server one by one,
   * then saves their URLs via PUT /api/me/face-photos. Stops the camera on success.
   */
  async function saveFacePhotos() {
    if (facePhotos.length !== 6) return;
    setSavingFacePhotos(true);
    setFaceMsg('');
    try {
      const token = localStorage.getItem("edutrack_token");
      const uploaded: string[] = [];
      for (let i = 0; i < facePhotos.length; i++) {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/upload-photo`, {
          method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ photoData: facePhotos[i], mimeType: 'image/jpeg' }),
        });
        if (!res.ok) throw new Error('Failed to upload photo ' + (i + 1));
        const d = await res.json();
        uploaded.push(d.user.photoUrl);
      }
      await api('/api/me/face-photos', {
        method: 'PUT',
        body: JSON.stringify({ facePhotos: uploaded }),
      });
      setFaceMsg('All 6 reference photos saved successfully!');
      setFacePhotos([]);
      stopCamera();
    } catch (err: any) {
      setFaceMsg(err.message || 'Failed to save face photos');
    }
    setSavingFacePhotos(false);
  }

  /**
   * MsgBanner — a small inline component that renders a coloured banner
   * (green for success, red for error) when `msg` is non-empty.
   * Checks for the word "success" to decide the colour.
   */
  function MsgBanner({ msg }: { msg: string }) {
    if (!msg) return null;
    const isSuccess = msg.toLowerCase().includes('success');
    return (
      <div className={`p-4 rounded-xl text-sm font-medium ${isSuccess ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'}`}>
        {msg}
      </div>
    );
  }

  return (
    <Shell role={user?.role === 'TEACHER' ? 'teacher' : 'student'} title="Settings">
      <BackButton href={`/${user?.role === 'TEACHER' ? 'teacher' : 'student'}/dashboard`} label="Back to Dashboard" />

      <div className="max-w-2xl space-y-6 mt-6">
        {loading ? (
          // ── Loading spinner ──
          <div className="card text-center py-16">
              <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-muted dark:text-slate-400">Loading settings...</p>
          </div>
        ) : (
          <>
        {/* Profile Info — edit name and department */}
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
            <MsgBanner msg={profileMsg} />
            <button type="submit" disabled={savingProfile} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all disabled:opacity-50">
              {savingProfile ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>

        {/* Academic Setup — pick year/semester (student) or subject (teacher) */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-md border border-slate-100 dark:border-slate-700" style={{ animation: 'fadeUp 0.4s ease-out 0.1s both' }}>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Academic Setup</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Select your current academic year and semester. This sets your registered semester across the application.</p>
          <form onSubmit={saveAcademic} className="space-y-6">
            {user?.role === 'STUDENT' && (
              <>
              {/* Year selector (1-4) */}
              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 block">Academic Year</label>
                <div className="grid grid-cols-4 gap-3">
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
                      <span className="text-lg font-bold block">{y}</span>
                      <span className="text-xs block mt-0.5">Year {y}</span>
                    </button>
                  ))}
                </div>
              </div>
              {/* Semester selector (derived from YEAR_SEMESTER_MAP) */}
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
                      <span className="text-lg font-bold block">Sem {s}</span>
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
            <MsgBanner msg={academicMsg} />
            <button type="submit" disabled={savingAcademic} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all disabled:opacity-50">
              {savingAcademic ? 'Saving...' : 'Save Academic Info'}
            </button>
          </form>
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
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password (min 6 characters)" className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1 block">Confirm New Password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter new password" className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" />
            </div>
            <MsgBanner msg={passwordMsg} />
            <button type="submit" disabled={savingPassword} className="bg-slate-800 text-white px-6 py-3 rounded-xl font-semibold hover:bg-slate-900 transition-all disabled:opacity-50">
              {savingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Profile Photo — upload a new profile picture */}
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

        {/* Face Registration (Student only) — capture 6 reference photos via camera for attendance verification */}
        {user?.role === 'STUDENT' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-md border border-slate-100 dark:border-slate-700" style={{ animation: 'fadeUp 0.4s ease-out 0.25s both' }}>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Capture 6 Photos for Reference</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
              Capture 6 reference photos for face verification during attendance.
            </p>
            {facePhotos.length < 6 && !cameraStream && (
              <button
                onClick={() => { setCapturing(true); startCamera(); }}
                className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-all text-sm"
              >
                Open Camera
              </button>
            )}
            {cameraStream && (
              <div className="space-y-4">
                <div className="relative rounded-2xl overflow-hidden bg-black">
                  <video ref={videoRef} autoPlay playsInline className="w-full max-w-sm mx-auto" />
                </div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  Photo {facePhotos.length + 1} of 6
                </p>
                {facePhotos.length < 6 && (
                  <button
                    onClick={capturePhoto}
                    className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-all text-sm"
                  >
                    Capture Photo {facePhotos.length + 1}
                  </button>
                )}
              </div>
            )}
            {facePhotos.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Captured Photos:</p>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {facePhotos.map((photo, i) => (
                    <div key={i} className="relative group">
                      <img src={photo} alt={`Face ${i + 1}`} className="w-full h-24 rounded-xl object-cover ring-2 ring-blue-400/30" />
                      <button
                        onClick={() => retakePhoto(i)}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                      <p className="text-[10px] text-center mt-1 text-slate-500">Photo {i + 1}</p>
                    </div>
                  ))}
                </div>
                {facePhotos.length === 6 && (
                  <div className="space-y-3">
                    <MsgBanner msg={faceMsg} />
                    <button
                      onClick={saveFacePhotos}
                      disabled={savingFacePhotos}
                      className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition-all disabled:opacity-50 text-sm"
                    >
                      {savingFacePhotos ? 'Saving...' : 'Save All 6 Photos'}
                    </button>
                    <button
                      onClick={() => { stopCamera(); setCapturing(false); }}
                      className="ml-2 bg-white/10 text-slate-600 dark:text-slate-400 px-5 py-2.5 rounded-xl font-semibold hover:bg-white/20 transition-all text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}

        {/* Delete Account — dangerous action; user must type "DELETE" to enable the button */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-md border border-red-200 dark:border-red-900/50" style={{ animation: 'fadeUp 0.4s ease-out 0.3s both' }}>
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
