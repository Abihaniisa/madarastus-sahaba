import Link from 'next/link';
import {
  supabase,
  SCHOOL,
  STATUS_LABELS,
  calculateStats,
  getWeekly,
  generateEligibleSessions,
} from '@/lib';
import type { Student, AttendanceRecord, Achievement } from '@/lib';
import AvatarViewer from './avatar-viewer';

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
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Student not found</h1>
        <Link href="/" className="btn-outline" style={{ marginTop: '16px' }}>Back to home</Link>
      </main>
    );
  }

  const { data: studentData } = await supabase.from('students').select('*').eq('id', id).single();

  if (!studentData) {
    return (
      <main className="container" style={{ padding: '40px 16px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Student not found</h1>
        <Link href="/" className="btn-outline" style={{ marginTop: '16px' }}>Back to home</Link>
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
  const eligibleSessions = generateEligibleSessions(student, records);
  const firstLetter = student.full_name.charAt(0).toUpperCase();

  return (
    <main className="container" style={{ padding: '20px 16px 40px' }}>
      <Link href="/" className="btn-outline" style={{ padding: '8px 16px', fontSize: '13px' }}>← Back to Students</Link>

      <div className="certificate-frame" style={{ marginTop: '16px' }}>
        <span className="corner corner-tl" /><span className="corner corner-tr" /><span className="corner corner-bl" /><span className="corner corner-br" />

        <div style={{ textAlign: 'center', borderBottom: '2px solid #c9a94e', paddingBottom: '16px' }}>
          <p style={{ fontSize: '11px', fontWeight: 600, color: '#6b5a4a', textTransform: 'uppercase', letterSpacing: '1px' }}>{SCHOOL.name}</p>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1a472a', marginTop: '4px' }}>Student Report Card</h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '16px', flexWrap: 'wrap' }}>
          <AvatarViewer src={student.photo_url} initial={firstLetter} name={student.full_name} size={80} shape="rounded" />
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>{student.full_name}</h2>
            <p style={{ fontSize: '12px', color: '#6b5a4a', marginTop: '4px' }}>
              Registration Number: <strong>{student.id}</strong>
            </p>
          </div>
        </div>

        <div style={{ marginTop: '16px', borderTop: '1px solid #e8dfd6', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px', fontSize: '13px' }}>
          <span>Enrolled in Program: <strong>Week {student.joining_week ?? '—'}</strong></span>
          {student.joining_date && <span>Enrolled on: <strong>{student.joining_date}</strong></span>}
          <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 600, background: student.is_active ? '#dcfce7' : '#f1f5f9', color: student.is_active ? '#166534' : '#475569' }}>
            {student.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>

        <div style={{ marginTop: '16px', borderTop: '2px solid #1a472a', paddingTop: '12px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '120px', textAlign: 'center', background: '#fdf9f5', borderRadius: '10px', padding: '12px' }}>
            <p style={{ fontSize: '24px', fontWeight: 700, color: '#1a472a' }}>{stats.attendance}%</p>
            <p style={{ fontSize: '11px', color: '#6b5a4a', fontWeight: 600 }}>On-Time Rate</p>
          </div>
          <div style={{ flex: 1, minWidth: '120px', textAlign: 'center', background: '#fdf9f5', borderRadius: '10px', padding: '12px' }}>
            <p style={{ fontSize: '24px', fontWeight: 700, color: '#c9a94e' }}>{stats.completion}%</p>
            <p style={{ fontSize: '11px', color: '#6b5a4a', fontWeight: 600 }}>Completion Rate</p>
          </div>
        </div>

        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#475569', flexWrap: 'wrap', gap: '6px' }}>
          <span>Recited (R): <strong>{stats.r}</strong></span>
          <span>Makeup (M): <strong>{stats.m}</strong></span>
          <span>Pending (X): <strong>{stats.x}</strong></span>
          <span>Total: <strong>{stats.total}</strong></span>
        </div>

        <div style={{ marginTop: '16px', borderTop: '1px solid #e8dfd6', paddingTop: '10px', textAlign: 'center' }}>
          <p style={{ fontSize: '10px', color: '#a6947e' }}>
            Recitation records are calculated from enrollment date. Sessions before enrollment are not counted.
          </p>
        </div>
      </div>

      <div style={{ marginTop: '24px', background: 'white', border: '1px solid #e8dfd6', borderRadius: '16px', padding: '20px' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px' }}>Weekly Breakdown</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {weekly.map((w) => {
            const weekDates = [];
            const monday = new Date(Date.UTC(2026, 6, 13));
            monday.setUTCDate(monday.getUTCDate() + (w.week - 1) * 7);
            for (let i = 0; i < 4; i++) {
              const d = new Date(monday.getTime() + i * 86400000);
              weekDates.push(d.toISOString().slice(0, 10));
            }
            return (
              <div key={w.week} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '36px', fontWeight: 600 }}>W{w.week}</span>
                <div style={{ flex: 1, display: 'flex', gap: '6px' }}>
                  {weekDates.map((date) => {
                    const session = eligibleSessions.find((s) => s.date === date);
                    if (!session || session.status === 'O') {
                      return <span key={date} style={{ width: '10px', height: '10px', borderRadius: '50%', border: '1px dashed #c9a94e', display: 'inline-block', background: 'transparent' }} title="Not Enrolled" />;
                    }
                    if (session.status === 'R') {
                      return <span key={date} style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} title="Recited" />;
                    }
                    if (session.status === 'M') {
                      return <span key={date} style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#eab308', display: 'inline-block' }} title="Makeup" />;
                    }
                    return <span key={date} style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f1f5f9', border: '1px solid #cbd5e1', display: 'inline-block' }} title="Pending" />;
                  })}
                </div>
                <span style={{ fontWeight: 700 }}>{w.attendance}%</span>
              </div>
            );
          })}
        </div>

        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginTop: '20px', marginBottom: '8px' }}>All Sessions</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {eligibleSessions.map((s) => (
            <div key={s.date} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f5efe8', alignItems: 'center' }}>
              <span style={{ color: '#6b5a4a' }}>
                {new Date(s.date + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
              <span style={{ padding: '2px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 600, background: s.status === 'R' ? '#dcfce7' : s.status === 'M' ? '#fef9c3' : s.status === 'X' ? '#f1f5f9' : '#fdf9f5', color: s.status === 'R' ? '#166534' : s.status === 'M' ? '#854d0e' : s.status === 'X' ? '#475569' : '#a6947e' }}>
                {s.status === 'O' ? 'Not Enrolled' : STATUS_LABELS[s.status]?.label}
              </span>
            </div>
          ))}
        </div>

        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginTop: '20px', marginBottom: '8px' }}>Achievements</h2>
        {achievements.length === 0 ? (
          <p style={{ color: '#a6947e' }}>No achievements recorded yet.</p>
        ) : (
          achievements.map((a) => (
            <div key={a.id} style={{ padding: '6px 0', borderBottom: '1px solid #f5efe8' }}>
              <p style={{ fontWeight: 600 }}>{a.title}</p>
              {a.date && <p style={{ fontSize: '12px', color: '#a6947e' }}>{a.date}</p>}
              {a.description && <p style={{ fontSize: '12px', color: '#6b5a4a' }}>{a.description}</p>}
            </div>
          ))
        )}
      </div>

      <footer style={{ marginTop: '32px', textAlign: 'center', paddingTop: '20px', borderTop: '1px solid #e8dfd6' }}>
        <p style={{ fontSize: '12px', color: '#a6947e' }}>© {new Date().getFullYear()} {SCHOOL.shortName}</p>
        <Link href="/admin" className="footer-link-btn" style={{ marginTop: '8px' }}>Admin</Link>
      </footer>
    </main>
  );
}