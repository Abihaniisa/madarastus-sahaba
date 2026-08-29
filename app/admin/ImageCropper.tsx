'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  src: string;
  onCancel: () => void;
  onCrop: (file: File) => void;
}

const HANDLE_SIZE = 28;
const MIN_SELECTION = 60;

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function ImageCropper({ src, onCancel, onCrop }: Props) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [imgLoaded, setImgLoaded] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [viewSize, setViewSize] = useState({ width: 0, height: 0 });
  const [selection, setSelection] = useState<Rect>({ x: 0, y: 0, width: 200, height: 200 });

  const dragRef = useRef<{
    type: 'move' | 'resize';
    startX: number;
    startY: number;
    startSelection: Rect;
    handle?: string;
  } | null>(null);

  const pinchRef = useRef<{
    dist: number;
    startScale: number;
  } | null>(null);

  const [viewScale, setViewScale] = useState(1);

  useEffect(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      imgRef.current = img;
      setNaturalSize({ width: img.width, height: img.height });

      const maxW = Math.min(360, window.innerWidth - 40);
      const maxH = Math.min(440, window.innerHeight - 160);
      const ratio = Math.min(maxW / img.width, maxH / img.height, 1);
      const dispW = Math.round(img.width * ratio);
      const dispH = Math.round(img.height * ratio);

      setViewSize({ width: dispW, height: dispH });
      setViewScale(ratio);

      const side = Math.min(dispW, dispH, 260);
      const x = Math.round((dispW - side) / 2);
      const y = Math.round((dispH - side) / 2);
      setSelection({ x, y, width: side, height: side });
      setImgLoaded(true);
    };

    return () => {
      img.onload = null;
    };
  }, [src]);

  function clampRect(rect: Rect): Rect {
    const maxW = viewSize.width;
    const maxH = viewSize.height;
    let { x, y, width, height } = rect;

    width = Math.max(MIN_SELECTION, Math.min(width, maxW));
    height = Math.max(MIN_SELECTION, Math.min(height, maxH));
    x = Math.max(0, Math.min(x, maxW - width));
    y = Math.max(0, Math.min(y, maxH - height));

    return { x, y, width, height };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>, type: 'move' | 'resize', handle?: string) {
    e.preventDefault();
    e.stopPropagation();

    if (e.pointerType === 'touch') {
      const touches = (e.nativeEvent as any).touches;
      if (touches && touches.length === 2) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        pinchRef.current = { dist: Math.hypot(dx, dy), startScale: viewScale };
        return;
      }
    }

    dragRef.current = {
      type,
      startX: e.clientX,
      startY: e.clientY,
      startSelection: { ...selection },
      handle,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === 'touch') {
      const touches = (e.nativeEvent as any).touches;
      if (touches && touches.length === 2 && pinchRef.current) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        const ratio = dist / pinchRef.current.dist;
        const newScale = Math.min(Math.max(pinchRef.current.startScale * ratio, 0.2), 3);
        setViewScale(newScale);
        return;
      }
    }

    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const start = dragRef.current.startSelection;

    if (dragRef.current.type === 'move') {
      setSelection(clampRect({
        x: start.x + dx,
        y: start.y + dy,
        width: start.width,
        height: start.height,
      }));
    } else {
      const h = dragRef.current.handle;
      let { x, y, width, height } = start;

      if (h?.includes('e')) width = start.width + dx;
      if (h?.includes('s')) height = start.height + dy;
      if (h?.includes('w')) {
        width = start.width - dx;
        x = start.x + dx;
      }
      if (h?.includes('n')) {
        height = start.height - dy;
        y = start.y + dy;
      }

      setSelection(clampRect({ x, y, width, height }));
    }
  }

  function handlePointerUp(e: React.PointerEvent) {
    pinchRef.current = null;
    dragRef.current = null;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  }

  function handleCrop() {
    if (!imgRef.current || !canvasRef.current) return;

    const scaleX = naturalSize.width / viewSize.width;
    const scaleY = naturalSize.height / viewSize.height;

    const sx = Math.round(selection.x * scaleX / viewScale);
    const sy = Math.round(selection.y * scaleY / viewScale);
    const sw = Math.round(selection.width * scaleX / viewScale);
    const sh = Math.round(selection.height * scaleY / viewScale);

    const canvas = canvasRef.current;
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(imgRef.current, sx, sy, sw, sh, 0, 0, sw, sh);
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'cropped-profile.jpg', { type: 'image/jpeg' });
        onCrop(file);
      }
    }, 'image/jpeg', 0.92);
  }

  if (!imgLoaded) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'white' }}>Loading...</p>
      </div>
    );
  }

  const handles = [
    { name: 'n', left: selection.width / 2 - HANDLE_SIZE / 2, top: -HANDLE_SIZE / 2, cursor: 'ns-resize' },
    { name: 's', left: selection.width / 2 - HANDLE_SIZE / 2, top: selection.height - HANDLE_SIZE / 2, cursor: 'ns-resize' },
    { name: 'w', left: -HANDLE_SIZE / 2, top: selection.height / 2 - HANDLE_SIZE / 2, cursor: 'ew-resize' },
    { name: 'e', left: selection.width - HANDLE_SIZE / 2, top: selection.height / 2 - HANDLE_SIZE / 2, cursor: 'ew-resize' },
    { name: 'nw', left: -HANDLE_SIZE / 2, top: -HANDLE_SIZE / 2, cursor: 'nwse-resize' },
    { name: 'ne', left: selection.width - HANDLE_SIZE / 2, top: -HANDLE_SIZE / 2, cursor: 'nesw-resize' },
    { name: 'sw', left: -HANDLE_SIZE / 2, top: selection.height - HANDLE_SIZE / 2, cursor: 'nesw-resize' },
    { name: 'se', left: selection.width - HANDLE_SIZE / 2, top: selection.height - HANDLE_SIZE / 2, cursor: 'nwse-resize' },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: '#111', borderRadius: '16px', padding: '16px', maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <p style={{ color: 'white', fontWeight: 600, marginBottom: '14px' }}>Drag the box or its handles to select the photo</p>

        <div
          ref={containerRef}
          style={{
            position: 'relative',
            width: viewSize.width,
            height: viewSize.height,
            touchAction: 'none',
            userSelect: 'none',
            overflow: 'hidden',
            borderRadius: '8px',
            background: '#000',
          }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <img
            src={src}
            alt=""
            style={{
              width: viewSize.width * viewScale,
              height: viewSize.height * viewScale,
              pointerEvents: 'none',
              display: 'block',
              objectFit: 'contain',
              transform: 'none',
            }}
            draggable={false}
          />

          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', inset: 0, boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)', borderRadius: '4px' }} />
          </div>

          <div
            onPointerDown={(e) => handlePointerDown(e, 'move')}
            style={{
              position: 'absolute',
              left: selection.x,
              top: selection.y,
              width: selection.width,
              height: selection.height,
              border: '2px solid white',
              cursor: 'move',
              touchAction: 'none',
              boxSizing: 'border-box',
            }}
          >
            <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
              <defs>
                <pattern id="crop-grid" width="33.33%" height="33.33%" patternUnits="userSpaceOnUse">
                  <path d="M 0 0 L 0 107 L 107 0" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#crop-grid)" />
            </svg>

            {handles.map((h) => (
              <div
                key={h.name}
                onPointerDown={(e) => handlePointerDown(e, 'resize', h.name)}
                style={{
                  position: 'absolute',
                  left: h.left,
                  top: h.top,
                  width: HANDLE_SIZE,
                  height: HANDLE_SIZE,
                  background: 'white',
                  border: '2px solid #1a472a',
                  borderRadius: '6px',
                  cursor: h.cursor,
                  touchAction: 'none',
                  zIndex: 3,
                  boxSizing: 'border-box',
                }}
              />
            ))}
          </div>
        </div>

        <canvas ref={canvasRef} style={{ display: 'none' }} />

        <div style={{ display: 'flex', gap: '12px', marginTop: '18px' }}>
          <button onClick={onCancel} style={{ background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '999px', padding: '10px 20px', fontWeight: 600 }}>
            Cancel
          </button>
          <button onClick={handleCrop} style={{ background: '#1a472a', color: 'white', border: 'none', borderRadius: '999px', padding: '10px 24px', fontWeight: 700 }}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}