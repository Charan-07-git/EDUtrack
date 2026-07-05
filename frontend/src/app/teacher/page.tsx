"use client";

import { useEffect } from "react";
import { getUser, isAuthenticated } from "@/lib/auth";

export default function TeacherPage() {
  useEffect(() => {
    if (!isAuthenticated()) {
      window.location.href = "/login";
      return;
    }

    const user = getUser();

    if (user?.role !== "teacher") {
      window.location.href = "/";
    }
  }, []);

  return (
    <div>
      <h1>👨‍🏫 Teacher Dashboard</h1>
      <p>Welcome Teacher!</p>
    </div>
  );
}
