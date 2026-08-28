import Link from 'next/link';
import { supabase, SCHOOL, STATUS_LABELS, calculateStats, getWeekly, getApplicable } from '../../lib';
import type { Student, AttendanceRecord, Achievement } from '../../lib';
import AvatarViewer from './avatar-viewer';

export const dynamic = 'force-dynamic';

export default async function StudentPage({ searchParams }: { searchParams: Promise<{ id: string }> }) {
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
  const applicable = getApplicable(records, student);
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
            <p style={{ fontSize: '12px', color: '#6b5a4a', marginTop: '4px' }}>Registration Number: <strong>{student.id}</strong></p>
          </div>
        </div>

        <div style={{ marginTop: '16px', borderTop: '1px solid #e8dfd6', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px', fontSize: '13px' }}>
          <span>Enrolled in Program: <strong>Week {student.joining_week ?? '—'}</strong></span>
          {student.joining_date && <span>Enrolled on: <strong>{student.joining_date}</strong></span>}
          <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 600, background: student.is_active ? '#dcfce7' : '#f1f5f9', color: student.is_active ? '#166534' : '#475569' }}>{student.is_active ? 'Active' : 'Inactive'}</span>
        </div>

        <div style={{ marginTop: '16px', borderTop: '2px solid #1a472a', paddingTop: '12px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '120px', textAlign: 'center', background: '#fdf9f5', borderRadius: '10px', padding: '12px' }}>
            <p style={{ fontSize: '24px', fontWeight: 700, color: '#1a472a' }}>{stats.attendance}%</p>
            <p style={{ fontSize: '11px', color: '#6b5a4a', fontWeight: 600 }}>Recitation Rate</p>
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
          <p style={{ fontSize: '10px', color: '#a6947e' }}>Recitation records are calculated from enrollment date. Sessions before enrollment are not counted.</p>
        </div>
      </div>

      <div style={{ marginTop: '24px', background: 'white', border: '1px solid #e8dfd6', borderRadius: '16px', padding: '20px' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px' }}>Weekly Breakdown</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {weekly.map((w) => (
            <div key={w.week} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: '36px', fontWeight: 600 }}>W{w.week}</span>
              <div style={{ flex: 1, display: 'flex', gap: '4px' }}>
                {Array.from({ length: w.r }).map((_, i) => <span key={`r${i}`} style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} />)}
                {Array.from({ length: w.m }).map((_, i) => <span key={`m${i}`} style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#eab308' }} />)}
                {Array.from({ length: w.x }).map((_, i) => <span key={`x${i}`} style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#cbd5e1' }} />)}
              </div>
              <span style={{ fontWeight: 700 }}>{w.attendance}%</span>
            </div>
          ))}
        </div>

        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginTop: '20px', marginBottom: '8px' }}>All Sessions</h2>
        <div>
          {applicable.map((r) => (
            <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f5efe8' }}>
              <span>{new Date(r.date + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
              <span style={{ padding: '2px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 600, background: r.status === 'R' ? '#dcfce7' : r.status === 'M' ? '#fef9c3' : '#f1f5f9', color: r.status === 'R' ? '#166534' : r.status === 'M' ? '#854d0e' : '#475569' }}>{STATUS_LABELS[r.status]?.label}</span>
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