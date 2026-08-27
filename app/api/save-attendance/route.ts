import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib.server';

export async function POST(request: Request) {
  const formData = await request.formData();
  const student_id = formData.get('student_id') as string;
  const date = formData.get('date') as string;
  const status = formData.get('status') as string;

  if (!student_id || !date || !status) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  }

  if (!['R', 'M', 'X'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('attendance_records')
    .upsert({ student_id, date, status }, { onConflict: 'student_id,date' });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}