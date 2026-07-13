'use client';

import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';

export interface CanvasPinData {
  id: string;
  url: string;
  title?: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CanvasPinProps {
  pin: CanvasPinData;
  scale: number;

  onMove: (id: string, x: number, y: number) => void;

  onMoveEnd: (id: string, x: number, y: number) => void;
  onOpen?: (id: string) => void;
  onRemove?: (id: string) => void;
}

export function CanvasPin({ pin, scale, onMove, onMoveEnd, onOpen, onRemove }: CanvasPinProps) {
  const dragStart = useRef({ x: pin.x, y: pin.y });

  return (
    <motion.div
      drag
      dragMomentum={false}
      onDragStart={() => { dragStart.current = { x: pin.x, y: pin.y }; }}
      onDrag={(_, info) => {
        onMove(pin.id, dragStart.current.x + info.offset.x / scale, dragStart.current.y + info.offset.y / scale);
      }}
      onDragEnd={(_, info) => {
        onMoveEnd(pin.id, dragStart.current.x + info.offset.x / scale, dragStart.current.y + info.offset.y / scale);
      }}
      style={{
        position: 'absolute',
        left: pin.x,
        top: pin.y,
        width: pin.width,
        height: pin.height,
        borderRadius: 10,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.1)',
        background: '#0a0a0a',
        cursor: 'grab',
        boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
        userSelect: 'none',
      }}
      whileDrag={{ cursor: 'grabbing', boxShadow: '0 16px 50px rgba(0,0,0,0.7)', zIndex: 50 }}
      onDoubleClick={() => onOpen?.(pin.id)}
    >
      <Image
        src={pin.url}
        alt={pin.title || ''}
        fill
        draggable={false}
        style={{ objectFit: 'cover', pointerEvents: 'none' }}
      />
      {pin.title && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '6px 8px', background: 'linear-gradient(transparent, rgba(0,0,0,0.85))', fontFamily: 'var(--mono)', fontSize: 10, color: '#fff', pointerEvents: 'none' }}>
          {pin.title}
        </div>
      )}
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(pin.id); }}
          title="Remove"
          style={{ position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 12, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          ✕
        </button>
      )}
    </motion.div>
  );
}
