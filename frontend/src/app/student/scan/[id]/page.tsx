'use client';

import Shell from '@/components/Shell';
import { api } from '@/lib/api';
import { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
// face-api.js loaded dynamically on client to avoid Node.js fs module issues

type Step = 'scan' | 'locating' | 'camera' | 'detecting' | 'saving' | 'done' | 'error';

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

  return (
    <Shell role="student" title="Mark Attendance">
      <div className="max-w-xl mx-auto">
        <div className="card">
          {step === 'scan' && (
            <div>
              <div className="text-center mb-4">
                <span className="text-4xl">📷</span>
                <h2 className="text-xl font-bold mt-2">Scan QR Code</h2>
              </div>
              <div id="reader" />
            </div>
          )}

          {step === 'locating' && (
            <div className="text-center py-12">
              <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-lg font-semibold">{msg}</p>
            </div>
          )}

          {(step === 'camera' || step === 'detecting') && (
            <div className="text-center">
              <div className="relative mx-auto overflow-hidden rounded-2xl bg-black max-w-sm">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-auto" />
                <canvas ref={canvasRef} className="hidden" />
              </div>
              <div className="mt-4 flex items-center justify-center gap-2">
                <div className="animate-pulse w-3 h-3 rounded-full bg-green-500" />
                <p className="font-semibold">{msg}</p>
              </div>
            </div>
          )}

          {step === 'saving' && (
            <div className="text-center py-12">
              <div className="animate-spin w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-lg font-semibold text-emerald-600">{msg}</p>
              {photoRef.current && (
                <img src={photoRef.current} alt="Captured" className="mx-auto mt-4 w-32 h-32 rounded-full object-cover border-4 border-emerald-400" />
              )}
            </div>
          )}

          {step === 'done' && (
            <div className="text-center py-12" style={{ animation: 'scaleIn 0.5s ease-out' }}>
              <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">✅</span>
              </div>
              <p className="text-2xl font-extrabold text-emerald-600">{msg}</p>
              {photoRef.current && (
                <img src={photoRef.current} alt="Captured" className="mx-auto mt-4 w-24 h-24 rounded-full object-cover border-4 border-emerald-400" />
              )}
              <button onClick={reset} className="btn-primary mt-6">Scan Another</button>
            </div>
          )}

          {step === 'error' && (
            <div className="text-center py-12">
              <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">❌</span>
              </div>
              <p className="text-lg font-bold text-red-600">{msg}</p>
              <button onClick={reset} className="btn-primary mt-6">Try Again</button>
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </Shell>
  );
}
