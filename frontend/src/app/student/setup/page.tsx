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
  const { user, refreshUser } = useAuth();
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
  const [photos, setPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState('');

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
    setError('');
    try {
      await api("/api/me", {
        method: "PUT",
        body: JSON.stringify({ year, department, semester }),
      });
      localStorage.setItem("edutrack_year", String(year));
      localStorage.setItem("edutrack_department", department);
      localStorage.setItem("edutrack_semester", String(semester));
      setStep("photo");
      setTimeout(openCamera, 300);
    } catch {
      setLoading(false);
      setError('Failed to save. Check your connection and try again.');
    }
  }

  async function openCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
      }
    } catch {}
  }

  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    const data = canvas.toDataURL('image/jpeg', 0.7);
    setPhotos(prev => [...prev, data]);
  }

  function compressImage(dataUrl: string, maxW = 400, quality = 0.6): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        let { width, height } = img;
        if (width > maxW) { height = (maxW / width) * height; width = maxW; }
        canvas.width = width; canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = dataUrl;
    });
  }

  function dataUrlToCanvas(dataUrl: string): Promise<HTMLCanvasElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        c.getContext('2d')!.drawImage(img, 0, 0);
        resolve(c);
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  async function savePhoto() {
    if (photos.length < 6) return;
    setProcessing(true);
    setError('');
    try {
      const faceapi = await import('face-api.js');
      console.log('[Setup] Loading models...');
      await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
      await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
      await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
      console.log('[Setup] Models loaded');

      const descriptors: Float32Array[] = [];
      for (let i = 0; i < photos.length; i++) {
        try {
          const canvas = await dataUrlToCanvas(photos[i]);
          const det = await faceapi.detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions({ inputSize: 320 }))
            .withFaceLandmarks().withFaceDescriptor();
          if (det?.descriptor) {
            descriptors.push(det.descriptor);
            console.log(`[Setup] Photo ${i + 1}: face detected`);
          } else {
            console.log(`[Setup] Photo ${i + 1}: no face`);
          }
        } catch (e) {
          console.error(`[Setup] Photo ${i + 1} error:`, e);
        }
      }

      if (descriptors.length < 3) {
        setError(`Could not detect face clearly in enough photos (${descriptors.length}/3 minimum). Please retake with better lighting.`);
        setProcessing(false);
        return;
      }

      console.log(`[Setup] Computing average of ${descriptors.length} descriptors`);
      const avg = new Float32Array(128);
      for (const d of descriptors) {
        for (let i = 0; i < 128; i++) avg[i] += d[i];
      }
      for (let i = 0; i < 128; i++) avg[i] /= descriptors.length;

      setSaving(true);
      const compressedPhoto = await compressImage(photos[photos.length - 1], 400, 0.6);
      console.log('[Setup] Saving to backend...');
      await api('/api/me', { method: 'PUT', body: JSON.stringify({ photoUrl: compressedPhoto }) });
      await api('/api/me/face-descriptor', {
        method: 'PUT',
        body: JSON.stringify({ faceDescriptor: Array.from(avg), photoUrl: compressedPhoto }),
      });
      console.log('[Setup] Done');
      setProcessing(false);
      setSaving(false);
      await refreshUser();
      setStep("done");
      setTimeout(() => router.push("/student/dashboard"), 800);
    } catch (e: any) {
      console.error('[Setup] Error:', e);
      setError(e?.message || 'Failed to process photos. Please try again.');
      setProcessing(false);
      setSaving(false);
    }
  }

  function removePhoto(idx: number) {
    setPhotos(prev => prev.filter((_, i) => i !== idx));
  }

  useEffect(() => {
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
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
            {error && (
              <div className="p-3 rounded-xl text-sm font-medium bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 mb-4">
                {error}
              </div>
            )}
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
        <div className={`${step === "photo" ? '' : 'hidden'}`}>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2 text-center">
              {prevSetup ? "Update Your Photos" : "Capture Face Reference"}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-3">
              Take at least 6 photos from different angles
            </p>

            {error && (
              <div className="p-3 rounded-xl text-sm font-medium bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 mb-4">
                {error}
              </div>
            )}

            <div className="relative bg-black rounded-2xl overflow-hidden mb-3">
              <video ref={videoRef} autoPlay playsInline muted className="w-full max-h-[280px] object-cover" />
              <canvas ref={canvasRef} className="hidden" />
              {!cameraReady && step === "photo" && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-spin w-8 h-8 border-2 border-white/50 border-t-transparent rounded-full" />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {photos.length} / 6 photos
              </span>
              <button
                onClick={capturePhoto}
                disabled={!cameraReady}
                className="w-14 h-14 rounded-full bg-white/80 hover:bg-white text-slate-900 shadow-lg transition-all disabled:opacity-40 flex items-center justify-center"
              >
                <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                </svg>
              </button>
            </div>

            {photos.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
                {photos.map((p, i) => (
                  <div key={i} className="relative shrink-0">
                    <img src={p} alt={`Capture ${i + 1}`} className="w-16 h-16 rounded-xl object-cover ring-2 ring-blue-300" />
                    <button
                      onClick={() => removePhoto(i)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center shadow"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={savePhoto}
              disabled={photos.length < 6 || saving || processing}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50"
            >
              {processing ? 'Processing face data...' : saving ? 'Saving...' : 'Save & Finish'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
