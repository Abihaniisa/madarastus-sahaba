'use client';

import { useState, useRef, useEffect } from 'react';
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
  uploadFounderPhoto,
  logout,
} from './actions';
import ImageCropper from './ImageCropper';

interface Props {
  mode: 'login' | 'dashboard';
  students: Student[];
  achievements: Achievement[];
  announcement: any;
}

export default function AdminClient({ mode, students, achievements, announcement }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<'students' | 'attendance' | 'achievements' | 'announcement'>('students');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [croppingFor, setCroppingFor] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string>('');
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [founderUploading, setFounderUploading] = useState(false);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [windowState, setWindowState] = useState<any>(null);

  useEffect(() => {
    setWindowState(window);
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  if (mode === 'login') {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoadingLogin(true);
      setToast(null);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setToast({ type: 'error', message: error.message });
      } else {
        router.push('/admin');
        router.refresh();
      }
      setLoadingLogin(false);
    };

    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fdf9f5', padding: '16px' }}>
        <div style={{ width: '100%', maxWidth: '400px', background: 'white', borderRadius: '16px', border: '1px solid #e8dfd6', padding: '32px 28px', boxShadow: '0 2px 10px rgba(26,71,42,0.06)' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, textAlign: 'center', color: '#1a472a' }}>{SCHOOL.shortName}</h1>
          <p style={{ fontSize: '14px', color: '#6b5a4a', textAlign: 'center', marginTop: '4px' }}>Admin Login</p>
          <form onSubmit={handleLogin} style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label htmlFor="email" style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>Email</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e8dfd6', fontSize: '15px', outline: 'none', background: '#fdf9f5' }} />
            </div>
            <div>
              <label htmlFor="password" style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" style={{ width: '100%', padding: '12px 48px 12px 16px', borderRadius: '12px', border: '1px solid #e8dfd6', fontSize: '15px', outline: 'none', background: '#fdf9f5' }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6b5a4a', padding: '4px' }} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>
            {toast?.type === 'error' && <p style={{ color: '#dc2626', fontSize: '14px' }}>{toast.message}</p>}
            <button type="submit" disabled={loadingLogin} className="btn-primary" style={{ width: '100%', opacity: loadingLogin ? 0.5 : 1 }}>
              {loadingLogin ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
        {toast && <div className={`toast ${toast.type === 'error' ? 'error' : ''}`}>{toast.message}</div>}
      </main>
    );
  }

  const showToast = (type: 'success' | 'error', message: string) => setToast({ type, message });

  const handleFileSelect = (studentId: string, file: File) => {
    if (!file.type.startsWith('image/')) return showToast('error', 'Only images allowed');
    const url = URL.createObjectURL(file);
    setCropSrc(url);
    setCroppingFor(studentId);
  };

  const handleCropComplete = (file: File) => {
    if (!croppingFor) return;
    const url = URL.createObjectURL(file);
    setPreviewUrls(prev => ({ ...prev, [croppingFor]: url }));
    // Save cropped file in window object for upload
    (window as any).croppedFiles = (window as any).croppedFiles || {};
    (window as any).croppedFiles[croppingFor] = file;
    setCropSrc('');
    setCroppingFor(null);
  };

  const savePhoto = async (studentId: string) => {
    const file = (window as any).croppedFiles?.[studentId];
    if (!file) return showToast('error', 'No cropped image');
    setUploadingId(studentId);
    const formData = new FormData();
    formData.append('student_id', studentId);
    formData.append('file', file);
    const result = await uploadStudentPhoto(formData);
    if (result?.error) showToast('error', result.error);
    else {
      showToast('success', 'Photo uploaded successfully.');
      if (previewUrls[studentId]) URL.revokeObjectURL(previewUrls[studentId]);
      setPreviewUrls(prev => ({ ...prev, [studentId]: '' }));
      delete (window as any).croppedFiles?.[studentId];
      router.refresh();
    }
    setUploadingId(null);
  };

  const removePhoto = async (studentId: string) => {
    const formData = new FormData();
    formData.append('student_id', studentId);
    const result = await removeStudentPhoto(formData);
    if (result?.error) showToast('error', result.error);
    else {
      showToast('success', 'Photo removed.');
      router.refresh();
    }
  };

  const saveAttendance = async () => {
    const entries = Object.entries(statusMap);
    if (entries.length === 0) return showToast('error', 'No attendance changes to save.');
    const records = entries.map(([student_id, status]) => ({ student_id, date: selectedDate, status }));
    const result = await saveAttendanceBatch(records);
    if (result?.error) showToast('error', result.error);
    else {
      const counts = { R: 0, M: 0, X: 0 };
      records.forEach((r) => { counts[r.status as 'R'|'M'|'X']++; });
      showToast('success', `Attendance saved: ${counts.R} R, ${counts.M} M, ${counts.X} X`);
      setStatusMap({});
      router.refresh();
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/admin');
  };

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

  const selectAll = () => {
    const allIds = students.filter((s) => s.is_active && s.joining_date !== null).map((s) => s.id);
    setSelectedStudents(new Set(allIds));
  };

  const clearSelection = () => setSelectedStudents(new Set());

  const applyBatch = (status: string) => {
    const newMap = { ...statusMap };
    selectedStudents.forEach((id) => { newMap[id] = status; });
    setStatusMap(newMap);
    setSelectedStudents(new Set());
  };

  return (
    <main style={{ minHeight: '100vh', background: '#fdf9f5' }}>
      <header style={{ background: 'linear-gradient(135deg, #1a472a, #2c6a56)', color: 'white', padding: '20px 0' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Admin Dashboard</h1>
          <button onClick={handleLogout} style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', background: 'none', border: 'none', fontWeight: 500 }}>Logout</button>
        </div>
      </header>

      <div className="container" style={{ padding: '24px 16px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {(['students','attendance','achievements','announcement'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`tab-btn ${tab === t ? 'is-active' : ''}`}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
          ))}
        </div>

        {tab === 'students' && (
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e8dfd6', padding: '24px' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '16px' }}>Add Student</h2>
            <form action={addStudent} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input name="full_name" placeholder="Full Name" required style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #e8dfd6' }} />
              <input name="joining_date" type="date" style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #e8dfd6' }} />
              <input name="joining_week" type="number" min="1" max="53" placeholder="Joining Week (optional)" style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #e8dfd6' }} />
              <button type="submit" className="btn-primary">Add Student</button>
            </form>

            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: '28px', marginBottom: '16px' }}>Existing Students</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {students.map((student) => (
                <div key={student.id} style={{ padding: '16px', border: '1px solid #e8dfd6', borderRadius: '12px', background: '#fdf9f5' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    {previewUrls[student.id] ? (
                      <img src={previewUrls[student.id]} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : student.photo_url ? (
                      <img src={student.photo_url} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#c9a94e', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{student.full_name.charAt(0)}</div>
                    )}
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600 }}>{student.full_name}</p>
                      <p style={{ fontSize: '12px', color: '#a6947e' }}>{student.id}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        ref={(el) => { fileInputRefs.current[student.id] = el; }}
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(student.id, f); }}
                      />
                      {previewUrls[student.id] ? (
                        <>
                          <button onClick={() => savePhoto(student.id)} disabled={uploadingId === student.id} className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }}>{uploadingId === student.id ? 'Uploading...' : 'Save'}</button>
                          <button onClick={() => { if (previewUrls[student.id]) URL.revokeObjectURL(previewUrls[student.id]); setPreviewUrls(prev => ({ ...prev, [student.id]: '' })); delete (window as any).croppedFiles?.[student.id]; }} className="btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }}>Cancel</button>
                        </>
                      ) : (
                        <button onClick={() => fileInputRefs.current[student.id]?.click()} className="btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }}>{student.photo_url ? 'Change' : 'Upload'}</button>
                      )}
                      {student.photo_url && !previewUrls[student.id] && (
                        <button onClick={() => removePhoto(student.id)} className="btn-danger" style={{ padding: '6px 12px', fontSize: '12px' }}>Remove</button>
                      )}
                    </div>
                  </div>
                  <form action={updateStudent} style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <input type="hidden" name="id" value={student.id} />
                    <input name="full_name" defaultValue={student.full_name} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e8dfd6', flex: '1 1 140px' }} />
                    <input name="joining_week" type="number" min="1" max="53" defaultValue={student.joining_week ?? ''} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e8dfd6', width: '80px' }} />
                    <select name="is_active" defaultValue={student.is_active ? 'true' : 'false'} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e8dfd6' }}>
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
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e8dfd6', padding: '24px' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '16px' }}>Record Attendance</h2>
            <input type="date" value={selectedDate} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setSelectedDate(e.target.value)} style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #e8dfd6', marginBottom: '16px', width: '100%' }} />
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button onClick={selectAll} className="btn-outline" style={{ padding: '8px 16px', fontSize: '13px' }}>Select All</button>
              <button onClick={clearSelection} className="btn-outline" style={{ padding: '8px 16px', fontSize: '13px' }}>Clear</button>
              <span>{selectedStudents.size} selected</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <button onClick={() => applyBatch('R')} className="btn-outline" style={{ borderColor:'#22c55e', color:'#166534' }}>Selected → R</button>
              <button onClick={() => applyBatch('M')} className="btn-outline" style={{ borderColor:'#eab308', color:'#854d0e' }}>Selected → M</button>
              <button onClick={() => applyBatch('X')} className="btn-outline" style={{ borderColor:'#94a3b8', color:'#475569' }}>Selected → X</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {students.filter(s => s.is_active && s.joining_date !== null).map(student => {
                const current = statusMap[student.id] || 'X';
                return (
                  <div key={student.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f5efe8' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                      <input type="checkbox" checked={selectedStudents.has(student.id)} onChange={() => toggleSelect(student.id)} style={{ width: '18px', height: '18px', accentColor: '#1a472a' }} />
                      <span>{student.full_name}</span>
                    </div>
                    <button onClick={() => toggleStatus(student.id)} style={{ padding: '8px 20px', borderRadius: '999px', border: 'none', fontWeight: 700, background: statusColor(current), color: 'white' }}>{current}</button>
                  </div>
                );
              })}
            </div>
            <button onClick={saveAttendance} className="btn-primary" style={{ marginTop: '20px', width: '100%' }}>Save Attendance</button>
          </div>
        )}

        {tab === 'achievements' && (
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e8dfd6', padding: '24px' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '16px' }}>Add Achievement</h2>
            <form action={addAchievement} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <select name="student_id" required style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #e8dfd6' }}>
                {students.map(s => <option key={s.id} value={s.id}>{s.id} — {s.full_name}</option>)}
              </select>
              <input name="title" placeholder="Achievement Title" required style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #e8dfd6' }} />
              <input name="category" placeholder="Category" style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #e8dfd6' }} />
              <input name="date" type="date" style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #e8dfd6' }} />
              <input name="description" placeholder="Description" style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #e8dfd6' }} />
              <button type="submit" className="btn-primary">Add Achievement</button>
            </form>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: '28px', marginBottom: '16px' }}>Existing Achievements</h2>
            {achievements.map(a => (
              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f5efe8' }}>
                <div>
                  <p style={{ fontWeight: 600 }}>{a.title}</p>
                  <p style={{ fontSize: '12px', color: '#a6947e' }}>{a.student_id} {a.date}</p>
                </div>
                <form action={deleteAchievement}>
                  <input type="hidden" name="id" value={a.id} />
                  <button type="submit" className="btn-danger" style={{ padding: '6px 12px', fontSize: '12px' }}>Delete</button>
                </form>
              </div>
            ))}
          </div>
        )}

        {tab === 'announcement' && (
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e8dfd6', padding: '24px' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '16px' }}>Post Announcement</h2>
            <form action={saveAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <textarea name="arabic_text" rows={4} placeholder="Arabic verses" style={{ fontFamily: 'Amiri, serif', direction: 'rtl', textAlign: 'right', fontSize: '18px', lineHeight: 2, padding: '12px 16px', borderRadius: '12px', border: '1px solid #e8dfd6' }} />
              <textarea name="english_text" rows={3} placeholder="English translation" style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #e8dfd6' }} />
              <textarea name="schedule" rows={5} placeholder="Weekly schedule" style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #e8dfd6' }} />
              <button type="submit" className="btn-primary">Post Announcement</button>
            </form>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: '28px', marginBottom: '16px' }}>Founder Photo</h2>
            <form action={uploadFounderPhoto}>
              <label className="btn-outline" style={{ cursor: 'pointer', display: 'inline-flex' }}>
                Upload Founder Photo
                <input type="file" name="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { if (e.target.files?.[0]) e.target.form?.requestSubmit(); }} />
              </label>
            </form>
          </div>
        )}
      </div>
      {croppingFor && <ImageCropper src={cropSrc} onCancel={() => { setCroppingFor(null); setCropSrc(''); URL.revokeObjectURL(cropSrc); }} onCrop={handleCropComplete} />}
      {toast && <div className={`toast ${toast.type === 'error' ? 'error' : ''}`}>{toast.message}</div>}
    </main>
  );
}