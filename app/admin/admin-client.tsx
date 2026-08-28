'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  const [tab, setTab] = useState<'students' | 'attendance' | 'achievements' | 'announcement'>('students');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [previewFiles, setPreviewFiles] = useState<Record<string, File | null>>({});
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (message || error) {
      const timer = setTimeout(() => {
        setMessage('');
        setError('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message, error]);

  if (mode === 'login') {
    return null;
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

  const selectAll = () => {
    const allIds = students.filter((s) => s.is_active && s.joining_date !== null).map((s) => s.id);
    setSelectedStudents(new Set(allIds));
  };

  const clearSelection = () => {
    setSelectedStudents(new Set());
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
      else {
        const counts = { R: 0, M: 0, X: 0 };
        records.forEach((r) => { counts[r.status as 'R' | 'M' | 'X']++; });
        setMessage(`Attendance saved: ${counts.R} R, ${counts.M} M, ${counts.X} X`);
        setStatusMap({});
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save attendance.');
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/admin/login');
  };

  const compressImage = (file: File, maxWidth = 600, quality = 0.7): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (!blob) return reject(new Error('Compression failed'));
              const compressedFile = new File([blob], file.name, { type: 'image/jpeg' });
              resolve(compressedFile);
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoSelect = async (studentId: string, file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Only image files are allowed.');
      return;
    }
    setUploadingId(studentId);
    try {
      const compressed = await compressImage(file);
      const url = URL.createObjectURL(compressed);
      setPreviewFiles((prev) => ({ ...prev, [studentId]: compressed }));
      setPreviewUrls((prev) => ({ ...prev, [studentId]: url }));
      setError('');
    } catch {
      setError('Failed to process image.');
    } finally {
      setUploadingId(null);
    }
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
    setUploadingId(studentId);
    const formData = new FormData();
    formData.append('student_id', studentId);
    formData.append('file', file);
    const result = await uploadStudentPhoto(formData);
    if (result?.error) {
      setError(result.error);
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
    setUploadingId(null);
  };

  const removePhoto = async (studentId: string) => {
    setError('');
    setMessage('Removing photo...');
    const formData = new FormData();
    formData.append('student_id', studentId);
    const result = await removeStudentPhoto(formData);
    if (result?.error) {
      setError(result.error);
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
          <button onClick={() => setTab('students')} className={`tab-btn ${tab === 'students' ? 'is-active' : ''}`}>Students</button>
          <button onClick={() => setTab('attendance')} className={`tab-btn ${tab === 'attendance' ? 'is-active' : ''}`}>Attendance</button>
          <button onClick={() => setTab('achievements')} className={`tab-btn ${tab === 'achievements' ? 'is-active' : ''}`}>Achievements</button>
          <button onClick={() => setTab('announcement')} className={`tab-btn ${tab === 'announcement' ? 'is-active' : ''}`}>Announcement</button>
        </div>

        {message && (
          <div style={{ background: '#dcfce7', color: '#166534', padding: '12px 16px', borderRadius: '12px', marginBottom: '16px', fontSize: '14px', fontWeight: 600 }}>
            {message}
          </div>
        )}
        {error && (
          <div style={{ background: '#fee2e2', color: '#991b1b', padding: '12px 16px', borderRadius: '12px', marginBottom: '16px', fontSize: '14px', fontWeight: 600 }}>
            {error}
          </div>
        )}

        {tab === 'students' && (
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e8dfd6', padding: '24px', boxShadow: '0 2px 10px rgba(26,71,42,0.04)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b', marginBottom: '16px' }}>Add Student</h2>
            <form action={addStudent} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input name="full_name" placeholder="Full Name" required style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #e8dfd6', fontSize: '15px', outline: 'none', background: '#fdf9f5' }} />
              <input name="joining_date" type="date" style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #e8dfd6', fontSize: '15px', outline: 'none', background: '#fdf9f5' }} />
              <input name="joining_week" type="number" min="1" max="53" placeholder="Joining Week (optional)" style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #e8dfd6', fontSize: '15px', outline: 'none', background: '#fdf9f5' }} />
              <button type="submit" className="btn-primary">Add Student</button>
            </form>

            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b', marginTop: '28px', marginBottom: '16px' }}>Existing Students</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {students.map((student) => (
                <div key={student.id} style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px', border: '1px solid #e8dfd6', borderRadius: '12px', background: '#fdf9f5' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    {previewUrls[student.id] ? (
                      <img src={previewUrls[student.id]} alt="Preview" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : student.photo_url ? (
                      <img src={student.photo_url} alt="Current" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#c9a94e', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{student.full_name.charAt(0)}</div>
                    )}
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, color: '#1e293b' }}>{student.full_name}</p>
                      <p style={{ fontSize: '12px', color: '#a6947e' }}>{student.id}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
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
                          <button onClick={() => savePhoto(student.id)} disabled={uploadingId === student.id} className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                            {uploadingId === student.id ? 'Uploading...' : 'Save Photo'}
                          </button>
                          <button onClick={() => cancelPhoto(student.id)} className="btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }}>Cancel</button>
                        </>
                      ) : (
                        <button onClick={() => fileInputRefs.current[student.id]?.click()} className="btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }}>
                          {student.photo_url ? 'Change Photo' : 'Upload Photo'}
                        </button>
                      )}
                      {student.photo_url && !previewUrls[student.id] && (
                        <button onClick={() => removePhoto(student.id)} className="btn-danger" style={{ padding: '6px 12px', fontSize: '12px' }}>Remove</button>
                      )}
                    </div>
                  </div>
                  <form action={updateStudent} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <input type="hidden" name="id" value={student.id} />
                    <input name="full_name" defaultValue={student.full_name} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e8dfd6', fontSize: '13px', flex: '1 1 140px', outline: 'none', background: 'white' }} />
                    <input name="joining_week" type="number" min="1" max="53" defaultValue={student.joining_week ?? ''} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e8dfd6', fontSize: '13px', width: '80px', outline: 'none', background: 'white' }} />
                    <select name="is_active" defaultValue={student.is_active ? 'true' : 'false'} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e8dfd6', fontSize: '13px', outline: 'none', background: 'white' }}>
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
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e8dfd6', padding: '24px', boxShadow: '0 2px 10px rgba(26,71,42,0.04)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b', marginBottom: '16px' }}>Record Attendance</h2>
            <input type="date" value={selectedDate} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setSelectedDate(e.target.value)} style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #e8dfd6', fontSize: '15px', marginBottom: '20px', width: '100%', outline: 'none', background: '#fdf9f5' }} />

            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button onClick={selectAll} className="btn-outline" style={{ padding: '8px 16px', fontSize: '13px' }}>Select All</button>
              <button onClick={clearSelection} className="btn-outline" style={{ padding: '8px 16px', fontSize: '13px' }}>Clear</button>
              <span style={{ fontSize: '13px', color: '#6b5a4a' }}>{selectedStudents.size} selected</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <button onClick={() => applyBatch('R')} className="btn-outline" style={{ padding: '8px 16px', fontSize: '13px', borderColor: '#22c55e', color: '#166534' }}>Selected → R</button>
              <button onClick={() => applyBatch('M')} className="btn-outline" style={{ padding: '8px 16px', fontSize: '13px', borderColor: '#eab308', color: '#854d0e' }}>Selected → M</button>
              <button onClick={() => applyBatch('X')} className="btn-outline" style={{ padding: '8px 16px', fontSize: '13px', borderColor: '#94a3b8', color: '#475569' }}>Selected → X</button>
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

            <button onClick={saveAttendance} className="btn-primary" style={{ marginTop: '20px', width: '100%', padding: '12px' }}>Save Attendance</button>
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
              <button type="submit" className="btn-primary">Add Achievement</button>
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
              <button type="submit" className="btn-primary">Post Announcement</button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}