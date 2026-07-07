"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

const C = createContext<any>(null);

export const useAuth = () => useContext(C);

function needsSetup(user: any): boolean {
  if (!user) return false;
  if (user.role === "TEACHER") return false;
  const year = user.year || localStorage.getItem("edutrack_year");
  const sem = user.semester || localStorage.getItem("edutrack_semester");
  const dept = user.department || localStorage.getItem("edutrack_department");
  return !year || !sem || !dept;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    if (localStorage.getItem("edutrack_token")) {
      api("/api/me").then((u) => {
        setUser(u);
        if (u && needsSetup(u)) {
          const path = u.role === "TEACHER" ? "/teacher/setup" : "/student/setup";
          router.replace(path);
        }
      }).catch(() => {});
    }
  }, []);

  async function login(email: string, password: string, role: string) {
    const d = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, role }),
    });
    localStorage.setItem("edutrack_token", d.token);
    setUser(d.user);
    if (needsSetup(d.user)) {
      router.replace(d.user.role === "TEACHER" ? "/teacher/setup" : "/student/setup");
    } else {
      router.replace(
        d.user.role === "TEACHER" ? "/teacher/dashboard" : "/student/dashboard"
      );
    }
  }

  async function signup(f: any) {
    const d = await api("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(f),
    });
    localStorage.setItem("edutrack_token", d.token);
    setUser(d.user);
    if (needsSetup(d.user)) {
      router.replace(d.user.role === "TEACHER" ? "/teacher/setup" : "/student/setup");
    } else {
      router.replace(
        d.user.role === "TEACHER" ? "/teacher/dashboard" : "/student/dashboard"
      );
    }
  }

  async function refreshUser() {
    try {
      const u = await api("/api/me");
      setUser(u);
      return u;
    } catch { return null; }
  }

  function logout() {
    localStorage.removeItem("edutrack_token");
    setUser(null);
    router.push("/login");
  }

  return (
    <C.Provider value={{ user, login, signup, refreshUser, logout }}>
      {children}
    </C.Provider>
  );
}
