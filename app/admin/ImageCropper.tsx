'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  src: string;
  onCancel: () => void;
  onCrop: (file: File) => void;
}

export default function ImageCropper({ src, onCancel, onCrop }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [img, setImg] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const image = new Image();
    image.src = src;
    image.onload = () => setImg(image);
  }, [src]);

  useEffect(() => {
    if (!img || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const size = 300;
    canvas.width = size;
    canvas.height = size;
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(img, offset.x, offset.y, img.width * scale, img.height * scale);
  }, [img, scale, offset]);

  const handlePointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handlePointerUp = () => setDragging(false);

  const handleCrop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'cropped.jpg', { type: 'image/jpeg' });
        onCrop(file);
      }
    }, 'image/jpeg', 0.8);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: 'white', padding: '16px', borderRadius: '12px', maxWidth: '90vw' }}>
        <p style={{ textAlign: 'center', marginBottom: '12px', fontWeight: 700 }}>Drag to move, slider to zoom</p>
        <div style={{ width: 300, height: 300, overflow: 'hidden', borderRadius: '8px', touchAction: 'none', cursor: 'grab' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <canvas ref={canvasRef} style={{ display: 'block' }} />
        </div>
        <input
          type="range"
          min="1"
          max="4"
          step="0.1"
          value={scale}
          onChange={(e) => setScale(parseFloat(e.target.value))}
          style={{ width: '100%', marginTop: '12px' }}
        />
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'center' }}>
          <button onClick={onCancel} className="btn-outline" style={{ padding: '8px 16px' }}>Cancel</button>
          <button onClick={handleCrop} className="btn-primary" style={{ padding: '8px 16px' }}>Crop & Save</button>
        </div>
      </div>
    </div>
  );
}