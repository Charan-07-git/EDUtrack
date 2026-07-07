'use client';

import Shell from '@/components/Shell';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const tiles = [
  {
    href: '/student/overview',
    gradient: 'from-cyan-500 via-blue-500 to-indigo-600',
    shadow: 'shadow-cyan-500/25',
    label: 'Attendance Overview',
    value: '',
    icon: <svg className="w-7 h-7 text-white/40 absolute top-3 right-3" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>,
  },
  {
    href: '/student/timetable',
    gradient: 'from-orange-400 via-amber-500 to-yellow-600',
    shadow: 'shadow-orange-500/25',
    label: 'Timetable',
    sub: 'View full weekly schedule',
    icon: <svg className="w-7 h-7 text-white/40 absolute top-3 right-3" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" /></svg>,
  },
  {
    href: '/student/today',
    gradient: 'from-indigo-500 via-blue-600 to-purple-600',
    shadow: 'shadow-indigo-500/25',
    label: "Today's Classes",
    sub: 'Scan QR and verify',
    icon: <svg className="w-7 h-7 text-white/40 absolute top-3 right-3" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z" /></svg>,
  },
  {
    href: '/student/gamification',
    gradient: 'from-violet-500 via-purple-600 to-pink-500',
    shadow: 'shadow-violet-500/25',
    label: 'Leaderboard',
    sub: 'Rank & streak',
    icon: <svg className="w-7 h-7 text-white/40 absolute top-3 right-3" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 01-2.77.896m0 0a6.022 6.022 0 01-2.77-.896m0 0a6.023 6.023 0 01-2.77-.896" /></svg>,
  },
  {
    href: '/student/goals',
    gradient: 'from-indigo-600 via-purple-600 to-pink-500',
    shadow: 'shadow-purple-500/25',
    label: 'Goals',
    value: 'Reach 75%',
    icon: <svg className="w-7 h-7 text-white/40 absolute top-3 right-3" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  },
];

export default function Page() {
  const { user } = useAuth();
  const router = useRouter();
  const [greeting, setGreeting] = useState('');
  const [setupLabel, setSetupLabel] = useState('');
  const [attPercent, setAttPercent] = useState<number | null>(null);

  useEffect(() => {
    const year = user?.year || Number(localStorage.getItem("edutrack_year"));
    const sem = user?.semester || Number(localStorage.getItem("edutrack_semester"));
    const dept = user?.department || localStorage.getItem("edutrack_department") || "CSE";
    setSetupLabel(year ? `Year ${year} | Semester ${sem} | ${dept}` : 'Set up your academic year');
    if (!year || !sem || !dept) {
      router.replace("/student/setup");
      return;
    }
    api("/api/me").then((u) => { setSetupLabel(`Year ${u.year} | Semester ${u.semester} | ${u.department}`); }).catch(() => {});
    api('/api/student/dashboard').then((data) => {
      const classes = data.classes || [];
      let total = 0, attended = 0;
      classes.forEach((c: any) => {
        total += c.sessions.length;
        attended += c.sessions.filter((s: any) =>
          s.attendances?.some((a: any) => a.studentId === user?.id)
        ).length;
      });
      setAttPercent(total ? Math.round((attended / total) * 100) : null);
    }).catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    function update() {
      const hour = new Date().getHours();
      setGreeting(hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening');
    }
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);

  const header = (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden bg-gradient-to-r from-slate-800 via-slate-700 to-slate-900 rounded-2xl p-4 lg:p-6 mb-4 lg:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-slate-900/20"
    >
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
      <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/5" />
      <div className="relative z-10">
        <h2 className="text-xl lg:text-2xl font-bold text-white">
          {greeting}, {user?.name?.split(' ')[0] || 'Student'}!
        </h2>
        <p className="text-slate-300 text-sm mt-1">
          {setupLabel || 'Loading...'}
        </p>
      </div>
      <div className="relative z-10 flex items-center gap-3">
        <Link href="/settings" className="shrink-0 p-2.5 rounded-xl bg-white/15 hover:bg-white/25 transition-all">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.07-.546.369-1.02.802-1.348a6.75 6.75 0 015.188 0c.433.328.732.802.802 1.348M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </Link>
        <Link
          href="/student/announcements"
          className="relative shrink-0 p-2.5 rounded-xl bg-white/15 hover:bg-white/25 transition-all"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 border-2 border-white dark:border-[#0F172A] rounded-full" />
        </Link>
      </div>
    </motion.div>
  );

  return (
    <Shell role="student" title="Student Dashboard" header={header}>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
        className="grid gap-3 sm:gap-6 md:grid-cols-2 max-w-5xl"
      >
        {tiles.map((t) => {
          const displayValue = t.href === '/student/overview'
            ? (attPercent !== null ? `${attPercent}%` : 'N/A') : t.value;
          return (
          <motion.div
            key={t.href}
            variants={{
              hidden: { opacity: 0, y: 30 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
            }}
          >
            <Link
              href={t.href}
              className={`relative rounded-2xl bg-gradient-to-br ${t.gradient} p-5 lg:p-8 min-h-[120px] lg:min-h-[160px] flex flex-col justify-between cursor-pointer hover:shadow-xl ${t.shadow} hover:-translate-y-1 transition-all duration-300 overflow-hidden group`}
            >
              <div className="absolute -bottom-4 -right-4 w-32 h-32 rounded-full bg-white/5" />
              <div className="absolute -top-6 -left-6 w-24 h-24 rounded-full bg-white/5" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-white/10 to-transparent" />
              {t.icon}
              <div className="relative z-10">
                <p className="text-white/90 text-sm lg:text-base font-semibold">{t.label}</p>
                {t.sub && <p className="text-white/60 text-xs lg:text-sm mt-0.5">{t.sub}</p>}
              </div>
              {displayValue && (
                <p className="relative z-10 text-white text-4xl lg:text-5xl font-extrabold">{displayValue}</p>
              )}
            </Link>
          </motion.div>
          );
        })}
      </motion.div>
    </Shell>
  );
}
