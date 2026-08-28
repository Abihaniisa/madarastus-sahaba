import { createClient } from '@supabase/supabase-js';

// ============================================
// SCHOOL CONFIGURATION
// ============================================

export const SCHOOL = {
  name: 'Madrasatus Sahaba Litahfizul Quran',
  shortName: 'Madrasatus Sahaba',
  tagline: 'Preserving the Quran, One Recitation at a Time',
  description:
    'A dedicated institution for Quran memorization and recitation, nurturing students in the art of Quranic recitation with proper tajweed.',
};

// ============================================
// FOUNDER CONFIGURATION
// ============================================

export const FOUNDER = {
  name: 'Sheikh Abdullahi Babayo',
  title: 'Founder & Spiritual Guide',
  history:
    'Sheikh Abdullahi Babayo founded Madrasatus Sahaba with a vision to create a center of excellence for Quran memorization. With decades of experience in Islamic education, he has guided countless students on their journey to becoming Huffaz.',
};

// ============================================
// STATUS LABELS & COLORS
// ============================================

export const STATUS_LABELS = {
  R: 'Recited',
  M: 'Makeup',
  X: 'Pending',
} as const;

export const STATUS_COLORS = {
  R: 'var(--status-recited)',
  M: 'var(--status-makeup)',
  X: 'var(--status-pending)',
} as const;

export type Status = 'R' | 'M' | 'X';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface Student {
  id: string;
  full_name: string;
  joining_date: string | null;
  joining_week: number | null;
  is_active: boolean;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  date: string;
  status: Status;
  created_at: string;
  updated_at: string;
}

export interface Achievement {
  id: string;
  student_id: string;
  title: string;
  description: string | null;
  category: string | null;
  date: string | null;
  created_at: string;
}

export interface Announcement {
  id: string;
  arabic_text: string | null;
  english_text: string | null;
  schedule: string | null;
  created_at: string;
}

export interface StudentStats {
  total: number;
  recited: number;
  makeup: number;
  pending: number;
  recitationRate: number;
  completionRate: number;
}

export interface WeeklyBreakdown {
  week: number;
  days: {
    date: string;
    status: Status | null;
  }[];
  rate: number;
}

// ============================================
// CALCULATION FUNCTIONS
// ============================================

const SCHOOL_START_DATE = new Date('2026-07-13');

export function getSchoolWeek(date: Date): number {
  const diff = date.getTime() - SCHOOL_START_DATE.getTime();
  return Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1;
}

export function getWeekStartDate(week: number): Date {
  const start = new Date(SCHOOL_START_DATE);
  start.setDate(start.getDate() + (week - 1) * 7);
  return start;
}

export function calculateStats(records: AttendanceRecord[]): StudentStats {
  const recited = records.filter((r) => r.status === 'R').length;
  const makeup = records.filter((r) => r.status === 'M').length;
  const pending = records.filter((r) => r.status === 'X').length;
  const total = records.length;

  return {
    total,
    recited,
    makeup,
    pending,
    recitationRate: total > 0 ? (recited / total) * 100 : 0,
    completionRate: total > 0 ? ((recited + makeup) / total) * 100 : 0,
  };
}

export function getWeeklyBreakdown(
  records: AttendanceRecord[],
  studentJoiningWeek: number | null
): WeeklyBreakdown[] {
  const weeks: WeeklyBreakdown[] = [];
  const now = new Date();
  const currentWeek = getSchoolWeek(now);

  if (!studentJoiningWeek) return weeks;

  for (let w = studentJoiningWeek; w <= currentWeek; w++) {
    const weekStart = getWeekStartDate(w);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const days = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + d);
      const dateStr = date.toISOString().split('T')[0];
      const record = records.find((r) => r.date === dateStr);
      days.push({
        date: dateStr,
        status: record ? record.status : null,
      });
    }

    const validDays = days.filter(
      (d) => d.status && ['R', 'M', 'X'].includes(d.status)
    );
    const recitedDays = days.filter((d) => d.status === 'R').length;
    const rate = validDays.length > 0 ? (recitedDays / validDays.length) * 100 : 0;

    weeks.push({
      week: w,
      days,
      rate,
    });
  }

  return weeks;
}

export function getApplicableRecords(
  records: AttendanceRecord[],
  joiningDate: string | null
): AttendanceRecord[] {
  if (!joiningDate) return [];
  return records.filter((r) => r.date >= joiningDate);
}

// ============================================
// SUPABASE CLIENT (ANON)
// ============================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================
// DATA FETCHING FUNCTIONS
// ============================================

export async function getStudents(): Promise<Student[]> {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .order('id');

  if (error) {
    console.error('Error fetching students:', error);
    return [];
  }

  return data || [];
}

export async function getActiveStudents(): Promise<Student[]> {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('is_active', true)
    .order('id');

  if (error) {
    console.error('Error fetching active students:', error);
    return [];
  }

  return data || [];
}

export async function getStudent(id: string): Promise<Student | null> {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching student:', error);
    return null;
  }

  return data;
}

export async function getAttendance(): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from('attendance_records')
    .select('*');

  if (error) {
    console.error('Error fetching attendance:', error);
    return [];
  }

  return data || [];
}

export async function getAttendanceByStudent(
  studentId: string
): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('student_id', studentId)
    .order('date');

  if (error) {
    console.error('Error fetching attendance for student:', error);
    return [];
  }

  return data || [];
}

export async function getAttendanceByDate(date: string): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('date', date);

  if (error) {
    console.error('Error fetching attendance for date:', error);
    return [];
  }

  return data || [];
}

export async function getAchievements(): Promise<Achievement[]> {
  const { data, error } = await supabase
    .from('achievements')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching achievements:', error);
    return [];
  }

  return data || [];
}

export async function getAchievementsByStudent(
  studentId: string
): Promise<Achievement[]> {
  const { data, error } = await supabase
    .from('achievements')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching achievements for student:', error);
    return [];
  }

  return data || [];
}

export async function getLatestAnnouncement(): Promise<Announcement | null> {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching announcement:', error);
    return null;
  }

  return data && data.length > 0 ? data[0] : null;
}