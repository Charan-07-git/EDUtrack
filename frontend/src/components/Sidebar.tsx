"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useDarkMode } from "@/context/DarkModeContext";
import { useState, useEffect } from "react";

const teacherItems = [
  { label: "Today's Classes", href: "/teacher/today", color: "from-blue-600 to-indigo-500", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg> },
  { label: "Classes & Timetable", href: "/teacher/timetable", color: "from-amber-500 to-orange-500", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg> },
  { label: "Announcements", href: "/teacher/announcements", color: "from-violet-600 to-pink-500", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38a.851.851 0 01-1.09-.273 12.345 12.345 0 01-1.208-2.59m2.433-3.811a12.309 12.309 0 012.384-4.39m-2.384 4.39a12.094 12.094 0 01-1.498 2.091m3.882-2.482a12.094 12.094 0 011.498-2.091m-1.498 2.091c.21.24.414.489.61.749m-2.433 3.811c.258.11.527.192.803.249 1.105.228 2.267.13 3.322-.29m-4.125-9.77a12.3 12.3 0 013.322-.29c1.105.228 2.048.822 2.688 1.626m-6.01 3.434c.47-.58.886-1.204 1.238-1.868m-1.238 1.868a11.97 11.97 0 01-1.238-1.868m3.882 2.482a12.03 12.03 0 012.347 2.168m-2.347-2.168a12.03 12.03 0 01-1.498 2.091m0 0a11.97 11.97 0 01-1.384.126" /></svg> },
  { label: "Session Archive", href: "/teacher/session-archive", color: "from-cyan-500 to-blue-600", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg> },
  { label: "<75% Attendance", href: "/teacher/low-attendance", color: "from-rose-500 to-red-500", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg> },
  { label: "My Subjects", href: "/teacher/subjects", color: "from-green-500 to-emerald-600", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg> },
  { label: "Clear Attendance", href: "/teacher/clear-attendance", color: "from-red-600 to-pink-700", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg> },
];

const studentItems = [
  { label: "Attendance Overview", href: "/student/overview", color: "from-cyan-500 to-blue-600", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg> },
  { label: "Today's Classes", href: "/student/today", color: "from-indigo-500 to-purple-600", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z" /></svg> },
  { label: "Timetable", href: "/student/timetable", color: "from-orange-400 to-amber-500", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" /></svg> },
  { label: "Leaderboard", href: "/student/gamification", color: "from-violet-500 to-pink-500", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 01-2.77.896m0 0a6.022 6.022 0 01-2.77-.896m0 0a6.023 6.023 0 01-2.77-.896" /></svg> },
  { label: "Goals", href: "/student/goals", color: "from-amber-500 to-orange-500", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
];

export default function Sidebar({ role }: { role: "teacher" | "student" }) {
  const p = usePathname();
  const { user, logout } = useAuth();
  const { dark, toggle } = useDarkMode();
  const [uploading, setUploading] = useState(false);
  const [deletingPhoto, setDeletingPhoto] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [photoModal, setPhotoModal] = useState(false);
  const [teacherSemesters, setTeacherSemesters] = useState<number[]>([]);
  const [teacherSem, setTeacherSem] = useState<number | null>(null);
  const [savingSem, setSavingSem] = useState(false);

  useEffect(() => {
    if (role === "teacher") {
      api('/api/timetable/departments').then((d: any[]) => {
        const sems = Array.from(new Set(d.map((s: any) => s.semester))).sort((a, b) => a - b);
        setTeacherSemesters(sems);
        const saved = localStorage.getItem('edutrack_teacher_semester');
        if (saved && sems.includes(Number(saved))) {
          setTeacherSem(Number(saved));
        } else if (sems.length > 0) {
          setTeacherSem(sems[0]);
        }
      });
    }
  }, [role]);

  function handleSidebarSemesterChange(sem: number) {
    setTeacherSem(sem);
    localStorage.setItem('edutrack_teacher_semester', String(sem));
    setSavingSem(true);
    api('/api/me', { method: 'PUT', body: JSON.stringify({ semester: sem }) }).finally(() => setSavingSem(false));
  }

  const items = role === "teacher" ? teacherItems : studentItems;

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
    if (file.size > 10 * 1024 * 1024) { alert("Photo must be under 10MB"); return; }
    if (!file.type.startsWith("image/")) { alert("Please select an image file"); return; }
    setUploading(true);
    setPhotoModal(false);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string);
        const token = localStorage.getItem("edutrack_token");
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/upload-photo`, {
          method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ photoData: compressed, mimeType: "image/jpeg" }),
        });
        if (!res.ok) { const d = await res.json(); alert(d.message || "Failed"); setUploading(false); return; }
        const d = await res.json();
        if (user) user.photoUrl = d.user.photoUrl;
        setUploading(false);
        window.location.reload();
      };
      reader.readAsDataURL(file);
    } catch { alert("Failed"); setUploading(false); }
  }

  async function deletePhoto() {
    setDeletingPhoto(true);
    try {
      const token = localStorage.getItem("edutrack_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/upload-photo`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ photoData: null }),
      });
      if (!res.ok) { alert("Failed to delete photo"); setDeletingPhoto(false); return; }
      if (user) user.photoUrl = null;
      setDeletingPhoto(false);
      setPhotoModal(false);
      window.location.reload();
    } catch { alert("Failed"); setDeletingPhoto(false); }
  }

  return (
    <>
      {/* Mobile Header */}
      <div className="fixed top-0 left-0 right-0 z-50 lg:hidden bg-slate-900 text-white flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="Logo" className="h-8 w-8" />
          <span className="font-bold text-lg">EDUTrack</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-lg hover:bg-white/10">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            {mobileOpen ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-dvh w-72 bg-gradient-to-b from-slate-950 via-slate-900 to-blue-950 text-white p-4 flex flex-col shadow-2xl border-r border-white/5 z-40 transition-transform duration-300 overflow-y-auto scrollbar-hide ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Logo */}
        <Link href={`/${role}/dashboard`} className="flex items-center gap-2 mb-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <img src="/logo.svg" alt="Logo" className="h-5 w-5 brightness-0 invert" />
          </div>
          <span className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">EDUTrack</span>
        </Link>

        {/* User Card */}
        <div className="rounded-2xl bg-gradient-to-br from-white/10 to-white/5 p-3 border border-white/10 backdrop-blur-sm shadow-inner shadow-white/5">
          <div className="flex items-center gap-2">
            <div className="relative group cursor-pointer shrink-0" onClick={() => setPhotoModal(true)}>
              <div className="h-10 w-10 rounded-xl overflow-hidden ring-2 ring-blue-400/30 group-hover:ring-blue-400 transition-all">
                <img src={user?.photoUrl || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='12' fill='%23e2e8f0'/%3E%3Ccircle cx='50' cy='35' r='18' fill='%2394a3b8'/%3E%3Cpath d='M12 82c0-22 17-38 38-38s38 16 38 38' fill='%2394a3b8'/%3E%3C/svg%3E"} className="h-full w-full object-cover" alt="Profile" />
              </div>
              <div className="absolute inset-0 bg-black/60 rounded-xl opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
              </div>
            </div>
            <input id="photo-upload" type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
            <div className="min-w-0">
              <h3 className="font-semibold text-sm text-white truncate">{user?.name || "Welcome"}</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                {role === "teacher" && user?.designation && (
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 rounded-md px-1.5 py-0.5">{user.designation}</span>
                )}
                {role === "teacher" && user?.facultyCode && (
                  <span className="text-[10px] text-blue-300/50">[{user.facultyCode}]</span>
                )}
                {role === "teacher" && teacherSemesters.length > 0 ? (
                  <div className="relative flex-1">
                    <select
                      value={teacherSem ?? ''}
                      onChange={(e) => handleSidebarSemesterChange(Number(e.target.value))}
                      className="appearance-none bg-white/10 text-[10px] text-blue-200 rounded-lg px-1.5 py-0.5 pr-5 border border-white/10 w-full cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-400"
                    >
                      {teacherSemesters.map((sem) => (
                        <option key={sem} value={sem} className="text-slate-900">Sem {sem}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-1">
                      <svg className="w-2.5 h-2.5 text-blue-300/70" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                ) : role !== "teacher" ? (
                  <p className="text-[10px] text-blue-300/70 truncate">{user?.department + " • Sem " + user?.semester}</p>
                ) : null}
                {savingSem && <span className="text-[10px] text-blue-300/50">...</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="mt-3 space-y-0.5 flex-1">
          <Link
            href={`/${role}/dashboard`}
            onClick={() => setMobileOpen(false)}
            className={`group flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 ${
              p === `/${role}/dashboard`
                ? "bg-gradient-to-r from-blue-600/90 to-blue-500/90 text-white shadow-lg shadow-blue-500/20"
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <span className={`shrink-0 w-7 h-7 flex items-center justify-center rounded-lg ${p === `/${role}/dashboard` ? "bg-gradient-to-br from-blue-600 to-indigo-500 text-white shadow-lg" : "bg-white/5 text-slate-400 group-hover:bg-white/10 group-hover:text-white transition-all"}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
            </span>
            Dashboard
            {p === `/${role}/dashboard` && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
          </Link>
          <p className="text-xs font-semibold tracking-widest text-slate-500 uppercase px-3 mb-1 mt-2">Menu</p>
          {items.map((item) => {
            const active = p === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`group flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 ${
                  active
                    ? "bg-gradient-to-r from-blue-600/90 to-blue-500/90 text-white shadow-lg shadow-blue-500/20"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className={`shrink-0 w-7 h-7 flex items-center justify-center rounded-lg ${active ? `bg-gradient-to-br ${item.color} text-white shadow-lg` : "bg-white/5 text-slate-400 group-hover:bg-white/10 group-hover:text-white transition-all"}`}>
                  {item.icon}
                </span>
                {item.label}
                {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
              </Link>
            );
          })}

          {/* Divider */}
          <div className="my-2 border-t border-white/5" />

          {/* Settings */}
          <Link
            href="/settings"
            onClick={() => setMobileOpen(false)}
            className={`group flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 ${
              p === "/settings"
                ? "bg-gradient-to-r from-blue-600/90 to-blue-500/90 text-white shadow-lg shadow-blue-500/20"
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <svg className="w-4 h-4 shrink-0 text-slate-500 group-hover:text-slate-300 transition-colors" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.07-.546.369-1.02.802-1.348a6.75 6.75 0 015.188 0c.433.328.732.802.802 1.348M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </Link>
        </nav>

        {/* Bottom */}
        <div className="mt-auto space-y-1 pt-2 border-t border-white/5">
          <button onClick={toggle} className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white transition-all duration-200 group">
            <svg className="w-4 h-4 shrink-0 text-slate-500 group-hover:text-slate-300 transition-colors" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              {dark ? <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />}
            </svg>
            {dark ? "Light Mode" : "Dark Mode"}
          </button>
          <button onClick={() => { setMobileOpen(false); logout(); }} className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 group">
            <svg className="w-4 h-4 shrink-0 text-slate-500 group-hover:text-red-400 transition-colors" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m0 0H7m6 4a5 5 0 100-10 5 5 0 000 10z" />
            </svg>
            Logout
          </button>
        </div>
      </aside>
      {/* Photo Modal */}
      {photoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setPhotoModal(false)}>
          <div className="bg-slate-900 rounded-2xl p-4 max-w-sm w-full mx-4 shadow-2xl border border-white/10" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center mb-4">
              <img src={user?.photoUrl || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='12' fill='%23e2e8f0'/%3E%3Ccircle cx='50' cy='35' r='18' fill='%2394a3b8'/%3E%3Cpath d='M12 82c0-22 17-38 38-38s38 16 38 38' fill='%2394a3b8'/%3E%3C/svg%3E"} className="w-48 h-48 rounded-2xl object-cover ring-4 ring-blue-500/30" alt="Profile" />
            </div>
            <div className="space-y-2">
              <button
                onClick={() => document.getElementById("photo-upload")?.click()}
                disabled={uploading}
                className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 text-sm"
              >
                {uploading ? "Uploading..." : "Change Photo"}
              </button>
              {user?.photoUrl && (
                <button
                  onClick={deletePhoto}
                  disabled={deletingPhoto}
                  className="w-full py-3 rounded-xl bg-red-600/20 text-red-400 font-semibold hover:bg-red-600/30 transition-all disabled:opacity-50 text-sm"
                >
                  {deletingPhoto ? "Deleting..." : "Delete Photo"}
                </button>
              )}
              <button
                onClick={() => setPhotoModal(false)}
                className="w-full py-3 rounded-xl bg-white/5 text-slate-300 font-semibold hover:bg-white/10 transition-all text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </>
  );
}
