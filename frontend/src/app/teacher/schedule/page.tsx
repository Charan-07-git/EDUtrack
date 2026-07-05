'use client';
import Shell from '@/components/Shell';
import BackButton from '@/components/BackButton';
import { api } from '@/lib/api';
import { useEffect, useState } from 'react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIME_SLOTS = [
  { label: '09:00 - 10:00', start: '09:00', end: '10:00' },
  { label: '10:00 - 11:00', start: '10:00', end: '11:00' },
  { label: '11:00 - 12:00', start: '11:00', end: '12:00' },
  { label: '12:00 - 13:00', start: '12:00', end: '13:00' },
  { label: '13:00 - 14:00', start: '13:00', end: '14:00' },
  { label: '14:00 - 15:00', start: '14:00', end: '15:00' },
  { label: '15:00 - 16:00', start: '15:00', end: '16:00' },
  { label: '16:00 - 17:00', start: '16:00', end: '17:00' },
];

const SUBJECT_COLORS = [
  'bg-gradient-to-br from-blue-500 to-blue-600',
  'bg-gradient-to-br from-purple-500 to-purple-600',
  'bg-gradient-to-br from-amber-500 to-orange-500',
  'bg-gradient-to-br from-emerald-500 to-emerald-600',
  'bg-gradient-to-br from-rose-500 to-rose-600',
  'bg-gradient-to-br from-cyan-500 to-cyan-600',
  'bg-gradient-to-br from-teal-500 to-teal-600',
  'bg-gradient-to-br from-pink-500 to-pink-600',
];

export default function Page() {
  const [deptSem, setDeptSem] = useState<{ department: string; semester: number }[]>([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedSem, setSelectedSem] = useState('');
  const [classes, setClasses] = useState<any[]>([]);
  const [editClass, setEditClass] = useState<any>(null);
  const [editEntries, setEditEntries] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api('/api/timetable/departments').then(setDeptSem);
  }, []);

  useEffect(() => {
    if (selectedDept && selectedSem) {
      api(`/api/timetable/by-department?department=${encodeURIComponent(selectedDept)}&semester=${selectedSem}`).then(setClasses);
    }
  }, [selectedDept, selectedSem]);

  function openEdit(cls: any) {
    setEditClass(cls);
    setEditEntries(cls.timetable?.map((t: any) => ({
      dayOfWeek: t.dayOfWeek,
      startTime: t.startTime,
      endTime: t.endTime,
      room: t.room,
    })) || []);
  }

  function addEntry() {
    setEditEntries([...editEntries, { dayOfWeek: 1, startTime: '09:00', endTime: '10:00', room: '' }]);
  }

  function updateEntry(i: number, field: string, value: any) {
    const updated = [...editEntries];
    updated[i] = { ...updated[i], [field]: value };
    setEditEntries(updated);
  }

  function removeEntry(i: number) {
    setEditEntries(editEntries.filter((_: any, idx: number) => idx !== i));
  }

  async function saveEntries() {
    if (!editClass) return;
    setSaving(true);
    try {
      const updated = await api('/api/timetable/bulk', {
        method: 'POST',
        body: JSON.stringify({ classId: editClass.id, entries: editEntries }),
      });
      setEditClass({ ...editClass, timetable: updated });
      setClasses(classes.map((c) => c.id === editClass.id ? { ...c, timetable: updated } : c));
      setEditClass(null);
      setEditEntries([]);
    } catch (e: any) {
      alert(e.message || 'Failed to save');
    }
    setSaving(false);
  }

  function getEntry(day: number, start: string) {
    if (!editClass) return null;
    return editEntries.find((e: any) => e.dayOfWeek === day && e.startTime === start);
  }

  function cellClicked(day: number, slot: typeof TIME_SLOTS[0]) {
    if (!editClass) return;
    const existing = editEntries.findIndex((e: any) => e.dayOfWeek === day && e.startTime === slot.start);
    if (existing >= 0) {
      removeEntry(existing);
    } else {
      setEditEntries([...editEntries, { dayOfWeek: day, startTime: slot.start, endTime: slot.end, room: '' }]);
    }
  }

  return (
    <Shell role="teacher" title="Schedule Input">
      <BackButton href="/teacher/dashboard" label="Back to Dashboard" />
      <div className="max-w-6xl mx-auto mt-6 space-y-6">
        {!editClass && (
          <div className="card">
            <h2 className="text-lg font-bold mb-4">Select Department & Semester</h2>
            <div className="flex flex-wrap gap-4">
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="input flex-1 min-w-[200px]"
              >
                <option value="">All Departments</option>
                {Array.from(new Set(deptSem.map((d) => d.department))).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <select
                value={selectedSem}
                onChange={(e) => setSelectedSem(e.target.value)}
                className="input flex-1 min-w-[200px]"
              >
                <option value="">All Semesters</option>
                {Array.from(new Set(deptSem.map((d) => d.semester))).sort().map((s) => (
                  <option key={s} value={s}>Semester {s}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {selectedDept && selectedSem && !editClass && (
          <div className="card">
            <h3 className="text-lg font-bold mb-4">Classes</h3>
            {classes.length === 0 ? (
              <p className="text-muted text-center py-8">No classes found for this department and semester</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {classes.map((cls) => (
                  <button
                    key={cls.id}
                    onClick={() => openEdit(cls)}
                    className="text-left p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:shadow-md transition-all bg-white dark:bg-slate-800"
                  >
                    <p className="font-bold text-slate-900 dark:text-white">{cls.subject}</p>
                    <p className="text-sm text-muted">{cls.code}</p>
                    <p className="text-xs text-muted mt-1">{cls.timetable?.length || 0} slots scheduled</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {editClass && (
          <div className="card" style={{ animation: 'fadeUp 0.3s ease-out' }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{editClass.subject}</h3>
                <p className="text-sm text-muted">{editClass.code} &middot; {editClass.department} Sem {editClass.semester}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={addEntry} className="btn-soft text-sm">
                  + Add Slot
                </button>
                <button onClick={() => setEditClass(null)} className="btn-soft text-sm">
                  Cancel
                </button>
              </div>
            </div>

            {/* Editable timetable */}
            <div className="overflow-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full border-collapse min-w-[600px]">
                <thead>
                  <tr>
                    <th className="bg-slate-900 text-white px-3 py-2 text-xs font-bold uppercase w-24">Time</th>
                    {DAYS.map((day, i) => (
                      <th key={day} className="bg-blue-600 text-white px-3 py-2 text-xs font-bold uppercase border-l border-blue-500">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TIME_SLOTS.map((slot, si) => (
                    <tr key={si}>
                      <td className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700 px-2 py-1 text-xs font-semibold text-slate-400 text-center">
                        {slot.label}
                      </td>
                      {DAYS.map((_, di) => {
                        const entry = getEntry(di + 1, slot.start);
                        return (
                          <td
                            key={di}
                            onClick={() => cellClicked(di + 1, slot)}
                            className={`border-b border-l border-slate-100 dark:border-slate-700 p-1 cursor-pointer transition-all hover:bg-blue-50 dark:hover:bg-blue-900/20 ${entry ? '' : 'bg-slate-50/30 dark:bg-slate-900/30'}`}
                          >
                            {entry && (
                              <div className={`rounded-lg ${SUBJECT_COLORS[editClass.subject.length % SUBJECT_COLORS.length]} shadow-md px-2 py-1.5 text-center text-white text-xs font-bold`}>
                                {editClass.code}
                                <div className="text-[10px] opacity-80 mt-0.5">{entry.room || 'No room'}</div>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Edit entries list */}
            {editEntries.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-semibold text-slate-500">Scheduled Slots</p>
                {editEntries.map((entry, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    <select
                      value={entry.dayOfWeek}
                      onChange={(e) => updateEntry(i, 'dayOfWeek', Number(e.target.value))}
                      className="input text-sm flex-1 min-w-[120px]"
                    >
                      {DAYS.map((day, di) => (
                        <option key={di} value={di + 1}>{day}</option>
                      ))}
                    </select>
                    <select
                      value={entry.startTime}
                      onChange={(e) => {
                        const slot = TIME_SLOTS.find((s) => s.start === e.target.value);
                        updateEntry(i, 'startTime', e.target.value);
                        if (slot) updateEntry(i, 'endTime', slot.end);
                      }}
                      className="input text-sm flex-1 min-w-[110px]"
                    >
                      {TIME_SLOTS.map((slot) => (
                        <option key={slot.start} value={slot.start}>{slot.label}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={entry.room}
                      onChange={(e) => updateEntry(i, 'room', e.target.value)}
                      placeholder="Room"
                      className="input text-sm flex-1 min-w-[100px]"
                    />
                    <button onClick={() => removeEntry(i)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setEditClass(null)} className="btn-soft">Cancel</button>
              <button onClick={saveEntries} disabled={saving} className="btn bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 shadow-lg">
                {saving ? 'Saving...' : 'Save Schedule'}
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </Shell>
  );
}
