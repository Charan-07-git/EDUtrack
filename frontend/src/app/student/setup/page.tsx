"use client";

import { useEffect, useState, useRef } from "react";
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
  const [step, setStep] = useState<"year-dept" | "semester" | "photo" | "done">("year-dept");
  const [loading, setLoading] = useState(false);
  const [prevSetup, setPrevSetup] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [photoCaptured, setPhotoCaptured] = useState(false);
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const faceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      setStep("photo");
      setTimeout(() => openCamera(), 500);
    } catch {
      setLoading(false);
    }
  }

  async function openCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      const faceapi = await import('face-api.js');
      await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
      faceIntervalRef.current = setInterval(async () => {
        const video = videoRef.current;
        if (!video || !video.videoWidth || photoCaptured) return;
        const det = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }));
        if (det) {
          clearInterval(faceIntervalRef.current!);
          faceIntervalRef.current = null;
          capturePhoto();
        }
      }, 1000);
    } catch {
      setStep("done");
      setTimeout(() => router.push("/student/dashboard"), 800);
    }
  }

  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    const data = canvas.toDataURL('image/jpeg', 0.7);
    setPhotoData(data);
    setPhotoCaptured(true);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }

  async function savePhoto() {
    if (!photoData) return;
    setSavingPhoto(true);
    try {
      await api('/api/me', { method: 'PUT', body: JSON.stringify({ photoUrl: photoData }) });
      setStep("done");
      setTimeout(() => router.push("/student/dashboard"), 800);
    } catch {
      setSavingPhoto(false);
    }
  }

  function retakePhoto() {
    setPhotoCaptured(false);
    setPhotoData(null);
    openCamera();
  }

  useEffect(() => {
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (faceIntervalRef.current) clearInterval(faceIntervalRef.current);
    };
  }, []);

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

        {/* Photo capture */}
        {step === "photo" && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 text-center">
              {prevSetup ? "Update Your Face Photo" : "Capture Your Face Photo"}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-4">
              This photo will be used to verify your identity during attendance
            </p>
            <div className="relative bg-black rounded-2xl overflow-hidden mb-4">
              <video ref={videoRef} autoPlay playsInline muted className="w-full max-h-[360px] object-cover" />
              <canvas ref={canvasRef} className="hidden" />
              {!photoCaptured && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-48 h-48 rounded-full border-2 border-dashed border-white/30" />
                </div>
              )}
              {!photoCaptured && !photoData && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur rounded-full px-4 py-2">
                  <span className="text-xs text-white">Look at the camera...</span>
                </div>
              )}
            </div>
            {photoData && (
              <div className="text-center mb-4">
                <div className="inline-block rounded-2xl ring-4 ring-blue-200 dark:ring-blue-800 overflow-hidden shadow-xl">
                  <img src={photoData} alt="Captured" className="w-48 h-48 object-cover" />
                </div>
              </div>
            )}
            <div className="flex gap-3 justify-center">
              {photoData ? (
                <>
                  <button onClick={retakePhoto} className="px-5 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold rounded-xl transition-all text-sm">
                    Retake
                  </button>
                  <button onClick={savePhoto} disabled={savingPhoto} className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/30 text-sm disabled:opacity-50">
                    {savingPhoto ? "Saving..." : "Save Photo →"}
                  </button>
                </>
              ) : !photoCaptured ? (
                <button onClick={capturePhoto} className="px-6 py-2.5 bg-white/90 text-slate-900 font-bold rounded-xl shadow-lg text-sm hover:bg-white transition-all">
                  Capture
                </button>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
