import Link from 'next/link';
import {
  supabase,
  SCHOOL,
  STATUS_LABELS,
  calculateStats,
  getWeekly,
  getApplicable,
} from '../../lib';
import type { Student, AttendanceRecord, Achievement } from '../../lib';

export const dynamic = 'force-dynamic';

export default async function StudentPage({
  searchParams,
}: {
  searchParams: Promise<{ id: string }>;
}) {
  const { id } = await searchParams;

  if (!id) {
    return (
      <main className="container" style={{ padding: '48px 16px', textAlign: 'center' }}>
        <h1 style={{ fontFamily: "'Lora',Georgia,serif", fontSize: '1.5rem', color: 'var(--ink)' }}>Student not found</h1>
        <Link href="/" style={{ color: 'var(--green)', textDecoration: 'underline', marginTop: '16px', display: 'inline-block', fontWeight: 600 }}>
          Back to home
        </Link>
      </main>
    );
  }

  const { data: studentData } = await supabase
    .from('students')
    .select('*')
    .eq('id', id)
    .single();

  if (!studentData) {
    return (
      <main className="container" style={{ padding: '48px 16px', textAlign: 'center' }}>
        <h1 style={{ fontFamily: "'Lora',Georgia,serif", fontSize: '1.5rem', color: 'var(--ink)' }}>Student not found</h1>
        <Link href="/" style={{ color: 'var(--green)', textDecoration: 'underline', marginTop: '16px', display: 'inline-block', fontWeight: 600 }}>
          Back to home
        </Link>
      </main>
    );
  }

  const student: Student = studentData;

  const [attendanceRes, achievementsRes] = await Promise.all([
    supabase.from('attendance_records').select('*').eq('student_id', id).order('date'),
    supabase.from('achievements').select('*').eq('student_id', id).order('date', { ascending: false }),
  ]);

  const records: AttendanceRecord[] = attendanceRes.data || [];
  const achievements: Achievement[] = achievementsRes.data || [];

  const stats = calculateStats(records, student);
  const weekly = getWeekly(records, student);
  const applicable = getApplicable(records, student);
  const firstLetter = student.full_name.charAt(0).toUpperCase();

  return (
    <main className="profile-shell">
      <div className="container">
        <Link href="/" className="profile-back">
          <svg viewBox="0 0 24 24" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
          Back to Students
        </Link>

        <div className="cert">
          <div className="cert-inner">
            <div className="cert-band">{SCHOOL.shortName} <span>·</span> Student Record</div>
            <div className="cert-body">
              <span className="cert-corner corner-tl" />
              <span className="cert-corner corner-tr" />
              <span className="cert-corner corner-bl" />
              <span className="cert-corner corner-br" />

              <div className="cert-id-row">
                <div className="cert-photo">
                  {student.photo_url ? (
                    <img src={student.photo_url} alt={student.full_name} className="avatar lg" />
                  ) : (
                    <div className="avatar lg">{firstLetter}</div>
                  )}
                </div>
                <div className="cert-id-text">
                  <h1>{student.full_name}</h1>
                  <div className="cert-id-meta">
                    <span>Registration Number: <b>{student.id}</b></span>
                    <span>Enrolled in Program: Week <b>{student.joining_week ?? '—'}</b></span>
                    {student.joining_date && <span>Enrolled on: <b>{student.joining_date}</b></span>}
                  </div>
                  <span className={`badge ${student.is_active ? 'active' : 'inactive'}`}>
                    <svg viewBox="0 0 24 24" strokeWidth="2"><path d="M20 6 9 17l-5-5"/></svg>
                    {student.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <div className="cert-stats">
                <div className="stat-card">
                  <div className="big">{stats.attendance}%</div>
                  <div className="label">Recitation Rate</div>
                  <div className="bar"><span style={{ width: `${Math.min(stats.attendance, 100)}%` }} /></div>
                </div>
                <div className="stat-card gold">
                  <div className="big">{stats.completion}%</div>
                  <div className="label">Completion Rate</div>
                  <div className="bar"><span style={{ width: `${Math.min(stats.completion, 100)}%` }} /></div>
                </div>
              </div>

              <div className="tally-row">
                <div className="tally-chip"><span className="tally-dot r" />Recited (R) <span className="n">{stats.r}</span></div>
                <div className="tally-chip"><span className="tally-dot m" />Makeup (M) <span className="n">{stats.m}</span></div>
                <div className="tally-chip"><span className="tally-dot x" />Pending (X) <span className="n">{stats.x}</span></div>
              </div>

              <p style={{ fontSize: '11px', color: 'var(--ink-soft)', fontStyle: 'italic', textAlign: 'center', marginTop: '16px' }}>
                Calculated from enrollment date. Sessions before enrollment are not counted.
              </p>
            </div>
          </div>
        </div>

        <div className="detail-grid">
          <div className="panel">
            <div className="panel-title">
              <svg viewBox="0 0 24 24" strokeWidth="1.8"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18"/><path d="M8 2v4M16 2v4"/></svg>
              Weekly Breakdown
            </div>
            {weekly.map((w) => (
              <div key={w.week} className="week-row">
                <span className="week-label">W{w.week}</span>
                <span className="week-dots">
                  {Array.from({ length: w.r }).map((_, i) => <span key={`r${i}`} className="dot r" />)}
                  {Array.from({ length: w.m }).map((_, i) => <span key={`m${i}`} className="dot m" />)}
                  {Array.from({ length: w.x }).map((_, i) => <span key={`x${i}`} className="dot x" />)}
                </span>
                <span className="week-pct">{w.attendance}%</span>
              </div>
            ))}
          </div>

          <div className="panel">
            <div className="panel-title">
              <svg viewBox="0 0 24 24" strokeWidth="1.8"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="9"/></svg>
              All Sessions
            </div>
            {applicable.map((r) => (
              <div key={r.id} className="session-row">
                <span className="session-date">
                  {new Date(r.date + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                </span>
                <span className={`session-status ${r.status === 'R' ? 'r' : r.status === 'M' ? 'm' : 'x'}`}>
                  {r.status === 'R' && <svg viewBox="0 0 24 24" strokeWidth="2"><path d="M20 6 9 17l-5-5"/></svg>}
                  {r.status === 'M' && <svg viewBox="0 0 24 24" strokeWidth="2"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/></svg>}
                  {r.status === 'X' && <svg viewBox="0 0 24 24" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>}
                  {STATUS_LABELS[r.status]?.label}
                </span>
              </div>
            ))}
          </div>

          <div className="panel full">
            <div className="panel-title">
              <svg viewBox="0 0 24 24" strokeWidth="1.8"><path d="M12 2 9.2 8.6 2 9.3l5.5 4.6L5.8 21 12 17.3 18.2 21l-1.7-7.1L22 9.3l-7.2-.7Z"/></svg>
              Achievements
            </div>
            {achievements.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>No achievements recorded yet.</p>
            ) : (
              achievements.map((a) => (
                <div key={a.id} className="achievement-item">
                  <div className="achievement-icon">
                    <svg viewBox="0 0 24 24" strokeWidth="1.8"><path d="M12 2 9.2 8.6 2 9.3l5.5 4.6L5.8 21 12 17.3 18.2 21l-1.7-7.1L22 9.3l-7.2-.7Z"/></svg>
                  </div>
                  <div>
                    <div className="achievement-title">{a.title}</div>
                    {a.date && <div className="achievement-sub">{a.category ? `${a.category} — ` : ''}{a.date}</div>}
                    {a.description && <div className="achievement-sub">{a.description}</div>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <footer className="site-footer" style={{ borderTop: '1px solid var(--line)', marginTop: '8px' }}>
          <p className="foot-copy">© {new Date().getFullYear()} {SCHOOL.shortName}</p>
          <Link href="/admin" className="foot-admin">
            <svg viewBox="0 0 24 24" strokeWidth="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.8-4 5-6 8-6s6.2 2 8 6"/></svg>
            Admin
          </Link>
        </footer>
      </div>
    </main>
  );
}