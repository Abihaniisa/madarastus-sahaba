'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase, SCHOOL, FOUNDER, calculateStats } from '@/lib';
import type { Student, AttendanceRecord } from '@/lib';

interface StudentWithStats extends Student {
  stats: { attendance: number; completion: number };
}

export default function HomePage() {
  const [students, setStudents] = useState<StudentWithStats[]>([]);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
      <header
        style={{
          background: '#1a472a',
          color: 'white',
          padding: '40px 0',
          textAlign: 'center',
        }}
      >
        <div className="container">
          <h1
            style={{
              fontSize: 'clamp(1.5rem, 5vw, 3rem)',
              fontWeight: 'bold',
              letterSpacing: '-0.02em',
            }}
          >
            {SCHOOL.name}
          </h1>
          <p
            style={{
              marginTop: '8px',
              fontSize: 'clamp(0.875rem, 3vw, 1.125rem)',
              color: '#c9a94e',
            }}
          >
            {SCHOOL.tagline}
          </p>
        </div>
      </header>

      <div className="container" style={{ padding: '16px 16px 32px' }}>
        {showInstall && (
          <div
            style={{
              background: '#1a472a',
              color: 'white',
              borderRadius: '12px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              margin: '16px 0',
            }}
          >
            <span style={{ fontSize: '14px' }}>
              Install {SCHOOL.shortName} for the best experience
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleInstall}
                style={{
                  background: '#c9a94e',
                  color: '#1a472a',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontWeight: 600,
                }}
              >
                Install
              </button>
              <button
                onClick={handleDismiss}
                style={{
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.7)',
                  border: 'none',
                  padding: '4px 8px',
                  fontSize: '14px',
                }}
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <section style={{ marginTop: '16px' }}>
          <p
            style={{
              color: '#475569',
              fontSize: 'clamp(0.875rem, 2.5vw, 1rem)',
              lineHeight: 1.7,
            }}
          >
            {SCHOOL.description}
          </p>
        </section>

        <section style={{ marginTop: '24px' }}>
          <h2
            style={{
              fontSize: '1.125rem',
              fontWeight: 600,
              color: '#1a472a',
              marginBottom: '12px',
            }}
          >
            Student Directory
          </h2>
          {loading ? (
            <p style={{ color: '#94a3b8' }}>Loading...</p>
          ) : sorted.length === 0 ? (
            <p style={{ color: '#94a3b8' }}>No students yet.</p>
          ) : (
            <div
              style={{
                background: 'white',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
              }}
            >
              {sorted.map((student) => {
                const firstLetter = student.full_name.charAt(0).toUpperCase();
                const isPinned = pinnedIds.includes(student.id);
                return (
                  <div
                    key={student.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      borderBottom: '1px solid #f1f5f9',
                    }}
                  >
                    <button
                      onClick={() => togglePin(student.id)}
                      style={{
                        fontSize: '18px',
                        opacity: isPinned ? 1 : 0.2,
                        background: 'none',
                        border: 'none',
                      }}
                      aria-label={isPinned ? 'Unpin' : 'Pin'}
                    >
                      📌
                    </button>
                    {student.photo_url ? (
                      <img
                        src={student.photo_url}
                        alt={student.full_name}
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: '#c9a94e',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                        }}
                      >
                        {firstLetter}
                      </div>
                    )}
                    <Link
                      href={`/student?id=${student.id}`}
                      style={{ flex: 1, minWidth: 0 }}
                    >
                      <p
                        style={{
                          fontWeight: 500,
                          color: '#0f172a',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {student.full_name}
                      </p>
                      <p style={{ fontSize: '12px', color: '#64748b' }}>
                        {student.id} · Week {student.joining_week ?? '—'}
                      </p>
                    </Link>
                    <div style={{ textAlign: 'right' }}>
                      <p
                        style={{
                          fontWeight: 'bold',
                          color: '#1a472a',
                          fontSize: '15px',
                        }}
                      >
                        {student.stats.attendance}%
                      </p>
                      <p style={{ fontSize: '11px', color: '#94a3b8' }}>
                        {student.stats.completion}% completion
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section
          style={{
            marginTop: '32px',
            background: 'white',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '24px',
            textAlign: 'center',
          }}
        >
          <h2
            style={{
              fontSize: '1.125rem',
              fontWeight: 600,
              color: '#1a472a',
            }}
          >
            Our Founder
          </h2>
          <div style={{ marginTop: '12px' }}>
            <div
              style={{
                width: '96px',
                height: '96px',
                margin: '0 auto',
                borderRadius: '50%',
                background: '#c9a94e',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                fontWeight: 'bold',
              }}
            >
              {FOUNDER.name.charAt(0)}
            </div>
          </div>
          <h3 style={{ marginTop: '12px', fontWeight: 'bold', color: '#0f172a' }}>
            {FOUNDER.name}
          </h3>
          <p style={{ fontSize: '14px', color: '#c9a94e', fontWeight: 500 }}>
            {FOUNDER.title}
          </p>
          <p
            style={{
              marginTop: '12px',
              fontSize: '14px',
              color: '#475569',
              lineHeight: 1.7,
            }}
          >
            {FOUNDER.history}
          </p>
        </section>

        <footer
          style={{
            marginTop: '32px',
            paddingTop: '24px',
            borderTop: '1px solid #e2e8f0',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '14px', color: '#475569' }}>{SCHOOL.name}</p>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            Founded by {FOUNDER.name}
          </p>
          <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>
            © {new Date().getFullYear()} {SCHOOL.shortName}. All rights reserved.
          </p>
          <Link
            href="/admin"
            style={{
              display: 'inline-block',
              marginTop: '12px',
              fontSize: '12px',
              color: '#94a3b8',
            }}
          >
            Admin
          </Link>
        </footer>
      </div>
    </main>
  );
}