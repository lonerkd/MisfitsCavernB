'use client';

import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { gutterLabel, type GutterItem } from '@/lib/film/gutter';
import { usePhoneLayout } from '@/lib/os/usePhone';

/** Narrower than this the script has no left margin to spare; the scene card carries it instead.
 *  A phone never has the margin, at any width: a landscape phone's layer passes this gate while its
 *  text inset is still a phone inset, and the labels landed on the script (owner's shots, Nov 26, 2026).
 *  On a phone the write view trades the margin read for a clean page — shoot days live in the Studio's
 *  scenes and breakdown, where they are canonical. */
const MIN_WIDTH = 720;

/**
 * When in the story each scene is, and its shoot day, in the script's left
 * margin beside the heading. Read only: it doesn't take clicks or the caret.
 * Sits above the textarea and follows its scroll; positions come from the
 * highlight layer, which lays the lines out identically (as CutNoteMarkers).
 */
export function SceneGutter({ items, highlightRef, textareaRef, content }: {
  items: GutterItem[];
  highlightRef: React.RefObject<HTMLDivElement | null>;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  content: string;
}) {
  const [tops, setTops] = useState<Map<number, number>>(new Map());
  const [scroll, setScroll] = useState(0);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const phone = usePhoneLayout().phone;

  const measure = useCallback(() => {
    const layer = highlightRef.current;
    if (!layer) return;
    const next = new Map<number, number>();
    for (const it of items) {
      const el = layer.children[it.line] as HTMLElement | undefined;
      if (el) next.set(it.line, el.offsetTop);
    }
    setTops(next);
    setSize({ width: layer.clientWidth, height: layer.clientHeight });
  }, [items, highlightRef]);

  useLayoutEffect(() => { measure(); }, [measure, content]);
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

  if (!items.length || phone || (size.width && size.width < MIN_WIDTH)) return null;
  return (
    <div aria-label="Story time, shoot day and cost by scene" role="group" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 5 }}>
      {items.map((it) => {
        const top = (tops.get(it.line) ?? -1000) - scroll;
        if (top < -60 || (size.height && top > size.height)) return null;
        return (
          <div key={it.line} role="note" aria-label={gutterLabel(it)}
            style={{
              position: 'absolute', left: 4, top: top + 2, width: 48, textAlign: 'right',
              fontFamily: 'var(--ui, inherit)', fontSize: 'max(11px, var(--mc-min-font, 0px))', lineHeight: 1.3, color: 'var(--fg-muted)',
              fontStyle: it.guessed ? 'italic' : 'normal', fontVariantNumeric: 'tabular-nums',
            }}>
            {it.day != null && <div>Day {it.day}</div>}
            {it.time && <div>{it.time}</div>}
            {it.shoot != null && <div style={{ fontStyle: 'normal', color: 'var(--fg-dim)' }}>Shoot {it.shoot}</div>}
            {it.cost != null && <div style={{ fontStyle: 'normal', color: 'var(--fg-dim)' }}>${Math.round(it.cost).toLocaleString('en-US')}</div>}
          </div>
        );
      })}
    </div>
  );
}
