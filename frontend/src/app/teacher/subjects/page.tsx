'use client';
import Shell from '@/components/Shell';
import BackButton from '@/components/BackButton';
import { api } from '@/lib/api';
import { useEffect, useState } from 'react';

export default function Page() {
  const [allSubjects, setAllSubjects] = useState<any[]>([]);
  const [mySubjects, setMySubjects] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [facultyCode, setFacultyCode] = useState('');
  const [facultySaving, setFacultySaving] = useState(false);
  const [autoPopulating, setAutoPopulating] = useState(false);

  useEffect(() => {
    Promise.all([
      api('/api/timetable/available-subjects'),
      api('/api/teacher/my-subjects'),
      api('/api/me'),
    ]).then(([all, mine, me]) => {
      setAllSubjects(all);
      setMySubjects(mine);
      if (me.facultyCode) setFacultyCode(me.facultyCode);
      setLoaded(true);
    });
  }, []);

  function isSelected(code: string, semester: number) {
    return mySubjects.some((s) => s.code === code && s.semester === semester);
  }

  function toggle(code: string, semester: number, name: string, department: string) {
    if (isSelected(code, semester)) {
      setMySubjects(mySubjects.filter((s) => !(s.code === code && s.semester === semester)));
    } else {
      setMySubjects([...mySubjects, { semester, code, name, department }]);
    }
  }

  async function saveFacultyCode() {
    setFacultySaving(true);
    try {
      await api('/api/me', { method: 'PUT', body: JSON.stringify({ facultyCode }) });
    } catch {}
    setFacultySaving(false);
  }

  async function autoPopulate() {
    if (!facultyCode) return;
    setAutoPopulating(true);
    try {
      const subjects = await api(`/api/timetable/by-faculty?code=${facultyCode}`);
      if (subjects.length > 0) {
        setMySubjects(subjects);
      } else {
        alert('No subjects found for faculty code "' + facultyCode + '". Check the code or select manually below.');
      }
    } catch {
      alert('Failed to fetch subjects for this faculty code.');
    }
    setAutoPopulating(false);
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      await api('/api/teacher/my-subjects', {
        method: 'PUT',
        body: JSON.stringify({ subjects: mySubjects }),
      });
      await saveFacultyCode();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  }

  const semesters = Array.from(new Set(allSubjects.map((s) => s.semester))).sort((a, b) => a - b);
  const [expandedSem, setExpandedSem] = useState<number | null>(null);

  useEffect(() => {
    if (semesters.length > 0 && expandedSem === null) {
      setExpandedSem(semesters[0]);
    }
  }, [semesters]);

  return (
    <Shell role="teacher" title="My Subjects">
      <BackButton href="/teacher/dashboard" label="Back to Dashboard" />

      {!loaded ? (
        <div className="card text-center py-16">
          <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-muted">Loading subjects...</p>
        </div>
      ) : (
        <div className="mt-6 max-w-3xl space-y-6">
          {/* Faculty Code Card */}
          <div className="card">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Link Your Timetable Identity</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Enter your faculty short code (e.g. GUR, NN, JU) as shown in the timetable to auto-populate your subjects.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="e.g. GUR"
                value={facultyCode}
                onChange={(e) => setFacultyCode(e.target.value.toUpperCase())}
                className="w-32 px-4 py-2.5 border-2 border-slate-200 dark:border-slate-600 rounded-xl text-sm font-semibold text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:border-blue-500 uppercase tracking-wider"
                maxLength={5}
              />
              <button
                onClick={autoPopulate}
                disabled={!facultyCode || autoPopulating}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 shadow-md text-sm"
              >
                {autoPopulating ? 'Loading...' : 'Auto-Populate Subjects'}
              </button>
              {facultyCode && (
                <button
                  onClick={saveFacultyCode}
                  disabled={facultySaving}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {facultySaving ? 'Saving...' : 'Save Code'}
                </button>
              )}
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
              Faculty codes are listed in the timetable (e.g., GUR = Dr. G. Upendra Reddy). Auto-populate will select all subjects assigned to this code.
            </p>
          </div>

          {/* Subject Selection Card */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Manage Your Subjects</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {mySubjects.length} subject{mySubjects.length !== 1 ? 's' : ''} selected
                </p>
              </div>
              <button
                onClick={save}
                disabled={saving}
                className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 shadow-md shadow-blue-600/20"
              >
                {saving ? 'Saving...' : saved ? 'Saved!' : 'Save All'}
              </button>
            </div>

            <div className="space-y-3">
              {semesters.map((sem) => {
                const semSubjects = allSubjects.filter((s) => s.semester === sem);
                const selectedCount = mySubjects.filter((s) => s.semester === sem).length;
                const isOpen = expandedSem === sem;
                return (
                  <div key={sem} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedSem(isOpen ? null : sem)}
                      className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm ${
                          selectedCount > 0 ? 'bg-blue-600' : 'bg-slate-400'
                        }`}>
                          {sem}
                        </div>
                        <div className="text-left">
                          <h3 className="font-bold text-slate-900 dark:text-white">Semester {sem}</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {selectedCount}/{semSubjects.length} subjects selected
                          </p>
                        </div>
                      </div>
                      <svg
                        className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {isOpen && (
                      <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-3 space-y-1.5">
                        {semSubjects.map((subj) => {
                          const selected = isSelected(subj.code, subj.semester);
                          return (
                            <label
                              key={`${subj.semester}-${subj.code}`}
                              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                                selected
                                  ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggle(subj.code, subj.semester, subj.name, subj.department)}
                                className="w-5 h-5 rounded-lg text-blue-600 border-2 border-slate-300 dark:border-slate-600 focus:ring-blue-500 cursor-pointer"
                              />
                              <div className="flex-1 min-w-0">
                                <p className={`font-semibold text-sm ${selected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}`}>
                                  {subj.name}
                                </p>
                                <p className="text-xs text-slate-400 dark:text-slate-500">{subj.code}</p>
                              </div>
                              {selected && (
                                <svg className="w-5 h-5 text-blue-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
