'use client';

// ─── Shell: Main Page Layout / Wrapper ────────────────────────────────────────
// Renders the sidebar, top header bar (with hamburger menu, dark-mode toggle,
// notification bell, and settings), and the page content. Every teacher and
// student page is wrapped inside this component.
// ──────────────────────────────────────────────────────────────────────────────

import Sidebar from './Sidebar';
import Link from 'next/link';
import { useDarkMode } from '@/context/DarkModeContext';
import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/lib/api';

// ─── timeAgo() ───────────────────────────────────────────────────────────────
// Converts a server timestamp string (ISO) into a human-readable relative time
// string (e.g. "5m ago", "2h ago", "3d ago"). Falls back to a date string for
// anything older than 7 days.
function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

// ─── Shell Props ─────────────────────────────────────────────────────────────
// - role:     Determines sidebar links and notification page links.
// - children: The page content rendered in the main content area.
// - title:    Page heading displayed in the top bar.
// - header:   Optional full custom header (replaces title + action buttons).
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
  // Dark mode state + toggle function from DarkModeContext
  const { dark, toggle } = useDarkMode();
  // Link target for the "View all announcements" footer
  const notifHref = role === 'teacher' ? '/teacher/announcements' : '/student/announcements';

  // ─── State Variables ────────────────────────────────────────────────────────
  // unread:        Number of unread notifications (shown as a badge on the bell).
  // notifications: Array of notification objects fetched when dropdown opens.
  // open:          Whether the notification dropdown is currently visible.
  // loadingNotifs: True while notifications are being fetched.
  // sidebarOpen:   Controls sidebar visibility (toggle/overlay).
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  // sidebarOpen: Controls sidebar visibility on all screen sizes.
  // Starts true (open) on desktop so the sidebar is visible by default.
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // Ref to the dropdown container for detecting outside clicks.
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ─── fetchUnread() ──────────────────────────────────────────────────────────
  // Calls GET /api/notifications/unread-count to get the current unread count.
  // Memoised with useCallback so the polling interval can safely reference it.
  const fetchUnread = useCallback(async () => {
    try {
      const d = await api('/api/notifications/unread-count');
      setUnread(d.count);
    } catch {}
  }, []);

  // ─── fetchNotifications() ───────────────────────────────────────────────────
  // Calls GET /api/notifications?limit=10 to load the most recent notifications.
  // Called when the dropdown opens. Memoised with useCallback.
  const fetchNotifications = useCallback(async () => {
    setLoadingNotifs(true);
    try {
      const d = await api('/api/notifications?limit=10');
      setNotifications(d.notifications || []);
    } catch {}
    setLoadingNotifs(false);
  }, []);

  // ─── Polling Effect ────────────────────────────────────────────────────────
  // Fetches the unread count immediately on mount, then polls every 30 seconds
  // to keep the badge count up-to-date. Cleans up the interval on unmount.
  useEffect(() => {
    fetchUnread();
    const id = setInterval(fetchUnread, 30000);
    return () => clearInterval(id);
  }, [fetchUnread]);

  // ─── Dropdown Open/Close Effect ────────────────────────────────────────────
  // When the notification dropdown opens:
  //   - Fetch the latest notifications from the server.
  //   - Add a global mousedown listener to detect clicks outside the dropdown
  //     and close it (click-outside pattern).
  // Cleans up the event listener when dropdown closes or component unmounts.
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClick);
      fetchNotifications();
    }
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, fetchNotifications]);

  // ─── markRead() ─────────────────────────────────────────────────────────────
  // Marks a single notification as read via PUT /api/notifications/:id/read.
  // Optimistically updates local state: sets isRead to true and decrements unread.
  async function markRead(id: string) {
    await api(`/api/notifications/${id}/read`, { method: 'PUT' });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnread((prev) => Math.max(0, prev - 1));
  }

  // ─── markAllRead() ──────────────────────────────────────────────────────────
  // Marks all notifications as read via PUT /api/notifications/read-all.
  // Updates local state: every notification is set to isRead=true and unread goes to 0.
  async function markAllRead() {
    await api('/api/notifications/read-all', { method: 'PUT' });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
  }

  // ─── Notification Bell + Dropdown (notifBadge) ─────────────────────────────
  const notifBadge = (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-slate-600 dark:text-slate-300"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 leading-none">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Notifications</h3>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loadingNotifs ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 text-slate-400 dark:text-slate-500">
                <svg className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
                <p className="text-xs font-medium">No notifications</p>
              </div>
            ) : (
              notifications.map((n) => (
                <Link
                  key={n.id}
                  href={n.link || notifHref}
                  onClick={() => { if (!n.isRead) markRead(n.id); setOpen(false); }}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${!n.isRead ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38a.851.851 0 01-1.09-.273 12.345 12.345 0 01-1.208-2.59m2.433-3.811a12.309 12.309 0 012.384-4.39m-2.384 4.39a12.094 12.094 0 01-1.498 2.091m3.882-2.482a12.094 12.094 0 011.498-2.091m-1.498 2.091c.21.24.414.489.61.749m-2.433 3.811c.258.11.527.192.803.249 1.105.228 2.267.13 3.322-.29m-4.125-9.77a12.3 12.3 0 013.322-.29c1.105.228 2.048.822 2.688 1.626m-6.01 3.434c.47-.58.886-1.204 1.238-1.868m-1.238 1.868a11.97 11.97 0 01-1.238-1.868m3.882 2.482a12.03 12.03 0 012.347 2.168m-2.347-2.168a12.03 12.03 0 01-1.498 2.091m0 0a11.97 11.97 0 01-1.384.126" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!n.isRead ? 'font-semibold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-300'}`}>
                      {n.title}
                    </p>
                    {n.message && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{n.message}</p>
                    )}
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                  {!n.isRead && (
                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-2" />
                  )}
                </Link>
              ))
            )}
          </div>
          <Link
            href={notifHref}
            onClick={() => setOpen(false)}
            className="block text-center text-xs text-blue-600 dark:text-blue-400 font-medium py-2.5 border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50"
          >
            View all announcements
          </Link>
        </div>
      )}
    </div>
  );

  // ─── Main Layout ────────────────────────────────────────────────────────────
  // Structure:
  //   <main>               → full-page wrapper with light/dark background
  //     <Sidebar>          → fixed navigation sidebar (role-aware)
  //     <section>          → content area (offset by sidebar width when open)
  //       {header ?? ...}  → default header with hamburger, title, dark-mode toggle,
  //                          notifications bell, and settings link
  //                          OR a custom header if provided via props
  //       {children}       → the actual page content rendered here
  return (
    <main className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A]">
      <Sidebar role={role} sidebarOpen={sidebarOpen} onCloseSidebar={() => setSidebarOpen(false)} />
      <section className={`${sidebarOpen ? 'lg:ml-72' : 'lg:ml-0'} min-h-screen p-4 pt-20 lg:p-8 lg:pt-8 transition-all duration-300`}>
        {header ?? (
          <div className="flex items-center justify-between mb-4 lg:mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-slate-600 dark:text-slate-300"
                aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
              >
                {sidebarOpen ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                  </svg>
                )}
              </button>
              <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{title}</h1>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={toggle} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-slate-600 dark:text-slate-300" title={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
                {dark ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>
                )}
              </button>
              {notifBadge}
              <Link
                href="/settings"
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-slate-600 dark:text-slate-300"
                title="Settings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.07-.546.369-1.02.802-1.348a6.75 6.75 0 015.188 0c.433.328.732.802.802 1.348M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </Link>
            </div>
          </div>
        )}
        {children}
      </section>
    </main>
  );
}
