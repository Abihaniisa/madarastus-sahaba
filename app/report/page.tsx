'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase, SCHOOL, getWeeklyStatsForWeek, getRecitationDatesForWeek } from '../../lib';
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

  const studentAttendanceMap = new Map<string, Map<string, string>>();
  for (const student of students) {
    studentAttendanceMap.set(student.id, new Map());
  }
  for (const rec of attendance) {
    const map = studentAttendanceMap.get(rec.student_id);
    if (map) map.set(rec.date, rec.status);
  }

  const weeks = [1, 2, 3, 4, 5, 6, 7];

  return (
    <main style={{ background: '#fdf9f5', minHeight: '100vh', padding: '20px 16px 40px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <Link href="/" className="btn-outline" style={{ padding: '8px 16px', fontSize: '13px' }}>← Back to Home</Link>
          <button onClick={() => window.print()} className="btn-primary no-print">Print / Save as PDF</button>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: 'clamp(1.25rem, 3vw, 1.75rem)', fontWeight: 800, color: '#1a472a', marginBottom: '4px' }}>{SCHOOL.name}</h1>
          <p style={{ fontSize: '14px', color: '#6b5a4a', fontWeight: 600 }}>Recitation Record Sheet</p>
          <p style={{ fontSize: '12px', color: '#a6947e', marginTop: '4px' }}>
            Generated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#a6947e' }}>Loading report...</p>
        ) : (
          weeks.map((weekNum) => {
            const weekDates = getRecitationDatesForWeek(weekNum);
            const weekStart = weekDates[0] || '';
            const weekEnd = weekDates[weekDates.length - 1] || '';
            const monthName = weekStart ? new Date(weekStart + 'T00:00:00Z').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : '';

            return (
              <div key={weekNum} style={{ marginBottom: '24px', background: 'white', borderRadius: '16px', border: '1px solid #e8dfd6', overflow: 'hidden', pageBreakInside: 'avoid' }}>
                <div style={{ background: '#1a472a', color: 'white', padding: '12px 20px', fontWeight: 700, fontSize: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <span>Week {weekNum}</span>
                  <span style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.8)' }}>{monthName} · {weekStart} to {weekEnd}</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '700px' }}>
                    <thead>
                      <tr style={{ background: '#fdf9f5', borderBottom: '2px solid #c9a94e' }}>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#1a472a', whiteSpace: 'nowrap' }}>Reg No</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#1a472a', whiteSpace: 'nowrap' }}>Student Name</th>
                        {weekDates.map((date) => (
                          <th key={date} style={{ padding: '10px 6px', textAlign: 'center', fontWeight: 700, color: '#1a472a', whiteSpace: 'nowrap' }}>
                            {new Date(date + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'short' })}
                            <span style={{ display: 'block', fontSize: '10px', fontWeight: 500, color: '#a6947e' }}>{date.slice(8)}</span>
                          </th>
                        ))}
                        <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700, color: '#1a472a' }}>Week %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student) => {
                        const weekStats = getWeeklyStatsForWeek(attendance, student, weekNum);
                        return (
                          <tr key={student.id} style={{ borderBottom: '1px solid #f5efe8' }}>
                            <td style={{ padding: '10px 12px', fontWeight: 700, color: '#1a472a' }}>{student.id}</td>
                            <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1e293b' }}>{student.full_name}</td>
                            {weekDates.map((date) => {
                              const studentStartDate = student.joining_date || (student.joining_week ? getRecitationDatesForWeek(student.joining_week)[0] : null);
                              if (studentStartDate && date < studentStartDate) {
                                return (
                                  <td key={date} style={{ padding: '10px 6px', textAlign: 'center', color: '#a6947e' }}>
                                    <span style={{ display: 'inline-block', width: '28px', height: '28px', lineHeight: '28px', borderRadius: '50%', border: '1px dashed #c9a94e', background: 'transparent', color: '#a6947e' }}>O</span>
                                  </td>
                                );
                              }
                              const status = studentAttendanceMap.get(student.id)?.get(date) || 'X';
                              return (
                                <td key={date} style={{ padding: '10px 6px', textAlign: 'center', fontWeight: 700, fontSize: '13px' }}>
                                  <span style={{ display: 'inline-block', width: '28px', height: '28px', lineHeight: '28px', borderRadius: '6px', background: status === 'R' ? '#dcfce7' : status === 'M' ? '#fef9c3' : '#f1f5f9', color: status === 'R' ? '#166534' : status === 'M' ? '#854d0e' : '#475569', border: '1px solid ' + (status === 'R' ? '#22c55e' : status === 'M' ? '#eab308' : '#94a3b8') }}>
                                    {status === 'X' ? 'X' : status}
                                  </span>
                                </td>
                              );
                            })}
                            <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700, color: '#1a472a' }}>
                              {weekStats.total > 0 ? `${weekStats.attendance}%` : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        )}

        <div style={{ textAlign: 'center', fontSize: '12px', color: '#6b5a4a', marginTop: '24px', padding: '16px', background: '#fdf9f5', borderRadius: '8px' }}>
          <p style={{ fontWeight: 700, marginBottom: '4px' }}>Legend</p>
          <p>R = Recited &nbsp;&nbsp;|&nbsp;&nbsp; M = Makeup &nbsp;&nbsp;|&nbsp;&nbsp; X = Pending &nbsp;&nbsp;|&nbsp;&nbsp; O = Not Enrolled</p>
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