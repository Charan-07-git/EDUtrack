// ─── Loader: Full-page Loading Spinner ───────────────────────────────────────
// Displays a centered spinning animation with "Loading..." text.
// Used as a fallback while data is being fetched (e.g. during page transitions
// or async data loading).
// ──────────────────────────────────────────────────────────────────────────────

export default function Loader() {
  return (
    // Vertically and horizontally centred container occupying at least 50vh
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center">
        {/* Spinning circle — a 48px ring with a transparent top segment creates
            the classic CSS-only spinner animation via Tailwind's animate-spin. */}
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="mt-4 text-slate-400 text-sm font-medium">Loading...</p>
      </div>
    </div>
  );
}
