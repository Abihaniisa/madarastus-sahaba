import { supabase, calculateStats } from '../lib';
import type { Student, AttendanceRecord } from '../lib';
import HomeClient from './home-client';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [studentsRes, attendanceRes] = await Promise.all([
    supabase.from('students').select('*').eq('is_active', true).order('id'),
    supabase.from('attendance_records').select('*').order('date'),
  ]);

  const students: Student[] = studentsRes.data || [];
  const attendance: AttendanceRecord[] = attendanceRes.data || [];

  const studentsWithStats = students.map((student) => {
    const studentAttendance = attendance.filter(
      (r) => r.student_id === student.id
    );
    const stats = calculateStats(studentAttendance, student);
    return { ...student, stats };
  });

  return <HomeClient students={studentsWithStats} />;
}