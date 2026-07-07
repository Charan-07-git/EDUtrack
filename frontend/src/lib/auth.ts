export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("edutrack_token");
}

export function getUser() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("edutrack_user");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function isAuthenticated() {
  return !!getToken();
}

export function logout() {
  localStorage.removeItem("edutrack_token");
  localStorage.removeItem("edutrack_user");
  window.location.href = "/login";
}
