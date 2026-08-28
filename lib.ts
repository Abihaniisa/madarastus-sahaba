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
};

export type RecitationStatus = 'R' | 'M' | 'X';

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

export function getSchoolWeek(dateStr: string): number {
  const start = new Date(SCHOOL_START + 'T00:00:00Z');
  const date = new Date(dateStr + 'T00:00:00Z');
  const diffDays = Math.floor((date.getTime() - start.getTime()) / 86400000);
  if (diffDays < 0) return 0;
  return Math.floor(diffDays / 7) + 1;
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

export function getApplicable(records: AttendanceRecord[], student: Student): AttendanceRecord[] {
  const deduped = deduplicate(records);
  const today = new Date().toISOString().slice(0, 10);
  const notFuture = deduped.filter((r) => r.date <= today);
  if (student.joining_date !== null) {
    return notFuture.filter((r) => r.date >= student.joining_date!);
  }
  if (student.joining_week !== null) {
    return notFuture.filter((r) => getSchoolWeek(r.date) >= student.joining_week!);
  }
  return notFuture;
}

export function calculateStats(records: AttendanceRecord[], student: Student) {
  const applicable = getApplicable(records, student);
  let r = 0;
  let m = 0;
  let x = 0;
  for (const rec of applicable) {
    if (rec.status === 'R') r++;
    else if (rec.status === 'M') m++;
    else x++;
  }
  const total = r + m + x;
  const attendance = total > 0 ? Math.round((r / total) * 10000) / 100 : 0;
  const completion = total > 0 ? Math.round(((r + m) / total) * 10000) / 100 : 0;
  return { total, r, m, x, attendance, completion };
}

export function getWeekly(records: AttendanceRecord[], student: Student) {
  const applicable = getApplicable(records, student);
  const weeks = new Map<number, { r: number; m: number; x: number }>();
  for (const rec of applicable) {
    const week = getSchoolWeek(rec.date);
    if (!weeks.has(week)) weeks.set(week, { r: 0, m: 0, x: 0 });
    const w = weeks.get(week)!;
    if (rec.status === 'R') w.r++;
    else if (rec.status === 'M') w.m++;
    else w.x++;
  }
  const result: Array<{ week: number; r: number; m: number; x: number; attendance: number }> = [];
  for (const [week, data] of weeks) {
    const total = data.r + data.m + data.x;
    const attendance = total > 0 ? Math.round((data.r / total) * 10000) / 100 : 0;
    result.push({ week, ...data, attendance });
  }
  result.sort((a, b) => a.week - b.week);
  return result;
}