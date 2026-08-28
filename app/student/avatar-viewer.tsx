'use client';

import { useState } from 'react';

interface Props {
  src?: string | null;
  initial: string;
  name: string;
  size?: number;
  shape?: 'circle' | 'rounded';
}

export default function AvatarViewer({ src, initial, name, size = 80, shape = 'rounded' }: Props) {
  const [view, setView] = useState<'small' | 'expanded' | 'full'>('small');
  const borderRadius = shape === 'circle' ? '50%' : '8px';

  if (!src) {
    return (
      <div style={{ width: size, height: size, borderRadius, background: '#c9a94e', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: size * 0.4 }}>{initial}</div>
    );
  }

  return (
    <>
      <div onClick={() => setView('expanded')} style={{ width: size, height: size, borderRadius, background: `url(${src}) center/cover`, cursor: 'pointer', flexShrink: 0 }} role="button" aria-label={`Expand photo of ${name}`} />
      {view !== 'small' && (
        <div className="avatar-overlay" onClick={() => setView('small')}>
          <p style={{ color: 'white', fontSize: '16px', fontWeight: 600, position: 'absolute', top: '20px', left: '20px' }}>{name}</p>
          <img src={src} alt={name} className={view === 'full' ? 'full' : ''} onClick={(e) => { e.stopPropagation(); setView(view === 'expanded' ? 'full' : 'expanded'); }} />
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', position: 'absolute', bottom: '20px' }}>Tap image to {view === 'expanded' ? 'see full screen' : 'return'}. Tap outside to close.</p>
        </div>
      )}
    </>
  );
}