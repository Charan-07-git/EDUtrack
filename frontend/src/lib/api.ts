const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export function token() {
  return typeof window === "undefined"
    ? null
    : localStorage.getItem("edutrack_token");
}

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
