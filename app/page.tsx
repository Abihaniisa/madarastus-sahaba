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
      const [studentsRes, attendanceRes, announcementRes] = await Promise.all([
        supabase.from('students').select('*').eq('is_active', true).order('id'),
        supabase.from('attendance_records').select('*').order('date'),
        supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(1),
      ]);

      const studentsList = studentsRes.data || [];
      const attendance = attendanceRes.data || [];

      const withStats = studentsList.map((student: Student) => {
        const studentAttendance = attendance.filter(
          (r: AttendanceRecord) => r.student_id === student.id
        );
        const stats = calculateStats(studentAttendance, student);
        return { ...student, stats };
      });

      setStudents(withStats);
      if (announcementRes.data && announcementRes.data.length > 0) {
        setAnnouncement(announcementRes.data[0]);
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

  const sorted = [...students].sort((a, b) => {
    const aPinned = pinnedIds.includes(a.id) ? 0 : 1;
    const bPinned = pinnedIds.includes(b.id) ? 0 : 1;
    if (aPinned !== bPinned) return aPinned - bPinned;
    return a.id.localeCompare(b.id);
  });

  return (
    <main className="page-home">
      <header className="site-header">
        <div className="container">
          <div className="header-row">
            <div className="brand">
              <div className="brand-mark">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3c-1.8 3-2.6 5.6-2.6 8 0 3.6 2.6 6.6 2.6 9.5 0-2.9 2.6-5.9 2.6-9.5 0-2.4-.8-5-2.6-8Z"/>
                  <path d="M4 20c2-1 4.3-1.6 8-1.6s6 .6 8 1.6"/>
                </svg>
              </div>
              <div className="brand-text">
                <h1>{SCHOOL.name}</h1>
                <p>{SCHOOL.tagline}</p>
              </div>
            </div>
            <div className="header-actions">
              <button onClick={handleInstall} className="btn btn-gold">
                <svg className="icon" viewBox="0 0 24 24"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>
                Install App
              </button>
              <Link href="/admin" className="btn btn-ghost">Admin</Link>
            </div>
          </div>

          <div className="hero-verse">
            <div className="verse-panel">
              <span className="eyebrow">Verse of the Week</span>
              {announcement?.arabic_text ? (
                <p className="verse-arabic">{announcement.arabic_text}</p>
              ) : (
                <p className="verse-arabic">وَلَقَدْ يَسَّرْنَا الْقُرْآنَ لِلذِّكْرِ فَهَلْ مِن مُّدَّكِرٍ</p>
              )}
              {announcement?.english_text ? (
                <p className="verse-translit">{announcement.english_text}</p>
              ) : (
                <p className="verse-translit">"And We have certainly made the Qur'an easy for remembrance, so is there any who will remember?"</p>
              )}
              <p className="verse-ref">Surah Al-Qamar · 54:17</p>
            </div>
            <div className="schedule-panel">
              <span className="eyebrow">Weekly Schedule</span>
              <div className="schedule-list">
                {announcement?.schedule ? (
                  announcement.schedule.split('\n').map((line: string, i: number) => (
                    <div key={i} className="schedule-row">
                      <div className="schedule-day">{line}</div>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="schedule-row">
                      <div className="schedule-day">Sunday – Wednesday</div>
                      <div className="schedule-time">7:30 – 9:00 AM</div>
                    </div>
                    <div className="schedule-row">
                      <div className="schedule-day">Thursday</div>
                      <div className="schedule-time">7:30 – 9:00 AM</div>
                    </div>
                    <div className="schedule-row">
                      <div className="schedule-day">Friday</div>
                      <div className="schedule-time">—</div>
                    </div>
                    <div className="schedule-row">
                      <div className="schedule-day">Saturday</div>
                      <div className="schedule-time">9:00 – 11:00 AM</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {showInstall && (
        <div className="install-strip">
          <div className="install-inner">
            <div className="install-copy">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/>
              </svg>
              <p><strong>Install {SCHOOL.shortName}</strong> — add to your home screen for quick access.</p>
            </div>
            <button onClick={handleInstall} className="btn btn-gold">
              <svg className="icon" viewBox="0 0 24 24"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>
              Install
            </button>
          </div>
        </div>
      )}

      <main className="container">
        <section className="section" style={{ paddingBottom: '12px' }}>
          <p className="about-copy">{SCHOOL.description}</p>
        </section>

        <section className="section" style={{ paddingTop: '16px' }}>
          <div className="section-head">
            <div>
              <h2 className="section-title">Student Directory</h2>
              <p className="section-sub">Tap a name to view their full recitation record.</p>
            </div>
            <span className="count-pill">{students.length} students</span>
          </div>

          {loading ? (
            <p style={{ color: 'var(--ink-soft)', fontSize: '14px' }}>Loading students...</p>
          ) : students.length === 0 ? (
            <div className="directory" style={{ padding: '32px', textAlign: 'center' }}>
              <p style={{ color: 'var(--ink-soft)', fontSize: '14px' }}>No students yet.</p>
            </div>
          ) : (
            <div className="directory">
              {sorted.map((student) => {
                const firstLetter = student.full_name.charAt(0).toUpperCase();
                const isPinned = pinnedIds.includes(student.id);
                return (
                  <div key={student.id} className="directory-row">
                    <button
                      onClick={() => togglePin(student.id)}
                      className={`pin-btn ${isPinned ? 'is-pinned' : ''}`}
                      aria-label={isPinned ? 'Unpin' : 'Pin'}
                    >
                      <svg viewBox="0 0 24 24" strokeWidth="1.8" fill={isPinned ? 'currentColor' : 'none'}>
                        <path d="M12 2 9 9l-6 1 4.5 4L6 21l6-3.6L18 21l-1.5-7L21 10l-6-1-3-7Z"/>
                      </svg>
                    </button>
                    {student.photo_url ? (
                      <img src={student.photo_url} alt={student.full_name} className="avatar" />
                    ) : (
                      <div className="avatar">{firstLetter}</div>
                    )}
                    <Link href={`/student?id=${student.id}`} className="student-id-block">
                      <div className="student-name">{student.full_name}</div>
                      <div className="student-meta">
                        <span className="reg-tag">{student.id}</span>
                        <span>Week {student.joining_week ?? '—'}</span>
                      </div>
                    </Link>
                    <div className="stat-block">
                      <div className="stat-pct">{student.stats.attendance}%</div>
                      <div className="stat-caption">{student.stats.completion}% completion</div>
                      <div className="mini-bar"><span style={{ width: `${Math.min(student.stats.attendance, 100)}%` }} /></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="section">
          <div className="founder-card">
            <div className="avatar lg founder-avatar">{FOUNDER.name.charAt(0)}</div>
            <h3 className="founder-name">{FOUNDER.name}</h3>
            <p className="founder-title">{FOUNDER.title}</p>
            <p className="founder-history">{FOUNDER.history}</p>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container">
          <p className="foot-brand">{SCHOOL.name}</p>
          <p className="foot-sub">Founded by {FOUNDER.name}</p>
          <p className="foot-copy">© {new Date().getFullYear()} {SCHOOL.shortName}. All rights reserved.</p>
          <Link href="/admin" className="foot-admin">
            <svg viewBox="0 0 24 24" strokeWidth="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.8-4 5-6 8-6s6.2 2 8 6"/></svg>
            Admin
          </Link>
        </div>
      </footer>
    </main>
  );
}