"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

const YEAR_SEMESTER_MAP: Record<number, number[]> = {
  1: [1, 2],
  2: [3, 4],
  3: [5, 6],
  4: [7, 8],
};

const DEPARTMENTS = ["Computer Science", "Electronics", "Mechanical", "Civil", "Electrical"];

export default function StudentSetupPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [year, setYear] = useState<number | null>(null);
  const [department, setDepartment] = useState("");
  const [semester, setSemester] = useState<number | null>(null);
  const [step, setStep] = useState<"year-dept" | "semester" | "done">("year-dept");
  const [loading, setLoading] = useState(false);
  const [prevSetup, setPrevSetup] = useState(false);

  useEffect(() => {
    const prevY = localStorage.getItem("edutrack_year");
    const prevD = localStorage.getItem("edutrack_department");
    const prevS = localStorage.getItem("edutrack_semester");
    if (prevY && prevD && prevS) {
      setYear(Number(prevY));
      setDepartment(prevD);
      setPrevSetup(true);
      setStep("semester");
    }
  }, []);

  function handleYearDept(y: number, d: string) {
    setYear(y);
    setDepartment(d);
    setSemester(null);
    setStep("semester");
  }

  function handleSemesterSelect(s: number) {
    setSemester(s);
  }

  async function finishSetup() {
    if (!year || !semester || !department) return;
    setLoading(true);
    try {
      await api("/api/me", {
        method: "PUT",
        body: JSON.stringify({ year, department, semester }),
      });
      localStorage.setItem("edutrack_year", String(year));
      localStorage.setItem("edutrack_department", department);
      localStorage.setItem("edutrack_semester", String(semester));
      setStep("done");
      setTimeout(() => router.push("/student/dashboard"), 800);
    } catch {
      setLoading(false);
    }
  }

  if (step === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-slate-900 px-4">
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">You're In!</h2>
          <p className="text-slate-500 dark:text-slate-400">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-slate-900 px-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img src="/logo.svg" alt="" className="w-10 h-10" />
            <h1 className="text-2xl font-extrabold text-blue-600">EDUTrack</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {prevSetup
              ? "New semester? Update your current semester below."
              : `Welcome, ${user?.name?.split(" ")[0]}! Let's set up your academic profile.`}
          </p>
        </div>

        {!prevSetup && (
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-blue-600 text-white">1</div>
            <div className="w-6 h-0.5 bg-gray-200 dark:bg-slate-700" />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${(step as string) === "semester" || (step as string) === "done" ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-slate-500"}`}>2</div>
          </div>
        )}

        {step === "year-dept" && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 text-center">Your Year & Department</h2>
            <div className="mb-5">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2 block">Year</label>
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((y) => (
                  <button
                    key={y}
                    onClick={() => setYear(y)}
                    className={`p-4 rounded-2xl border-2 text-center transition-all ${
                      year === y
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-200 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-500 bg-gray-50 dark:bg-slate-900 hover:shadow-md"
                    }`}
                  >
                    <span className="text-2xl font-bold text-blue-600">{y}</span>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {y === 1 ? "1st Year" : y === 2 ? "2nd Year" : y === 3 ? "3rd Year" : "4th Year"} BE
                    </p>
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-5">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2 block">Department</label>
              <div className="grid grid-cols-1 gap-2">
                {DEPARTMENTS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDepartment(d)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      department === d
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                        : "border-gray-200 dark:border-slate-600 hover:border-blue-300 bg-gray-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => handleYearDept(year!, department)}
              disabled={!year || !department}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              Next →
            </button>
          </div>
        )}

        {(step === "semester" || prevSetup) && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 text-center">
              {prevSetup ? "Which semester are you in now?" : `Choose your semester`}
              <span className="text-blue-600 block text-sm">Year {year} {department ? `| ${department}` : ""}</span>
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {(YEAR_SEMESTER_MAP[year!] || []).map((s) => (
                <button
                  key={s}
                  onClick={() => handleSemesterSelect(s)}
                  className={`p-6 rounded-2xl border-2 text-center transition-all ${
                    semester === s
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-200 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-500 bg-gray-50 dark:bg-slate-900 hover:shadow-md hover:-translate-y-0.5"
                  }`}
                >
                  <span className="text-3xl font-bold text-blue-600">{s}</span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {s % 2 === 1 ? `${s}th Semester (Odd)` : `${s}th Semester (Even)`}
                  </p>
                </button>
              ))}
            </div>
            <button
              onClick={finishSetup}
              disabled={!semester || loading}
              className="w-full mt-6 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              {loading ? "Saving..." : prevSetup ? "Update Semester →" : "Confirm & Continue →"}
            </button>
            {!prevSetup && (
              <button onClick={() => setStep("year-dept")} className="mt-2 text-sm text-blue-600 hover:underline w-full text-center">
                ← Change year or department
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
