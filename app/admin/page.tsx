import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib';
import AdminDashboard from './dashboard';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/admin/login');

  const { data: students } = await supabaseAdmin.from('students').select('*').order('id');
  const { data: attendance } = await supabaseAdmin.from('attendance_records').select('*').order('date');
  const { data: achievements } = await supabaseAdmin.from('achievements').select('*').order('created_at', { ascending: false });

  return <AdminDashboard students={students || []} attendance={attendance || []} achievements={achievements || []} />;
}