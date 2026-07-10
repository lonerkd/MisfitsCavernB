'use client';

import { useEffect, useRef, useState } from 'react';

// Context the cursor can adapt to. Each maps to a distinct visual treatment so
// the pointer tells you what a target does before you click it.
type CursorMode = 'default' | 'action' | 'text' | 'grab' | 'view' | 'disabled' | 'help';

export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [clicking, setClicking] = useState(false);
  const [mode, setMode] = useState<CursorMode>('default');
  const [enabled, setEnabled] = useState(false);

  // Only run the custom cursor on real fine-pointer devices (mouse/trackpad),
  // and honour the user's preference toggled from Settings. On touch we leave
  // the native cursor alone entirely.
  // Apply the reduce-motion preference (or the OS setting) app-wide on load.
  useEffect(() => {
    const osReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let pref: string | null = null;
    try { pref = localStorage.getItem('mc_reduce_motion'); } catch {}
    const reduce = pref === 'on' || (pref == null && osReduced);
    document.body.classList.toggle('reduce-motion', reduce);
  }, []);

  useEffect(() => {
    const updateTheme = () => {
      try {
        const theme = localStorage.getItem('mc_theme') || 'default';
        // Convert classList to array to safely remove during iteration
        const classesToRemove = Array.from(document.body.classList).filter(cls => cls.startsWith('theme-'));
        classesToRemove.forEach(cls => document.body.classList.remove(cls));
        if (theme !== 'default') {
          document.body.classList.add(`theme-${theme}`);
        }
      } catch {}
    };
    updateTheme();
    window.addEventListener('mc-theme-change', updateTheme);
    return () => window.removeEventListener('mc-theme-change', updateTheme);
  }, []);

  useEffect(() => {
    const evaluate = () => {
      const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
      const pref = (() => { try { return localStorage.getItem('mc_custom_cursor'); } catch { return null; } })();
      const on = finePointer && pref !== 'off';
      setEnabled(on);
      document.body.classList.toggle('custom-cursor-active', on);
    };
    evaluate();
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    mq.addEventListener?.('change', evaluate);
    window.addEventListener('mc-cursor-pref-change', evaluate);
    return () => {
      mq.removeEventListener?.('change', evaluate);
      window.removeEventListener('mc-cursor-pref-change', evaluate);
      document.body.classList.remove('custom-cursor-active');
    };
  }, []);

  // Resolve which mode an element under the pointer should trigger.
  const resolveMode = (el: HTMLElement | null): CursorMode => {
    if (!el) return 'default';
    
    // Explicit data attribute overrides
    const explicit = el.closest('[data-cursor]') as HTMLElement | null;
    if (explicit) {
      const val = explicit.dataset.cursor as CursorMode;
      if (val) return val;
    }

    // Computed style check (automatic fallback)
    try {
      const style = window.getComputedStyle(el);
      if (style.cursor === 'pointer') {
        if (el.closest('[disabled], [aria-disabled="true"]')) return 'disabled';
        return 'action';
      }
      if (style.cursor === 'text') return 'text';
      if (style.cursor === 'grab' || style.cursor === 'grabbing') return 'grab';
      if (style.cursor === 'help') return 'help';
      if (style.cursor === 'not-allowed') return 'disabled';
    } catch {}

    if (el.closest('[draggable="true"]')) {
      if (el.closest('[disabled], [aria-disabled="true"]')) return 'disabled';
      return 'grab';
    }
    if (el.closest('input:not([type="button"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"]')) return 'text';
    
    const actionable = el.closest('a, button, [role="button"], [role="link"], select, label[for], [data-cursor-hover]');
    if (actionable) {
      if (actionable.matches('[disabled], [aria-disabled="true"]') || actionable.closest('[disabled], [aria-disabled="true"]')) return 'disabled';
      return 'action';
    }
    if (el.closest('img, video')) return 'view';
    
    return 'default';
  };

  useEffect(() => {
    if (!enabled) return;
    let raf: number;
    let mx = 0, my = 0;
    let rx = 0, ry = 0;

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (!visible) setVisible(true);
      setMode(prev => { const next = resolveMode(e.target as HTMLElement); return next === prev ? prev : next; });
    };
    const onLeave = () => setVisible(false);
    const onEnter = () => setVisible(true);
    const onDown = () => setClicking(true);
    const onUp = () => setClicking(false);

    const tick = () => {
      rx += (mx - rx) * 0.28;
      ry += (my - ry) * 0.28;

      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%) ${clicking ? 'scale(0.6)' : 'scale(1)'}`;
      }
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%) ${clicking ? 'scale(0.82)' : 'scale(1)'}`;
      }
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener('mousemove', onMove);
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('mouseenter', onEnter);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);

    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('mouseenter', onEnter);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      cancelAnimationFrame(raf);
    };
  }, [visible, enabled, clicking]);

  if (!enabled) return null;

  const accent = 'var(--accent)';

  // Dot: an I-beam bar in text mode, a solid dot otherwise.
  const isText = mode === 'text';
  const dotColor = mode === 'action' || mode === 'grab' ? accent : mode === 'disabled' ? '#ff5c5c' : 'var(--fg)';

  // Ring geometry + treatment per mode.
  const ring = (() => {
    switch (mode) {
      case 'action': return { size: 48, border: `1px solid ${accent}`, radius: '50%', bg: 'rgba(255,255,255,0.08)', backdrop: 'blur(2px)' };
      case 'grab': return { size: 36, border: `2px solid ${accent}`, radius: '8px', bg: 'rgba(255,255,255,0.15)', backdrop: 'blur(4px)' };
      case 'view': return { size: 60, border: '1px solid rgba(255,255,255,0.4)', radius: '50%', bg: 'rgba(0,0,0,0.2)', backdrop: 'blur(4px)' };
      case 'help': return { size: 42, border: `1.5px dotted ${accent}`, radius: '50%', bg: 'rgba(255,255,255,0.05)', backdrop: 'none' };
      case 'disabled': return { size: 30, border: '1.5px solid #ff5c5c', radius: '50%', bg: 'rgba(255, 92, 92, 0.1)', backdrop: 'none' };
      case 'text': return { size: 0, border: '1px solid transparent', radius: '50%', bg: 'transparent', backdrop: 'none' };
      default: return { size: clicking ? 24 : 34, border: '1.5px solid rgba(255,255,255,0.3)', radius: '50%', bg: clicking ? 'rgba(255,255,255,0.1)' : 'transparent', backdrop: 'none' };
    }
  })();

  const label = mode === 'grab' ? 'DRAG' : mode === 'view' ? 'VIEW' : mode === 'help' ? '?' : '';

  return (
    <>
      {/* Fast dot / I-beam */}
      <div
        ref={dotRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: isText ? 2 : clicking ? 6 : 8,
          height: isText ? 20 : clicking ? 6 : 8,
          borderRadius: isText ? 1 : '50%',
          background: dotColor,
          pointerEvents: 'none',
          zIndex: 99999,
          mixBlendMode: isText ? 'normal' : 'difference',
          opacity: visible ? 1 : 0,
          transition: 'width 0.15s cubic-bezier(0.16, 1, 0.3, 1), height 0.15s cubic-bezier(0.16, 1, 0.3, 1), background 0.2s, border-radius 0.15s, opacity 0.3s',
          willChange: 'transform, width, height',
        }}
      />
      {/* Lagging ring */}
      <div
        ref={ringRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: ring.size,
          height: ring.size,
          borderRadius: ring.radius,
          border: ring.border,
          background: ring.bg,
          backdropFilter: ring.backdrop,
          WebkitBackdropFilter: ring.backdrop,
          pointerEvents: 'none',
          zIndex: 99998,
          mixBlendMode: 'difference',
          opacity: visible && ring.size > 0 ? 1 : 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'width 0.25s cubic-bezier(0.16, 1, 0.3, 1), height 0.25s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s, border-radius 0.2s, background 0.2s, opacity 0.3s',
          willChange: 'transform, width, height',
        }}
      >
        {label && (
          <span style={{ fontSize: 7.5, letterSpacing: 1.5, fontWeight: 700, color: mode === 'grab' ? accent : 'rgba(224, 221, 174,0.7)', fontFamily: 'var(--mono, monospace)', pointerEvents: 'none' }}>{label}</span>
        )}
      </div>
    </>
  );
}
