'use client';

import { useEffect, useState, useRef } from 'react';

const TOTAL_SAMPLES = 10;
const MIN_SCORE = 0.6;

interface Props {
  onComplete: (descriptor: number[], photo: string) => void;
  onSkip?: () => void;
}

export default function FaceEnrollment({ onComplete, onSkip }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceapiRef = useRef<any>(null);
  const animationRef = useRef<number>(0);
  const [step, setStep] = useState<'loading' | 'ready' | 'capturing' | 'done' | 'error'>('loading');
  const [msg, setMsg] = useState('Loading face detection...');
  const [samples, setSamples] = useState<number>(0);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const descriptorsRef = useRef<any[]>([]);
  const lastCaptureRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    init();
    return () => {
      mountedRef.current = false;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  async function init() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } });
      if (!mountedRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      const faceapi = await import('face-api.js');
      faceapiRef.current = faceapi;
      setMsg('Loading models...');
      await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
      await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
      await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
      if (mountedRef.current) {
        setMsg('Look straight at the camera');
        setStep('ready');
        detectLoop();
      }
    } catch (e: any) {
      if (mountedRef.current) {
        setStep('error');
        setMsg(e?.message || 'Camera unavailable');
      }
    }
  }

  function captureSample(descriptor: any, photo: string) {
    descriptorsRef.current.push(descriptor);
    setSamples(descriptorsRef.current.length);
    setCapturedPhotos(prev => [photo, ...prev.slice(0, 4)]);
    lastCaptureRef.current = Date.now();
    if (descriptorsRef.current.length >= TOTAL_SAMPLES) {
      finish();
    }
  }

  function finish() {
    setStep('done');
    const all = descriptorsRef.current;
    const avg = Array.from({ length: 128 }, (_, i) =>
      all.reduce((s, d) => s + d[i], 0) / all.length
    );
    const bestPhoto = capturedPhotos[0];
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    onComplete(avg, bestPhoto);
  }

  async function detectLoop() {
    if (!mountedRef.current) return;
    const video = videoRef.current;
    const faceapi = faceapiRef.current;
    if (!video || !video.videoWidth) {
      animationRef.current = requestAnimationFrame(detectLoop);
      return;
    }
    try {
      const det = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.3 }))
        .withFaceLandmarks()
        .withFaceDescriptor();
      if (mountedRef.current && det && det.descriptor && det.score >= MIN_SCORE && video.videoWidth) {
        const box = det.detection.box;
        const cx = box.x + box.width / 2;
        const cy = box.y + box.height / 2;
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        const centered = Math.abs(cx / vw - 0.5) < 0.15 && Math.abs(cy / vh - 0.5) < 0.15;
        if (centered && Date.now() - lastCaptureRef.current > 600) {
          const canvas = canvasRef.current;
          if (canvas) {
            canvas.width = vw;
            canvas.height = vh;
            canvas.getContext('2d')?.drawImage(video, 0, 0);
            const photo = canvas.toDataURL('image/jpeg', 0.6);
            captureSample(Array.from(det.descriptor), photo);
          }
        }
      }
      const remaining = TOTAL_SAMPLES - descriptorsRef.current.length;
      if (remaining > 0) {
        const hints = ['Look straight', 'Turn slightly left', 'Turn slightly right', 'Tilt up', 'Tilt down'];
        setMsg(`${hints[descriptorsRef.current.length % hints.length]} (${samples + 1}/${TOTAL_SAMPLES})`);
      }
    } catch {}
    if (mountedRef.current && descriptorsRef.current.length < TOTAL_SAMPLES) {
      animationRef.current = requestAnimationFrame(detectLoop);
    }
  }

  if (step === 'loading') {
    return (
      <div className="text-center py-8">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-sm text-slate-500">{msg}</p>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="text-center py-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4 mb-4">
          <p className="text-sm text-red-600 dark:text-red-300">{msg}</p>
        </div>
        {onSkip && (
          <button onClick={onSkip} className="px-6 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-sm">
            Skip for now
          </button>
        )}
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-lg font-bold text-green-600 dark:text-green-400">Face Registered!</p>
        <p className="text-xs text-slate-400 mt-1">Saving your facial profile...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="relative bg-black rounded-2xl overflow-hidden mb-4">
        <video ref={videoRef} autoPlay playsInline muted className="w-full max-h-[360px] object-cover" />
        <canvas ref={canvasRef} className="hidden" />
        {step === 'ready' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 rounded-full border-2 border-dashed border-white/40" />
          </div>
        )}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur rounded-full px-4 py-2 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-white">{msg}</span>
        </div>
      </div>
      <div className="flex items-center justify-center gap-2 mb-4">
        {Array.from({ length: TOTAL_SAMPLES }, (_, i) => (
          <div key={i} className={`w-6 h-1.5 rounded-full transition-all ${i < samples ? 'bg-blue-500' : i === samples ? 'bg-blue-300 animate-pulse' : 'bg-slate-200 dark:bg-slate-700'}`} />
        ))}
      </div>
      {capturedPhotos.length > 0 && (
        <div className="flex justify-center gap-2 mb-2">
          {capturedPhotos.slice(0, 5).map((p, i) => (
            <img key={i} src={p} alt="" className="w-10 h-10 rounded-lg object-cover ring-2 ring-blue-200 dark:ring-blue-800" />
          ))}
        </div>
      )}
      <p className="text-xs text-center text-slate-400">Move your head slightly between captures for best results</p>
    </div>
  );
}
