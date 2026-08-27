import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib.server';
import AdminClient from './admin-client';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <AdminClient mode="login" />;
  }

  const { data: students } = await supabaseAdmin
    .from('students')
    .select('*')
    .order('id');

  const { data: attendance } = await supabaseAdmin
    .from('attendance_records')
    .select('*')
    .order('date');

  const { data: achievements } = await supabaseAdmin
    .from('achievements')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <AdminClient
      mode="dashboard"
      students={students || []}
      attendance={attendance || []}
      achievements={achievements || []}
    />
  );
}