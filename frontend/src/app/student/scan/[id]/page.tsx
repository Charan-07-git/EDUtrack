'use client';

// Import shared UI components
import Shell from '@/components/Shell';
import BackButton from '@/components/BackButton';
// Import API helper function and server URL
import { api, API } from '@/lib/api';
import { useEffect, useState, useRef } from 'react';
// Library for scanning QR codes from camera
import { Html5Qrcode } from 'html5-qrcode';

// The different screens (steps) in the attendance flow, one at a time
type Step = 'scan' | 'camera' | 'captured' | 'validating' | 'confirm' | 'saving' | 'success' | 'error';

// Fixed campus centre coordinates (used to check if the student is nearby)
const CAMPUS_LAT = Number(process.env.NEXT_PUBLIC_CAMPUS_LAT) || 17.411;
const CAMPUS_LNG = Number(process.env.NEXT_PUBLIC_CAMPUS_LNG) || 78.529;
// Maximum allowed distance from campus in metres (3 km)
const MAX_DISTANCE = 3000;

// Haversine formula: calculates the great-circle distance in metres between two lat/lng points
function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371000; // Earth radius in metres
  const toRad = (d: number) => (d * Math.PI) / 180; // Convert degrees to radians
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  // Haversine formula
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export default function Page({ params }: { params: { id: string } }) {
  const { id } = params;

  // State machine: which step of the flow is currently shown
  const [step, setStep] = useState<Step>('scan');
  // Message to display on screen (status / instructions)
  const [msg, setMsg] = useState('Point camera at the QR code');
  // Decoded QR payload: session ID and security token
  const [payload, setPayload] = useState<{ sessionId: string; token: string } | null>(null);
  // Student's GPS coordinates obtained during location validation
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  // Session expiry timestamp in ms (used to reject expired QR codes)
  const [qrExpiresAt, setQrExpiresAt] = useState<number | null>(null);
  // Text of the validation error if location or expiry check fails
  const [validationError, setValidationError] = useState('');
  // Refs to DOM elements for the selfie camera
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // The active camera stream (so we can stop it later)
  const streamRef = useRef<MediaStream | null>(null);
  // Captured selfie stored as a base64 data URI
  const photoRef = useRef<string | null>(null);
  // The Html5Qrcode scanner instance (for starting/stopping)
  const scannerRef = useRef<Html5Qrcode | null>(null);
  // Whether the QR camera is currently active
  const [scanning, setScanning] = useState(false);

  // On mount, fetch the session to read the expiry time
  useEffect(() => {
    if (id) {
      api(`/api/sessions/${id}`).then((session: any) => {
        if (session.expiresAt) {
          setQrExpiresAt(new Date(session.expiresAt).getTime());
        }
      }).catch(() => {});
    }
  }, [id]);

  // Called when the QR scanner successfully reads a code
  // Stops the scanner, parses JSON, and moves to the camera step
  function onQrScanned(decoded: string) {
    stopScanner();
    try {
      const p = JSON.parse(decoded);
      if (!p.sessionId || !p.token) throw new Error('Invalid QR code');
      setPayload(p);
      setMsg('QR scanned! Opening camera...');
      setStep('camera');
    } catch (e: any) {
      setStep('error');
      setMsg(e.message || 'Invalid QR code');
    }
  }

  // Create the Html5Qrcode instance when we enter the "scan" step
  useEffect(() => {
    if (step === 'scan') {
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;
    }
    // Cleanup: stop the scanner when leaving this step or unmounting
    return () => {
      stopScanner();
    };
  }, [step]);

  // Activate the QR scanner: enumerate cameras, pick the back camera, start scanning
  async function openScanner() {
    const scanner = scannerRef.current;
    if (!scanner) return;
    setScanning(true);
    setMsg('Opening camera...');
    try {
      const cameras = await Html5Qrcode.getCameras();
      // Prefer back-facing camera, fall back to the first available
      const backCam = cameras.find(c => c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('environment')) || cameras[0];
      if (!backCam) throw new Error('No camera found');
      await scanner.start(
        { deviceId: backCam.id },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        onQrScanned,   // callback when a QR is decoded
        () => {}        // ignored – non-decode frames
      );
      setMsg('Point camera at the QR code');
    } catch (e: any) {
      setStep('error');
      setMsg(e?.message || 'Failed to open camera');
      setScanning(false);
    }
  }

  // Stop the QR scanner if it is running
  function stopScanner() {
    setScanning(false);
    const sc = scannerRef.current;
    if (sc) {
      try { sc.stop(); } catch {}
    }
  }

  // Automatically stop scanner when we navigate away from the scan step
  useEffect(() => {
    if (step !== 'scan') {
      stopScanner();
    }
  }, [step]);

  // When the "camera" step is entered, open the front-facing camera for selfie capture
  useEffect(() => {
    if (step !== 'camera') return;
    let cancelled = false;
    (async () => {
      try {
        setMsg('Capturing photo...');
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (e: any) {
        if (!cancelled) {
          setStep('error');
          setMsg(e?.message || 'Camera permission denied or unavailable');
        }
      }
    })();
    // Cleanup: stop the camera stream when leaving the camera step
    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, [step]);

  // Capture a single frame from the video feed, save it as a JPEG data URI
  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      setStep('error');
      setMsg('Failed to capture photo');
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setStep('error');
      setMsg('Failed to capture photo');
      return;
    }
    ctx.drawImage(video, 0, 0);
    photoRef.current = canvas.toDataURL('image/jpeg', 0.7);
    // Stop the camera immediately after capture
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setStep('captured');
    setMsg('Photo captured');
  }

  // Allow the student to retake their selfie (goes back to camera step)
  function retakePhoto() {
    photoRef.current = null;
    setStep('camera');
    setMsg('Capturing photo...');
  }

  // Validate session expiry and GPS location before allowing confirmation
  async function handleDone() {
    setStep('validating');
    setMsg('Validating location and timestamp...');
    setValidationError('');

    // Check if the QR session has expired
    const qrExpiry = qrExpiresAt || Date.now() + 5 * 60 * 1000;
    if (Date.now() > qrExpiry) {
      setValidationError('Attendance session expired. Please scan a new QR code.');
      setStep('error');
      setMsg('Attendance session expired');
      return;
    }

    try {
      // Request GPS position from the browser
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
      });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setCoords({ lat, lng });

      // Calculate distance from campus; reject if too far
      const d = distanceMeters(lat, lng, CAMPUS_LAT, CAMPUS_LNG);
      if (d > MAX_DISTANCE) {
        setValidationError(`Location mismatch. You are ${Math.round(d)}m from campus (max ${MAX_DISTANCE}m).`);
        setStep('error');
        setMsg('Location mismatch');
        return;
      }

      // All checks passed — show confirm screen
      setStep('confirm');
      setMsg('Validation passed. Confirm to mark attendance.');
    } catch (e: any) {
      setValidationError('Location permission denied. Please enable GPS and try again.');
      setStep('error');
      setMsg('Location permission denied');
    }
  }

  // Submit attendance to the server: POST sessionId, token, photo, and optional location
  async function confirmAttendance() {
    setStep('saving');
    setMsg('Saving attendance...');
    if (!payload) {
      setStep('error');
      setMsg('Missing session data');
      return;
    }
    try {
      const body: any = {
        sessionId: payload.sessionId,
        token: payload.token,
        photo: photoRef.current,
      };
      if (coords) {
        body.lat = coords.lat;
        body.lng = coords.lng;
      }
      await api('/api/sessions/mark', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setStep('success');
      setMsg('Attendance Marked Successfully');
    } catch (e: any) {
      setStep('error');
      setMsg(e.message || 'Failed to mark attendance');
    }
  }

  return (
    <Shell role="student" title="Mark Attendance">
      <div className="max-w-lg mx-auto">
        {/* Step indicator — shows QR → Photo → Review → Done progress */}
        {step !== 'success' && step !== 'error' && (
          <div className="flex items-center justify-center gap-1 mb-6">
            {['scan', 'camera', 'captured', 'confirm'].map((s, i) => {
              const order = ['scan', 'camera', 'captured', 'validating', 'confirm', 'saving'];
              const stepIdx = order.indexOf(step);
              const currentStepIdx = order.indexOf(s);
              const active = currentStepIdx <= stepIdx;
              const isCurrent = currentStepIdx === stepIdx;
              const labels: Record<string, string> = { scan: 'QR', camera: 'Photo', captured: 'Review', confirm: 'Done' };
              return (
                <div key={s} className="flex items-center gap-1">
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    isCurrent
                      ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 ring-2 ring-blue-300 dark:ring-blue-600'
                      : active
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}>
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                      active && !isCurrent ? 'bg-white/30' : isCurrent ? 'bg-blue-600 text-white' : 'bg-slate-300 dark:bg-slate-600'
                    }`}>{active && !isCurrent ? '✓' : currentStepIdx + 1}</span>
                    {labels[s] || s}
                  </div>
                  {/* Connector line between steps */}
                  {currentStepIdx < 3 && (
                    <div className={`w-6 h-0.5 rounded ${active && currentStepIdx < stepIdx ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Scan QR — shows the QR reader viewfinder and Start/Stop buttons */}
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
            <div className="p-4">
              <div id="qr-reader" className="rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900/50" />
              <div className="mt-4 flex justify-center gap-3">
                {!scanning ? (
                  <button
                    onClick={openScanner}
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/30 text-sm"
                  >
                    Open Camera
                  </button>
                ) : (
                  <button
                    onClick={stopScanner}
                    className="px-6 py-2.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-500/30 text-sm"
                  >
                    Stop Camera
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Camera — Capture photo: shows a front-facing camera viewfinder with a capture button */}
        {step === 'camera' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden" style={{ animation: 'fadeUp 0.4s ease-out' }}>
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-3 flex items-center justify-center gap-2">
              <span className="text-xs font-medium text-slate-300">Take a live photo for attendance</span>
            </div>
            <div className="relative bg-black">
              <video ref={videoRef} autoPlay playsInline muted className="w-full max-h-[400px] object-cover" />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                <button
                  onClick={capturePhoto}
                  className="w-16 h-16 rounded-full bg-white/80 hover:bg-white border-4 border-white shadow-xl flex items-center justify-center transition-all hover:scale-105"
                >
                  <div className="w-12 h-12 rounded-full bg-white border-2 border-slate-300" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Captured — Review photo and confirm to proceed with validation */}
        {step === 'captured' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden" style={{ animation: 'fadeUp 0.4s ease-out' }}>
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 flex items-center justify-center gap-2">
              <svg className="w-5 h-5 text-white/80" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span className="text-sm font-medium text-white">Photo captured successfully</span>
            </div>
            <div className="p-6 text-center">
              {photoRef.current && (
                <div className="inline-block rounded-2xl ring-4 ring-emerald-200 dark:ring-emerald-800 overflow-hidden mb-4 shadow-xl">
                  <img src={photoRef.current} alt="Captured" className="w-48 h-48 object-cover" />
                </div>
              )}
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Review your photo. Click Done to proceed with location validation.</p>
              <div className="flex gap-3 justify-center">
                <button onClick={retakePhoto} className="px-6 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold rounded-xl transition-all text-sm">
                  Retake
                </button>
                <button onClick={handleDone} className="px-8 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/30 text-sm">
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Validating — Spinner shown while location + session expiry are checked */}
        {step === 'validating' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-8 text-center" style={{ animation: 'fadeUp 0.4s ease-out' }}>
            <div className="w-20 h-20 mx-auto mb-5 relative">
              <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="animate-spin w-8 h-8 border-[3px] border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-lg font-bold text-slate-900 dark:text-white">Validating...</p>
            <p className="text-sm text-slate-400 mt-2">Checking your location and session timestamp</p>
          </div>
        )}

        {/* Confirm — Shows the photo + coordinates and lets the student confirm attendance */}
        {step === 'confirm' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden" style={{ animation: 'scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-5 text-center">
              <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white">Ready to Mark</h2>
              <p className="text-emerald-100 text-sm mt-1">Location and timestamp verified successfully</p>
            </div>
            <div className="p-6 text-center">
              {photoRef.current && (
                <div className="inline-block rounded-2xl ring-4 ring-emerald-200 dark:ring-emerald-800 overflow-hidden mb-4 shadow-lg">
                  <img src={photoRef.current} alt="Captured" className="w-28 h-28 object-cover" />
                </div>
              )}
              {coords && (
                <p className="text-xs text-slate-400 mb-4">
                  Location: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                </p>
              )}
              <button onClick={confirmAttendance} className="w-full px-8 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/30 text-base">
                Confirm to Mark Attendance
              </button>
            </div>
          </div>
        )}

        {/* Saving — Spinner shown while the POST request is in flight */}
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

        {/* Success — Attendance was recorded successfully */}
        {step === 'success' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-8 text-center" style={{ animation: 'scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
            <div className="w-24 h-24 mx-auto mb-5">
              <div className="w-full h-full rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mb-2">Attendance Marked Successfully</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">Your attendance has been recorded</p>
            {photoRef.current && (
              <div className="inline-block rounded-2xl ring-4 ring-emerald-200 dark:ring-emerald-800 overflow-hidden mb-6">
                <img src={photoRef.current} alt="Captured" className="w-24 h-24 object-cover" />
              </div>
            )}
            <BackButton href="/student/today" label="Back to Today's Classes" />
          </div>
        )}

        {/* Error — Displays failure message with retry and back options */}
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
            <p className="text-slate-500 dark:text-slate-400 mb-2">{msg}</p>
            {validationError && (
              <p className="text-sm text-red-500 dark:text-red-400 mb-6 font-medium">{validationError}</p>
            )}
            <div className="flex gap-3 justify-center">
              <BackButton href="/student/today" label="Back to Today's Classes" />
              <button onClick={() => { setStep('scan'); setMsg('Point camera at the QR code'); setPayload(null); setCoords(null); setValidationError(''); photoRef.current = null; }} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all text-sm">
                Try Again
              </button>
            </div>
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
        #qr-reader video { border-radius: 0.75rem !important; }
        #qr-reader img[alt="Info icon"] { display: none !important; }
      `}</style>
    </Shell>
  );
}
