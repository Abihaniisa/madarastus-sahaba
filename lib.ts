import { createClient } from '@supabase/supabase-js';

export const SCHOOL = {
  name: 'Madrasatus Sahaba Litahfizul Quran',
  shortName: 'Madrasatus Sahaba',
  tagline: 'Center of Quranic Memorization and Islamic Learning',
  description:
    'Madrasatus Sahaba Litahfizul Quran is a center dedicated to the memorization of the Holy Quran and the study of Islamic sciences. Our students engage in daily recitation, guided learning, and the development of strong moral character.',
};

export const FOUNDER = {
  name: 'Sheikh Abdullahi Babayo',
  title: 'Founder & Spiritual Guide',
  history:
    'Sheikh Abdullahi Babayo is a devoted scholar and educator who has dedicated his life to the teaching of the Quran and Islamic knowledge. He established Madrasatus Sahaba Litahfizul Quran to provide authentic, structured, and accessible Quranic education to students from all backgrounds.',
};

export const STATUS_LABELS: Record<string, { label: string; emoji: string }> = {
  R: { label: 'Recited', emoji: '' },
  M: { label: 'Makeup', emoji: '' },
  X: { label: 'Pending', emoji: '' },
  O: { label: 'Not Enrolled', emoji: '' },
};

export type RecitationStatus = 'R' | 'M' | 'X' | 'O';

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
  status: RecitationStatus;
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const SCHOOL_START = '2026-07-13';

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getMondayOfWeek(week: number): Date {
  const start = new Date(Date.UTC(2026, 6, 13));
  const daysOffset = (week - 1) * 7;
  return new Date(start.getTime() + daysOffset * 86400000);
}

export function getRecitationDatesForWeek(week: number): string[] {
  const monday = getMondayOfWeek(week);
  const dates: string[] = [];
  for (let i = 0; i < 4; i++) {
    const d = new Date(monday.getTime() + i * 86400000);
    dates.push(formatDate(d));
  }
  return dates;
}

export function getSchoolWeek(dateStr: string): number {
  const start = new Date(Date.UTC(2026, 6, 13));
  const date = new Date(dateStr + 'T00:00:00Z');
  const diffDays = Math.floor((date.getTime() - start.getTime()) / 86400000);
  if (diffDays < 0) return 0;
  return Math.floor(diffDays / 7) + 1;
}

export function getStudentStartDate(student: Student): string | null {
  if (student.joining_date) return student.joining_date;
  if (student.joining_week) {
    return formatDate(getMondayOfWeek(student.joining_week));
  }
  return null;
}

export function deduplicate(records: AttendanceRecord[]): AttendanceRecord[] {
  const seen = new Set<string>();
  const result: AttendanceRecord[] = [];
  for (const r of records) {
    const key = `${r.student_id}:${r.date}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(r);
    }
  }
  return result;
}

export function getTodayISO(): string {
  return formatDate(new Date());
}

export interface SessionResult {
  date: string;
  status: RecitationStatus;
}

export function generateEligibleSessions(
  student: Student,
  records: AttendanceRecord[],
  today?: string
): SessionResult[] {
  const todayStr = today || getTodayISO();
  const startDate = getStudentStartDate(student);
  const deduped = deduplicate(records);
  const recordMap = new Map<string, RecitationStatus>();
  for (const rec of deduped) {
    if (rec.student_id === student.id) {
      recordMap.set(rec.date, rec.status);
    }
  }

  const sessions: SessionResult[] = [];
  const maxWeek = getSchoolWeek(todayStr);

  for (let week = 1; week <= maxWeek; week++) {
    const weekDates = getRecitationDatesForWeek(week);
    for (const date of weekDates) {
      if (date > todayStr) continue;
      if (startDate && date < startDate) {
        sessions.push({ date, status: 'O' });
        continue;
      }
      const status = recordMap.get(date) || 'X';
      sessions.push({ date, status });
    }
  }

  return sessions;
}

export function calculateStats(records: AttendanceRecord[], student: Student) {
  const sessions = generateEligibleSessions(student, records);
  let r = 0,
    m = 0,
    x = 0;
  for (const s of sessions) {
    if (s.status === 'R') r++;
    else if (s.status === 'M') m++;
    else if (s.status === 'X') x++;
  }
  const total = r + m + x;
  const attendance = total > 0 ? Math.round((r / total) * 10000) / 100 : 0;
  const completion = total > 0 ? Math.round(((r + m) / total) * 10000) / 100 : 0;
  return { total, r, m, x, attendance, completion };
}

export function getWeekly(records: AttendanceRecord[], student: Student) {
  const sessions = generateEligibleSessions(student, records);
  const weeks = new Map<number, { r: number; m: number; x: number }>();
  for (const s of sessions) {
    if (s.status === 'O') continue;
    const week = getSchoolWeek(s.date);
    if (!weeks.has(week)) weeks.set(week, { r: 0, m: 0, x: 0 });
    const w = weeks.get(week)!;
    if (s.status === 'R') w.r++;
    else if (s.status === 'M') w.m++;
    else if (s.status === 'X') w.x++;
  }
  const result: Array<{ week: number; r: number; m: number; x: number; attendance: number }> = [];
  for (const [week, data] of weeks) {
    const total = data.r + data.m + data.x;
    const attendance = total > 0 ? Math.round((data.r / total) * 10000) / 100 : 0;
    result.push({ week, r: data.r, m: data.m, x: data.x, attendance });
  }
  result.sort((a, b) => a.week - b.week);
  return result;
}

export function getWeeklyStatsForWeek(
  records: AttendanceRecord[],
  student: Student,
  week: number,
  today?: string
) {
  const todayStr = today || getTodayISO();
  const weekDates = getRecitationDatesForWeek(week);
  const startDate = getStudentStartDate(student);
  const deduped = deduplicate(records);
  const recordMap = new Map<string, RecitationStatus>();
  for (const rec of deduped) {
    if (rec.student_id === student.id) {
      recordMap.set(rec.date, rec.status);
    }
  }

  let r = 0,
    m = 0,
    x = 0;
  for (const date of weekDates) {
    if (date > todayStr) continue;
    if (startDate && date < startDate) continue;
    const status = recordMap.get(date) || 'X';
    if (status === 'R') r++;
    else if (status === 'M') m++;
    else if (status === 'X') x++;
  }
  const total = r + m + x;
  const attendance = total > 0 ? Math.round((r / total) * 10000) / 100 : 0;
  const completion = total > 0 ? Math.round(((r + m) / total) * 10000) / 100 : 0;
  return { week, r, m, x, attendance, completion, total };
}

export function getApplicable(records: AttendanceRecord[], student: Student): AttendanceRecord[] {
  return deduplicate(records).filter((r) => r.student_id === student.id);
}