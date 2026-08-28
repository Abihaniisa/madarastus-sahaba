'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  supabase,
  SCHOOL,
  FOUNDER,
  getActiveStudents,
  getAttendance,
  getLatestAnnouncement,
  calculateStats,
  Student,
  AttendanceRecord,
  Announcement,
} from '@/lib';

// ============================================
// PIN FEATURE (localStorage)
// ============================================

const PIN_STORAGE_KEY = 'madrasatus_pinned_students';

function getPinnedStudents(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(PIN_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setPinnedStudents(ids: string[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

function togglePin(id: string): string[] {
  const current = getPinnedStudents();
  const index = current.indexOf(id);
  if (index >= 0) {
    const updated = [...current];
    updated.splice(index, 1);
    setPinnedStudents(updated);
    return updated;
  } else {
    const updated = [...current, id];
    setPinnedStudents(updated);
    return updated;
  }
}

function isPinned(id: string): boolean {
  return getPinnedStudents().includes(id);
}

// ============================================
// PWA INSTALL
// ============================================

const INSTALL_DISMISS_KEY = 'madrasatus_install_dismissed';

function shouldShowInstall(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const dismissed = localStorage.getItem(INSTALL_DISMISS_KEY);
    if (!dismissed) return true;
    const dismissedDate = parseInt(dismissed, 10);
    const daysSince = (Date.now() - dismissedDate) / (1000 * 60 * 60 * 24);
    return daysSince >= 7;
  } catch {
    return true;
  }
}

function dismissInstall() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(INSTALL_DISMISS_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function HomePage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);

  // ============================================
  // DATA FETCHING
  // ============================================

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [studentsData, attendanceData, announcementData] = await Promise.all([
          getActiveStudents(),
          getAttendance(),
          getLatestAnnouncement(),
        ]);
        setStudents(studentsData);
        setAttendance(attendanceData);
        setAnnouncement(announcementData);
        setPinnedIds(getPinnedStudents());
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // ============================================
  // PWA INSTALL
  // ============================================

  useEffect(() => {
    setShowInstall(shouldShowInstall());

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .catch((err) => console.log('Service worker registration failed:', err));
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (installPrompt) {
      try {
        await installPrompt.prompt();
        const result = await installPrompt.userChoice;
        if (result.outcome === 'accepted') {
          setShowInstall(false);
        }
      } catch {
        // ignore
      }
    }
  };

  const handleDismissInstall = () => {
    dismissInstall();
    setShowInstall(false);
  };

  // ============================================
  // PIN HANDLING
  // ============================================

  const handlePinToggle = useCallback((id: string) => {
    const updated = togglePin(id);
    setPinnedIds(updated);
  }, []);

  // ============================================
  // SORT STUDENTS: Pinned first
  // ============================================

  const sortedStudents = [...students].sort((a, b) => {
    const aPinned = pinnedIds.includes(a.id);
    const bPinned = pinnedIds.includes(b.id);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return a.id.localeCompare(b.id);
  });

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return (
      <div className="container" style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '1rem 0 2rem' }}>
      {/* PWA Install Banner */}
      {showInstall && (
        <div
          style={{
            background: 'var(--color-primary)',
            color: '#fff',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <span>Install Madrasatus Sahaba for quick access</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-accent" onClick={handleInstall}>
              Install App
            </button>
            <button
              style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
              onClick={handleDismissInstall}
              aria-label="Dismiss install prompt"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* School Header */}
      <header style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '2rem' }}>{SCHOOL.name}</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem' }}>{SCHOOL.tagline}</p>
        <p style={{ color: 'var(--color-text-light)', maxWidth: '600px', margin: '0.5rem auto' }}>
          {SCHOOL.description}
        </p>
      </header>

      {/* Announcement Card */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        {announcement ? (
          <>
            {announcement.arabic_text && (
              <div className="arabic" style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>
                {announcement.arabic_text}
              </div>
            )}
            {announcement.english_text && (
              <p style={{ color: 'var(--color-text-muted)' }}>{announcement.english_text}</p>
            )}
            {announcement.schedule && (
              <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                <strong>Schedule:</strong> {announcement.schedule}
              </p>
            )}
          </>
        ) : (
          <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
            No announcement posted yet.
          </p>
        )}
      </div>

      {/* Student Directory */}
      <section>
        <h2 style={{ marginBottom: '1rem' }}>Students</h2>
        {sortedStudents.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)' }}>No active students.</p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '1rem',
            }}
          >
            {sortedStudents.map((student) => {
              const studentAttendance = attendance.filter(
                (a) => a.student_id === student.id
              );
              const stats = calculateStats(studentAttendance);
              const pinned = pinnedIds.includes(student.id);

              return (
                <Link
                  key={student.id}
                  href={`/student?id=${student.id}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div
                    className="card"
                    style={{
                      cursor: 'pointer',
                      transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
                      position: 'relative',
                      border: pinned ? '2px solid var(--color-accent)' : 'none',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                    }}
                  >
                    {/* Pin Button */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handlePinToggle(student.id);
                      }}
                      style={{
                        position: 'absolute',
                        top: '0.5rem',
                        right: '0.5rem',
                        background: 'transparent',
                        border: 'none',
                        fontSize: '1.2rem',
                        cursor: 'pointer',
                        color: pinned ? 'var(--color-accent)' : 'var(--color-text-light)',
                      }}
                      aria-label={pinned ? 'Unpin' : 'Pin'}
                    >
                      {pinned ? '★' : '☆'}
                    </button>

                    {/* Avatar / Photo */}
                    <div
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        background: 'var(--color-primary-light)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                        color: '#fff',
                        margin: '0 auto 0.5rem',
                        overflow: 'hidden',
                      }}
                    >
                      {student.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={student.photo_url}
                          alt={student.full_name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        student.full_name.charAt(0).toUpperCase()
                      )}
                    </div>

                    <h3 style={{ fontSize: '1rem', textAlign: 'center', wordWrap: 'break-word' }}>
                      {student.full_name}
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                      Registration Number: {student.id}
                    </p>
                    <div style={{ textAlign: 'center', marginTop: '0.25rem' }}>
                      <span style={{ fontSize: '0.8rem' }}>
                        {stats.recitationRate.toFixed(0)}% recited
                      </span>
                      <span style={{ margin: '0 0.25rem', color: 'var(--color-text-light)' }}>·</span>
                      <span style={{ fontSize: '0.8rem' }}>
                        {stats.completionRate.toFixed(0)}% completed
                      </span>
                    </div>
                    {pinned && (
                      <div
                        style={{
                          fontSize: '0.65rem',
                          color: 'var(--color-accent-dark)',
                          textAlign: 'center',
                          marginTop: '0.25rem',
                          fontWeight: '600',
                          letterSpacing: '0.5px',
                        }}
                      >
                        PINNED
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Founder Section */}
      <section style={{ marginTop: '2rem' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'var(--color-primary-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              fontWeight: 'bold',
              color: '#fff',
              margin: '0 auto 0.5rem',
              overflow: 'hidden',
            }}
          >
            {FOUNDER.name.charAt(0)}
          </div>
          <h3>{FOUNDER.name}</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{FOUNDER.title}</p>
          <p style={{ fontSize: '0.9rem', maxWidth: '600px', margin: '0.5rem auto' }}>
            {FOUNDER.history}
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          marginTop: '2rem',
          paddingTop: '1rem',
          borderTop: '1px solid var(--color-border)',
          textAlign: 'center',
          fontSize: '0.85rem',
          color: 'var(--color-text-muted)',
        }}
      >
        <p>{SCHOOL.name}</p>
        <p>Founded by {FOUNDER.name}</p>
        <p>&copy; {new Date().getFullYear()}</p>
        <p style={{ marginTop: '0.25rem' }}>
          <Link href="/admin" style={{ fontSize: '0.75rem', color: 'var(--color-text-light)' }}>
            Admin
          </Link>
        </p>
      </footer>
    </div>
  );
}