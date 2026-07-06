'use client';

import Shell from '@/components/Shell';
import { api } from '@/lib/api';
import { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

type Step = 'scan' | 'locating' | 'camera' | 'detecting' | 'saving' | 'done' | 'error';

const STEPS = [
  { key: 'scan', label: 'Scan QR' },
  { key: 'locating', label: 'Location' },
  { key: 'camera', label: 'Face Verify' },
  { key: 'saving', label: 'Save' },
];

export default function Page() {
  const [step, setStep] = useState<Step>('scan');
  const [msg, setMsg] = useState('Point your camera at the teacher\'s QR code');
  const [payload, setPayload] = useState<{ sessionId: string; token: string } | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const photoRef = useRef<string | null>(null);
  const modelsLoaded = useRef(false);
  const faceapiRef = useRef<any>(null);

  useEffect(() => {
    if (step !== 'scan') return;
    const scanner = new Html5QrcodeScanner('reader', { fps: 10, qrbox: 250 }, false);
    scanner.render(
      async (decoded) => {
        scanner.clear();
        try {
          const p = JSON.parse(decoded);
          if (!p.sessionId || !p.token) throw new Error('Invalid QR code');
          setPayload(p);
          setStep('locating');
          setMsg('QR scanned. Getting your location...');
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
              setStep('camera');
              setMsg('Opening front camera for face verification...');
            },
            () => {
              setStep('camera');
              setMsg('Location unavailable. Face verification only...');
            },
            { timeout: 10000 }
          );
        } catch (e: any) {
          setStep('error');
          setMsg(e.message || 'Invalid QR code');
        }
      },
      () => {}
    );
    return () => { scanner.clear().catch(() => {}); };
  }, [step]);

  useEffect(() => {
    if (step !== 'camera') return;
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        if (!modelsLoaded.current) {
          setMsg('Loading face detection model...');
          const faceapi = await import('face-api.js');
          faceapiRef.current = faceapi;
          await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
          modelsLoaded.current = true;
        }
        if (!cancelled) {
          setStep('detecting');
          setMsg('Detecting face...');
          detectFace();
        }
      } catch {
        if (!cancelled) {
          setStep('error');
          setMsg('Camera permission denied or unavailable');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [step]);

  async function detectFace() {
    const video = videoRef.current;
    const faceapi = faceapiRef.current;
    if (!video || !video.videoWidth || !faceapi) {
      setTimeout(detectFace, 500);
      return;
    }

    const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }));

    if (!detection) {
      setMsg('No face detected. Please look at the camera...');
      setTimeout(detectFace, 1000);
      return;
    }

    setMsg('Face detected! Capturing photo...');
    await capturePhoto();
    setStep('saving');
    setMsg('Saving attendance...');
    await saveAttendance();
  }

  async function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    photoRef.current = canvas.toDataURL('image/jpeg', 0.7);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }

  async function saveAttendance() {
    if (!payload) { setStep('error'); setMsg('Missing session data'); return; }
    try {
      const body: any = {
        sessionId: payload.sessionId,
        token: payload.token,
        faceVerified: true,
        facePhoto: photoRef.current,
      };
      if (coords) {
        body.lat = coords.lat;
        body.lng = coords.lng;
      }
      await api('/api/sessions/mark', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setStep('done');
      setMsg('Attendance marked successfully!');
    } catch (e: any) {
      setStep('error');
      setMsg(e.message || 'Failed to mark attendance');
    }
  }

  function reset() {
    setStep('scan');
    setPayload(null);
    setCoords(null);
    photoRef.current = null;
    setMsg('Point your camera at the teacher\'s QR code');
  }

  const stepIndex = STEPS.findIndex((s) => s.key === step || (step === 'detecting' && s.key === 'camera') || (step === 'done' && s.key === 'saving') || (step === 'error' && s.key === 'scan'));

  return (
    <Shell role="student" title="Mark Attendance">
      <div className="max-w-lg mx-auto">
        {/* Progress bar */}
        {step !== 'done' && step !== 'error' && (
          <div className="flex items-center justify-center gap-1 mb-6">
            {STEPS.map((s, i) => {
              const active = i <= stepIndex;
              const current = i === stepIndex;
              return (
                <div key={s.key} className="flex items-center gap-1">
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    current
                      ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 ring-2 ring-blue-300 dark:ring-blue-600'
                      : active
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}>
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                      active && !current ? 'bg-white/30' : current ? 'bg-blue-600 text-white' : 'bg-slate-300 dark:bg-slate-600'
                    }`}>{active && !current ? '✓' : i + 1}</span>
                    {s.label}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`w-6 h-0.5 rounded ${active && i < stepIndex ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Scan QR */}
        {step === 'scan' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden" style={{ animation: 'fadeUp 0.4s ease-out' }}>
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-5 text-center">
              <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white">Scan QR Code</h2>
              <p className="text-blue-200 text-sm mt-1">Point your camera at the teacher&apos;s QR code</p>
            </div>
            <div className="p-6">
              <div id="reader" className="[&_video]:rounded-xl [&_video]:border-2 [&_video]:border-blue-200 dark:[&_video]:border-blue-800 [&_video]:shadow-inner" />
              <div className="flex items-center justify-center gap-2 mt-4 text-xs text-slate-400">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Make sure the QR code is well-lit and centered
              </div>
            </div>
          </div>
        )}

        {/* Locating */}
        {step === 'locating' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-8 text-center" style={{ animation: 'fadeUp 0.4s ease-out' }}>
            <div className="w-20 h-20 mx-auto mb-5 relative">
              <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
              </div>
            </div>
            <div className="animate-spin w-8 h-8 border-[3px] border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-lg font-bold text-slate-900 dark:text-white">{msg}</p>
            <p className="text-sm text-slate-400 mt-2">Verifying your location for attendance radius</p>
          </div>
        )}

        {/* Camera / Detecting Face */}
        {(step === 'camera' || step === 'detecting') && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden" style={{ animation: 'fadeUp 0.4s ease-out' }}>
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-medium text-green-400">Camera Active</span>
              </div>
              <span className="text-xs text-slate-400">{step === 'detecting' ? 'Detecting...' : 'Ready'}</span>
            </div>
            <div className="relative bg-black">
              <video ref={videoRef} autoPlay playsInline muted className="w-full max-h-[360px] object-cover" />
              <canvas ref={canvasRef} className="hidden" />
              {step === 'detecting' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-48 h-48 rounded-full border-2 border-emerald-400/60 animate-pulse shadow-[0_0_30px_rgba(52,211,153,0.3)]" />
                </div>
              )}
              {step === 'camera' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-48 h-48 rounded-full border-2 border-dashed border-white/30" />
                </div>
              )}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur rounded-full px-4 py-2 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${step === 'detecting' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <span className="text-xs text-white font-medium">{msg}</span>
              </div>
            </div>
          </div>
        )}

        {/* Saving */}
        {step === 'saving' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-8 text-center" style={{ animation: 'fadeUp 0.4s ease-out' }}>
            <div className="w-20 h-20 mx-auto mb-5 relative">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="animate-spin w-8 h-8 border-[3px] border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{msg}</p>
            {photoRef.current && (
              <div className="mt-5 inline-block rounded-2xl ring-4 ring-emerald-200 dark:ring-emerald-800 overflow-hidden">
                <img src={photoRef.current} alt="Captured" className="w-28 h-28 object-cover" />
              </div>
            )}
          </div>
        )}

        {/* Done */}
        {step === 'done' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-8 text-center" style={{ animation: 'scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
            <div className="w-24 h-24 mx-auto mb-5">
              <div className="w-full h-full rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mb-2">Success!</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">{msg}</p>
            {photoRef.current && (
              <div className="inline-block rounded-2xl ring-4 ring-emerald-200 dark:ring-emerald-800 overflow-hidden mb-6">
                <img src={photoRef.current} alt="Captured" className="w-24 h-24 object-cover" />
              </div>
            )}
            <div className="flex gap-3 justify-center">
              <button onClick={reset} className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-md shadow-blue-600/20">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                </svg>
                Scan Another
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {step === 'error' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-8 text-center" style={{ animation: 'shake 0.5s ease-out' }}>
            <div className="w-24 h-24 mx-auto mb-5">
              <div className="w-full h-full rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/30">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-extrabold text-red-600 dark:text-red-400 mb-2">Failed</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">{msg}</p>
            <button onClick={reset} className="inline-flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-all shadow-md shadow-red-600/20">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
              </svg>
              Try Again
            </button>
          </div>
        )}
      </div>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.5); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(5px); }
        }
      `}</style>
    </Shell>
  );
}
