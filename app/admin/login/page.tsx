'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { SCHOOL } from '@/lib';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push('/admin');
    router.refresh();
  };

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafaf8', padding: '16px' }}>
      <div style={{ width: '100%', maxWidth: '380px', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', textAlign: 'center', color: '#1a472a' }}>{SCHOOL.shortName}</h1>
        <p style={{ fontSize: '14px', color: '#64748b', textAlign: 'center', marginTop: '4px' }}>Admin Login</p>

        <form onSubmit={handleLogin} style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label htmlFor="email" style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#334155' }}>Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ marginTop: '4px', width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '16px', outline: 'none' }} />
          </div>
          <div>
            <label htmlFor="password" style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#334155' }}>Password</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ marginTop: '4px', width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '16px', outline: 'none' }} />
          </div>

          {error && <p style={{ fontSize: '14px', color: '#dc2626' }}>{error}</p>}

          <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#1a472a', color: 'white', fontWeight: 600, border: 'none', cursor: 'pointer', opacity: loading ? 0.5 : 1 }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </main>
  );
}