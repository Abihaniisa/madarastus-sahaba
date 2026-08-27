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
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fdf9f5', padding: '16px' }}>
        <div className="premium-card" style={{ width: '100%', maxWidth: '400px', padding: '32px 28px' }}>
          <h1 className="heading-display" style={{ fontSize: '1.5rem', textAlign: 'center', color: '#1a472a' }}>{SCHOOL.shortName}</h1>
          <p style={{ fontSize: '14px', color: '#6b5a4a', textAlign: 'center', marginTop: '4px' }}>Admin Login</p>
          <form onSubmit={handleLogin} style={{ marginTop: '28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label htmlFor="email" style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>Email</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e8dfd6', fontSize: '15px', outline: 'none', background: '#fdf9f5' }} />
            </div>
            <div>
              <label htmlFor="password" style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>Password</label>
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e8dfd6', fontSize: '15px', outline: 'none', background: '#fdf9f5' }} />
            </div>
            {error && <p style={{ fontSize: '14px', color: '#dc2626' }}>{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary" style={{ opacity: loading ? 0.5 : 1 }}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  const toggleStatus = (studentId: string) => {
    const current = statusMap[studentId] || 'X';
    const next = current === 'X' ? 'R' : current === 'R' ? 'M' : 'X';
    setStatusMap({ ...statusMap, [studentId]: next });
  };

  const statusColor = (s: string) => {
    if (s === 'R') return '#22c55e';
    if (s === 'M') return '#eab308';
    return '#94a3b8';
  };

  const statusLabel = (s: string) => {
    if (s === 'R') return 'R';
    if (s === 'M') return 'M';
    return 'X';
  };

  const toggleSelect = (studentId: string) => {
    const newSet = new Set(selectedStudents);
    if (newSet.has(studentId)) {
      newSet.delete(studentId);
    } else {
      newSet.add(studentId);
    }
    setSelectedStudents(newSet);
  };

  const applyBatch = (status: string) => {
    const newMap = { ...statusMap };
    for (const id of selectedStudents) {
      newMap[id] = status;
    }
    setStatusMap(newMap);
    setSelectedStudents(new Set());
  };

  const saveAttendance = async () => {
    setMessage('');
    setError('');
    const entries = Object.entries(statusMap);
    if (entries.length === 0) {
      setError('No attendance changes to save.');
      return;
    }

    const records = entries.map(([student_id, status]) => ({
      student_id,
      date: selectedDate,
      status,
    }));

    try {
      const result = await saveAttendanceBatch(records);
      if (result.error) {
        setError(result.error);
      } else {
        setMessage('Attendance saved successfully.');
        setStatusMap({});
        router.refresh();
      }
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
    <main style={{ minHeight: '100vh', background: '#fdf9f5' }}>
      <header style={{ background: 'linear-gradient(135deg, #1a472a, #2c6a56)', color: 'white', padding: '20px 0' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 className="heading-display" style={{ fontSize: '1.25rem' }}>Admin Dashboard</h1>
          <button onClick={handleLogout} style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', background: 'none', border: 'none', fontWeight: 500 }}>
            Logout
          </button>
        </div>
      </header>

      <div className="container" style={{ padding: '28px 16px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <button onClick={() => setTab('students')} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '13px', background: tab === 'students' ? '#1a472a' : 'transparent', color: tab === 'students' ? 'white' : '#1a472a' }}>Students</button>
          <button onClick={() => setTab('attendance')} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '13px', background: tab === 'attendance' ? '#1a472a' : 'transparent', color: tab === 'attendance' ? 'white' : '#1a472a' }}>Attendance</button>
          <button onClick={() => setTab('achievements')} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '13px', background: tab === 'achievements' ? '#1a472a' : 'transparent', color: tab === 'achievements' ? 'white' : '#1a472a' }}>Achievements</button>
          <button onClick={() => setTab('announcement')} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '13px', background: tab === 'announcement' ? '#1a472a' : 'transparent', color: tab === 'announcement' ? 'white' : '#1a472a' }}>Announcement</button>
        </div>

        {message && <p style={{ fontSize: '14px', color: '#16a34a', marginBottom: '12px', fontWeight: 500 }}>{message}</p>}
        {error && <p style={{ fontSize: '14px', color: '#dc2626', marginBottom: '12px', fontWeight: 500 }}>{error}</p>}

        {tab === 'students' && (
          <div className="premium-card" style={{ padding: '24px' }}>
            <h2 className="heading-display" style={{ fontSize: '1.125rem', color: '#1e293b', marginBottom: '16px' }}>Add Student</h2>
            <form action={addStudent} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input name="full_name" placeholder="Full Name" required style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #e8dfd6', fontSize: '15px', outline: 'none', background: '#fdf9f5' }} />
              <input name="joining_date" type="date" style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #e8dfd6', fontSize: '15px', outline: 'none', background: '#fdf9f5' }} />
              <input name="joining_week" type="number" min="1" max="53" placeholder="Joining Week (optional)" style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #e8dfd6', fontSize: '15px', outline: 'none', background: '#fdf9f5' }} />
              <button type="submit" className="btn-primary">Add Student</button>
            </form>

            <h2 className="heading-display" style={{ fontSize: '1.125rem', color: '#1e293b', marginTop: '28px', marginBottom: '16px' }}>Existing Students</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {students.map((student) => (
                <div key={student.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f5efe8', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <p style={{ fontWeight: 600, color: '#1e293b' }}>{student.full_name}</p>
                    <p style={{ fontSize: '12px', color: '#a6947e' }}>{student.id}</p>
                  </div>
                  <form action={updateStudent} style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input type="hidden" name="id" value={student.id} />
                    <input name="full_name" defaultValue={student.full_name} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e8dfd6', fontSize: '13px', width: '140px', outline: 'none', background: '#fdf9f5' }} />
                    <input name="joining_week" type="number" min="1" max="53" defaultValue={student.joining_week ?? ''} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e8dfd6', fontSize: '13px', width: '70px', outline: 'none', background: '#fdf9f5' }} />
                    <select name="is_active" defaultValue={student.is_active ? 'true' : 'false'} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e8dfd6', fontSize: '13px', outline: 'none', background: '#fdf9f5' }}>
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                    <button type="submit" className="btn-primary" style={{ padding: '8px 16px', fontSize: '12px' }}>Save</button>
                  </form>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'attendance' && (
          <div className="premium-card" style={{ padding: '24px' }}>
            <h2 className="heading-display" style={{ fontSize: '1.125rem', color: '#1e293b', marginBottom: '16px' }}>Record Attendance</h2>
            <input type="date" value={selectedDate} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setSelectedDate(e.target.value)} style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #e8dfd6', fontSize: '15px', marginBottom: '20px', width: '100%', outline: 'none', background: '#fdf9f5' }} />

            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <button onClick={() => applyBatch('R')} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '13px', borderColor: '#22c55e', color: '#166534' }}>Selected → R</button>
              <button onClick={() => applyBatch('M')} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '13px', borderColor: '#eab308', color: '#854d0e' }}>Selected → M</button>
              <button onClick={() => applyBatch('X')} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '13px', borderColor: '#94a3b8', color: '#475569' }}>Selected → X</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {students.filter((s) => s.is_active && s.joining_date !== null).map((student) => {
                const currentStatus = statusMap[student.id] || 'X';
                const isSelected = selectedStudents.has(student.id);
                return (
                  <div key={student.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f5efe8', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(student.id)} style={{ width: '18px', height: '18px', accentColor: '#1a472a' }} />
                      <span style={{ fontSize: '14px', fontWeight: 500, color: '#1e293b' }}>{student.full_name}</span>
                    </div>
                    <button
                      onClick={() => toggleStatus(student.id)}
                      style={{
                        padding: '8px 20px',
                        borderRadius: '999px',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: '14px',
                        background: statusColor(currentStatus),
                        color: 'white',
                      }}
                    >
                      {statusLabel(currentStatus)}
                    </button>
                  </div>
                );
              })}
            </div>

            <button onClick={saveAttendance} className="btn-primary" style={{ marginTop: '20px', width: '100%' }}>Save Attendance</button>
            <p style={{ fontSize: '12px', color: '#a6947e', marginTop: '10px', textAlign: 'center' }}>
              Tap status to change: X → R → M → X
            </p>
          </div>
        )}

        {tab === 'achievements' && (
          <div className="premium-card" style={{ padding: '24px' }}>
            <h2 className="heading-display" style={{ fontSize: '1.125rem', color: '#1e293b', marginBottom: '16px' }}>Add Achievement</h2>
            <form action={addAchievement} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <select name="student_id" required style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #e8dfd6', fontSize: '15px', outline: 'none', background: '#fdf9f5' }}>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.id} — {s.full_name}</option>
                ))}
              </select>
              <input name="title" placeholder="Achievement Title" required style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #e8dfd6', fontSize: '15px', outline: 'none', background: '#fdf9f5' }} />
              <input name="category" placeholder="Category (e.g., Nahwu, Tajwid)" style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #e8dfd6', fontSize: '15px', outline: 'none', background: '#fdf9f5' }} />
              <input name="date" type="date" style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #e8dfd6', fontSize: '15px', outline: 'none', background: '#fdf9f5' }} />
              <input name="description" placeholder="Description (optional)" style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #e8dfd6', fontSize: '15px', outline: 'none', background: '#fdf9f5' }} />
              <button type="submit" className="btn-primary">Add Achievement</button>
            </form>

            <h2 className="heading-display" style={{ fontSize: '1.125rem', color: '#1e293b', marginTop: '28px', marginBottom: '16px' }}>Existing Achievements</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {achievements.map((a) => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f5efe8' }}>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{a.title}</p>
                    <p style={{ fontSize: '12px', color: '#a6947e' }}>{a.student_id} {a.date ? `— ${a.date}` : ''}</p>
                  </div>
                  <form action={deleteAchievement}>
                    <input type="hidden" name="id" value={a.id} />
                    <button type="submit" style={{ fontSize: '13px', color: '#dc2626', background: 'none', border: 'none', fontWeight: 500 }}>Delete</button>
                  </form>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'announcement' && (
          <div className="premium-card" style={{ padding: '24px' }}>
            <h2 className="heading-display" style={{ fontSize: '1.125rem', color: '#1e293b', marginBottom: '16px' }}>Post Announcement</h2>
            <form action={saveAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <textarea name="arabic_text" placeholder="Arabic verses (paste here)" rows={6} style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #e8dfd6', fontSize: '18px', outline: 'none', background: '#fdf9f5', fontFamily: 'Amiri, serif', direction: 'rtl', textAlign: 'right', lineHeight: 2 }} />
              <textarea name="english_text" placeholder="English text (optional)" rows={3} style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #e8dfd6', fontSize: '15px', outline: 'none', background: '#fdf9f5' }} />
              <textarea name="schedule" placeholder="Schedule (e.g., Monday: Verses 1-4)" rows={6} style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #e8dfd6', fontSize: '15px', outline: 'none', background: '#fdf9f5' }} />
              <button type="submit" className="btn-primary">Post Announcement</button>
            </form>

            {announcement && (
              <div style={{ marginTop: '24px', padding: '16px', background: '#fdf9f5', borderRadius: '12px' }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>Current Announcement:</p>
                {announcement.arabic_text && (
                  <p style={{ fontFamily: 'Amiri, serif', direction: 'rtl', textAlign: 'right', fontSize: '18px', lineHeight: 2 }}>{announcement.arabic_text}</p>
                )}
                {announcement.english_text && (
                  <p style={{ fontSize: '14px', color: '#6b5a4a', marginTop: '8px' }}>{announcement.english_text}</p>
                )}
                {announcement.schedule && (
                  <p style={{ fontSize: '14px', color: '#6b5a4a', marginTop: '8px', whiteSpace: 'pre-wrap' }}>{announcement.schedule}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}