'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <main style={{ minHeight: '100vh', background: '#fdf9f5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1a472a' }}>Something went wrong</h1>
        <p style={{ marginTop: '8px', color: '#6b5a4a' }}>An unexpected error occurred.</p>
        <button onClick={reset} className="btn-primary" style={{ marginTop: '16px' }}>Try again</button>
      </div>
    </main>
  );
}