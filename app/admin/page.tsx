import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseAdmin } from './admin-server';
import AdminClient from './admin-client';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <AdminClient mode="login" students={[]} achievements={[]} announcement={null} />;
  }

  const { data: students } = await supabaseAdmin.from('students').select('*').order('id');
  const { data: achievements } = await supabaseAdmin.from('achievements').select('*').order('created_at', { ascending: false });

  return <AdminClient mode="dashboard" students={students || []} achievements={achievements || []} announcement={null} />;
}