'use client';

// A board presented full screen, one card at a time: the Studio's board and the shared board page both use it (it only
// takes slides, so it can show nothing the page did not already have). Keyboard: left / right move, Space starts and
// stops the auto-advance, Esc closes. Swipe moves on a phone. Focus stays inside and goes back to what opened it.
// Motion: nothing animates and nothing advances by itself unless the person turns it on.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, ExternalLink, Pause, Play, X } from 'lucide-react';
import { AUTO_SECONDS, stepSlide, type Slide } from '@/lib/studio/board-slides';
import c from './slideshow.module.css';

interface Props { name: string; slides: Slide[]; startIndex?: number; onClose: () => void }

const FOCUSABLE = 'button, a[href], select, input, [tabindex]:not([tabindex="-1"])';

export default function BoardSlideshow({ name, slides, startIndex = 0, onClose }: Props) {
  const [index, setIndex] = useState(() => Math.min(Math.max(startIndex, 0), Math.max(0, slides.length - 1)));
  const [playing, setPlaying] = useState(false);
  const [seconds, setSeconds] = useState<number>(AUTO_SECONDS[1]);
  const rootRef = useRef<HTMLDivElement>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const count = slides.length;
  const slide = slides[index];

  const go = useCallback((dir: 1 | -1) => setIndex((i) => stepSlide(i, count, dir)), [count]);

  // Focus in on open, back to the opener on close; the page behind does not scroll.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    rootRef.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      if (opener && opener.isConnected) opener.focus();
    };
  }, []);

  // Auto-advance: stops by itself on the last slide.
  useEffect(() => {
    if (!playing || index >= count - 1) return;
    const t = window.setTimeout(() => {
      const next = stepSlide(index, count, 1);
      setIndex(next);
      if (next >= count - 1) setPlaying(false);
    }, seconds * 1000);
    return () => window.clearTimeout(t);
  }, [playing, index, count, seconds]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); return; }
    if (e.key === 'Tab') {
      const items = Array.from(rootRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter((el) => !el.hasAttribute('disabled'));
      if (!items.length) { e.preventDefault(); return; }
      const first = items[0], last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === rootRef.current)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (e.target as HTMLElement).tagName;
    if (e.key === 'ArrowRight' && tag !== 'SELECT') { e.preventDefault(); go(1); }
    else if (e.key === 'ArrowLeft' && tag !== 'SELECT') { e.preventDefault(); go(-1); }
    else if (e.key === ' ' && !/^(BUTTON|SELECT|A|INPUT)$/.test(tag)) { e.preventDefault(); setPlaying((p) => !p); }
  };

  const onTouchStart = (e: React.TouchEvent) => { const t = e.touches[0]; swipe.current = { x: t.clientX, y: t.clientY }; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = swipe.current; swipe.current = null;
    const t = e.changedTouches[0];
    if (!start || !t) return;
    const dx = t.clientX - start.x, dy = t.clientY - start.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
  };

  if (!slide) return null;

  const announce = `${index + 1} of ${count}: ${slide.kind === 'note' ? `note, ${slide.text ?? ''}` : slide.title}`;

  // On the page itself, not inside the Studio: nothing the page draws (a transformed panel, the island) can sit above it.
  return createPortal(
    <div ref={rootRef} className={c.root} role="dialog" aria-modal="true" aria-label={`Slideshow: ${name}`} tabIndex={-1}
      onKeyDown={onKeyDown} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announce}</div>

      <header className={c.top}>
        <p className={c.name}>{name}</p>
        <p className={c.count} aria-hidden>{index + 1} of {count}</p>
        <button type="button" className={c.iconBtn} onClick={onClose} aria-label="Close slideshow"><X size={18} aria-hidden /></button>
      </header>

      <div className={c.stage}>
        <div key={slide.id} className={c.slide} data-kind={slide.kind} data-testid="slide">
          {slide.kind === 'image' && slide.src && (
            // eslint-disable-next-line @next/next/no-img-element -- a signed storage URL or an image from any host
            <img className={c.image} src={slide.src} alt={slide.title} referrerPolicy="no-referrer" draggable={false} />
          )}
          {slide.kind === 'note' && <p className={c.note}>{slide.text}</p>}
          {slide.kind === 'link' && (
            <div className={c.item}>
              <p className={c.label}>{slide.label}</p>
              <p className={c.itemTitle}>{slide.title}</p>
              {slide.href && (
                <a className={c.open} href={slide.href} target="_blank" rel="noopener noreferrer nofollow">
                  Open <ExternalLink size={14} aria-hidden /><span className="sr-only"> {slide.title} in a new tab</span>
                </a>
              )}
            </div>
          )}
          {slide.kind !== 'note' && slide.caption && <p className={c.caption}>{slide.caption}</p>}
          {slide.kind === 'image' && <p className={c.caption}>{slide.title}</p>}
        </div>
      </div>

      <div className={c.bar} role="group" aria-label="Slideshow controls">
        <button type="button" className={c.iconBtn} onClick={() => go(-1)} disabled={index === 0} aria-label="Previous"><ChevronLeft size={20} aria-hidden /></button>
        <button type="button" className={c.pill} onClick={() => setPlaying((p) => !p)} aria-pressed={playing}>
          {playing ? <Pause size={14} aria-hidden /> : <Play size={14} aria-hidden />} {playing ? 'Pause' : 'Play'}
        </button>
        <label className={c.secs}>
          <span className="sr-only">Seconds per item</span>
          <select value={seconds} onChange={(e) => setSeconds(Number(e.target.value))} aria-label="Seconds per item">
            {AUTO_SECONDS.map((n) => <option key={n} value={n}>{n} s</option>)}
          </select>
        </label>
        <button type="button" className={c.iconBtn} onClick={() => go(1)} disabled={index >= count - 1} aria-label="Next"><ChevronRight size={20} aria-hidden /></button>
      </div>
      <div className={c.progress} aria-hidden><span style={{ width: `${((index + 1) / count) * 100}%` }} /></div>
    </div>,
    document.body,
  );
}
