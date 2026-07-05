"use client";

import { useEffect } from "react";
import { getUser, isAuthenticated } from "@/lib/auth";

export default function StudentPage() {
  useEffect(() => {
    if (!isAuthenticated()) {
      window.location.href = "/login";
      return;
    }

    const user = getUser();

    if (user?.role !== "student") {
      window.location.href = "/";
    }
  }, []);

  return (
    <div>
      <h1>🎓 Student Dashboard</h1>
      <p>Welcome Student!</p>
    </div>
  );
}
