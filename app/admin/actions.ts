'use server';

import { supabaseAdmin } from '@/lib';
import { revalidatePath } from 'next/cache';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

async function requireAdmin() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/admin/login');
  return user;
}

export async function createStudentAction(formData: FormData) {
  await requireAdmin();
  const full_name = formData.get('full_name') as string;
  const joining_date = formData.get('joining_date') as string || null;
  const joining_week = formData.get('joining_week') ? parseInt(formData.get('joining_week') as string) : null;

  const { data: lastStudent } = await supabaseAdmin.from('students').select('id').order('id', { ascending: false }).limit(1);
  let nextNumber = 1;
  if (lastStudent && lastStudent.length > 0) {
    const lastNum = parseInt(lastStudent[0].id.replace('MS', ''), 10);
    nextNumber = lastNum + 1;
  }
  const newId = `MS${String(nextNumber).padStart(3, '0')}`;

  await supabaseAdmin.from('students').insert({ id: newId, full_name, joining_date: joining_date || null, joining_week });
  revalidatePath('/');
  revalidatePath('/admin');
  return { success: true };
}

export async function updateStudentAction(formData: FormData) {
  await requireAdmin();
  const id = formData.get('id') as string;
  const full_name = formData.get('full_name') as string;
  const joining_date = formData.get('joining_date') as string || null;
  const joining_week = formData.get('joining_week') ? parseInt(formData.get('joining_week') as string) : null;
  const is_active = formData.get('is_active') === 'true';

  await supabaseAdmin.from('students').update({ full_name, joining_date: joining_date || null, joining_week, is_active }).eq('id', id);
  revalidatePath('/');
  revalidatePath(`/students/${id}`);
  revalidatePath('/admin');
  return { success: true };
}

export async function recordAttendanceAction(formData: FormData) {
  await requireAdmin();
  const student_id = formData.get('student_id') as string;
  const date = formData.get('date') as string;
  const status = formData.get('status') as string;

  await supabaseAdmin.from('attendance_records').upsert({ student_id, date, status }, { onConflict: 'student_id,date' });
  revalidatePath('/');
  revalidatePath(`/students/${student_id}`);
  revalidatePath('/admin');
  return { success: true };
}

export async function addAchievementAction(formData: FormData) {
  await requireAdmin();
  const student_id = formData.get('student_id') as string;
  const title = formData.get('title') as string;
  const category = formData.get('category') as string || null;
  const date = formData.get('date') as string || null;
  const description = formData.get('description') as string || null;

  await supabaseAdmin.from('achievements').insert({ student_id, title, category, date, description });
  revalidatePath('/');
  revalidatePath(`/students/${student_id}`);
  revalidatePath('/admin');
  return { success: true };
}

export async function deleteAchievementAction(formData: FormData) {
  await requireAdmin();
  const id = formData.get('id') as string;
  await supabaseAdmin.from('achievements').delete().eq('id', id);
  revalidatePath('/');
  revalidatePath('/admin');
  return { success: true };
}

export async function logoutAction() {
  const supabase = createServerComponentClient({ cookies });
  await supabase.auth.signOut();
  redirect('/admin/login');
}