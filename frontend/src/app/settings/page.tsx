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
      setSemester(user.semester || Number(localStorage.getItem("edutrack_semester")) || 5);
      setYear(user.year || Number(localStorage.getItem("edutrack_year")) || 3);
      setSubject(user.selectedSubject || localStorage.getItem("edutrack_subject") || '');
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
        body: JSON.stringify({ name, department, semester, year }),
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

  function compressImage(dataUrl: string, maxW = 400, quality = 0.7): Promise<string> {
    return new Promise((resolve) => {
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
      };
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

        {/* Profile Photo */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-md border border-slate-100 dark:border-slate-700" style={{ animation: 'fadeUp 0.4s ease-out 0.2s both' }}>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Profile Photo</h3>
          <div className="flex items-center gap-5">
            <div className="h-20 w-20 rounded-2xl overflow-hidden ring-2 ring-blue-400/30">
              <img src={user?.photoUrl || "https://i.pravatar.cc/100"} className="h-full w-full object-cover" alt="Profile" />
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

        {/* Face Registration */}
        {user?.role === 'STUDENT' && (
          <FaceRegisterCard />
        )}

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

function FaceRegisterCard() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [cameraReady, setCameraReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [msg, setMsg] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);

  async function openCamera() {
    setMsg('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
        setCameraOpen(true);
      }
    } catch { setMsg('Camera access denied'); }
  }

  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    const data = canvas.toDataURL('image/jpeg', 0.7);
    setPhotos(prev => [...prev, data]);
  }

  function closeCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
    setCameraOpen(false);
  }

  function compressImage(dataUrl: string, maxW = 400, quality = 0.6): Promise<string> {
    return new Promise((resolve) => {
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
      img.src = dataUrl;
    });
  }

  async function dataUrlToCanvas(dataUrl: string): Promise<HTMLCanvasElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        c.getContext('2d')!.drawImage(img, 0, 0);
        resolve(c);
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  async function save() {
    if (photos.length < 6) return;
    setProcessing(true);
    setMsg('');
    try {
      const faceapi = await import('face-api.js');
      console.log('[FaceRegister] Loading models...');
      await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
      await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
      await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
      console.log('[FaceRegister] Models loaded');

      const descriptors: Float32Array[] = [];
      for (let i = 0; i < photos.length; i++) {
        try {
          const canvas = await dataUrlToCanvas(photos[i]);
          const det = await faceapi.detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions({ inputSize: 320 }))
            .withFaceLandmarks().withFaceDescriptor();
          if (det?.descriptor) {
            descriptors.push(det.descriptor);
            console.log(`[FaceRegister] Photo ${i + 1}: face detected`);
          } else {
            console.log(`[FaceRegister] Photo ${i + 1}: no face`);
          }
        } catch (e) {
          console.error(`[FaceRegister] Photo ${i + 1} error:`, e);
        }
      }

      if (descriptors.length < 3) {
        setMsg(`Could not detect face clearly in enough photos (${descriptors.length}/3 minimum). Please retake with better lighting.`);
        setProcessing(false);
        return;
      }

      console.log(`[FaceRegister] Computing average of ${descriptors.length} descriptors`);
      const avg = new Float32Array(128);
      for (const d of descriptors) {
        for (let i = 0; i < 128; i++) avg[i] += d[i];
      }
      for (let i = 0; i < 128; i++) avg[i] /= descriptors.length;

      setSaving(true);
      closeCamera();

      const compressedPhoto = await compressImage(photos[photos.length - 1], 400, 0.6);
      console.log('[FaceRegister] Saving to backend...');
      await api('/api/me', { method: 'PUT', body: JSON.stringify({ photoUrl: compressedPhoto }) });
      await api('/api/me/face-descriptor', {
        method: 'PUT',
        body: JSON.stringify({ faceDescriptor: Array.from(avg), photoUrl: compressedPhoto }),
      });
      console.log('[FaceRegister] Done');
      setProcessing(false);
      setSaving(false);
      setMsg('Face registered successfully!');
      setPhotos([]);
      setTimeout(() => window.location.reload(), 1500);
    } catch (e: any) {
      console.error('[FaceRegister] Error:', e);
      setMsg(e?.message || 'Failed to process face data');
      setProcessing(false);
      setSaving(false);
    }
  }

  function removePhoto(idx: number) {
    setPhotos(prev => prev.filter((_, i) => i !== idx));
  }

  useEffect(() => {
    return () => { if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); };
  }, []);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-md border border-slate-100 dark:border-slate-700" style={{ animation: 'fadeUp 0.4s ease-out 0.22s both' }}>
      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Face Registration</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        Take at least 6 photos from different angles for attendance verification.
      </p>

      {msg && (
        <div className={`p-3 rounded-xl text-sm font-medium mb-4 ${msg.includes('success') ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'}`}>
          {msg}
        </div>
      )}

      {cameraOpen && (
        <div>
          <div className="relative bg-black rounded-2xl overflow-hidden mb-3">
            <video ref={videoRef} autoPlay playsInline muted className="w-full max-h-[280px] object-cover" />
            <canvas ref={canvasRef} className="hidden" />
            {!cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-white/50 border-t-transparent rounded-full" />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {photos.length} / 6 photos
            </span>
            <div className="flex gap-2">
              <button onClick={capturePhoto} disabled={!cameraReady} className="w-14 h-14 rounded-full bg-white/80 hover:bg-white text-slate-900 shadow-lg transition-all disabled:opacity-40 flex items-center justify-center">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                </svg>
              </button>
              <button onClick={closeCamera} className="w-14 h-14 rounded-full bg-red-500/80 hover:bg-red-500 text-white shadow-lg transition-all flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {photos.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
              {photos.map((p, i) => (
                <div key={i} className="relative shrink-0">
                  <img src={p} alt={`Capture ${i + 1}`} className="w-16 h-16 rounded-xl object-cover ring-2 ring-blue-300" />
                  <button onClick={() => removePhoto(i)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center shadow">×</button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={save}
            disabled={photos.length < 6 || saving || processing}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50"
          >
            {processing ? 'Processing face data...' : saving ? 'Saving...' : 'Register Face'}
          </button>
        </div>
      )}

      {!cameraOpen && photos.length === 0 && (
        <button onClick={openCamera} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-all text-sm">
          Open Camera
        </button>
      )}
    </div>
  );
}
