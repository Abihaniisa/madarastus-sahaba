import { redirect } from 'next/navigation';
import { createClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import AdminClient from './admin-client';

// ============================================
// FORCE DYNAMIC
// ============================================

export const dynamic = 'force-dynamic';

// ============================================
// SERVER COMPONENT: AUTH CHECK
// ============================================

export default async function AdminPage() {
  // ✅ FIX: await cookies() - mandatory in Next.js 15
  const cookieStore = await cookies();

  const supabase = createClient(
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

  const { data: session } = await supabase.auth.getSession();

  // If already logged in, redirect to dashboard
  if (session?.session) {
    // ✅ Use relative redirect, NOT localhost
    redirect('/admin');
  }

  // Render login form (client component)
  return <AdminClient />;
}