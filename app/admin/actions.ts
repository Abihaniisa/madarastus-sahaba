'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/ssr';
import { supabaseAdmin } from './admin-server';

// ============================================
// HELPERS
// ============================================

function getNextStudentId(students: { id: string }[]): string {
  const ids = students.map((s) => parseInt(s.id.replace('MS', ''), 10));
  const max = ids.length > 0 ? Math.max(...ids) : 0;
  return `MS${String(max + 1).padStart(3, '0')}`;
}

// ============================================
// ADD STUDENT
// ============================================

export async function addStudent(data: {
  full_name: string;
  joining_date: string;
  joining_week: number;
}) {
  // Get existing students to generate next ID
  const { data: existing } = await supabaseAdmin
    .from('students')
    .select('id');

  const id = getNextStudentId(existing || []);

  const { data: student, error } = await supabaseAdmin
    .from('students')
    .insert({
      id,
      full_name: data.full_name,
      joining_date: data.joining_date,
      joining_week: data.joining_week,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding student:', error);
    return null;
  }

  revalidatePath('/');
  revalidatePath('/student');
  revalidatePath('/admin');
  return student;
}

// ============================================
// UPDATE STUDENT
// ============================================

export async function updateStudent(data: {
  id: string;
  full_name?: string;
  joining_week?: number;
  is_active?: boolean;
}) {
  const updateData: any = {};
  if (data.full_name !== undefined) updateData.full_name = data.full_name;
  if (data.joining_week !== undefined) updateData.joining_week = data.joining_week;
  if (data.is_active !== undefined) updateData.is_active = data.is_active;

  const { data: student, error } = await supabaseAdmin
    .from('students')
    .update(updateData)
    .eq('id', data.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating student:', error);
    return null;
  }

  revalidatePath('/');
  revalidatePath('/student');
  revalidatePath('/admin');
  return student;
}

// ============================================
// SAVE ATTENDANCE BATCH
// ============================================

export async function saveAttendanceBatch(data: {
  records: Array<{
    student_id: string;
    date: string;
    status: 'R' | 'M' | 'X';
  }>;
}) {
  const today = new Date().toISOString().split('T')[0];

  // Validate no future dates
  for (const record of data.records) {
    if (record.date > today) {
      throw new Error('Cannot record future dates');
    }
  }

  // Upsert records
  let successCount = 0;
  const errors: string[] = [];

  for (const record of data.records) {
    const { error } = await supabaseAdmin
      .from('attendance_records')
      .upsert(
        {
          student_id: record.student_id,
          date: record.date,
          status: record.status,
        },
        {
          onConflict: 'student_id,date',
        }
      );

    if (error) {
      errors.push(`${record.student_id}: ${error.message}`);
    } else {
      successCount++;
    }
  }

  revalidatePath('/');
  revalidatePath('/student');
  revalidatePath('/admin');

  if (errors.length > 0) {
    console.error('Attendance save errors:', errors);
  }

  return { success: errors.length === 0, count: successCount, errors };
}

// ============================================
// ADD ACHIEVEMENT
// ============================================

export async function addAchievement(data: {
  student_id: string;
  title: string;
  description?: string;
  category?: string;
  date?: string;
}) {
  const { data: achievement, error } = await supabaseAdmin
    .from('achievements')
    .insert({
      student_id: data.student_id,
      title: data.title,
      description: data.description || null,
      category: data.category || null,
      date: data.date || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding achievement:', error);
    return null;
  }

  revalidatePath('/student');
  revalidatePath('/admin');
  return achievement;
}

// ============================================
// DELETE ACHIEVEMENT
// ============================================

export async function deleteAchievement(data: { id: string }) {
  const { error } = await supabaseAdmin
    .from('achievements')
    .delete()
    .eq('id', data.id);

  if (error) {
    console.error('Error deleting achievement:', error);
    return { success: false };
  }

  revalidatePath('/student');
  revalidatePath('/admin');
  return { success: true };
}

// ============================================
// SAVE ANNOUNCEMENT
// ============================================

export async function saveAnnouncement(data: {
  arabic_text?: string;
  english_text?: string;
  schedule?: string;
}) {
  const { data: announcement, error } = await supabaseAdmin
    .from('announcements')
    .insert({
      arabic_text: data.arabic_text || null,
      english_text: data.english_text || null,
      schedule: data.schedule || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving announcement:', error);
    return null;
  }

  revalidatePath('/');
  revalidatePath('/admin');
  return announcement;
}

// ============================================
// LOGOUT
// ============================================

export async function logout() {
  const cookieStore = await cookies();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set(name, value, options);
        },
        remove(name: string) {
          cookieStore.set(name, '', { maxAge: 0 });
        },
      },
    }
  );

  await supabase.auth.signOut();

  revalidatePath('/admin');
  redirect('/admin');
}