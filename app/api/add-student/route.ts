import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib.server';

export async function POST(request: Request) {
  const formData = await request.formData();
  const full_name = formData.get('full_name') as string;
  const joining_date = (formData.get('joining_date') as string) || null;
  const joining_week = formData.get('joining_week')
    ? parseInt(formData.get('joining_week') as string)
    : null;

  if (!full_name) {
    return NextResponse.json(
      { error: 'Full name is required' },
      { status: 400 }
    );
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
      return NextResponse.redirect(new URL('/admin', request.url));
    }

    if (error.code !== '23505') {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json(
    { error: 'Failed to generate student ID' },
    { status: 500 }
  );
}