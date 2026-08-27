'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase, SCHOOL, FOUNDER, calculateStats } from '../lib';
import type { Student, AttendanceRecord } from '../lib';

export default function HomePage() {
  const [students, setStudents] = useState<any[]>([]);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [loading, setLoading] = useState(true);
  const [announcement, setAnnouncement] = useState<any>(null);
  const [showAnnouncement, setShowAnnouncement] = useState(true);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    const saved = localStorage.getItem('pinned_students');
    if (saved) setPinnedIds(JSON.parse(saved));

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone;

    if (!isStandalone) {
      const handler = (e: Event) => {
        e.preventDefault();
        setInstallPrompt(e);
        const dismissedAt = localStorage.getItem('pwa_prompt_dismissed');
        if (!dismissedAt || Date.now() > parseInt(dismissedAt)) {
          setShowInstall(true);
        }
      };
      window.addEventListener('beforeinstallprompt', handler);
      return () => window.removeEventListener('beforeinstallprompt', handler);
    }
  }, []);

  useEffect(() => {
    async function load() {
      const { data: studentsData } = await supabase
        .from('students')
        .select('*')
        .eq('is_active', true)
        .order('id');

      const { data: attendanceData } = await supabase
        .from('attendance_records')
        .select('*')
        .order('date');

      const { data: announcementData } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      const studentsList = studentsData || [];
      const attendance = attendanceData || [];

      const withStats = studentsList.map((student: Student) => {
        const studentAttendance = attendance.filter(
          (r: AttendanceRecord) => r.student_id === student.id
        );
        const stats = calculateStats(studentAttendance, student);
        return { ...student, stats };
      });

      setStudents(withStats);
      if (announcementData && announcementData.length > 0) {
        setAnnouncement(announcementData[0]);
      }
      setLoading(false);
    }
    load();
  }, []);

  const togglePin = (id: string) => {
    const newPinned = pinnedIds.includes(id)
      ? pinnedIds.filter((p) => p !== id)
      : [...pinnedIds, id];
    setPinnedIds(newPinned);
    localStorage.setItem('pinned_students', JSON.stringify(newPinned));
  };

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') setShowInstall(false);
    setInstallPrompt(null);
  };

  const handleDismiss = () => {
    setShowInstall(false);
    localStorage.setItem(
      'pwa_prompt_dismissed',
      String(Date.now() + 7 * 24 * 60 * 60 * 1000)
    );
  };

  const sorted = [...students].sort((a, b) => {
    const aPinned = pinnedIds.includes(a.id) ? 0 : 1;
    const bPinned = pinnedIds.includes(b.id) ? 0 : 1;
    if (aPinned !== bPinned) return aPinned - bPinned;
    return a.id.localeCompare(b.id);
  });

  return (
    <main>
      <header style={{ background: 'linear-gradient(135deg, #1a472a, #2c6a56)', color: 'white', padding: '60px 0 40px', textAlign: 'center' }}>
        <div className="container">
          <h1 className="heading-display" style={{ fontSize: 'clamp(1.75rem, 5vw, 3.5rem)', letterSpacing: '-0.02em' }}>
            {SCHOOL.name}
          </h1>
          <p style={{ marginTop: '12px', fontSize: 'clamp(0.875rem, 3vw, 1.125rem)', color: '#c9a94e', fontWeight: 500 }}>
            {SCHOOL.tagline}
          </p>
        </div>
      </header>

      <div className="container" style={{ padding: '24px 16px 48px' }}>
        {showInstall && (
          <div className="premium-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', margin: '16px 0' }}>
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#1e293b' }}>
              Install {SCHOOL.shortName} for the best experience
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleInstall} className="btn-primary" style={{ padding: '8px 20px' }}>
                Install
              </button>
              <button onClick={handleDismiss} style={{ background: 'transparent', border: 'none', color: '#a6947e', fontSize: '18px', padding: '4px 8px' }} aria-label="Dismiss">
                ×
              </button>
            </div>
          </div>
        )}

        {announcement && showAnnouncement && (
          <div className="announcement-card fade-in">
            <button className="dismiss-btn" onClick={() => setShowAnnouncement(false)} aria-label="Dismiss">
              ×
            </button>
            {announcement.arabic_text && (
              <p className="arabic-text">{announcement.arabic_text}</p>
            )}
            {announcement.english_text && (
              <p style={{ marginTop: '16px', fontSize: '14px', lineHeight: 1.8, color: 'rgba(255,255,255,0.9)' }}>
                {announcement.english_text}
              </p>
            )}
            {announcement.schedule && (
              <div style={{ marginTop: '16px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', padding: '16px' }}>
                <p style={{ fontSize: '13px', lineHeight: 1.8, color: 'rgba(255,255,255,0.9)', whiteSpace: 'pre-wrap' }}>
                  {announcement.schedule}
                </p>
              </div>
            )}
          </div>
        )}

        <section style={{ marginTop: '8px' }}>
          <p style={{ color: '#6b5a4a', fontSize: 'clamp(0.875rem, 2.5vw, 1rem)', lineHeight: 1.8 }}>
            {SCHOOL.description}
          </p>
        </section>

        <section style={{ marginTop: '32px' }}>
          <h2 className="heading-display" style={{ fontSize: '1.5rem', color: '#1a472a', marginBottom: '16px' }}>
            Student Directory
          </h2>
          {loading ? (
            <div className="premium-card" style={{ padding: '8px' }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px' }}>
                  <div className="skeleton avatar-sm" style={{ borderRadius: '50%' }} />
                  <div style={{ flex: 1 }}>
                    <div className="skeleton" style={{ height: '16px', width: '60%', marginBottom: '8px' }} />
                    <div className="skeleton" style={{ height: '12px', width: '40%' }} />
                  </div>
                  <div className="skeleton" style={{ height: '16px', width: '48px' }} />
                </div>
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div className="premium-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
              <p style={{ color: '#a6947e', fontSize: '15px' }}>No students yet.</p>
            </div>
          ) : (
            <div className="premium-card" style={{ overflow: 'hidden' }}>
              {sorted.map((student) => {
                const firstLetter = student.full_name.charAt(0).toUpperCase();
                const isPinned = pinnedIds.includes(student.id);
                return (
                  <div key={student.id} className="student-card">
                    <button
                      onClick={() => togglePin(student.id)}
                      className={`pin-btn ${isPinned ? 'active' : ''}`}
                      aria-label={isPinned ? 'Unpin' : 'Pin'}
                      title={isPinned ? 'Unpin' : 'Pin to top'}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill={isPinned ? '#1a472a' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="17" x2="12" y2="22" />
                        <path d="M5 17h14l-1.5-4.5V7a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v5.5L5 17Z" />
                      </svg>
                    </button>
                    {student.photo_url ? (
                      <img src={student.photo_url} alt={student.full_name} className="avatar avatar-sm" />
                    ) : (
                      <div className="avatar avatar-sm" style={{ background: '#c9a94e' }}>
                        {firstLetter}
                      </div>
                    )}
                    <Link href={`/student?id=${student.id}`} style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '15px' }}>
                        {student.full_name}
                      </p>
                      <p style={{ fontSize: '12px', color: '#a6947e', marginTop: '2px' }}>
                        {student.id} · Week {student.joining_week ?? '—'}
                      </p>
                    </Link>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontWeight: 700, color: '#1a472a', fontSize: '16px' }}>
                        {student.stats.attendance}%
                      </p>
                      <p style={{ fontSize: '11px', color: '#a6947e' }}>
                        {student.stats.completion}% completion
                      </p>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a6947e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="premium-card" style={{ marginTop: '32px', padding: '32px 24px', textAlign: 'center' }}>
          <h2 className="heading-display" style={{ fontSize: '1.5rem', color: '#1a472a' }}>
            Our Founder
          </h2>
          <div style={{ marginTop: '16px' }}>
            <div className="avatar avatar-lg" style={{ margin: '0 auto', background: '#c9a94e' }}>
              {FOUNDER.name.charAt(0)}
            </div>
          </div>
          <h3 className="heading-display" style={{ marginTop: '16px', fontSize: '1.25rem', color: '#1e293b' }}>
            {FOUNDER.name}
          </h3>
          <p style={{ fontSize: '14px', color: '#c9a94e', fontWeight: 600, marginTop: '4px' }}>
            {FOUNDER.title}
          </p>
          <p style={{ marginTop: '16px', fontSize: '14px', color: '#6b5a4a', lineHeight: 1.8, maxWidth: '600px', margin: '16px auto 0' }}>
            {FOUNDER.history}
          </p>
        </section>

        <footer style={{ marginTop: '40px', paddingTop: '32px', borderTop: '1px solid #e8dfd6', textAlign: 'center' }}>
          <p className="heading-display" style={{ fontSize: '1rem', color: '#1e293b' }}>{SCHOOL.name}</p>
          <p style={{ fontSize: '13px', color: '#6b5a4a', marginTop: '4px' }}>Founded by {FOUNDER.name}</p>
          <p style={{ fontSize: '12px', color: '#a6947e', marginTop: '8px' }}>© {new Date().getFullYear()} {SCHOOL.shortName}. All rights reserved.</p>
          <Link href="/admin" style={{ display: 'inline-block', marginTop: '16px', fontSize: '12px', color: '#a6947e', fontWeight: 500 }}>
            Admin
          </Link>
        </footer>
      </div>
    </main>
  );
}