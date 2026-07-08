'use client';
import Shell from '@/components/Shell';
import BackButton from '@/components/BackButton';
import { api, API } from '@/lib/api';
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export default function Page({ params }: { params: { id: string } }) {
  const { id } = params;

  // The QR data returned from the server (contains qrDataUrl, expiry, etc.)
  const [qr, setQr] = useState<any>();
  // Live count of students who have marked attendance so far
  const [count, setCount] = useState(0);
  // Countdown timer (seconds) – the QR code expires after 5 minutes (300 s)
  const [left, setLeft] = useState(300);

  // Generate (or regenerate) the QR code for this session
  // Tries to get the teacher's GPS location first, then POSTs it with the QR request
  async function gen() {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        // Teacher location available – send it along so students are validated against it
        const d = await api(`/api/sessions/${id}/qr`, {
          method: 'POST',
          body: JSON.stringify({ teacherLat: pos.coords.latitude, teacherLng: pos.coords.longitude }),
        });
        setQr(d);
        setLeft(300); // reset the 5-minute countdown
      },
      async () => {
        // Geolocation denied or unavailable – generate QR without location data
        const d = await api(`/api/sessions/${id}/qr`, { method: 'POST' });
        setQr(d);
        setLeft(300);
      }
    );
  }

  // On mount: generate QR, connect to real-time socket for attendance count, start countdown
  useEffect(() => {
    gen();

    // Connect to socket server and join this session's room
    const s = io(API);
    s.emit('join:session', id);

    // Helper to fetch the latest attendance count from the REST API
    const load = () => api(`/api/sessions/${id}/count`).then((x) => setCount(x.count));
    // Listen for real-time attendance:count events
    s.on('attendance:count', load);
    load(); // initial fetch

    // Countdown ticks every second; stop at 0
    const t = setInterval(() => setLeft((x) => Math.max(0, x - 1)), 1000);

    // Cleanup on unmount
    return () => { s.close(); clearInterval(t); };
  }, [id]);

  // Download a CSV file containing the attendance list for this session
  async function exportAttendance() {
    try {
      const data = await api(`/api/sessions/${id}/students`);
      // Build CSV header row
      const csv = [['Name', 'Roll Number', 'Status', 'Time'].join(',')];
      // Append one row per student
      data.forEach((s: any) => {
        csv.push([s.name, s.rollNumber || '', s.isPresent ? 'Present' : 'Absent', s.markedAt ? new Date(s.markedAt).toLocaleString() : ''].join(','));
      });
      // Create a Blob and trigger a browser download
      const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-${id}-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Failed to export attendance');
    }
  }

  return (
    <Shell role="teacher" title="QR Process">
      <BackButton href="/teacher/today" label="Back to Today's Classes" />
      <div className="card max-w-xl text-center" style={{ animation: 'fadeUp 0.4s ease-out' }}>
        {/* While the countdown is active and a QR exists, show the QR image */}
        {left > 0 && qr ? (
          <>
            <img src={qr.qrDataUrl} className="mx-auto h-72 w-72 rounded-2xl shadow-lg" />
            <p className="mt-4 text-2xl font-bold">Live attendance count: {count}</p>
            <p className="text-muted">QR expires in {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</p>
            <button onClick={gen} className="btn-soft mt-4">REFRESH QR</button>
          </>
        ) : (
          // QR expired or not generated yet – show export option instead
          <>
            <h2 className="text-2xl font-bold">QR disabled</h2>
            <button onClick={exportAttendance} className="btn-primary mt-4">Export Today&apos;s Attendance</button>
          </>
        )}
      </div>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </Shell>
  );
}
