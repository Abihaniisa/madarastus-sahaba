'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { SCHOOL } from '../../lib';
import type { Student, Achievement } from '../../lib';
import {
  addStudent,
  updateStudent,
  saveAttendanceBatch,
  addAchievement,
  deleteAchievement,
  saveAnnouncement,
  logout,
} from './actions';

interface Props {
  mode: 'login' | 'dashboard';
  students: Student[];
  achievements: Achievement[];
  announcement: any;
}

export default function AdminClient({ mode, students, achievements, announcement }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'students' | 'attendance' | 'achievements' | 'announcement'>('students');
  const [message, setMessage] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());

  if (mode === 'login') {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      router.push('/admin');
      router.refresh();
    };

    return (
      <main className="login-wrap">
        <div className="login-card">
          <div className="login-mark">
            <svg viewBox="0 0 24 24" strokeWidth="1.7"><path d="M12 3c-1.8 3-2.6 5.6-2.6 8 0 3.6 2.6 6.6 2.6 9.5 0-2.9 2.6-5.9 2.6-9.5 0-2.4-.8-5-2.6-8Z"/><path d="M4 20c2-1 4.3-1.6 8-1.6s6 .6 8 1.6"/></svg>
          </div>
          <h2>{SCHOOL.shortName}</h2>
          <p className="sub">Admin Login</p>
          <form onSubmit={handleLogin}>
            <div className="field">
              <label htmlFor="admin-email">Email</label>
              <input id="admin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="admin@madrasatussahaba.org" />
            </div>
            <div className="field">
              <label htmlFor="admin-pass">Password</label>
              <input id="admin-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
            </div>
            {error && <p style={{ color: 'var(--status-x)', fontSize: '13px', marginTop: '12px' }}>{error}</p>}
            <button className="btn btn-gold btn-block" type="submit" style={{ marginTop: '22px' }} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <a href="/" className="login-back">← Back to site</a>
        </div>
      </main>
    );
  }

  const toggleStatus = (studentId: string) => {
    const current = statusMap[studentId] || 'X';
    const next = current === 'X' ? 'R' : current === 'R' ? 'M' : 'X';
    setStatusMap({ ...statusMap, [studentId]: next });
  };

  const toggleSelect = (studentId: string) => {
    const newSet = new Set(selectedStudents);
    if (newSet.has(studentId)) newSet.delete(studentId);
    else newSet.add(studentId);
    setSelectedStudents(newSet);
  };

  const applyBatch = (status: string) => {
    const newMap = { ...statusMap };
    for (const id of selectedStudents) newMap[id] = status;
    setStatusMap(newMap);
    setSelectedStudents(new Set());
  };

  const saveAttendance = async () => {
    setMessage('');
    setError('');
    const entries = Object.entries(statusMap);
    if (entries.length === 0) { setError('No attendance changes to save.'); return; }
    const records = entries.map(([student_id, status]) => ({ student_id, date: selectedDate, status }));
    try {
      const result = await saveAttendanceBatch(records);
      if (result.error) setError(result.error);
      else { setMessage('Attendance saved successfully.'); setStatusMap({}); router.refresh(); }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save attendance.');
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/admin');
    router.refresh();
  };

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div className="container admin-header-inner">
          <div className="admin-brand">
            <div className="dot-mark">
              <svg viewBox="0 0 24 24" strokeWidth="1.7"><path d="M12 3c-1.8 3-2.6 5.6-2.6 8 0 3.6 2.6 6.6 2.6 9.5 0-2.9 2.6-5.9 2.6-9.5 0-2.4-.8-5-2.6-8Z"/><path d="M4 20c2-1 4.3-1.6 8-1.6s6 .6 8 1.6"/></svg>
            </div>
            <div>
              <span>Admin Dashboard</span>
              <small>{SCHOOL.name}</small>
            </div>
          </div>
          <button onClick={handleLogout} className="logout-link">
            <svg viewBox="0 0 24 24" strokeWidth="1.8"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>
            Logout
          </button>
        </div>
      </header>

      <div className="container admin-body">
        <div className="tabs">
          <button className={`tab-btn ${tab === 'students' ? 'is-active' : ''}`} onClick={() => setTab('students')}>Students</button>
          <button className={`tab-btn ${tab === 'attendance' ? 'is-active' : ''}`} onClick={() => setTab('attendance')}>Attendance</button>
          <button className={`tab-btn ${tab === 'achievements' ? 'is-active' : ''}`} onClick={() => setTab('achievements')}>Achievements</button>
          <button className={`tab-btn ${tab === 'announcement' ? 'is-active' : ''}`} onClick={() => setTab('announcement')}>Announcement</button>
        </div>

        {message && <p style={{ color: 'var(--status-r)', fontSize: '13px', marginBottom: '12px', fontWeight: 600 }}>{message}</p>}
        {error && <p style={{ color: 'var(--status-x)', fontSize: '13px', marginBottom: '12px', fontWeight: 600 }}>{error}</p>}

        {tab === 'students' && (
          <div className="admin-panel is-active">
            <div className="card">
              <div className="card-title-row">
                <div>
                  <div className="card-title">Add Student</div>
                  <p className="card-sub">Register a new student and set their starting point.</p>
                </div>
              </div>
              <form action={addStudent}>
                <div className="form-grid">
                  <div className="field span-2">
                    <label>Full Name</label>
                    <input type="text" name="full_name" required placeholder="e.g. Isa Yahya Bayero" />
                  </div>
                  <div className="field">
                    <label>Joining Date</label>
                    <input type="date" name="joining_date" />
                  </div>
                  <div className="field">
                    <label>Joining Week (optional)</label>
                    <input type="number" name="joining_week" min="1" max="53" placeholder="e.g. 1" />
                  </div>
                </div>
                <button className="btn btn-gold" type="submit" style={{ marginTop: '18px' }}>Add Student</button>
              </form>
            </div>

            <div className="card">
              <div className="card-title-row">
                <div>
                  <div className="card-title">Existing Students</div>
                  <p className="card-sub">Edit details or update a student's photo.</p>
                </div>
                <span className="count-pill">{students.length} students</span>
              </div>

              {students.map((student) => (
                <div key={student.id} className="admin-row">
                  <div className="avatar sm">{student.full_name.charAt(0).toUpperCase()}</div>
                  <div className="grow">
                    <div className="row-name">{student.full_name}</div>
                    <div className="row-reg">{student.id} · Week {student.joining_week ?? '—'}</div>
                  </div>
                  <div className="row-actions">
                    <span className={`badge ${student.is_active ? 'active' : 'inactive'}`}>
                      {student.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <form action={updateStudent} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <input type="hidden" name="id" value={student.id} />
                      <input name="full_name" defaultValue={student.full_name} style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '12px', width: '130px' }} />
                      <input name="joining_week" type="number" min="1" max="53" defaultValue={student.joining_week ?? ''} style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '12px', width: '60px' }} />
                      <select name="is_active" defaultValue={student.is_active ? 'true' : 'false'} style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '12px' }}>
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </select>
                      <button type="submit" className="btn btn-outline" style={{ padding: '6px 14px', fontSize: '12px' }}>Save</button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'attendance' && (
          <div className="admin-panel is-active">
            <div className="card">
              <div className="card-title-row">
                <div>
                  <div className="card-title">Record Attendance</div>
                  <p className="card-sub">Select a date, then tap each student's status.</p>
                </div>
              </div>
              <div className="field">
                <label>Session Date</label>
                <input type="date" value={selectedDate} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setSelectedDate(e.target.value)} />
              </div>

              <div style={{ marginTop: '16px' }}>
                {students.filter((s) => s.is_active && s.joining_date !== null).map((student) => {
                  const currentStatus = statusMap[student.id] || 'X';
                  const isSelected = selectedStudents.has(student.id);
                  return (
                    <div key={student.id} className="attendance-row">
                      <div className="attendance-name">
                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(student.id)} style={{ width: '16px', height: '16px', accentColor: 'var(--green)' }} />
                        <div className="avatar sm">{student.full_name.charAt(0).toUpperCase()}</div>
                        {student.full_name}
                      </div>
                      <div className="status-toggle">
                        <button className={currentStatus === 'R' ? 'sel-r' : ''} onClick={() => toggleStatus(student.id)}>R</button>
                        <button className={currentStatus === 'M' ? 'sel-m' : ''} onClick={() => { setStatusMap({ ...statusMap, [student.id]: 'M' }); }}>M</button>
                        <button className={currentStatus === 'X' ? 'sel-x' : ''} onClick={() => { setStatusMap({ ...statusMap, [student.id]: 'X' }); }}>X</button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="save-bar">
                <span className="save-hint">Tap a letter to change status: R → Recited, M → Makeup, X → Pending</span>
                <button className="btn btn-gold" onClick={saveAttendance}>Save Attendance</button>
              </div>
            </div>
          </div>
        )}

        {tab === 'achievements' && (
          <div className="admin-panel is-active">
            <div className="card">
              <div className="card-title-row">
                <div>
                  <div className="card-title">Add Achievement</div>
                  <p className="card-sub">Record a student's milestone or recognition.</p>
                </div>
              </div>
              <form action={addAchievement}>
                <div className="form-grid">
                  <div className="field span-2">
                    <label>Student</label>
                    <select name="student_id" required>
                      {students.map((s) => <option key={s.id} value={s.id}>{s.id} — {s.full_name}</option>)}
                    </select>
                  </div>
                  <div className="field span-2">
                    <label>Title</label>
                    <input type="text" name="title" required placeholder="e.g. Completed Juz' Amma" />
                  </div>
                  <div className="field">
                    <label>Category</label>
                    <input type="text" name="category" placeholder="e.g. Tahfiz, Tajwid" />
                  </div>
                  <div className="field">
                    <label>Date</label>
                    <input type="date" name="date" />
                  </div>
                  <div className="field span-2">
                    <label>Description (optional)</label>
                    <input type="text" name="description" placeholder="Brief description" />
                  </div>
                </div>
                <button className="btn btn-gold" type="submit" style={{ marginTop: '18px' }}>Add Achievement</button>
              </form>
            </div>

            <div className="card">
              <div className="card-title-row">
                <div>
                  <div className="card-title">Existing Achievements</div>
                </div>
              </div>
              {achievements.map((a) => (
                <div key={a.id} className="admin-row">
                  <div className="grow">
                    <div className="row-name">{a.title}</div>
                    <div className="row-reg">{a.student_id} {a.date ? `— ${a.date}` : ''}</div>
                  </div>
                  <form action={deleteAchievement}>
                    <input type="hidden" name="id" value={a.id} />
                    <button type="submit" className="btn btn-outline" style={{ padding: '6px 14px', fontSize: '12px', color: 'var(--status-x)' }}>Delete</button>
                  </form>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'announcement' && (
          <div className="admin-panel is-active">
            <div className="card">
              <div className="card-title-row">
                <div>
                  <div className="card-title">Verse of the Week</div>
                  <p className="card-sub">Shown on the home page announcement card.</p>
                </div>
              </div>
              <form action={saveAnnouncement}>
                <div className="form-grid">
                  <div className="field span-2">
                    <label>Arabic Text</label>
                    <textarea name="arabic_text" style={{ fontFamily: "'Amiri',serif", direction: 'rtl', fontSize: '1.2rem', minHeight: '60px' }} defaultValue={announcement?.arabic_text || ''} />
                  </div>
                  <div className="field span-2">
                    <label>Translation</label>
                    <textarea name="english_text" defaultValue={announcement?.english_text || ''} />
                  </div>
                  <div className="field span-2">
                    <label>Weekly Schedule</label>
                    <textarea name="schedule" rows={5} defaultValue={announcement?.schedule || ''} />
                  </div>
                </div>
                <button className="btn btn-gold" type="submit" style={{ marginTop: '18px' }}>Save Announcement</button>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}