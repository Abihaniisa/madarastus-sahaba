import { supabase, calculateStats } from '../lib';
import type { Student, AttendanceRecord } from '../lib';
import HomeClient from './home-client';
import { SCHOOL } from '../lib';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: SCHOOL.name,
  description: SCHOOL.tagline,
};

export default async function HomePage() {
  const [studentsRes, attendanceRes, schoolConfigRes] = await Promise.all([
    supabase.from('students').select('*').eq('is_active', true).order('id'),
    supabase.from('attendance_records').select('*').order('date'),
    supabase.from('school_config').select('founder_photo_url').eq('id', 'default').single(),
  ]);

  const students: Student[] = studentsRes.data || [];
  const attendance: AttendanceRecord[] = attendanceRes.data || [];
  const founderPhotoUrl = schoolConfigRes.data?.founder_photo_url || null;

  const studentsWithStats = students.map((student) => {
    const studentAttendance = attendance.filter((r) => r.student_id === student.id);
    const stats = calculateStats(studentAttendance, student);
    return { ...student, stats };
  });

  return <HomeClient students={studentsWithStats} founderPhotoUrl={founderPhotoUrl} />;
}