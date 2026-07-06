"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TeacherSetupPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/teacher/dashboard");
  }, [router]);

  return null;
}
