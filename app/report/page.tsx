'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase, SCHOOL, getSchoolWeek } from '../../lib';
import type { Student, AttendanceRecord } from '../../lib';

export default function ReportPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [studentsRes, attendanceRes] = await Promise.all([
        supabase.from('students').select('*').eq('is_active', true).order('id'),
        supabase.from('attendance_records').select('*').order('date'),
      ]);
      setStudents(studentsRes.data || []);
      setAttendance(attendanceRes.data || []);
      setLoading(false);
    }
    load();
  }, []);

  // Build student attendance map
  const studentAttendanceMap = new Map<string, Map<string, string>>();
  for (const student of students) {
    studentAttendanceMap.set(student.id, new Map());
  }
  for (const rec of attendance) {
    const map = studentAttendanceMap.get(rec.student_id);
    if (map) map.set(rec.date, rec.status);
  }

  // Collect all unique dates sorted
  const allDates = Array.from(new Set(attendance.map((r) => r.date))).sort();

  // Group dates by absolute school week
  const weekMap = new Map<number, string[]>();
  for (const date of allDates) {
    const week = getSchoolWeek(date);
    if (!weekMap.has(week)) weekMap.set(week, []);
    weekMap.get(week)!.push(date);
  }

  // Sort weeks chronologically
  const weeks = Array.from(weekMap.keys()).sort((a, b) => a - b);

  const dayName = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00Z');
    return d.toLocaleDateString('en-GB', { weekday: 'short' });
  };

  const dayNumber = (dateStr: string) => {
    return dateStr.slice(8);
  };

  return (
    <main style={{ background: '#fdf9f5', minHeight: '100vh', padding: '20px 16px 40px' }}>
      <div style={{ maxWidth: '100%', margin: '0 auto' }}>
        <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <Link href="/" style={{ color: '#1a472a', fontSize: '14px', fontWeight: 600 }}>
            ← Back to Home
          </Link>
          <button
            onClick={() => window.print()}
            className="no-print"
            style={{
              background: '#1a472a',
              color: 'white',
              border: 'none',
              borderRadius: '999px',
              padding: '12px 24px',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Print / Save as PDF
          </button>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#a6947e', fontSize: '14px' }}>Loading report...</p>
        ) : (
          <>
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

            {weeks.map((weekNum) => {
              const weekDates = weekMap.get(weekNum) || [];
              const weekStart = weekDates[0] || '';
              const weekEnd = weekDates[weekDates.length - 1] || '';
              const startDate = new Date(weekStart + 'T00:00:00Z');
              const monthName = startDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

              return (
                <div key={weekNum} style={{ marginBottom: '32px', background: 'white', borderRadius: '16px', border: '1px solid #e8dfd6', overflow: 'hidden', pageBreakInside: 'avoid' }}>
                  <div style={{ background: '#1a472a', color: 'white', padding: '12px 20px', fontWeight: 700, fontSize: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <span>Week {weekNum}</span>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.8)' }}>
                      {monthName} · {weekStart} to {weekEnd}
                    </span>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '700px' }}>
                      <thead>
                        <tr style={{ background: '#fdf9f5', borderBottom: '2px solid #c9a94e' }}>
                          <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#1a472a', whiteSpace: 'nowrap' }}>Reg No</th>
                          <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#1a472a', whiteSpace: 'nowrap' }}>Student Name</th>
                          {weekDates.map((date) => (
                            <th key={date} style={{ padding: '10px 6px', textAlign: 'center', fontWeight: 700, color: '#1a472a', whiteSpace: 'nowrap' }}>
                              {dayName(date)}
                              <span style={{ display: 'block', fontSize: '10px', fontWeight: 500, color: '#a6947e' }}>{dayNumber(date)}</span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((student) => {
                          const enrolled = student.joining_date ? student.joining_date <= weekEnd : true;
                          return (
                            <tr key={student.id} style={{ borderBottom: '1px solid #f5efe8' }}>
                              <td style={{ padding: '10px 12px', fontWeight: 700, color: '#1a472a', whiteSpace: 'nowrap' }}>{student.id}</td>
                              <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap' }}>{student.full_name}</td>
                              {weekDates.map((date) => {
                                const map = studentAttendanceMap.get(student.id);
                                const status = map?.get(date) || '';
                                const studentEnrolled = student.joining_date ? student.joining_date <= date : true;
                                if (!studentEnrolled) {
                                  return (
                                    <td key={date} style={{ padding: '10px 6px', textAlign: 'center', color: '#cbd5e1', fontWeight: 500 }}>
                                      —
                                    </td>
                                  );
                                }
                                return (
                                  <td key={date} style={{ padding: '10px 6px', textAlign: 'center', fontWeight: 700, fontSize: '13px' }}>
                                    <span style={{
                                      display: 'inline-block',
                                      width: '28px',
                                      height: '28px',
                                      lineHeight: '28px',
                                      borderRadius: '6px',
                                      background: status === 'R' ? '#dcfce7' : status === 'M' ? '#fef9c3' : status === 'X' ? '#f1f5f9' : '#fdf9f5',
                                      color: status === 'R' ? '#166534' : status === 'M' ? '#854d0e' : status === 'X' ? '#475569' : '#cbd5e1',
                                      border: status ? '1px solid ' + (status === 'R' ? '#22c55e' : status === 'M' ? '#eab308' : '#94a3b8') : '1px solid #e8dfd6',
                                    }}>
                                      {status || '·'}
                                    </span>
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
              );
            })}

            <div style={{ textAlign: 'center', fontSize: '12px', color: '#6b5a4a', marginTop: '24px', padding: '16px', background: '#fdf9f5', borderRadius: '8px' }}>
              <p style={{ fontWeight: 700, marginBottom: '4px' }}>Legend</p>
              <p>R = Recited &nbsp;&nbsp;|&nbsp;&nbsp; M = Makeup &nbsp;&nbsp;|&nbsp;&nbsp; X = Pending &nbsp;&nbsp;|&nbsp;&nbsp; — = Not Enrolled</p>
            </div>
          </>
        )}

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