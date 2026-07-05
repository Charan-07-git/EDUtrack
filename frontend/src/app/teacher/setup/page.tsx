"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const YEAR_SEMESTER_MAP: Record<number, number[]> = {
  1: [1, 2],
  2: [3, 4],
  3: [5, 6],
  4: [7, 8],
};

export default function TeacherSetupPage() {
  const { user, login } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<"year" | "semester" | "subject" | "done">("year");
  const [year, setYear] = useState<number | null>(null);
  const [semester, setSemester] = useState<number | null>(null);
  const [subject, setSubject] = useState("");
  const [semestersData, setSemestersData] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api("/api/timetable/semesters")
      .then(setSemestersData)
      .catch(() => {});
  }, []);

  function handleYearSelect(y: number) {
    setYear(y);
    setSemester(null);
    setSubject("");
    setStep("semester");
  }

  function handleSemesterSelect(s: number) {
    setSemester(s);
    setSubject("");
    const sem = semestersData.find((sd) => sd.semester === s);
    setSubjects(sem?.subjects || {});
    setStep("subject");
  }

  function handleSubjectSelect(code: string) {
    setSubject(code);
  }

  async function finishSetup() {
    if (!year || !semester || !subject) return;
    setLoading(true);
    try {
      localStorage.setItem("edutrack_year", String(year));
      localStorage.setItem("edutrack_semester", String(semester));
      localStorage.setItem("edutrack_subject", subject);
      setStep("done");
      setTimeout(() => router.push("/teacher/dashboard"), 800);
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
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">All Set!</h2>
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
          <p className="text-slate-500 dark:text-slate-400 text-sm">Welcome, {user?.name?.split(" ")[0]}! Let's set up your teaching context.</p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-6">
          {["year", "semester", "subject"].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step === s ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-slate-500"
              }`}>{i + 1}</div>
              {i < 2 && <div className="w-6 h-0.5 bg-gray-200 dark:bg-slate-700" />}
            </div>
          ))}
        </div>

        {step === "year" && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 text-center">Which year are you teaching?</h2>
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((y) => (
                <button
                  key={y}
                  onClick={() => handleYearSelect(y)}
                  className="p-6 rounded-2xl border-2 border-gray-200 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-500 bg-gray-50 dark:bg-slate-900 text-center transition-all hover:shadow-md hover:-translate-y-0.5"
                >
                  <span className="text-3xl font-bold text-blue-600">{y}</span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {y === 1 ? "1st Year" : y === 2 ? "2nd Year" : y === 3 ? "3rd Year" : "4th Year"}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "semester" && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 text-center">
              Which semester? <span className="text-blue-600">Year {year}</span>
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {(YEAR_SEMESTER_MAP[year!] || []).map((s) => {
                const hasData = semestersData.some((sd) => sd.semester === s);
                return (
                  <button
                    key={s}
                    onClick={() => handleSemesterSelect(s)}
                    disabled={!hasData}
                    className={`p-6 rounded-2xl border-2 text-center transition-all ${
                      hasData
                        ? "border-gray-200 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-500 bg-gray-50 dark:bg-slate-900 hover:shadow-md hover:-translate-y-0.5"
                        : "border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 opacity-50 cursor-not-allowed"
                    }`}
                  >
                    <span className={`text-3xl font-bold ${hasData ? "text-blue-600" : "text-gray-300 dark:text-slate-600"}`}>{s}</span>
                    <p className={`text-xs mt-1 ${hasData ? "text-slate-500 dark:text-slate-400" : "text-gray-300 dark:text-slate-600"}`}>
                      {s % 2 === 1 ? "Odd Semester" : "Even Semester"}
                      {!hasData && <span className="block text-[10px]">(Data unavailable)</span>}
                    </p>
                  </button>
                );
              })}
            </div>
            <button onClick={() => setStep("year")} className="mt-4 text-sm text-blue-600 hover:underline w-full text-center">
              ← Change year
            </button>
          </div>
        )}

        {step === "subject" && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 text-center">
              Which subject do you teach? <span className="text-blue-600">Sem {semester}</span>
            </h2>
            {Object.keys(subjects).length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-400 dark:text-slate-500 mb-4">No subjects available for this semester.</p>
                <button onClick={() => setStep("semester")} className="text-blue-600 hover:underline text-sm">← Change semester</button>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {Object.entries(subjects).map(([code, name]) => (
                  <button
                    key={code}
                    onClick={() => handleSubjectSelect(code)}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                      subject === code
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-700 bg-gray-50 dark:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{name}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">Code: {code}</p>
                      </div>
                      {subject === code && (
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={finishSetup}
              disabled={!subject || loading}
              className="w-full mt-6 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              {loading ? "Saving..." : "Confirm & Continue →"}
            </button>
            <button onClick={() => setStep("semester")} className="mt-2 text-sm text-blue-600 hover:underline w-full text-center">
              ← Change semester
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
