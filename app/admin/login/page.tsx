'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { SCHOOL } from '../../../lib';

export default function AdminLoginPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fdf9f5', padding: '16px' }}>
      <div style={{ width: '100%', maxWidth: '400px', background: 'white', borderRadius: '16px', border: '1px solid #e8dfd6', padding: '32px 28px', boxShadow: '0 2px 10px rgba(26,71,42,0.06)' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, textAlign: 'center', color: '#1a472a' }}>{SCHOOL.shortName}</h1>
        <p style={{ fontSize: '14px', color: '#6b5a4a', textAlign: 'center', marginTop: '4px' }}>Admin Login</p>
        <form onSubmit={handleSubmit} style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label htmlFor="email" style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e8dfd6', fontSize: '15px', outline: 'none', background: '#fdf9f5' }}
            />
          </div>
          <div>
            <label htmlFor="password" style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{ width: '100%', padding: '12px 48px 12px 16px', borderRadius: '12px', border: '1px solid #e8dfd6', fontSize: '15px', outline: 'none', background: '#fdf9f5' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6b5a4a',
                  fontSize: '18px',
                  lineHeight: 1,
                  padding: '4px',
                }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          {error && <p style={{ fontSize: '14px', color: '#dc2626' }}>{error}</p>}
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', borderRadius: '999px', background: '#1a472a', color: 'white', fontWeight: 700, border: 'none', opacity: loading ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </main>
  );
}