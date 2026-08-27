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
      <main className="container" style={{ padding: '40px 16px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>Student not found</h1>
        <Link href="/" style={{ color: '#1a472a', textDecoration: 'underline', marginTop: '12px', display: 'inline-block', fontWeight: 500, fontSize: '14px' }}>
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
      <main className="container" style={{ padding: '40px 16px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>Student not found</h1>
        <Link href="/" style={{ color: '#1a472a', textDecoration: 'underline', marginTop: '12px', display: 'inline-block', fontWeight: 500, fontSize: '14px' }}>
          Back to home
        </Link>
      </main>
    );
  }

  const student: Student = studentData;

  const { data: attendanceData } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('student_id', id)
    .order('date');

  const records: AttendanceRecord[] = attendanceData || [];

  const { data: achievementsData } = await supabase
    .from('achievements')
    .select('*')
    .eq('student_id', id)
    .order('date', { ascending: false });

  const achievements: Achievement[] = achievementsData || [];

  const stats = calculateStats(records, student);
  const weekly = getWeekly(records, student);
  const applicable = getApplicable(records, student);
  const firstLetter = student.full_name.charAt(0).toUpperCase();

  return (
    <main className="container" style={{ padding: '20px 16px 40px' }}>
      <Link href="/" style={{ color: '#1a472a', fontSize: '13px', fontWeight: 500 }}>
        ← Back to Students
      </Link>

      {/* REPORT CARD */}
      <div className="certificate-frame" style={{ marginTop: '16px' }}>
        <span className="corner corner-tl" />
        <span className="corner corner-tr" />
        <span className="corner corner-bl" />
        <span className="corner corner-br" />

        <div style={{ textAlign: 'center', borderBottom: '2px solid #c9a94e', paddingBottom: '16px' }}>
          <p style={{ fontSize: '11px', fontWeight: 600, color: '#6b5a4a', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {SCHOOL.name}
          </p>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1a472a', marginTop: '4px' }}>
            Student Report Card
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '16px', flexWrap: 'wrap' }}>
          {student.photo_url ? (
            <img src={student.photo_url} alt={student.full_name} style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover', border: '2px solid #c9a94e' }} />
          ) : (
            <div style={{ width: '80px', height: '80px', borderRadius: '8px', background: '#c9a94e', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 700, border: '2px solid #c9a94e' }}>
              {firstLetter}
            </div>
          )}
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
              {student.full_name}
            </h2>
            <p style={{ fontSize: '12px', color: '#6b5a4a', marginTop: '4px' }}>
              Registration Number: <span style={{ fontWeight: 600, color: '#1e293b' }}>{student.id}</span>
            </p>
          </div>
        </div>

        <div style={{ marginTop: '16px', borderTop: '1px solid #e8dfd6', paddingTop: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569', flexWrap: 'wrap', gap: '6px' }}>
            <span>Enrolled in Program: <strong style={{ color: '#1e293b' }}>Week {student.joining_week ?? '—'}</strong></span>
            {student.joining_date && (
              <span>Enrolled on: <strong style={{ color: '#1e293b' }}>{student.joining_date}</strong></span>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginTop: '6px', flexWrap: 'wrap', gap: '6px' }}>
            <span className="status-badge" style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 600, background: student.is_active ? '#dcfce7' : '#f1f5f9', color: student.is_active ? '#166534' : '#475569' }}>
              {student.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        <div style={{ marginTop: '16px', borderTop: '2px solid #1a472a', paddingTop: '12px' }}>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '120px', textAlign: 'center', background: '#fdf9f5', borderRadius: '10px', padding: '12px' }}>
              <p style={{ fontSize: '24px', fontWeight: 700, color: '#1a472a' }}>
                {stats.attendance}%
              </p>
              <p style={{ fontSize: '11px', color: '#6b5a4a', fontWeight: 600, marginTop: '2px' }}>
                Recitation Rate
              </p>
            </div>
            <div style={{ flex: 1, minWidth: '120px', textAlign: 'center', background: '#fdf9f5', borderRadius: '10px', padding: '12px' }}>
              <p style={{ fontSize: '24px', fontWeight: 700, color: '#c9a94e' }}>
                {stats.completion}%
              </p>
              <p style={{ fontSize: '11px', color: '#6b5a4a', fontWeight: 600, marginTop: '2px' }}>
                Completion Rate
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '12px', color: '#475569', flexWrap: 'wrap', gap: '6px' }}>
            <span>Recited (R): <strong>{stats.r}</strong></span>
            <span>Makeup (M): <strong>{stats.m}</strong></span>
            <span>Pending (X): <strong>{stats.x}</strong></span>
            <span>Total: <strong>{stats.total}</strong></span>
          </div>
        </div>

        <div style={{ marginTop: '16px', borderTop: '1px solid #e8dfd6', paddingTop: '10px', textAlign: 'center' }}>
          <p style={{ fontSize: '10px', color: '#a6947e', lineHeight: 1.5 }}>
            Recitation records are calculated from the student's enrollment date.
            Sessions before enrollment are not counted.
          </p>
        </div>
      </div>

      {/* BREAKDOWN */}
      <div style={{ marginTop: '24px', background: 'white', border: '1px solid #e8dfd6', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 10px rgba(26,71,42,0.04)' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', marginBottom: '16px' }}>
          Weekly Breakdown
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {weekly.map((w) => (
            <div key={w.week} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ fontWeight: 600, color: '#6b5a4a', width: '36px' }}>W{w.week}</span>
              <div style={{ flex: 1, margin: '0 10px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {Array.from({ length: w.r }).map((_, i) => (
                  <span key={`r${i}`} style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                ))}
                {Array.from({ length: w.m }).map((_, i) => (
                  <span key={`m${i}`} style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#eab308', display: 'inline-block' }} />
                ))}
                {Array.from({ length: w.x }).map((_, i) => (
                  <span key={`x${i}`} style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#cbd5e1', display: 'inline-block' }} />
                ))}
              </div>
              <span style={{ fontWeight: 700, color: '#1e293b' }}>{w.attendance}%</span>
            </div>
          ))}
        </div>

        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', marginTop: '24px', marginBottom: '12px' }}>
          All Sessions
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {applicable.map((r) => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', padding: '6px 0', borderBottom: '1px solid #fdf9f5' }}>
              <span style={{ color: '#6b5a4a' }}>
                {new Date(r.date + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
              <span style={{
                display: 'inline-block',
                padding: '2px 10px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 600,
                background: r.status === 'R' ? '#dcfce7' : r.status === 'M' ? '#fef9c3' : '#f1f5f9',
                color: r.status === 'R' ? '#166534' : r.status === 'M' ? '#854d0e' : '#475569',
              }}>
                {STATUS_LABELS[r.status]?.label}
              </span>
            </div>
          ))}
        </div>

        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', marginTop: '24px', marginBottom: '12px' }}>
          Achievements
        </h2>
        {achievements.length === 0 ? (
          <p style={{ fontSize: '13px', color: '#a6947e' }}>No achievements recorded yet.</p>
        ) : (
          <ul style={{ fontSize: '13px', color: '#6b5a4a', listStyle: 'none', padding: 0 }}>
            {achievements.map((a) => (
              <li key={a.id} style={{ padding: '6px 0', borderBottom: '1px solid #fdf9f5' }}>
                <span style={{ fontWeight: 600, color: '#1e293b' }}>{a.title}</span>
                {a.category && <span style={{ color: '#6b5a4a' }}> — {a.category}</span>}
                {a.date && <span style={{ color: '#a6947e' }}> ({a.date})</span>}
                {a.description && <p style={{ fontSize: '12px', color: '#6b5a4a', marginTop: '2px' }}>{a.description}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <footer style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid #e8dfd6', textAlign: 'center' }}>
        <p style={{ fontSize: '11px', color: '#a6947e' }}>© {new Date().getFullYear()} {SCHOOL.shortName}</p>
        <Link href="/admin" style={{ display: 'inline-block', marginTop: '8px', fontSize: '11px', color: '#a6947e', fontWeight: 500 }}>
          Admin
        </Link>
      </footer>
    </main>
  );
}