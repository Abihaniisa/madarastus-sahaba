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
    async function loadStudents() {
      const { data: studentsData } = await supabase
        .from('students')
        .select('*')
        .eq('is_active', true)
        .order('id');

      const studentsList = studentsData || [];
      setStudents(studentsList);
      setLoading(false);
    }

    loadStudents();
  }, []);

  useEffect(() => {
    async function loadStats() {
      if (students.length === 0) return;

      const { data: attendanceData } = await supabase
        .from('attendance_records')
        .select('*')
        .order('date');

      const attendance = attendanceData || [];

      const withStats = students.map((student: Student) => {
        const studentAttendance = attendance.filter(
          (r: AttendanceRecord) => r.student_id === student.id
        );
        const stats = calculateStats(studentAttendance, student);
        return { ...student, stats };
      });

      setStudents(withStats);
    }

    loadStats();
  }, [students.length]);

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
      <header style={{ background: 'linear-gradient(135deg, #1a472a, #2c6a56)', color: 'white', padding: '48px 0 32px', textAlign: 'center' }}>
        <div className="container">
          <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            {SCHOOL.name}
          </h1>
          <p style={{ marginTop: '8px', fontSize: 'clamp(0.875rem, 3vw, 1rem)', color: '#c9a94e', fontWeight: 500 }}>
            {SCHOOL.tagline}
          </p>
        </div>
      </header>

      <div className="container" style={{ padding: '20px 16px 40px' }}>
        {showInstall && (
          <div style={{ background: '#1a472a', color: 'white', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', margin: '12px 0' }}>
            <span style={{ fontSize: '13px', fontWeight: 500 }}>
              Install {SCHOOL.shortName} for the best experience
            </span>
            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
              <button onClick={handleInstall} style={{ background: '#c9a94e', color: '#1a472a', border: 'none', borderRadius: '999px', padding: '8px 16px', fontWeight: 600, fontSize: '13px' }}>
                Install
              </button>
              <button onClick={handleDismiss} style={{ background: 'transparent', color: 'rgba(255,255,255,0.7)', border: 'none', padding: '4px 8px', fontSize: '16px' }} aria-label="Dismiss">
                ×
              </button>
            </div>
          </div>
        )}

        <section style={{ marginTop: '16px' }}>
          <p style={{ color: '#6b5a4a', fontSize: 'clamp(0.875rem, 2.5vw, 0.95rem)', lineHeight: 1.7 }}>
            {SCHOOL.description}
          </p>
        </section>

        <section style={{ marginTop: '28px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1a472a', marginBottom: '12px' }}>
            Students
          </h2>
          {loading ? (
            <p style={{ color: '#a6947e', fontSize: '14px' }}>Loading students...</p>
          ) : sorted.length === 0 ? (
            <div style={{ background: 'white', border: '1px solid #e8dfd6', borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
              <p style={{ color: '#a6947e', fontSize: '14px' }}>No students yet.</p>
            </div>
          ) : (
            <div style={{ background: 'white', border: '1px solid #e8dfd6', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(26,71,42,0.04)' }}>
              {sorted.map((student) => {
                const firstLetter = student.full_name.charAt(0).toUpperCase();
                const isPinned = pinnedIds.includes(student.id);
                return (
                  <div key={student.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderBottom: '1px solid #f5efe8' }}>
                    <button
                      onClick={() => togglePin(student.id)}
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        border: '1px solid #e8dfd6',
                        background: isPinned ? '#f0e4d8' : 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                      aria-label={isPinned ? 'Unpin' : 'Pin'}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill={isPinned ? '#1a472a' : 'none'} stroke={isPinned ? '#1a472a' : '#a6947e'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="17" x2="12" y2="22" />
                        <path d="M5 17h14l-1.5-4.5V7a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v5.5L5 17Z" />
                      </svg>
                    </button>
                    {student.photo_url ? (
                      <img src={student.photo_url} alt={student.full_name} style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#c9a94e', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '16px', flexShrink: 0 }}>
                        {firstLetter}
                      </div>
                    )}
                    <Link href={`/student?id=${student.id}`} style={{ flex: 1, minWidth: 0, display: 'block' }}>
                      <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '14px', lineHeight: 1.3, wordBreak: 'break-word' }}>
                        {student.full_name}
                      </p>
                      <p style={{ fontSize: '11px', color: '#a6947e', marginTop: '2px' }}>
                        Reg. No: {student.id}
                      </p>
                    </Link>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontWeight: 700, color: '#1a472a', fontSize: '15px' }}>
                        {student.stats ? `${student.stats.attendance}%` : '—'}
                      </p>
                      <p style={{ fontSize: '10px', color: '#a6947e' }}>
                        Recitation
                      </p>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a6947e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section style={{ marginTop: '32px', background: 'white', border: '1px solid #e8dfd6', borderRadius: '16px', padding: '28px 20px', textAlign: 'center', boxShadow: '0 2px 10px rgba(26,71,42,0.04)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1a472a' }}>Our Founder</h2>
          <div style={{ marginTop: '14px' }}>
            <div style={{ width: '100px', height: '100px', margin: '0 auto', borderRadius: '50%', background: '#c9a94e', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', fontWeight: 700 }}>
              {FOUNDER.name.charAt(0)}
            </div>
          </div>
          <h3 style={{ marginTop: '14px', fontWeight: 700, color: '#1e293b', fontSize: '1.1rem' }}>{FOUNDER.name}</h3>
          <p style={{ fontSize: '13px', color: '#c9a94e', fontWeight: 600, marginTop: '2px' }}>{FOUNDER.title}</p>
          <p style={{ marginTop: '12px', fontSize: '13px', color: '#6b5a4a', lineHeight: 1.7, maxWidth: '560px', margin: '12px auto 0' }}>
            {FOUNDER.history}
          </p>
        </section>

        <footer style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #e8dfd6', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: '#1e293b', fontWeight: 600 }}>{SCHOOL.name}</p>
          <p style={{ fontSize: '12px', color: '#6b5a4a', marginTop: '4px' }}>Founded by {FOUNDER.name}</p>
          <p style={{ fontSize: '11px', color: '#a6947e', marginTop: '6px' }}>© {new Date().getFullYear()} {SCHOOL.shortName}. All rights reserved.</p>
          <div style={{ marginTop: '12px' }}>
            <Link href="/report" className="footer-link-btn" style={{ marginRight: '12px' }}>
              Download Report
            </Link>
            <Link href="/admin" className="footer-link-btn">
              Admin
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}