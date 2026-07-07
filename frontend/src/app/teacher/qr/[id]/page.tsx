'use client';
import Shell from '@/components/Shell';
import BackButton from '@/components/BackButton';
import { api, API } from '@/lib/api';
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export default function Page({ params }: { params: { id: string } }) {
  const { id } = params;
  const [qr, setQr] = useState<any>();
  const [count, setCount] = useState(0);
  const [left, setLeft] = useState(300);

  async function gen() {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const d = await api(`/api/sessions/${id}/qr`, {
          method: 'POST',
          body: JSON.stringify({ teacherLat: pos.coords.latitude, teacherLng: pos.coords.longitude }),
        });
        setQr(d);
        setLeft(300);
      },
      async () => {
        const d = await api(`/api/sessions/${id}/qr`, { method: 'POST' });
        setQr(d);
        setLeft(300);
      }
    );
  }

  useEffect(() => {
    gen();
    const s = io(API);
    s.emit('join:session', id);
    const load = () => api(`/api/sessions/${id}/count`).then((x) => setCount(x.count));
    s.on('attendance:count', load);
    load();
    const t = setInterval(() => setLeft((x) => Math.max(0, x - 1)), 1000);
    return () => { s.close(); clearInterval(t); };
  }, [id]);

  async function exportAttendance() {
    try {
      const data = await api(`/api/sessions/${id}/students`);
      const csv = [['Name', 'Roll Number', 'Status', 'Time'].join(',')];
      data.forEach((s: any) => {
        csv.push([s.name, s.rollNumber || '', s.isPresent ? 'Present' : 'Absent', s.markedAt ? new Date(s.markedAt).toLocaleString() : ''].join(','));
      });
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
        {left > 0 && qr ? (
          <>
            <img src={qr.qrDataUrl} className="mx-auto h-72 w-72 rounded-2xl shadow-lg" />
            <p className="mt-4 text-2xl font-bold">Live attendance count: {count}</p>
            <p className="text-muted">QR expires in {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</p>
            <button onClick={gen} className="btn-soft mt-4">REFRESH QR</button>
          </>
        ) : (
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
