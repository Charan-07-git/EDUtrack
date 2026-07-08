// ─── API Helper Module ────────────────────────────────────────────────────────
// Centralised fetch wrapper for all backend API calls.
// Automatically picks the correct base URL and attaches the JWT auth header.
// ──────────────────────────────────────────────────────────────────────────────

// Select the backend base URL based on environment:
// - Local dev (localhost) → local Express server on port 4000
// - Production/deployed  → Render-hosted backend
const API = typeof window !== "undefined" && location.hostname === "localhost"
  ? "http://localhost:4000"
  : "https://edutrack-7yt9.onrender.com";

// ─── token() ─────────────────────────────────────────────────────────────────
// Retrieves the JWT from localStorage. Returns null during SSR (server-side
// rendering) since localStorage is not available on the server.
export function token() {
  return typeof window === "undefined"
    ? null
    : localStorage.getItem("edutrack_token");
}

// ─── api() ───────────────────────────────────────────────────────────────────
// Generic fetch helper used by every API call in the app.
// @param path  - The API endpoint path (e.g. "/api/me").
// @param opts  - Optional fetch configuration (method, body, headers, etc.).
//
// Steps:
//   1. Construct the full URL by prepending API base to path.
//   2. Merge default headers (Content-Type + optional Authorization) with any
//      custom headers from opts.
//   3. If the response is not OK (4xx/5xx), parse the error body and throw.
//   4. On success, parse and return the JSON body.
export async function api(path: string, opts: any = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || "Request failed");
  }

  return res.json();
}

export { API };
