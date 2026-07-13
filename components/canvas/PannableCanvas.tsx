'use client';

import React, { useCallback, useRef, useState } from 'react';

const MIN_SCALE = 0.25;
const MAX_SCALE = 3;

export interface PannableCanvasHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
}

interface PannableCanvasProps {
  children: React.ReactNode;
  className?: string;

  onScaleChange?: (scale: number) => void;
}

export const PannableCanvas = React.forwardRef<PannableCanvasHandle, PannableCanvasProps>(
  ({ children, className, onScaleChange }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
    const panState = useRef<{ dragging: boolean; startX: number; startY: number; originX: number; originY: number }>({
      dragging: false, startX: 0, startY: 0, originX: 0, originY: 0,
    });

    const applyScale = useCallback((nextScale: number, pivotX?: number, pivotY?: number) => {
      setTransform(prev => {
        const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale));
        if (pivotX === undefined || pivotY === undefined) {
          onScaleChange?.(scale);
          return { ...prev, scale };
        }

        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return { ...prev, scale };
        const px = pivotX - rect.left;
        const py = pivotY - rect.top;
        const worldX = (px - prev.x) / prev.scale;
        const worldY = (py - prev.y) / prev.scale;
        const x = px - worldX * scale;
        const y = py - worldY * scale;
        onScaleChange?.(scale);
        return { x, y, scale };
      });
    }, [onScaleChange]);

    React.useImperativeHandle(ref, () => ({
      zoomIn: () => applyScale(transform.scale * 1.2),
      zoomOut: () => applyScale(transform.scale / 1.2),
      resetView: () => setTransform({ x: 0, y: 0, scale: 1 }),
    }), [applyScale, transform.scale]);

    const handleWheel = useCallback((e: React.WheelEvent) => {
      e.preventDefault();

      const zoomFactor = e.ctrlKey ? 1 - e.deltaY * 0.01 : 1 - e.deltaY * 0.001;
      applyScale(transform.scale * zoomFactor, e.clientX, e.clientY);
    }, [applyScale, transform.scale]);

    const handlePointerDown = useCallback((e: React.PointerEvent) => {

      if (e.target !== e.currentTarget) return;
      panState.current = { dragging: true, startX: e.clientX, startY: e.clientY, originX: transform.x, originY: transform.y };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }, [transform.x, transform.y]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
      if (!panState.current.dragging) return;
      const dx = e.clientX - panState.current.startX;
      const dy = e.clientY - panState.current.startY;
      setTransform(prev => ({ ...prev, x: panState.current.originX + dx, y: panState.current.originY + dy }));
    }, []);

    const handlePointerUp = useCallback(() => { panState.current.dragging = false; }, []);

    return (
      <div
        ref={containerRef}
        className={className}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{
          position: 'relative',
          overflow: 'hidden',
          width: '100%',
          height: '100%',
          cursor: panState.current.dragging ? 'grabbing' : 'grab',
          touchAction: 'none',
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: `${24 * transform.scale}px ${24 * transform.scale}px`,
          backgroundPosition: `${transform.x}px ${transform.y}px`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: '0 0',
          }}
        >
          {children}
        </div>
      </div>
    );
  }
);

PannableCanvas.displayName = 'PannableCanvas';
