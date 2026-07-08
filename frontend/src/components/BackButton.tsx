'use client';

// ─── BackButton: Navigate Back or to a Specific Href ─────────────────────────
// Renders a styled back button with an arrow icon. If an href prop is provided,
// clicking navigates to that route. Otherwise it navigates to the previous page
// in the browser history (router.back()).
// ──────────────────────────────────────────────────────────────────────────────

import { useRouter } from 'next/navigation';

// ─── Props ───────────────────────────────────────────────────────────────────
// - href:  Optional route to navigate to. If omitted, uses browser history back.
// - label: Optional custom label text (defaults to "Back").
export default function BackButton({ href, label }: { href?: string; label?: string }) {
  const router = useRouter();

  return (
    <button
      // If href is given, push to that route; otherwise go back in history.
      onClick={() => (href ? router.push(href) : router.back())}
      className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-200 font-medium mb-6 transition-all group"
    >
      {/* Icon container with hover effects */}
      <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center group-hover:bg-slate-50 dark:group-hover:bg-slate-700 group-hover:border-slate-300 dark:group-hover:border-slate-600 transition-all">
        <svg
          className="w-4 h-4 text-slate-400 dark:text-slate-300 group-hover:-translate-x-0.5 transition-transform"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          {/* Left arrow icon */}
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
      </div>
      <span className="text-sm">{label || 'Back'}</span>
    </button>
  );
}
