'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  supabase,
  Student,
  AttendanceRecord,
  Achievement,
  Announcement,
  STATUS_LABELS,
  STATUS_COLORS,
  getStudents,
  getActiveStudents,
  getAttendanceByDate,
  getAchievements,
  getLatestAnnouncement,
} from '@/lib';
import {
  addStudent,
  updateStudent,
  saveAttendanceBatch,
  addAchievement,
  deleteAchievement,
  saveAnnouncement,
  logout,
} from './actions';

type Tab = 'students' | 'attendance' | 'achievements' | 'announcement';

// ============================================
// LOGIN FORM (shown when not authenticated)
// ============================================

function LoginForm({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabaseClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              const value = document.cookie
                .split('; ')
                .find((row) => row.startsWith(name + '='))
                ?.split('=')[1];
              return value;
            },
            set(name: string, value: string, options: any) {
              document.cookie = `${name}=${value}; path=/; max-age=${options?.maxAge || 86400}`;
            },
            remove(name: string) {
              document.cookie = `${name}=; path=/; max-age=0`;
            },
          },
        }
      );

      const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError('Invalid email or password');
        setLoading(false);
        return;
      }

      onLogin();
    } catch {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div
      className="container"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh',
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: '400px',
          width: '100%',
          padding: '2rem',
        }}
      >
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          Madrasatus Sahaba Admin
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="email" style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '1rem',
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="password" style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '1rem',
              }}
            />
          </div>

          {error && (
            <p style={{ color: '#d32f2f', fontSize: '0.9rem', marginBottom: '1rem', textAlign: 'center' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%' }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.85rem' }}>
          <Link href="/" style={{ color: 'var(--color-text-light)' }}>
            ← Back to Home
          </Link>
        </p>
      </div>
    </div>
  );
}

// ============================================
// DASHBOARD (shown when authenticated)
// ============================================

function Dashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('students');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Students Tab State
  const [students, setStudents] = useState<Student[]>([]);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentDate, setNewStudentDate] = useState('');

  // Attendance Tab State
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeStudents, setActiveStudents] = useState<Student[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, 'R' | 'M' | 'X'>>({});
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [savingAttendance, setSavingAttendance] = useState(false);

  // Achievements Tab State
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [achievementStudent, setAchievementStudent] = useState('');
  const [achievementTitle, setAchievementTitle] = useState('');
  const [achievementDesc, setAchievementDesc] = useState('');
  const [achievementCategory, setAchievementCategory] = useState('');
  const [achievementDate, setAchievementDate] = useState('');

  // Announcement Tab State
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [arabicText, setArabicText] = useState('');
  const [englishText, setEnglishText] = useState('');
  const [scheduleText, setScheduleText] = useState('');

  // ============================================
  // DATA FETCHING
  // ============================================

  useEffect(() => {
    loadData();
  }, [activeTab]);

  async function loadData() {
    setLoading(true);
    try {
      if (activeTab === 'students') {
        const data = await getStudents();
        setStudents(data);
      } else if (activeTab === 'attendance') {
        const [activeData, attendanceData] = await Promise.all([
          getActiveStudents(),
          getAttendanceByDate(selectedDate),
        ]);
        setActiveStudents(activeData);
        const map: Record<string, 'R' | 'M' | 'X'> = {};
        attendanceData.forEach((r) => {
          map[r.student_id] = r.status as 'R' | 'M' | 'X';
        });
        setAttendanceMap(map);
      } else if (activeTab === 'achievements') {
        const data = await getAchievements();
        setAchievements(data);
      } else if (activeTab === 'announcement') {
        const data = await getLatestAnnouncement();
        setAnnouncement(data);
        if (data) {
          setArabicText(data.arabic_text || '');
          setEnglishText(data.english_text || '');
          setScheduleText(data.schedule || '');
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      showMessage('error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  function showMessage(type: 'success' | 'error', text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }

  // ============================================
  // STUDENTS TAB
  // ============================================

  function getWeekFromDate(dateStr: string): number {
    const start = new Date('2026-07-13');
    const date = new Date(dateStr);
    const diff = date.getTime() - start.getTime();
    return Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1;
  }

  async function handleAddStudent() {
    if (!newStudentName.trim() || !newStudentDate) {
      showMessage('error', 'Please fill in all fields');
      return;
    }

    try {
      const week = getWeekFromDate(newStudentDate);
      const result = await addStudent({
        full_name: newStudentName.trim(),
        joining_date: newStudentDate,
        joining_week: week,
      });
      if (result) {
        showMessage('success', `Student ${result.id} added successfully`);
        setNewStudentName('');
        setNewStudentDate('');
        await loadData();
      } else {
        showMessage('error', 'Failed to add student');
      }
    } catch (error) {
      console.error('Error adding student:', error);
      showMessage('error', 'Failed to add student');
    }
  }

  async function handleToggleActive(id: string, current: boolean) {
    try {
      await updateStudent({ id, is_active: !current });
      showMessage('success', 'Student status updated');
      await loadData();
    } catch (error) {
      console.error('Error updating student:', error);
      showMessage('error', 'Failed to update student');
    }
  }

  async function handleUpdateStudent(id: string, name: string, week: number | null) {
    try {
      await updateStudent({ id, full_name: name, joining_week: week ?? undefined });
      showMessage('success', 'Student updated successfully');
      await loadData();
    } catch (error) {
      console.error('Error updating student:', error);
      showMessage('error', 'Failed to update student');
    }
  }

  // ============================================
  // ATTENDANCE TAB
  // ============================================

  function handleDateChange(date: string) {
    const today = new Date().toISOString().split('T')[0];
    if (date > today) {
      showMessage('error', 'Cannot select future dates');
      return;
    }
    setSelectedDate(date);
    loadData();
  }

  function handleStatusToggle(studentId: string, status: 'R' | 'M' | 'X') {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  }

  function handleSelectAll() {
    if (selectedStudents.size === activeStudents.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(activeStudents.map((s) => s.id)));
    }
  }

  function handleBatchStatus(status: 'R' | 'M' | 'X') {
    const newMap = { ...attendanceMap };
    selectedStudents.forEach((id) => {
      newMap[id] = status;
    });
    setAttendanceMap(newMap);
  }

  async function handleSaveAttendance() {
    setSavingAttendance(true);
    try {
      const records = activeStudents.map((student) => ({
        student_id: student.id,
        date: selectedDate,
        status: attendanceMap[student.id] || 'X',
      }));
      const result = await saveAttendanceBatch({ records });
      if (result.success) {
        showMessage('success', `Attendance saved for ${result.count} students`);
        await loadData();
      } else {
        showMessage('error', 'Failed to save attendance');
      }
    } catch (error) {
      console.error('Error saving attendance:', error);
      showMessage('error', 'Failed to save attendance');
    } finally {
      setSavingAttendance(false);
    }
  }

  // ============================================
  // ACHIEVEMENTS TAB
  // ============================================

  async function handleAddAchievement() {
    if (!achievementStudent || !achievementTitle.trim()) {
      showMessage('error', 'Please select a student and enter a title');
      return;
    }

    try {
      const result = await addAchievement({
        student_id: achievementStudent,
        title: achievementTitle.trim(),
        description: achievementDesc.trim() || undefined,
        category: achievementCategory.trim() || undefined,
        date: achievementDate || undefined,
      });
      if (result) {
        showMessage('success', 'Achievement added successfully');
        setAchievementStudent('');
        setAchievementTitle('');
        setAchievementDesc('');
        setAchievementCategory('');
        setAchievementDate('');
        await loadData();
      } else {
        showMessage('error', 'Failed to add achievement');
      }
    } catch (error) {
      console.error('Error adding achievement:', error);
      showMessage('error', 'Failed to add achievement');
    }
  }

  async function handleDeleteAchievement(id: string) {
    if (!confirm('Delete this achievement?')) return;
    try {
      await deleteAchievement({ id });
      showMessage('success', 'Achievement deleted');
      await loadData();
    } catch (error) {
      console.error('Error deleting achievement:', error);
      showMessage('error', 'Failed to delete achievement');
    }
  }

  // ============================================
  // ANNOUNCEMENT TAB
  // ============================================

  async function handleSaveAnnouncement() {
    try {
      const result = await saveAnnouncement({
        arabic_text: arabicText.trim() || undefined,
        english_text: englishText.trim() || undefined,
        schedule: scheduleText.trim() || undefined,
      });
      if (result) {
        showMessage('success', 'Announcement posted successfully');
        await loadData();
      } else {
        showMessage('error', 'Failed to post announcement');
      }
    } catch (error) {
      console.error('Error saving announcement:', error);
      showMessage('error', 'Failed to post announcement');
    }
  }

  // ============================================
  // LOGOUT
  // ============================================

  async function handleLogout() {
    try {
      await logout();
      router.push('/admin');
      router.refresh();
    } catch (error) {
      console.error('Error logging out:', error);
      showMessage('error', 'Failed to logout');
    }
  }

  // ============================================
  // RENDER
  // ============================================

  if (loading && activeTab === 'students') {
    return (
      <div className="container" style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '1rem 0 2rem' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <h2 style={{ fontSize: '1.4rem' }}>Admin Dashboard</h2>
        <button className="btn btn-danger" onClick={handleLogout}>
          Logout
        </button>
      </div>

      {/* Message */}
      {message && (
        <div
          style={{
            padding: '0.75rem',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '1rem',
            background: message.type === 'success' ? '#e8f5e9' : '#ffebee',
            color: message.type === 'success' ? '#2e7d32' : '#c62828',
          }}
        >
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '2px solid var(--color-border)',
          marginBottom: '1.5rem',
          overflowX: 'auto',
          paddingBottom: '0.25rem',
        }}
      >
        {(['students', 'attendance', 'achievements', 'announcement'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '0.5rem 1.25rem',
              border: 'none',
              background: 'transparent',
              fontSize: '0.9rem',
              fontWeight: activeTab === tab ? '600' : '400',
              color: activeTab === tab ? 'var(--color-primary)' : 'var(--color-text-muted)',
              borderBottom: activeTab === tab ? '3px solid var(--color-primary)' : 'none',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* ===== TAB: STUDENTS ===== */}
      {activeTab === 'students' && (
        <div>
          {/* Add Student Form */}
          <div className="card" style={{ marginBottom: '1rem' }}>
            <h4 style={{ marginBottom: '0.5rem' }}>Add Student</h4>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Full Name"
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: '150px',
                  padding: '0.5rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                }}
              />
              <input
                type="date"
                value={newStudentDate}
                onChange={(e) => setNewStudentDate(e.target.value)}
                style={{
                  padding: '0.5rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                }}
              />
              <button className="btn btn-primary" onClick={handleAddStudent}>
                Add Student
              </button>
            </div>
          </div>

          {/* Student List */}
          <div className="card">
            <h4 style={{ marginBottom: '0.5rem' }}>
              Students ({students.length})
            </h4>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                    <th style={{ textAlign: 'left', padding: '0.5rem 0.25rem' }}>ID</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem 0.25rem' }}>Name</th>
                    <th style={{ textAlign: 'center', padding: '0.5rem 0.25rem' }}>Week</th>
                    <th style={{ textAlign: 'center', padding: '0.5rem 0.25rem' }}>Active</th>
                    <th style={{ textAlign: 'center', padding: '0.5rem 0.25rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '0.4rem 0.25rem' }}>{student.id}</td>
                      <td style={{ padding: '0.4rem 0.25rem', wordWrap: 'break-word' }}>
                        <input
                          type="text"
                          defaultValue={student.full_name}
                          onBlur={(e) => {
                            if (e.target.value !== student.full_name) {
                              handleUpdateStudent(student.id, e.target.value, student.joining_week);
                            }
                          }}
                          style={{
                            width: '100%',
                            padding: '0.2rem 0.3rem',
                            border: '1px solid transparent',
                            borderRadius: 'var(--radius-sm)',
                            background: 'transparent',
                          }}
                          onFocus={(e) => { e.target.style.borderColor = 'var(--color-border)'; }}
                          onBlur={(e) => { e.target.style.borderColor = 'transparent'; }}
                        />
                      </td>
                      <td style={{ textAlign: 'center', padding: '0.4rem 0.25rem' }}>
                        <input
                          type="number"
                          min="1"
                          max="53"
                          defaultValue={student.joining_week || ''}
                          style={{ width: '50px', padding: '0.2rem', textAlign: 'center' }}
                          onBlur={(e) => {
                            const val = parseInt(e.target.value);
                            if (!isNaN(val) && val !== student.joining_week) {
                              handleUpdateStudent(student.id, student.full_name, val);
                            }
                          }}
                        />
                      </td>
                      <td style={{ textAlign: 'center', padding: '0.4rem 0.25rem' }}>
                        <button
                          className={`btn ${student.is_active ? 'btn-primary' : 'btn-outline'}`}
                          style={{ padding: '0.2rem 0.6rem', fontSize: '0.7rem' }}
                          onClick={() => handleToggleActive(student.id, student.is_active)}
                        >
                          {student.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td style={{ textAlign: 'center', padding: '0.4rem 0.25rem' }}>
                        <button
                          className="btn btn-outline"
                          style={{ padding: '0.2rem 0.6rem', fontSize: '0.7rem' }}
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*';
                            input.onchange = async (e) => {
                              const file = (e.target as HTMLInputElement).files?.[0];
                              if (!file) return;
                              // This would call uploadPhoto from actions
                              showMessage('success', 'Photo upload feature coming soon');
                            };
                            input.click();
                          }}
                        >
                          Upload Photo
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===== TAB: ATTENDANCE ===== */}
      {activeTab === 'attendance' && (
        <div>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ fontSize: '0.9rem' }}>
              Date:
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                style={{ marginLeft: '0.5rem', padding: '0.3rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}
              />
            </label>
            <button
              className="btn btn-primary"
              onClick={handleSaveAttendance}
              disabled={savingAttendance}
            >
              {savingAttendance ? 'Saving...' : 'Save Attendance'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <button
              className="btn btn-outline"
              onClick={() => handleBatchStatus('R')}
              style={{ background: 'var(--status-recited)', color: '#fff', border: 'none' }}
            >
              Selected → R
            </button>
            <button
              className="btn btn-outline"
              onClick={() => handleBatchStatus('M')}
              style={{ background: 'var(--status-makeup)', color: '#fff', border: 'none' }}
            >
              Selected → M
            </button>
            <button
              className="btn btn-outline"
              onClick={() => handleBatchStatus('X')}
              style={{ background: 'var(--status-pending)', color: '#fff', border: 'none' }}
            >
              Selected → X
            </button>
            <button className="btn btn-outline" onClick={handleSelectAll} style={{ fontSize: '0.8rem' }}>
              {selectedStudents.size === activeStudents.length ? 'Deselect All' : 'Select All'}
            </button>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', alignSelf: 'center' }}>
              {selectedStudents.size} selected
            </span>
          </div>

          <div className="card">
            {activeStudents.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)' }}>No active students.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {activeStudents.map((student) => (
                  <div
                    key={student.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.3rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      background: selectedStudents.has(student.id) ? 'var(--color-bg)' : 'transparent',
                      flexWrap: 'wrap',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedStudents.has(student.id)}
                      onChange={() => {
                        const newSet = new Set(selectedStudents);
                        if (newSet.has(student.id)) {
                          newSet.delete(student.id);
                        } else {
                          newSet.add(student.id);
                        }
                        setSelectedStudents(newSet);
                      }}
                    />
                    <span style={{ fontSize: '0.85rem', minWidth: '60px' }}>{student.id}</span>
                    <span style={{ fontSize: '0.85rem', flex: 1, wordWrap: 'break-word' }}>
                      {student.full_name}
                    </span>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      {(['R', 'M', 'X'] as const).map((status) => (
                        <button
                          key={status}
                          onClick={() => handleStatusToggle(student.id, status)}
                          style={{
                            padding: '0.2rem 0.6rem',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            background: attendanceMap[student.id] === status
                              ? STATUS_COLORS[status]
                              : 'var(--color-border)',
                            color: attendanceMap[student.id] === status ? '#fff' : 'var(--color-text-muted)',
                            cursor: 'pointer',
                            fontSize: '0.7rem',
                            fontWeight: '600',
                            transition: 'all var(--transition-fast)',
                          }}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== TAB: ACHIEVEMENTS ===== */}
      {activeTab === 'achievements' && (
        <div>
          <div className="card" style={{ marginBottom: '1rem' }}>
            <h4 style={{ marginBottom: '0.5rem' }}>Add Achievement</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <select
                  value={achievementStudent}
                  onChange={(e) => setAchievementStudent(e.target.value)}
                  style={{ padding: '0.4rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', flex: 1, minWidth: '120px' }}
                >
                  <option value="">Select Student</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.id} - {s.full_name}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Title (required)"
                  value={achievementTitle}
                  onChange={(e) => setAchievementTitle(e.target.value)}
                  style={{ flex: 2, minWidth: '150px', padding: '0.4rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={achievementDesc}
                  onChange={(e) => setAchievementDesc(e.target.value)}
                  style={{ flex: 2, minWidth: '150px', padding: '0.4rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}
                />
                <input
                  type="text"
                  placeholder="Category (optional)"
                  value={achievementCategory}
                  onChange={(e) => setAchievementCategory(e.target.value)}
                  style={{ flex: 1, minWidth: '100px', padding: '0.4rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}
                />
                <input
                  type="date"
                  value={achievementDate}
                  onChange={(e) => setAchievementDate(e.target.value)}
                  style={{ padding: '0.4rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}
                />
                <button className="btn btn-primary" onClick={handleAddAchievement}>
                  Add Achievement
                </button>
              </div>
            </div>
          </div>

          <div className="card">
            <h4 style={{ marginBottom: '0.5rem' }}>
              Achievements ({achievements.length})
            </h4>
            {achievements.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)' }}>No achievements recorded.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {achievements.map((ach) => (
                  <div
                    key={ach.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.5rem',
                      borderBottom: '1px solid var(--color-border)',
                      flexWrap: 'wrap',
                      gap: '0.25rem',
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>
                        {ach.student_id}: {ach.title}
                      </span>
                      {ach.description && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginLeft: '0.5rem' }}>
                          {ach.description}
                        </span>
                      )}
                      {ach.category && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-light)', marginLeft: '0.5rem' }}>
                          [{ach.category}]
                        </span>
                      )}
                    </div>
                    <button
                      className="btn btn-danger"
                      style={{ padding: '0.15rem 0.5rem', fontSize: '0.7rem' }}
                      onClick={() => handleDeleteAchievement(ach.id)}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== TAB: ANNOUNCEMENT ===== */}
      {activeTab === 'announcement' && (
        <div>
          {announcement && (
            <div className="card" style={{ marginBottom: '1rem' }}>
              <h4 style={{ marginBottom: '0.5rem' }}>Current Announcement</h4>
              {announcement.arabic_text && (
                <div className="arabic" style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>
                  {announcement.arabic_text}
                </div>
              )}
              {announcement.english_text && (
                <p style={{ color: 'var(--color-text-muted)' }}>{announcement.english_text}</p>
              )}
              {announcement.schedule && (
                <p style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>
                  <strong>Schedule:</strong> {announcement.schedule}
                </p>
              )}
            </div>
          )}

          <div className="card">
            <h4 style={{ marginBottom: '0.5rem' }}>Post New Announcement</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.15rem' }}>
                  Arabic Text (RTL)
                </label>
                <textarea
                  value={arabicText}
                  onChange={(e) => setArabicText(e.target.value)}
                  dir="rtl"
                  className="arabic"
                  style={{
                    width: '100%',
                    minHeight: '80px',
                    padding: '0.5rem',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    fontFamily: 'var(--font-family-arabic)',
                    fontSize: '1.1rem',
                  }}
                  placeholder="Enter Arabic verse or announcement..."
                />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.15rem' }}>
                  English Translation
                </label>
                <textarea
                  value={englishText}
                  onChange={(e) => setEnglishText(e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: '60px',
                    padding: '0.5rem',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                  }}
                  placeholder="Enter English translation..."
                />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.15rem' }}>
                  Schedule
                </label>
                <textarea
                  value={scheduleText}
                  onChange={(e) => setScheduleText(e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: '40px',
                    padding: '0.5rem',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                  }}
                  placeholder="Enter weekly schedule..."
                />
              </div>
              <button className="btn btn-primary" onClick={handleSaveAnnouncement}>
                Save Announcement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// MAIN CLIENT COMPONENT
// ============================================

export default function AdminClient() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const supabaseClient = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            cookies: {
              get(name: string) {
                const value = document.cookie
                  .split('; ')
                  .find((row) => row.startsWith(name + '='))
                  ?.split('=')[1];
                return value;
              },
            },
          }
        );
        const { data } = await supabaseClient.auth.getSession();
        setIsLoggedIn(!!data?.session);
      } catch {
        setIsLoggedIn(false);
      }
    };
    checkSession();
  }, []);

  if (isLoggedIn === null) {
    return (
      <div className="container" style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (isLoggedIn) {
    return <Dashboard />;
  }

  return <LoginForm onLogin={() => setIsLoggedIn(true)} />;
}