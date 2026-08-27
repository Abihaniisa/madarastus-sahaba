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
        <h1 className="heading-display" style={{ fontSize: '1.5rem', color: '#1e293b' }}>Student not found</h1>
        <Link href="/" style={{ color: '#1a472a', textDecoration: 'underline', marginTop: '16px', display: 'inline-block', fontWeight: 500 }}>
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
        <h1 className="heading-display" style={{ fontSize: '1.5rem', color: '#1e293b' }}>Student not found</h1>
        <Link href="/" style={{ color: '#1a472a', textDecoration: 'underline', marginTop: '16px', display: 'inline-block', fontWeight: 500 }}>
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
    <main className="container" style={{ padding: '24px 16px 48px' }}>
      <Link href="/" style={{ color: '#1a472a', fontSize: '14px', fontWeight: 500 }}>
        ← Back to Students
      </Link>

      <div className="premium-card" style={{ marginTop: '20px', overflow: 'hidden' }}>
        <div style={{ background: 'linear-gradient(135deg, #1a472a, #2c6a56)', color: 'white', padding: '20px', textAlign: 'center' }}>
          <p className="heading-display" style={{ fontSize: '1rem' }}>{SCHOOL.shortName}</p>
        </div>
        <div style={{ padding: '28px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            {student.photo_url ? (
              <img src={student.photo_url} alt={student.full_name} className="avatar avatar-md" />
            ) : (
              <div className="avatar avatar-md" style={{ background: '#c9a94e' }}>
                {firstLetter}
              </div>
            )}
            <div style={{ flex: 1, minWidth: '200px' }}>
              <h1 className="heading-display" style={{ fontSize: '1.5rem', color: '#1e293b' }}>
                {student.full_name}
              </h1>
              <p style={{ fontSize: '14px', color: '#6b5a4a', marginTop: '4px' }}>
                {student.id} · Week {student.joining_week ?? '—'}
                {student.joining_date ? ` · ${student.joining_date}` : ''}
              </p>
              <span className={`status-badge ${student.is_active ? 'status-r' : 'status-x'}`} style={{ marginTop: '8px' }}>
                {student.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          <div style={{ marginTop: '28px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '140px' }}>
              <p style={{ fontSize: '32px', fontWeight: 700, color: '#1a472a' }}>
                {stats.attendance}%
              </p>
              <p style={{ fontSize: '13px', color: '#6b5a4a', fontWeight: 500 }}>Attendance</p>
              <div className="progress-track" style={{ marginTop: '8px' }}>
                <div className="progress-fill" style={{ width: `${Math.min(stats.attendance, 100)}%`, background: '#1a472a' }} />
              </div>
            </div>
            <div style={{ flex: 1, minWidth: '140px' }}>
              <p style={{ fontSize: '32px', fontWeight: 700, color: '#c9a94e' }}>
                {stats.completion}%
              </p>
              <p style={{ fontSize: '13px', color: '#6b5a4a', fontWeight: 500 }}>Completion</p>
              <div className="progress-track" style={{ marginTop: '8px' }}>
                <div className="progress-fill" style={{ width: `${Math.min(stats.completion, 100)}%`, background: '#c9a94e' }} />
              </div>
            </div>
          </div>

          <div style={{ marginTop: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <span className="status-badge status-r">R: {stats.r}</span>
            <span className="status-badge status-m">M: {stats.m}</span>
            <span className="status-badge status-x">X: {stats.x}</span>
            <span style={{ fontSize: '13px', color: '#6b5a4a', fontWeight: 500, alignSelf: 'center' }}>
              {stats.total} total
            </span>
          </div>

          <div style={{ marginTop: '28px', borderTop: '1px solid #f5efe8', paddingTop: '20px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', marginBottom: '12px' }}>Weekly Breakdown</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {weekly.map((w) => (
                <div key={w.week} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ fontWeight: 600, color: '#6b5a4a', width: '36px' }}>W{w.week}</span>
                  <div style={{ flex: 1, margin: '0 12px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
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
          </div>

          {achievements.length > 0 && (
            <div style={{ marginTop: '28px', borderTop: '1px solid #f5efe8', paddingTop: '20px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>Achievements</h2>
              <ul style={{ fontSize: '14px', color: '#6b5a4a', listStyle: 'none', padding: 0 }}>
                {achievements.slice(0, 3).map((a) => (
                  <li key={a.id} style={{ padding: '6px 0', borderBottom: '1px solid #fdf9f5' }}>
                    {a.title}
                    {a.date ? ` — ${a.date}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="premium-card" style={{ marginTop: '24px', padding: '28px 24px' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', marginBottom: '20px' }}>Detailed Breakdown</h2>

        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#6b5a4a', marginBottom: '10px' }}>All Sessions</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {applicable.map((r) => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px', padding: '8px 0', borderBottom: '1px solid #fdf9f5' }}>
              <span style={{ color: '#6b5a4a' }}>
                {new Date(r.date + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
              <span className={`status-badge ${r.status === 'R' ? 'status-r' : r.status === 'M' ? 'status-m' : 'status-x'}`}>
                {STATUS_LABELS[r.status]?.label}
              </span>
            </div>
          ))}
        </div>

        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#6b5a4a', marginTop: '24px', marginBottom: '10px' }}>Achievements</h3>
        {achievements.length === 0 ? (
          <p style={{ fontSize: '14px', color: '#a6947e' }}>No achievements recorded yet.</p>
        ) : (
          <ul style={{ fontSize: '14px', color: '#6b5a4a', listStyle: 'none', padding: 0 }}>
            {achievements.map((a) => (
              <li key={a.id} style={{ padding: '8px 0', borderBottom: '1px solid #fdf9f5' }}>
                <span style={{ fontWeight: 600, color: '#1e293b' }}>{a.title}</span>
                {a.category && <span style={{ color: '#6b5a4a' }}> — {a.category}</span>}
                {a.date && <span style={{ color: '#a6947e' }}> ({a.date})</span>}
                {a.description && <p style={{ fontSize: '13px', color: '#6b5a4a', marginTop: '4px' }}>{a.description}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <footer style={{ marginTop: '40px', paddingTop: '32px', borderTop: '1px solid #e8dfd6', textAlign: 'center' }}>
        <p style={{ fontSize: '12px', color: '#a6947e' }}>© {new Date().getFullYear()} {SCHOOL.shortName}</p>
        <Link href="/admin" style={{ display: 'inline-block', marginTop: '12px', fontSize: '12px', color: '#a6947e', fontWeight: 500 }}>
          Admin
        </Link>
      </footer>
    </main>
  );
}