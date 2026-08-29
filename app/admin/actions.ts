'use server';

import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    'Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.'
  );
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function requireAdmin() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/admin');
  }

  return user;
}

export async function addStudent(formData: FormData) {
  await requireAdmin();
  const full_name = formData.get('full_name') as string;
  const joining_date = (formData.get('joining_date') as string) || null;
  const joining_week = formData.get('joining_week')
    ? parseInt(formData.get('joining_week') as string)
    : null;

  if (!full_name) {
    redirect('/admin');
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: lastStudent } = await supabaseAdmin
      .from('students')
      .select('id')
      .order('id', { ascending: false })
      .limit(1);

    let nextNumber = 1;
    if (lastStudent && lastStudent.length > 0) {
      const lastNum = parseInt(lastStudent[0].id.replace('MS', ''), 10);
      nextNumber = lastNum + 1;
    }
    const newId = `MS${String(nextNumber).padStart(3, '0')}`;

    const { error } = await supabaseAdmin.from('students').insert({
      id: newId,
      full_name,
      joining_date: joining_date || null,
      joining_week,
    });

    if (!error) {
      redirect('/admin');
    }
  }

  redirect('/admin');
}

export async function updateStudent(formData: FormData) {
  await requireAdmin();
  const id = formData.get('id') as string;
  const full_name = formData.get('full_name') as string;
  const joining_week = formData.get('joining_week')
    ? parseInt(formData.get('joining_week') as string)
    : null;
  const is_active = formData.get('is_active') === 'true';

  if (!id || !full_name) {
    redirect('/admin');
  }

  await supabaseAdmin
    .from('students')
    .update({ full_name, joining_week, is_active })
    .eq('id', id);

  redirect('/admin');
}

export async function saveAttendanceBatch(
  records: Array<{ student_id: string; date: string; status: string }>
) {
  await requireAdmin();

  for (const record of records) {
    if (!['R', 'M', 'X'].includes(record.status)) {
      return { error: 'Invalid status' };
    }
  }

  const { error } = await supabaseAdmin
    .from('attendance_records')
    .upsert(records, { onConflict: 'student_id,date' });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function addAchievement(formData: FormData) {
  await requireAdmin();
  const student_id = formData.get('student_id') as string;
  const title = formData.get('title') as string;
  const category = (formData.get('category') as string) || null;
  const date = (formData.get('date') as string) || null;
  const description = (formData.get('description') as string) || null;

  if (!student_id || !title) {
    redirect('/admin');
  }

  await supabaseAdmin
    .from('achievements')
    .insert({ student_id, title, category, date, description });

  redirect('/admin');
}

export async function deleteAchievement(formData: FormData) {
  await requireAdmin();
  const id = formData.get('id') as string;

  if (!id) {
    redirect('/admin');
  }

  await supabaseAdmin.from('achievements').delete().eq('id', id);

  redirect('/admin');
}

export async function saveAnnouncement(formData: FormData) {
  await requireAdmin();
  const arabic_text = (formData.get('arabic_text') as string) || null;
  const english_text = (formData.get('english_text') as string) || null;
  const schedule = (formData.get('schedule') as string) || null;

  if (!arabic_text && !english_text && !schedule) {
    redirect('/admin');
  }

  await supabaseAdmin.from('announcements').insert({
    arabic_text,
    english_text,
    schedule,
  });

  redirect('/admin');
}

export async function uploadStudentPhoto(formData: FormData) {
  await requireAdmin();
  const student_id = formData.get('student_id') as string;
  const file = formData.get('file') as File;

  if (!student_id || !file || file.size === 0) {
    return { error: 'Missing student or file.' };
  }
  if (!file.type.startsWith('image/')) {
    return { error: 'Only image files are allowed.' };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { error: 'Image size must be under 5MB.' };
  }

  const fileExt = file.name.split('.').pop() || 'jpg';
  const unique = Date.now();
  const fileName = `students/${student_id}-${unique}.${fileExt}`;
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await supabaseAdmin.storage
    .from('student-photos')
    .upload(fileName, buffer, { upsert: true, contentType: file.type });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { data: urlData } = supabaseAdmin.storage
    .from('student-photos')
    .getPublicUrl(fileName);

  const { error: updateError } = await supabaseAdmin
    .from('students')
    .update({ photo_url: urlData.publicUrl })
    .eq('id', student_id);

  if (updateError) {
    return { error: updateError.message };
  }

  return { success: true, photoUrl: urlData.publicUrl };
}

export async function removeStudentPhoto(formData: FormData) {
  await requireAdmin();
  const student_id = formData.get('student_id') as string;

  if (!student_id) {
    return { error: 'Missing student.' };
  }

  const { data: student } = await supabaseAdmin
    .from('students')
    .select('photo_url')
    .eq('id', student_id)
    .single();

  if (student?.photo_url) {
    const url = student.photo_url;
    const path = url.split('/').pop();
    if (path) {
      await supabaseAdmin.storage
        .from('student-photos')
        .remove([`students/${path}`]);
    }
  }

  const { error } = await supabaseAdmin
    .from('students')
    .update({ photo_url: null })
    .eq('id', student_id);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function uploadFounderPhoto(formData: FormData) {
  await requireAdmin();
  const file = formData.get('file') as File;

  if (!file || file.size === 0) {
    redirect('/admin');
  }
  if (!file.type.startsWith('image/')) {
    redirect('/admin');
  }

  const fileExt = file.name.split('.').pop() || 'jpg';
  const unique = Date.now();
  const fileName = `founder/founder-${unique}.${fileExt}`;
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await supabaseAdmin.storage
    .from('student-photos')
    .upload(fileName, buffer, { upsert: true, contentType: file.type });

  if (!uploadError) {
    const { data: urlData } = supabaseAdmin.storage
      .from('student-photos')
      .getPublicUrl(fileName);

    await supabaseAdmin
      .from('school_config')
      .upsert(
        { id: 'default', founder_photo_url: urlData.publicUrl },
        { onConflict: 'id' }
      );
  }

  redirect('/admin');
}

export async function logout() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
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
        remove(name: string, options: any) {
          cookieStore.set(name, '', { ...options, maxAge: 0 });
        },
      },
    }
  );

  await supabase.auth.signOut();
  redirect('/admin');
}