'use client';

import { useState, useRef } from 'react';
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
  uploadStudentPhoto,
  removeStudentPhoto,
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
  const [previewFiles, setPreviewFiles] = useState<Record<string, File | null>>({});
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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
        <div style={{ width: '100%', maxWidth: '400px', background: 'white', borderRadius: '16px', border: '1px solid #e8dfd6', padding: '32px 28px', boxShadow: '0 2px 10px rgba(26,71,42,0.06)' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, textAlign: 'center', color: '#1a472a' }}>{SCHOOL.shortName}</h1>
          <p style={{ fontSize: '14px', color: '#6b5a4a', textAlign: 'center', marginTop: '4px' }}>Admin Login</p>
          <form onSubmit={handleLogin} style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label htmlFor="email" style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>Email</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e8dfd6', fontSize: '15px', outline: 'none', background: '#fdf9f5' }} />
            </div>
            <div>
              <label htmlFor="password" style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>Password</label>
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e8dfd6', fontSize: '15px', outline: 'none', background: '#fdf9f5' }} />
            </div>
            {error && <p style={{ fontSize: '14px', color: '#dc2626' }}>{error}</p>}
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', borderRadius: '999px', background: '#1a472a', color: 'white', fontWeight: 700, border: 'none', opacity: loading ? 0.5 : 1 }}>
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

  const handlePhotoSelect = (studentId: string, file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Only image files are allowed.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be under 5MB.');
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewFiles((prev) => ({ ...prev, [studentId]: file }));
    setPreviewUrls((prev) => ({ ...prev, [studentId]: url }));
    setError('');
  };

  const cancelPhoto = (studentId: string) => {
    const url = previewUrls[studentId];
    if (url) URL.revokeObjectURL(url);
    setPreviewFiles((prev) => ({ ...prev, [studentId]: null }));
    setPreviewUrls((prev) => ({ ...prev, [studentId]: '' }));
    if (fileInputRefs.current[studentId]) {
      fileInputRefs.current[studentId]!.value = '';
    }
  };

  const savePhoto = async (studentId: string) => {
    const file = previewFiles[studentId];
    if (!file) return;
    setError('');
    setMessage('Uploading photo...');
    const formData = new FormData();
    formData.append('student_id', studentId);
    formData.append('file', file);
    const result = await uploadStudentPhoto(formData);
    if (result?.error) {
      setError(result.error);
      setMessage('');
    } else {
      setMessage('Photo uploaded successfully.');
      const url = previewUrls[studentId];
      if (url) URL.revokeObjectURL(url);
      setPreviewFiles((prev) => ({ ...prev, [studentId]: null }));
      setPreviewUrls((prev) => ({ ...prev, [studentId]: '' }));
      if (fileInputRefs.current[studentId]) {
        fileInputRefs.current[studentId]!.value = '';
      }
      router.refresh();
    }
  };

  const removePhoto = async (studentId: string) => {
    setError('');
    setMessage('Removing photo...');
    const formData = new FormData();
    formData.append('student_id', studentId);
    const result = await removeStudentPhoto(formData);
    if (result?.error) {
      setError(result.error);
      setMessage('');
    } else {
      setMessage('Photo removed.');
      router.refresh();
    }
  };

  return (
    <main style={{ minHeight: '100vh', background: '#fdf9f5' }}>
      <header style={{ background: 'linear-gradient(135deg, #1a472a, #2c6a56)', color: 'white', padding: '20px 0' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Admin Dashboard</h1>
          <button onClick={handleLogout} style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', background: 'none', border: 'none', fontWeight: 500 }}>
            Logout
          </button>
        </div>
      </header>

      <div className="container" style={{ padding: '24px 16px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <button onClick={() => setTab('students')} style={{ padding: '8px 16px', borderRadius: '999px', fontSize: '13px', fontWeight: 700, background: tab === 'students' ? '#1a472a' : 'white', color: tab === 'students' ? 'white' : '#475569', border: '1px solid #e8dfd6' }}>Students</button>
          <button onClick={() => setTab('attendance')} style={{ padding: '8px 16px', borderRadius: '999px', fontSize: '13px', fontWeight: 700, background: tab === 'attendance' ? '#1a472a' : 'white', color: tab === 'attendance' ? 'white' : '#475569', border: '1px solid #e8dfd6' }}>Attendance</button>
          <button onClick={() => setTab('achievements')} style={{ padding: '8px 16px', borderRadius: '999px', fontSize: '13px', fontWeight: 700, background: tab === 'achievements' ? '#1a472a' : 'white', color: tab === 'achievements' ? 'white' : '#475569', border: '1px solid #e8dfd6' }}>Achievements</button>
          <button onClick={() => setTab('announcement')} style={{ padding: '8px 16px', borderRadius: '999px', fontSize: '13px', fontWeight: 700, background: tab === 'announcement' ? '#1a472a' : 'white', color: tab === 'announcement' ? 'white' : '#475569', border: '1px solid #e8dfd6' }}>Announcement</button>
        </div>

        {message && <p style={{ fontSize: '14px', color: '#16a34a', marginBottom: '12px', fontWeight: 600 }}>{message}</p>}
        {error && <p style={{ fontSize: '14px', color: '#dc2626', marginBottom: '12px', fontWeight: 600 }}>{error}</p>}

        {tab === 'students' && (
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e8dfd6', padding: '24px', boxShadow: '0 2px 10px rgba(26,71,42,0.04)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b', marginBottom: '16px' }}>Add Student</h2>
            <form action={addStudent} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input name="full_name" placeholder="Full Name" required style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #e8dfd6', fontSize: '15px', outline: 'none', background: '#fdf9f5' }} />
              <input name="joining_date" type="date" style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #e8dfd6', fontSize: '15px', outline: 'none', background: '#fdf9f5' }} />
              <input name="joining_week" type="number" min="1" max="53" placeholder="Joining Week (optional)" style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #e8dfd6', fontSize: '15px', outline: 'none', background: '#fdf9f5' }} />
              <button type="submit" style={{ padding: '12px', borderRadius: '999px', background: '#1a472a', color: 'white', fontWeight: 700, border: 'none' }}>Add Student</button>
            </form>

            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b', marginTop: '28px', marginBottom: '16px' }}>Existing Students</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {students.map((student) => (
                <div key={student.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f5efe8', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <p style={{ fontWeight: 600, color: '#1e293b' }}>{student.full_name}</p>
                    <p style={{ fontSize: '12px', color: '#a6947e' }}>{student.id}</p>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                    {/* Photo preview and upload */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {previewUrls[student.id] ? (
                        <img src={previewUrls[student.id]} alt="Preview" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                      ) : student.photo_url ? (
                        <img src={student.photo_url} alt="Current" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#c9a94e', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{student.full_name.charAt(0)}</div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        ref={(el) => { fileInputRefs.current[student.id] = el; }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handlePhotoSelect(student.id, file);
                        }}
                      />
                      {previewUrls[student.id] ? (
                        <>
                          <button onClick={() => savePhoto(student.id)} style={{ fontSize: '12px', padding: '6px 10px', borderRadius: '8px', border: 'none', background: '#1a472a', color: 'white', fontWeight: 600 }}>Save Photo</button>
                          <button onClick={() => cancelPhoto(student.id)} style={{ fontSize: '12px', padding: '6px 10px', borderRadius: '8px', border: '1px solid #e8dfd6', background: 'white', color: '#475569', fontWeight: 600 }}>Cancel</button>
                        </>
                      ) : (
                        <button onClick={() => fileInputRefs.current[student.id]?.click()} style={{ fontSize: '12px', padding: '6px 10px', borderRadius: '8px', border: '1px solid #e8dfd6', background: 'white', color: '#1a472a', fontWeight: 600 }}>
                          {student.photo_url ? 'Change Photo' : 'Upload Photo'}
                        </button>
                      )}
                      {student.photo_url && !previewUrls[student.id] && (
                        <button onClick={() => removePhoto(student.id)} style={{ fontSize: '12px', padding: '6px 10px', borderRadius: '8px', border: 'none', background: '#dc2626', color: 'white', fontWeight: 600 }}>Remove</button>
                      )}
                    </div>

                    {/* Edit form */}
                    <form action={updateStudent} style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <input type="hidden" name="id" value={student.id} />
                      <input name="full_name" defaultValue={student.full_name} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e8dfd6', fontSize: '13px', width: '140px', outline: 'none', background: '#fdf9f5' }} />
                      <input name="joining_week" type="number" min="1" max="53" defaultValue={student.joining_week ?? ''} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e8dfd6', fontSize: '13px', width: '70px', outline: 'none', background: '#fdf9f5' }} />
                      <select name="is_active" defaultValue={student.is_active ? 'true' : 'false'} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e8dfd6', fontSize: '13px', outline: 'none', background: '#fdf9f5' }}>
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </select>
                      <button type="submit" style={{ padding: '8px 16px', borderRadius: '8px', background: '#1a472a', color: 'white', fontSize: '12px', fontWeight: 600, border: 'none' }}>Save</button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'attendance' && (
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e8dfd6', padding: '24px', boxShadow: '0 2px 10px rgba(26,71,42,0.04)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b', marginBottom: '16px' }}>Record Attendance</h2>
            <input type="date" value={selectedDate} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setSelectedDate(e.target.value)} style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #e8dfd6', fontSize: '15px', marginBottom: '20px', width: '100%', outline: 'none', background: '#fdf9f5' }} />

            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <button onClick={() => applyBatch('R')} style={{ padding: '8px 16px', borderRadius: '999px', fontSize: '13px', fontWeight: 700, border: '1px solid #22c55e', background: 'white', color: '#166534' }}>Selected → R</button>
              <button onClick={() => applyBatch('M')} style={{ padding: '8px 16px', borderRadius: '999px', fontSize: '13px', fontWeight: 700, border: '1px solid #eab308', background: 'white', color: '#854d0e' }}>Selected → M</button>
              <button onClick={() => applyBatch('X')} style={{ padding: '8px 16px', borderRadius: '999px', fontSize: '13px', fontWeight: 700, border: '1px solid #94a3b8', background: 'white', color: '#475569' }}>Selected → X</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {students.filter((s) => s.is_active && s.joining_date !== null).map((student) => {
                const currentStatus = statusMap[student.id] || 'X';
                const isSelected = selectedStudents.has(student.id);
                return (
                  <div key={student.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f5efe8', gap: '10px' }}>
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
                      {currentStatus}
                    </button>
                  </div>
                );
              })}
            </div>

            <button onClick={saveAttendance} style={{ marginTop: '20px', width: '100%', padding: '12px', borderRadius: '999px', background: '#1a472a', color: 'white', fontWeight: 700, border: 'none' }}>Save Attendance</button>
            <p style={{ fontSize: '12px', color: '#a6947e', marginTop: '10px', textAlign: 'center' }}>
              Tap status to change: X → R → M → X
            </p>
          </div>
        )}

        {tab === 'achievements' && (
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e8dfd6', padding: '24px', boxShadow: '0 2px 10px rgba(26,71,42,0.04)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b', marginBottom: '16px' }}>Add Achievement</h2>
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
              <button type="submit" style={{ padding: '12px', borderRadius: '999px', background: '#1a472a', color: 'white', fontWeight: 700, border: 'none' }}>Add Achievement</button>
            </form>

            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b', marginTop: '28px', marginBottom: '16px' }}>Existing Achievements</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {achievements.map((a) => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f5efe8' }}>
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
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e8dfd6', padding: '24px', boxShadow: '0 2px 10px rgba(26,71,42,0.04)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b', marginBottom: '16px' }}>Post Announcement</h2>
            <form action={saveAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <textarea name="arabic_text" placeholder="Arabic verses (paste here)" rows={4} style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #e8dfd6', fontSize: '18px', outline: 'none', background: '#fdf9f5', fontFamily: 'Amiri, serif', direction: 'rtl', textAlign: 'right', lineHeight: 2 }} />
              <textarea name="english_text" placeholder="English text (optional)" rows={3} style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #e8dfd6', fontSize: '15px', outline: 'none', background: '#fdf9f5' }} />
              <textarea name="schedule" placeholder="Schedule (e.g., Monday: Verses 1-4)" rows={5} style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #e8dfd6', fontSize: '15px', outline: 'none', background: '#fdf9f5' }} />
              <button type="submit" style={{ padding: '12px', borderRadius: '999px', background: '#1a472a', color: 'white', fontWeight: 700, border: 'none' }}>Post Announcement</button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}