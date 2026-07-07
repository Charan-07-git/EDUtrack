'use client';
import Shell from '@/components/Shell';
import BackButton from '@/components/BackButton';
import { api, API } from '@/lib/api';
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { io } from 'socket.io-client';

const FLOW_STEPS = [
  { key: 'SCHEDULED', label: 'Ready', icon: '📅', color: 'from-slate-400 to-slate-500' },
  { key: 'ACTIVE', label: 'Live', icon: '▶️', color: 'from-emerald-500 to-emerald-600' },
  { key: 'QR_ACTIVE', label: 'QR Active', icon: '📱', color: 'from-violet-500 to-violet-600' },
  { key: 'ENDED', label: 'Done', icon: '✅', color: 'from-red-400 to-red-500' },
];

export default function Page() {
  const { id } = useParams();
  const [cls, setCls] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrExpiry, setQrExpiry] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [attendanceCount, setAttendanceCount] = useState(0);
  const [students, setStudents] = useState<any[]>([]);
  const [showAbsent, setShowAbsent] = useState(false);
  const [studentsLoaded, setStudentsLoaded] = useState(false);
  const [photoModal, setPhotoModal] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (id) {
      api(`/api/classes/${id}`).then((classData: any) => {
        setCls(classData);
        if (classData.sessions?.length) {
          setSession(classData.sessions[0]);
          if (classData.sessions[0].status === 'ACTIVE' || classData.sessions[0].status === 'QR_ACTIVE') {
            api(`/api/sessions/${classData.sessions[0].id}/count`).then((d: any) => setAttendanceCount(d.count));
          }
        }
      }).catch(() => {});
    }
  }, [id]);

  useEffect(() => {
    if (session?.id && (session.status === 'ACTIVE' || session.status === 'QR_ACTIVE' || session.status === 'ENDED')) {
      api(`/api/sessions/${session.id}/students`).then((d) => {
        setStudents(d);
        setStudentsLoaded(true);
      });
    }
  }, [session?.id, session?.status]);

  useEffect(() => {
    if (session?.id && (session.status === 'ACTIVE' || session.status === 'QR_ACTIVE')) {
      const socket = io(API);
      socketRef.current = socket;
      socket.emit('join:session', session.id);
      socket.on('attendance:count', async () => {
        const d = await api(`/api/sessions/${session.id}/count`);
        setAttendanceCount(d.count);
        const s = await api(`/api/sessions/${session.id}/students`);
        setStudents(s);
      });

      pollRef.current = setInterval(async () => {
        try {
          const d = await api(`/api/sessions/${session.id}/count`);
          setAttendanceCount(d.count);
          const s = await api(`/api/sessions/${session.id}/students`);
          setStudents(s);
        } catch {}
      }, 5000);

      return () => {
        socket.disconnect();
        socketRef.current = null;
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      };
    }
  }, [session?.id, session?.status]);

  useEffect(() => {
    if (qrExpiry) {
      intervalRef.current = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((qrExpiry - Date.now()) / 1000));
        setCountdown(remaining);
        if (remaining <= 0) {
          clearInterval(intervalRef.current!);
          setQrDataUrl(null);
          setQrExpiry(null);
        }
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [qrExpiry]);

  async function startSession() {
    setLoading(true);
    const created = await api(`/api/sessions/${id}/start`, { method: 'POST' });
    setSession(created);
    setLoading(false);
  }

  async function generateQR() {
    setLoading(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const d = await api(`/api/sessions/${session.id}/qr`, {
        method: 'POST',
        body: JSON.stringify({
          teacherLat: pos.coords.latitude,
          teacherLng: pos.coords.longitude,
        }),
      });
      setQrDataUrl(d.qrDataUrl);
      setQrExpiry(Date.now() + 5 * 60 * 1000);
      setSession({ ...session, status: 'QR_ACTIVE' });
      setLoading(false);
    }, async () => {
      const d = await api(`/api/sessions/${session.id}/qr`, { method: 'POST' });
      setQrDataUrl(d.qrDataUrl);
      setQrExpiry(Date.now() + 5 * 60 * 1000);
      setSession({ ...session, status: 'QR_ACTIVE' });
      setLoading(false);
    });
  }

  async function finishSession() {
    setLoading(true);
    setQrDataUrl(null);
    setQrExpiry(null);
    setCountdown(0);
    await api(`/api/sessions/${session.id}/end`, { method: 'POST' });
    setSession({ ...session, status: 'ENDED' });
    setLoading(false);
  }

  const presentStudents = students.filter(s => s.isPresent);
  const absentStudents = students.filter(s => !s.isPresent);

  const status = session?.status || 'SCHEDULED';
  const statusIndex = FLOW_STEPS.findIndex((s) => s.key === status);

  return (
    <Shell role="teacher" title="Session Control">
      <BackButton href="/teacher/today" label="Back to Today's Classes" />

      {/* Photo Modal */}
      {photoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setPhotoModal(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-2xl max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-bold text-slate-900 dark:text-white">Captured Photo</h3>
              <button onClick={() => setPhotoModal(null)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50">
              <img src={photoModal} alt="Student photo" className="w-full rounded-xl" />
            </div>
          </div>
        </div>
      )}

      {cls ? (
        <div className="mt-6 max-w-3xl space-y-6">
          {/* Class Header */}
          <div className="card bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                {cls.code?.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{cls.subject}</h2>
                <p className="text-slate-600">{cls.code} • Room {cls.timetable?.[0]?.room} • {cls.timetable?.[0]?.startTime} - {cls.timetable?.[0]?.endTime}</p>
              </div>
            </div>
          </div>

          {/* Animated Progress Flow */}
          <div className="card">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-5">Session Progress</h3>
            <div className="flex items-center justify-between relative">
              <div className="absolute top-6 left-0 right-0 h-1 bg-slate-200 rounded-full mx-8"></div>
              <div
                className="absolute top-6 left-0 h-1 bg-gradient-to-r from-emerald-400 to-violet-500 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${(statusIndex / (FLOW_STEPS.length - 1)) * 80}%`, marginLeft: '8%' }}
              ></div>
              {FLOW_STEPS.map((step, i) => {
                const isActive = i <= statusIndex;
                const isCurrent = i === statusIndex;
                return (
                  <div key={i} className="relative flex flex-col items-center z-10" style={{ animation: `stepIn 0.5s ease-out ${i * 200}ms both` }}>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all duration-500 ${
                      isCurrent ? `bg-gradient-to-br ${step.color} shadow-lg scale-110 ring-4 ring-white` :
                      isActive ? 'bg-emerald-400 text-white' :
                      'bg-slate-200 text-slate-500'
                    }`}>
                      {isActive && !isCurrent ? '✓' : step.icon}
                    </div>
                    <span className={`mt-2 text-xs font-semibold ${
                      isCurrent ? 'text-white' : isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Students Marked Counter */}
          {(status === 'ACTIVE' || status === 'QR_ACTIVE') && (
            <div className="card text-center" style={{ animation: 'bounceIn 0.5s ease-out' }}>
              <p className="text-sm text-slate-500 mb-2">Students Marked</p>
              <p className="text-5xl font-extrabold bg-gradient-to-r from-emerald-500 to-blue-600 bg-clip-text text-transparent">
                {attendanceCount}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3" style={{ animation: 'fadeUp 0.5s ease-out 0.3s both' }}>
            {status === 'SCHEDULED' && (
              <button
                onClick={startSession}
                disabled={loading}
                className="btn bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 shadow-lg"
              >
                <span className="flex items-center gap-2">
                  <span className="text-xl">▶️</span> Start Session
                </span>
              </button>
            )}

            {(status === 'ACTIVE' || status === 'QR_ACTIVE') && !qrDataUrl && (
              <button
                onClick={generateQR}
                disabled={loading}
                className="btn bg-gradient-to-r from-violet-500 to-violet-600 text-white hover:from-violet-600 hover:to-violet-700 disabled:opacity-50 shadow-lg"
              >
                <span className="flex items-center gap-2">
                  <span className="text-xl">📱</span> Generate QR
                </span>
              </button>
            )}

            {status !== 'ENDED' && status !== 'SCHEDULED' && (
              <button
                onClick={finishSession}
                disabled={loading}
                className="btn bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 disabled:opacity-50 shadow-lg"
              >
                <span className="flex items-center gap-2">
                  <span className="text-xl">🏁</span> End Session
                </span>
              </button>
            )}
          </div>

          {/* QR Display */}
          {qrDataUrl && (
            <div className="card flex flex-col items-center" style={{ animation: 'scaleIn 0.5s ease-out' }}>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">📱</span>
                <h3 className="text-xl font-bold">Scan QR to Mark Attendance</h3>
              </div>
              <div className="p-4 bg-white rounded-2xl shadow-inner">
                <img src={qrDataUrl} alt="QR Code" className="w-64 h-64 rounded-xl" />
              </div>
              <div className="mt-6 w-full">
                <div className="w-full bg-slate-200 rounded-full h-3 mb-3">
                  <div
                    className="bg-gradient-to-r from-amber-400 to-red-500 h-3 rounded-full transition-all duration-1000"
                    style={{ width: `${(countdown / 300) * 100}%` }}
                  ></div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-center">
                    <p className="text-3xl font-extrabold text-red-500">{Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}</p>
                    <p className="text-xs text-muted">Expires in</p>
                  </div>
                  <div className="flex gap-3">
                    {countdown <= 0 && (
                      <button
                        onClick={generateQR}
                        className="btn bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700"
                      >
                        🔄 Regenerate
                      </button>
                    )}
                    <button
                      onClick={finishSession}
                      className="btn bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700"
                    >
                      🏁 Finish
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Live Attendance List */}
          {(status === 'ACTIVE' || status === 'QR_ACTIVE' || status === 'ENDED') && (
            <div className="card" style={{ animation: 'fadeUp 0.5s ease-out 0.5s both' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Attendance List</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAbsent(false)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      !showAbsent ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                    }`}
                  >
                    Present ({presentStudents.length})
                  </button>
                  <button
                    onClick={() => setShowAbsent(true)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      showAbsent ? 'bg-red-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                    }`}
                  >
                    Absent ({absentStudents.length})
                  </button>
                </div>
              </div>
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {studentsLoaded && students.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-8">No students found for this class</p>
                )}
                {(showAbsent ? absentStudents : presentStudents).map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                        s.isPresent ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}>
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{s.name}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {s.rollNumber && (
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">{s.rollNumber}</span>
                          )}
                          {s.isPresent && s.markedAt && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                              {new Date(s.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {s.isPresent ? (
                        <>
                          {s.photo ? (
                            <button onClick={() => setPhotoModal(s.photo)} className="px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all text-xs font-medium flex items-center gap-1">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                              View
                            </button>
                          ) : (
                            <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-full">Present</span>
                          )}
                        </>
                      ) : (
                        <span className="text-[10px] font-medium text-red-500 bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded-full">Absent</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-16 text-center">
          <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-muted">Loading class details...</p>
        </div>
      )}

      <style>{`
        @keyframes stepIn { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
        @keyframes bounceIn { 0% { opacity: 0; transform: scale(0.3); } 50% { transform: scale(1.05); } 70% { transform: scale(0.9); } 100% { opacity: 1; transform: scale(1); } }
      `}</style>
    </Shell>
  );
}
