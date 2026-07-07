'use client';

import Shell from '@/components/Shell';
import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import Loader from '@/components/Loader';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';

const tiles = [
  {
    href: '/teacher/today',
    gradient: 'from-blue-600 via-indigo-500 to-purple-600',
    shadow: 'shadow-blue-600/25',
    label: "Today's Classes",
    value: null as null | 'classes',
    icon: <svg className="w-7 h-7 text-white/40 absolute top-3 right-3" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>,
  },
  {
    href: '/teacher/announcements',
    gradient: 'from-violet-600 via-purple-600 to-pink-500',
    shadow: 'shadow-violet-600/25',
    label: 'Announcements',
    sub: 'Post class updates',
    icon: <svg className="w-7 h-7 text-white/40 absolute top-3 right-3" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38a.851.851 0 01-1.09-.273 12.345 12.345 0 01-1.208-2.59m2.433-3.811a12.309 12.309 0 012.384-4.39m-2.384 4.39a12.094 12.094 0 01-1.498 2.091m3.882-2.482a12.094 12.094 0 011.498-2.091m-1.498 2.091c.21.24.414.489.61.749m-2.433 3.811c.258.11.527.192.803.249 1.105.228 2.267.13 3.322-.29m-4.125-9.77a12.3 12.3 0 013.322-.29c1.105.228 2.048.822 2.688 1.626m-6.01 3.434c.47-.58.886-1.204 1.238-1.868m-1.238 1.868a11.97 11.97 0 01-1.238-1.868m3.882 2.482a12.03 12.03 0 012.347 2.168m-2.347-2.168a12.03 12.03 0 01-1.498 2.091m0 0a11.97 11.97 0 01-1.384.126" /></svg>,
  },
  {
    href: '/teacher/session-archive',
    gradient: 'from-cyan-500 via-sky-500 to-blue-600',
    shadow: 'shadow-cyan-500/25',
    label: 'Session Archive',
    sub: 'Past sessions history',
    icon: <svg className="w-7 h-7 text-white/40 absolute top-3 right-3" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>,
  },
  {
    href: '/teacher/low-attendance',
    gradient: 'from-rose-500 via-red-500 to-orange-500',
    shadow: 'shadow-rose-500/25',
    label: '<75% Attendance',
    value: null as null | 'low',
    icon: <svg className="w-7 h-7 text-white/40 absolute top-3 right-3" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>,
  },
  {
    href: '/teacher/timetable',
    gradient: 'from-amber-500 via-orange-500 to-red-500',
    shadow: 'shadow-amber-500/25',
    label: 'Timetable View',
    sub: 'View weekly schedule',
    icon: <svg className="w-7 h-7 text-white/40 absolute top-3 right-3" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>,
  },
];

function AnimatedCounter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const duration = 800;
    const steps = 20;
    const step = to / steps;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setCount(Math.min(Math.round(step * i), to));
      if (i >= steps) clearInterval(id);
    }, duration / steps);
    return () => clearInterval(id);
  }, [visible, to]);

  return <span ref={ref}>{count}{suffix}</span>;
}

export default function Page() {
  const [d, setD] = useState<any>();
  const { user, refreshUser } = useAuth();
  const [setupInfo, setSetupInfo] = useState("");

  useEffect(() => {
    refreshUser();
    api('/api/teacher/dashboard').then(setD).catch(() => {});
  }, []);

  useEffect(() => {
    if (user?.semester) {
      setSetupInfo(`Semester ${user.semester}${user.facultyCode ? ` • ${user.facultyCode}` : ''}`);
    }
  }, [user?.semester, user?.facultyCode]);

  const [greeting, setGreeting] = useState('');

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
      className="relative overflow-hidden bg-gradient-to-r from-slate-800 via-slate-700 to-slate-900 rounded-2xl p-5 lg:p-7 mb-4 lg:mb-8 shadow-lg shadow-slate-900/20"
    >
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
      <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/5" />
      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <div className="shrink-0">
          <div className="h-20 w-20 lg:h-24 lg:w-24 rounded-2xl overflow-hidden ring-4 ring-white/20 shadow-xl">
            <img src={user?.photoUrl || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='12' fill='%23e2e8f0'/%3E%3Ccircle cx='50' cy='35' r='18' fill='%2394a3b8'/%3E%3Cpath d='M12 82c0-22 17-38 38-38s38 16 38 38' fill='%2394a3b8'/%3E%3C/svg%3E"} className="h-full w-full object-cover" alt="Profile" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl lg:text-2xl font-bold text-white">
                {greeting}, {user?.name?.split(' ')[0] || 'Teacher'}!
              </h2>
              <p className="text-slate-300 text-sm mt-1">
                {user?.designation || 'Faculty'} &middot; {user?.department || 'Department'}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-4">
              <Link href="/settings" className="p-2.5 rounded-xl bg-white/15 hover:bg-white/25 transition-all">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.07-.546.369-1.02.802-1.348a6.75 6.75 0 015.188 0c.433.328.732.802.802 1.348M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </Link>
              <Link
                href="/teacher/announcements"
                className="relative p-2.5 rounded-xl bg-white/15 hover:bg-white/25 transition-all"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 border-2 border-white dark:border-[#0F172A] rounded-full" />
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-3 flex-wrap">
            {setupInfo && (
              <div className="flex items-center gap-1.5 text-blue-100 text-xs bg-white/10 rounded-lg px-3 py-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>
                {setupInfo}
              </div>
            )}
            {d && (
              <>
                <div className="flex items-center gap-1.5 text-blue-100 text-xs bg-white/10 rounded-lg px-3 py-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
                  {d.classes.length} Classes
                </div>
                <div className="flex items-center gap-1.5 text-blue-100 text-xs bg-white/10 rounded-lg px-3 py-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
                  {d.classes.reduce((a: any, c: any) => a + c.sessions.length, 0)} Sessions
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );

  function getValue(tile: typeof tiles[0]): number | string {
    if (!d) return '';
    if (tile.value === 'classes') return d.classes.length;
    if (tile.href === '/teacher/low-attendance') return d.lowAttendance?.length || 0;
    return '';
  }

  return (
    <Shell role="teacher" title="Teacher Dashboard" header={header}>
      {!d ? (
        <Loader />
      ) : (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
          className="grid gap-3 sm:gap-6 md:grid-cols-2 max-w-5xl"
        >
          {tiles.map((t, i) => (
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
                <p className="relative z-10 text-white text-4xl lg:text-5xl font-extrabold">
                  {typeof getValue(t) === 'number' ? <AnimatedCounter to={getValue(t) as number} /> : (getValue(t) || '\u2014')}
                </p>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </Shell>
  );
}
