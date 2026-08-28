import Link from 'next/link';
import { supabase, SCHOOL, calculateStats } from '../../lib';
import type { Student, AttendanceRecord } from '../../lib';

export const dynamic = 'force-dynamic';

export default async function ReportPage() {
  const [studentsRes, attendanceRes] = await Promise.all([
    supabase.from('students').select('*').eq('is_active', true).order('id'),
    supabase.from('attendance_records').select('*').order('date'),
  ]);

  const students: Student[] = studentsRes.data || [];
  const attendance: AttendanceRecord[] = attendanceRes.data || [];

  const studentAttendanceMap = new Map<string, Map<string, string>>();
  for (const student of students) {
    studentAttendanceMap.set(student.id, new Map());
  }
  for (const rec of attendance) {
    const map = studentAttendanceMap.get(rec.student_id);
    if (map) map.set(rec.date, rec.status);
  }

  const allDates = Array.from(new Set(attendance.map((r) => r.date))).sort();

  const months = new Map<string, string[]>();
  for (const date of allDates) {
    const monthKey = date.slice(0, 7);
    if (!months.has(monthKey)) months.set(monthKey, []);
    months.get(monthKey)!.push(date);
  }

  const monthBlocks: Array<{ monthKey: string; weeks: string[][] }> = [];
  for (const [monthKey, dates] of months) {
    const weeks: string[][] = [];
    let currentWeek: string[] = [];
    for (const date of dates) {
      if (currentWeek.length === 0) {
        currentWeek.push(date);
      } else {
        const lastDate = new Date(currentWeek[currentWeek.length - 1] + 'T00:00:00Z');
        const thisDate = new Date(date + 'T00:00:00Z');
        const diffDays = Math.floor((thisDate.getTime() - lastDate.getTime()) / 86400000);
        if (diffDays <= 4 && currentWeek.length < 4) {
          currentWeek.push(date);
        } else {
          weeks.push(currentWeek);
          currentWeek = [date];
        }
      }
    }
    if (currentWeek.length > 0) weeks.push(currentWeek);
    monthBlocks.push({ monthKey, weeks });
  }

  const monthName = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const d = new Date(parseInt(year), parseInt(month) - 1, 1);
    return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  };

  return (
    <main style={{ background: '#fdf9f5', minHeight: '100vh', padding: '20px 16px 40px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <Link href="/" style={{ color: '#1a472a', fontSize: '14px', fontWeight: 600 }}>
            ← Back to Home
          </Link>
          <a
            href="javascript:window.print()"
            className="no-print"
            style={{
              background: '#1a472a',
              color: 'white',
              borderRadius: '999px',
              padding: '12px 24px',
              fontWeight: 700,
              fontSize: '14px',
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Print / Save as PDF
          </a>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: 'clamp(1.25rem, 3vw, 1.75rem)', fontWeight: 800, color: '#1a472a', marginBottom: '4px' }}>
            {SCHOOL.name}
          </h1>
          <p style={{ fontSize: '14px', color: '#6b5a4a', fontWeight: 600 }}>
            Recitation Record Sheet
          </p>
          <p style={{ fontSize: '12px', color: '#a6947e', marginTop: '4px' }}>
            Generated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {monthBlocks.map((block) => (
          <div key={block.monthKey} style={{ marginBottom: '32px', background: 'white', borderRadius: '16px', border: '1px solid #e8dfd6', overflow: 'hidden', pageBreakInside: 'avoid' }}>
            <div style={{ background: '#1a472a', color: 'white', padding: '12px 20px', fontWeight: 700, fontSize: '14px' }}>
              {monthName(block.monthKey)}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '600px' }}>
                <thead>
                  <tr style={{ background: '#fdf9f5', borderBottom: '2px solid #c9a94e' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#1a472a', whiteSpace: 'nowrap' }}>Reg No</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#1a472a', whiteSpace: 'nowrap' }}>Student Name</th>
                    {block.weeks.map((week, i) => (
                      <th key={i} style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700, color: '#1a472a', whiteSpace: 'nowrap' }}>
                        W{i + 1}
                        <span style={{ display: 'block', fontSize: '10px', fontWeight: 500, color: '#a6947e' }}>
                          {week[0]?.slice(8)}–{week[week.length - 1]?.slice(8)}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => {
                    const stats = calculateStats(
                      attendance.filter((r) => r.student_id === student.id),
                      student
                    );
                    return (
                      <tr key={student.id} style={{ borderBottom: '1px solid #f5efe8' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 700, color: '#1a472a', whiteSpace: 'nowrap' }}>{student.id}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap' }}>{student.full_name}</td>
                        {block.weeks.map((week, i) => {
                          const statuses = week.map((date) => {
                            const map = studentAttendanceMap.get(student.id);
                            const status = map?.get(date);
                            if (!status) return '';
                            return status;
                          });
                          const enrolled = student.joining_date ? student.joining_date <= week[week.length - 1] : true;
                          if (!enrolled) {
                            return (
                              <td key={i} style={{ padding: '10px 8px', textAlign: 'center', color: '#cbd5e1', fontWeight: 500 }}>
                                —
                              </td>
                            );
                          }
                          return (
                            <td key={i} style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 600, letterSpacing: '2px' }}>
                              {statuses.map((s, j) => (
                                <span key={j} style={{ color: s === 'R' ? '#22c55e' : s === 'M' ? '#eab308' : s === 'X' ? '#ef4444' : '#cbd5e1' }}>
                                  {s || '·'}
                                </span>
                              ))}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        <div style={{ textAlign: 'center', fontSize: '12px', color: '#6b5a4a', marginTop: '24px', padding: '16px', background: '#fdf9f5', borderRadius: '8px' }}>
          <p style={{ fontWeight: 700, marginBottom: '4px' }}>Legend</p>
          <p>R = Recited &nbsp;&nbsp;|&nbsp;&nbsp; M = Makeup &nbsp;&nbsp;|&nbsp;&nbsp; X = Pending &nbsp;&nbsp;|&nbsp;&nbsp; — = Not Enrolled</p>
        </div>

        <style>{`
          @media print {
            .no-print { display: none !important; }
            body { background: white; }
            table { font-size: 10px; }
            th, td { padding: 6px 8px !important; }
          }
        `}</style>
      </div>
    </main>
  );
}