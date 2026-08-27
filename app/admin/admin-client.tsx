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
  logout,
} from './actions';

interface Props {
  mode: 'login' | 'dashboard';
  students: Student[];
  achievements: Achievement[];
}

export default function AdminClient({ mode, students, achievements }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'students' | 'attendance' | 'achievements'>('students');
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
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafaf8', padding: '16px' }}>
        <div style={{ width: '100%', maxWidth: '380px', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', textAlign: 'center', color: '#1a472a' }}>{SCHOOL.shortName}</h1>
          <p style={{ fontSize: '14px', color: '#64748b', textAlign: 'center', marginTop: '4px' }}>Admin Login</p>
          <form onSubmit={handleLogin} style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label htmlFor="email" style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#334155' }}>Email</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ marginTop: '4px', width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '16px', outline: 'none' }} />
            </div>
            <div>
              <label htmlFor="password" style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#334155' }}>Password</label>
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ marginTop: '4px', width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '16px', outline: 'none' }} />
            </div>
            {error && <p style={{ fontSize: '14px', color: '#dc2626' }}>{error}</p>}
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#1a472a', color: 'white', fontWeight: 600, border: 'none', opacity: loading ? 0.5 : 1 }}>
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
    return '#ef4444';
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
    <main style={{ minHeight: '100vh', background: '#fafaf8' }}>
      <header style={{ background: '#1a472a', color: 'white', padding: '16px 0' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: '1.125rem', fontWeight: 'bold' }}>Admin Dashboard</h1>
          <button onClick={handleLogout} style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', background: 'none', border: 'none' }}>Logout</button>
        </div>
      </header>

      <div className="container" style={{ padding: '24px 16px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <button onClick={() => setTab('students')} style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 500, background: tab === 'students' ? '#1a472a' : 'white', color: tab === 'students' ? 'white' : '#475569', border: '1px solid #e2e8f0' }}>Students</button>
          <button onClick={() => setTab('attendance')} style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 500, background: tab === 'attendance' ? '#1a472a' : 'white', color: tab === 'attendance' ? 'white' : '#475569', border: '1px solid #e2e8f0' }}>Attendance</button>
          <button onClick={() => setTab('achievements')} style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 500, background: tab === 'achievements' ? '#1a472a' : 'white', color: tab === 'achievements' ? 'white' : '#475569', border: '1px solid #e2e8f0' }}>Achievements</button>
        </div>

        {message && <p style={{ fontSize: '14px', color: '#16a34a', marginBottom: '12px' }}>{message}</p>}
        {error && <p style={{ fontSize: '14px', color: '#dc2626', marginBottom: '12px' }}>{error}</p>}

        {tab === 'students' && (
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px' }}>
            <h2 style={{ fontWeight: 600, marginBottom: '12px' }}>Add Student</h2>
            <form action={addStudent} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input name="full_name" placeholder="Full Name" required style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '16px' }} />
              <input name="joining_date" type="date" style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '16px' }} />
              <input name="joining_week" type="number" min="1" max="53" placeholder="Joining Week (optional)" style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '16px' }} />
              <button type="submit" style={{ padding: '12px', borderRadius: '8px', background: '#1a472a', color: 'white', fontWeight: 600, border: 'none' }}>Add Student</button>
            </form>

            <h2 style={{ fontWeight: 600, marginTop: '24px', marginBottom: '12px' }}>Existing Students</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {students.map((student) => (
                <div key={student.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <p style={{ fontWeight: 500 }}>{student.full_name}</p>
                    <p style={{ fontSize: '12px', color: '#64748b' }}>{student.id}</p>
                  </div>
                  <form action={updateStudent} style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input type="hidden" name="id" value={student.id} />
                    <input name="full_name" defaultValue={student.full_name} style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', width: '140px' }} />
                    <input name="joining_week" type="number" min="1" max="53" defaultValue={student.joining_week ?? ''} style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', width: '70px' }} />
                    <select name="is_active" defaultValue={student.is_active ? 'true' : 'false'} style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}>
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                    <button type="submit" style={{ padding: '6px 12px', borderRadius: '6px', background: '#1a472a', color: 'white', fontSize: '12px', border: 'none' }}>Save</button>
                  </form>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'attendance' && (
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px' }}>
            <h2 style={{ fontWeight: 600, marginBottom: '12px' }}>Record Attendance</h2>
            <input type="date" value={selectedDate} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setSelectedDate(e.target.value)} style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '16px', marginBottom: '16px', width: '100%' }} />

            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <button onClick={() => applyBatch('R')} style={{ padding: '8px 16px', borderRadius: '8px', background: '#22c55e', color: 'white', border: 'none', fontWeight: 600 }}>Selected → R</button>
              <button onClick={() => applyBatch('M')} style={{ padding: '8px 16px', borderRadius: '8px', background: '#eab308', color: 'white', border: 'none', fontWeight: 600 }}>Selected → M</button>
              <button onClick={() => applyBatch('X')} style={{ padding: '8px 16px', borderRadius: '8px', background: '#ef4444', color: 'white', border: 'none', fontWeight: 600 }}>Selected → X</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {students.filter((s) => s.is_active && s.joining_date !== null).map((student) => {
                const currentStatus = statusMap[student.id] || 'X';
                const isSelected = selectedStudents.has(student.id);
                return (
                  <div key={student.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(student.id)} style={{ width: '18px', height: '18px' }} />
                      <span style={{ fontSize: '14px', fontWeight: 500 }}>{student.full_name}</span>
                    </div>
                    <button onClick={() => toggleStatus(student.id)} style={{ padding: '6px 16px', borderRadius: '999px', border: 'none', fontWeight: 600, fontSize: '14px', background: statusColor(currentStatus), color: 'white' }}>
                      {currentStatus === 'R' ? '✅ R' : currentStatus === 'M' ? '🔄 M' : '⏳ X'}
                    </button>
                  </div>
                );
              })}
            </div>

            <button onClick={saveAttendance} style={{ marginTop: '16px', width: '100%', padding: '12px', borderRadius: '8px', background: '#1a472a', color: 'white', fontWeight: 600, border: 'none' }}>Save Attendance</button>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px', textAlign: 'center' }}>Tap status to change: X → R → M → X</p>
          </div>
        )}

        {tab === 'achievements' && (
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px' }}>
            <h2 style={{ fontWeight: 600, marginBottom: '12px' }}>Add Achievement</h2>
            <form action={addAchievement} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <select name="student_id" required style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '16px' }}>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.id} — {s.full_name}</option>
                ))}
              </select>
              <input name="title" placeholder="Achievement Title" required style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '16px' }} />
              <input name="category" placeholder="Category (e.g., Nahwu, Tajwid)" style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '16px' }} />
              <input name="date" type="date" style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '16px' }} />
              <input name="description" placeholder="Description (optional)" style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '16px' }} />
              <button type="submit" style={{ padding: '12px', borderRadius: '8px', background: '#1a472a', color: 'white', fontWeight: 600, border: 'none' }}>Add Achievement</button>
            </form>

            <h2 style={{ fontWeight: 600, marginTop: '24px', marginBottom: '12px' }}>Existing Achievements</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {achievements.map((a) => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 500 }}>{a.title}</p>
                    <p style={{ fontSize: '12px', color: '#64748b' }}>{a.student_id} {a.date ? `— ${a.date}` : ''}</p>
                  </div>
                  <form action={deleteAchievement}>
                    <input type="hidden" name="id" value={a.id} />
                    <button type="submit" style={{ fontSize: '12px', color: '#dc2626', background: 'none', border: 'none' }}>Delete</button>
                  </form>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}