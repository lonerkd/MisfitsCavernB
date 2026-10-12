'use client';

import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { cueCardLabel, type CueCard } from '@/lib/film/cue';

const MIN_WIDTH = 720;

/**
 * What the film knows about the character whose cue the caret is on, in the
 * script's right margin beside that line: who plays them, their look in this
 * scene, how much they speak. Read only (no clicks, no caret). Positions come
 * from the highlight layer, as for the gutter and the cut-note markers.
 */
export function CueCardOverlay({ card, line, highlightRef, textareaRef, content }: {
  card: CueCard | null;
  line: number;
  highlightRef: React.RefObject<HTMLDivElement | null>;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  content: string;
}) {
  const [top, setTop] = useState<number | null>(null);
  const [scroll, setScroll] = useState(0);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const measure = useCallback(() => {
    const layer = highlightRef.current;
    if (!layer) return;
    const el = layer.children[line] as HTMLElement | undefined;
    setTop(el ? el.offsetTop : null);
    setSize({ width: layer.clientWidth, height: layer.clientHeight });
  }, [highlightRef, line]);

  useLayoutEffect(() => { measure(); }, [measure, content, card]);
  useEffect(() => {
    const ta = textareaRef.current;
    const layer = highlightRef.current;
    if (!ta || !layer) return;
    const onScroll = () => setScroll(ta.scrollTop);
    onScroll();
    ta.addEventListener('scroll', onScroll, { passive: true });
    const ro = new ResizeObserver(() => measure());
    ro.observe(layer);
    return () => { ta.removeEventListener('scroll', onScroll); ro.disconnect(); };
  }, [textareaRef, highlightRef, measure]);

  if (!card || top == null || (size.width && size.width < MIN_WIDTH)) return null;
  const y = top - scroll;
  if (y < -60 || (size.height && y > size.height)) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 5 }}>
      <div role="note" aria-label={cueCardLabel(card)}
        style={{
          position: 'absolute', right: 10, top: y - 4, width: 190, padding: '8px 10px', borderRadius: 8,
          background: 'var(--surface)', border: '1px solid rgba(var(--ink-rgb), 0.12)', boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
          fontFamily: 'var(--ui, inherit)', fontSize: 'max(11px, var(--mc-min-font, 0px))', lineHeight: 1.4, color: 'var(--fg-muted)',
        }}>
        <div style={{ color: 'var(--fg)', fontWeight: 600 }}>{card.name}</div>
        <div>{card.actor ? `Played by ${card.actor}` : 'Not cast yet'}</div>
        <div>{card.look ? `Look: ${card.look}` : 'No look for this scene'}</div>
        {(card.speeches != null || card.scenes != null) && (
          <div style={{ color: 'var(--fg-dim)' }}>
            {[card.speeches != null ? `${card.speeches} ${card.speeches === 1 ? 'speech' : 'speeches'}` : '', card.scenes != null ? `${card.scenes} ${card.scenes === 1 ? 'scene' : 'scenes'}` : ''].filter(Boolean).join(' · ')}
          </div>
        )}
      </div>
    </div>
  );
}
