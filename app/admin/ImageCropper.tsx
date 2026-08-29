'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  src: string;
  onCancel: () => void;
  onCrop: (file: File) => void;
}

const CROP_SIZE = 320;

export default function ImageCropper({ src, onCancel, onCrop }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialOffset, setInitialOffset] = useState({ x: 0, y: 0 });

  const pinchStartRef = useRef<{ dist: number; scale: number } | null>(null);
  const wheelAccumRef = useRef(0);

  useEffect(() => {
    const image = new Image();
    image.src = src;
    image.onload = () => {
      setImg(image);
      centerImage(image, 1);
    };
    return () => {
      image.onload = null;
    };
  }, [src]);

  function clampOffset(newOffset: { x: number; y: number }, currentScale: number) {
    if (!img) return { x: 0, y: 0 };
    const scaledW = img.width * currentScale;
    const scaledH = img.height * currentScale;

    let minX: number;
    let maxX: number;
    if (scaledW < CROP_SIZE) {
      minX = (CROP_SIZE - scaledW) / 2;
      maxX = minX;
    } else {
      minX = CROP_SIZE - scaledW;
      maxX = 0;
    }

    let minY: number;
    let maxY: number;
    if (scaledH < CROP_SIZE) {
      minY = (CROP_SIZE - scaledH) / 2;
      maxY = minY;
    } else {
      minY = CROP_SIZE - scaledH;
      maxY = 0;
    }

    return {
      x: Math.min(Math.max(newOffset.x, minX), maxX),
      y: Math.min(Math.max(newOffset.y, minY), maxY),
    };
  }

  function centerImage(image: HTMLImageElement, targetScale: number) {
    if (!image) return;
    const scaledW = image.width * targetScale;
    const scaledH = image.height * targetScale;
    const cx = (CROP_SIZE - scaledW) / 2;
    const cy = (CROP_SIZE - scaledH) / 2;
    const centered = clampOffset({ x: cx, y: cy }, targetScale);
    setScale(targetScale);
    setOffset(centered);
  }

  useEffect(() => {
    if (!img || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = CROP_SIZE;
    canvas.height = CROP_SIZE;

    ctx.clearRect(0, 0, CROP_SIZE, CROP_SIZE);
    ctx.drawImage(img, offset.x, offset.y, img.width * scale, img.height * scale);
  }, [img, scale, offset]);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!img) return;
    if (e.pointerType === 'touch') {
      const touches = (e.nativeEvent as any).touches;
      if (touches && touches.length === 2) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        pinchStartRef.current = { dist: Math.hypot(dx, dy), scale };
        setDragging(false);
        return;
      }
    }

    setDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialOffset(offset);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!img) return;

    if (e.pointerType === 'touch') {
      const touches = (e.nativeEvent as any).touches;
      if (touches && touches.length === 2) {
        if (!pinchStartRef.current) return;
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        const ratio = dist / pinchStartRef.current.dist;
        const newScale = clampScale(pinchStartRef.current.scale * ratio);
        const clamped = clampOffset(offset, newScale);
        setScale(newScale);
        setOffset(clamped);
        return;
      }
    }

    if (!dragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    const newOffset = { x: initialOffset.x + dx, y: initialOffset.y + dy };
    setOffset(clampOffset(newOffset, scale));
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === 'touch') {
      pinchStartRef.current = null;
    }
    setDragging(false);
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  }

  function clampScale(s: number) {
    if (!img) return s;
    const minScale = Math.max(CROP_SIZE / img.width, CROP_SIZE / img.height);
    const maxScale = 5;
    return Math.min(Math.max(s, minScale), maxScale);
  }

  function handleWheel(e: React.WheelEvent<HTMLDivElement>) {
    if (!img) return;
    wheelAccumRef.current += e.deltaY > 0 ? -0.1 : 0.1;
    const factor = 1 + wheelAccumRef.current;
    const newScale = clampScale(scale * factor);
    wheelAccumRef.current = 0;
    const clamped = clampOffset(offset, newScale);
    setScale(newScale);
    setOffset(clamped);
  }

  function handleCrop() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], 'profile.jpg', { type: 'image/jpeg' });
          onCrop(file);
        }
      },
      'image/jpeg',
      0.9
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.9)',
        zIndex: 400,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          background: '#111',
          borderRadius: '16px',
          padding: '16px',
          maxWidth: '95vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <p style={{ color: 'white', fontWeight: 600, marginBottom: '14px' }}>
          Move and zoom to fit the square
        </p>

        <div
          ref={containerRef}
          style={{
            width: CROP_SIZE,
            height: CROP_SIZE,
            touchAction: 'none',
            cursor: dragging ? 'grabbing' : 'grab',
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '4px',
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={handleWheel}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              zIndex: 2,
            }}
          >
            {/* Dark overlay */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
                borderRadius: '4px',
              }}
            />

            {/* Grid */}
            <svg width={CROP_SIZE} height={CROP_SIZE} style={{ position: 'absolute', inset: 0 }}>
              <defs>
                <pattern id="crop-grid" width="33.33%" height="33.33%" patternUnits="userSpaceOnUse">
                  <path d="M 0 0 L 0 107 L 107 0" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#crop-grid)" />
            </svg>

            {/* Border */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                border: '2px solid rgba(255,255,255,0.9)',
                borderRadius: '4px',
              }}
            />

            {/* Corner indicators */}
            <div style={{ position: 'absolute', top: -2, left: -2, width: 22, height: 22, borderTop: '4px solid white', borderLeft: '4px solid white' }} />
            <div style={{ position: 'absolute', top: -2, right: -2, width: 22, height: 22, borderTop: '4px solid white', borderRight: '4px solid white' }} />
            <div style={{ position: 'absolute', bottom: -2, left: -2, width: 22, height: 22, borderBottom: '4px solid white', borderLeft: '4px solid white' }} />
            <div style={{ position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderBottom: '4px solid white', borderRight: '4px solid white' }} />
          </div>

          <canvas
            ref={canvasRef}
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '18px' }}>
          <button
            onClick={onCancel}
            style={{
              background: 'transparent',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '999px',
              padding: '10px 20px',
              fontWeight: 600,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleCrop}
            style={{
              background: '#1a472a',
              color: 'white',
              border: 'none',
              borderRadius: '999px',
              padding: '10px 24px',
              fontWeight: 700,
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}