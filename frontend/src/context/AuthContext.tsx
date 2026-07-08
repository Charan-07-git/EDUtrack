"use client";

// ─── AuthContext: Global Authentication State ────────────────────────────────
// Provides login, signup, logout, and user state across the entire app.
// Wraps the app so every component can access the current user without prop drilling.
// ──────────────────────────────────────────────────────────────────────────────

import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

// Create the context object. 'C' holds user state + auth methods.
// 'any' is used for simplicity; a real app would define a proper User interface.
const C = createContext<any>(null);

// Custom hook for consuming the auth context.
// Any component calling useAuth() gets { user, login, signup, refreshUser, logout }.
export const useAuth = () => useContext(C);

// ─── needsSetup() ────────────────────────────────────────────────────────────
// Checks whether the user still needs to complete their one-time profile setup.
// Teachers are always considered set up (they have no year/semester/department).
// For students, we check if year, semester, and department are all present
// (falling back to localStorage in case the server response is incomplete).
function needsSetup(user: any): boolean {
  if (!user) return false;
  if (user.role === "TEACHER") return false;
  const year = user.year || localStorage.getItem("edutrack_year");
  const sem = user.semester || localStorage.getItem("edutrack_semester");
  const dept = user.department || localStorage.getItem("edutrack_department");
  return !year || !sem || !dept;
}

// ─── AuthProvider Component ──────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Stores the currently logged-in user object (or null when logged out).
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  // ─── Initialisation Effect ──────────────────────────────────────────────────
  // Runs once on mount (empty dependency array). If a JWT token exists in
  // localStorage, it calls GET /api/me to verify the token and re-hydrate the
  // user state. If the token is invalid/expired, we clean up localStorage so
  // the user is forced to log in again.
  useEffect(() => {
    if (localStorage.getItem("edutrack_token")) {
      api("/api/me").then((u) => {
        setUser(u);
        if (u) localStorage.setItem("edutrack_user", JSON.stringify(u));
        if (u && needsSetup(u)) {
          const path = u.role === "TEACHER" ? "/teacher/setup" : "/student/setup";
          router.replace(path);
        }
      }).catch(() => {
        localStorage.removeItem("edutrack_token");
        localStorage.removeItem("edutrack_user");
      });
    }
  }, []);

  // ─── login() ────────────────────────────────────────────────────────────────
  // Sends email + password + role to POST /api/auth/login.
  // On success, stores the JWT token and user object in localStorage, updates
  // the user state, and redirects to the appropriate dashboard (or setup page).
  async function login(email: string, password: string, role: string) {
    const d = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, role }),
    });
    localStorage.setItem("edutrack_token", d.token);
    if (d.user) localStorage.setItem("edutrack_user", JSON.stringify(d.user));
    setUser(d.user);
    if (needsSetup(d.user)) {
      router.replace(d.user.role === "TEACHER" ? "/teacher/setup" : "/student/setup");
    } else {
      router.replace(
        d.user.role === "TEACHER" ? "/teacher/dashboard" : "/student/dashboard"
      );
    }
  }

  // ─── signup() ───────────────────────────────────────────────────────────────
  // Sends the registration form data to POST /api/auth/signup.
  // Behaves the same as login afterwards: stores token, sets user, redirects.
  async function signup(f: any) {
    const d = await api("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(f),
    });
    localStorage.setItem("edutrack_token", d.token);
    if (d.user) localStorage.setItem("edutrack_user", JSON.stringify(d.user));
    setUser(d.user);
    if (needsSetup(d.user)) {
      router.replace(d.user.role === "TEACHER" ? "/teacher/setup" : "/student/setup");
    } else {
      router.replace(
        d.user.role === "TEACHER" ? "/teacher/dashboard" : "/student/dashboard"
      );
    }
  }

  // ─── refreshUser() ──────────────────────────────────────────────────────────
  // Re-fetches the current user from GET /api/me. Useful after profile updates
  // (e.g. photo change, setup completion) to sync the UI with the server.
  // Returns the user object so callers can await it, or null on error.
  async function refreshUser() {
    try {
      const u = await api("/api/me");
      setUser(u);
      if (u) localStorage.setItem("edutrack_user", JSON.stringify(u));
      return u;
    } catch { return null; }
  }

  // ─── logout() ───────────────────────────────────────────────────────────────
  // Clears the JWT token and user data from localStorage, resets the user state
  // to null, and redirects to the login page.
  function logout() {
    localStorage.removeItem("edutrack_token");
    localStorage.removeItem("edutrack_user");
    setUser(null);
    router.push("/login");
  }

  // Provide the auth context value to all child components.
  return (
    <C.Provider value={{ user, login, signup, refreshUser, logout }}>
      {children}
    </C.Provider>
  );
}
