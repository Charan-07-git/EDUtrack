import Sidebar from './Sidebar';
import Link from 'next/link';

export default function Shell({
  role,
  children,
  title,
  header,
}: {
  role: 'teacher' | 'student';
  children: React.ReactNode;
  title: string;
  header?: React.ReactNode;
}) {
  const notifHref = role === 'teacher' ? '/teacher/announcements' : '/student/announcements';

  const notifBadge = (
    <Link
      href={notifHref}
      className="relative p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-slate-600 dark:text-slate-300"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
      <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 border-2 border-white dark:border-[#0F172A] rounded-full" />
    </Link>
  );

  return (
    <main className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A]">
      <Sidebar role={role} />
      <section className="lg:ml-72 min-h-screen p-4 pt-20 lg:p-8 lg:pt-8">
        {header ?? (
          <div className="flex items-center justify-between mb-4 lg:mb-6">
            <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{title}</h1>
            <div className="flex items-center gap-2">{notifBadge}</div>
          </div>
        )}
        {children}
      </section>
    </main>
  );
}
