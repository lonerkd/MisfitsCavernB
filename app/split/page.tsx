'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeftRight, ChevronDown, Columns2, Link2, Link2Off, Maximize2, Rows2, X } from 'lucide-react';
import {
  DEFAULT_LAYOUT, SURFACES, clampRatio, isSplitMessage, layoutFromSearch, layoutToSearch, surfaceOf,
  type SplitLayout, type Surface,
} from '@/lib/split/core';
import { useHydrated } from '@/lib/hooks/useSearchParam';
import { useMediaQuery } from '@/lib/hooks/useMediaQuery';
import s from './split.module.css';

type Side = 'a' | 'b';
const STORE_KEY = 'mc_split_layout';
const NARROW = '(max-width: 760px)';

/**
 * Two surfaces of the suite side by side — the script beside the Studio, the
 * breakdown beside the schedule, anything beside anything. Each pane is the
 * real page; linked panes follow each other (the script's caret brings the
 * Studio to that scene, and "Open in script" in the Studio moves the script).
 */
export default function SplitPage() {
  // The layout comes from the address or this device's memory, so the split
  // itself only renders in the browser.
  return useHydrated() ? <Split /> : <div className={s.page} aria-busy="true" />;
}

/** First load: the URL wins; else the last split on this device. */
function initialLayout(): SplitLayout {
  let stored: SplitLayout = DEFAULT_LAYOUT;
  try { const raw = localStorage.getItem(STORE_KEY); if (raw) stored = layoutFromSearch(raw); } catch { /* blocked */ }
  return window.location.search ? layoutFromSearch(window.location.search, stored) : stored;
}

function Split() {
  const [first] = useState(initialLayout);
  const [layout, setLayout] = useState<SplitLayout | null>(first);
  // What each frame was pointed at (changing it navigates the frame) and where it is now.
  const [src, setSrc] = useState<Record<Side, string>>({ a: first.a, b: first.b });
  const [here, setHere] = useState<Record<Side, { href: string; title: string }>>({ a: { href: first.a, title: '' }, b: { href: first.b, title: '' } });
  const [dragging, setDragging] = useState(false);
  const narrow = useMediaQuery(NARROW);
  const [pulse, setPulse] = useState<Side | null>(null);
  const frames = { a: useRef<HTMLIFrameElement>(null), b: useRef<HTMLIFrameElement>(null) };
  const wrapRef = useRef<HTMLDivElement>(null);


  // Keep the URL and this device's memory in step with the panes.
  useEffect(() => {
    if (!layout) return;
    const search = layoutToSearch({ ...layout, a: here.a.href, b: here.b.href });
    window.history.replaceState(null, '', `/split${search}`);
    try { localStorage.setItem(STORE_KEY, search); } catch { /* blocked */ }
  }, [layout, here]);

  // Relay between panes. Only same-origin messages from our own two frames.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || !isSplitMessage(e.data)) return;
      const from: Side | null = e.source === frames.a.current?.contentWindow ? 'a' : e.source === frames.b.current?.contentWindow ? 'b' : null;
      if (!from) return;
      const msg = e.data;
      if (msg.type === 'navigated') {
        setHere((h) => (h[from].href === msg.href && h[from].title === msg.title ? h : { ...h, [from]: { href: msg.href, title: msg.title } }));
        return;
      }
      if (!layout?.linked) return;
      const to: Side = from === 'a' ? 'b' : 'a';
      frames[to].current?.contentWindow?.postMessage(msg, window.location.origin);
      setPulse(to);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
    // frames are refs; layout.linked is what matters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout?.linked]);

  useEffect(() => {
    if (!pulse) return;
    const t = setTimeout(() => setPulse(null), 700);
    return () => clearTimeout(t);
  }, [pulse]);

  const update = useCallback((patch: Partial<SplitLayout>) => setLayout((l) => (l ? { ...l, ...patch } : l)), []);

  const ratioAt = (clientX: number, clientY: number) => {
    const box = wrapRef.current?.getBoundingClientRect();
    if (!box || !layout) return 0.5;
    const column = layout.orientation === 'column' || narrow;
    return clampRatio(column ? (clientY - box.top) / box.height : (clientX - box.left) / box.width);
  };

  if (!layout) return <div className={s.page} aria-busy="true" />;

  const column = layout.orientation === 'column' || narrow;
  const open = (side: Side, href: string) => {
    if (href === here[side].href) return;
    setSrc((v) => ({ ...v, [side]: href }));
    setHere((h) => ({ ...h, [side]: { href, title: '' } }));
  };
  const swap = () => {
    setSrc({ a: here.b.href, b: here.a.href });
    setHere({ a: here.b, b: here.a });
  };
  const full = (side: Side) => { window.location.assign(here[side].href); };
  const pct = Math.round(layout.ratio * 100);

  return (
    <div className={s.page}>
      <header className={s.bar}>
        <span className={s.brand}><Columns2 size={14} aria-hidden /> Split screen</span>
        <div className={s.tools} role="toolbar" aria-label="Split screen">
          <button type="button" className={s.tool} onClick={() => update({ orientation: layout.orientation === 'row' ? 'column' : 'row' })} disabled={narrow}
            aria-label={layout.orientation === 'row' ? 'Stack the panes' : 'Put the panes side by side'}>
            {layout.orientation === 'row' ? <Rows2 size={14} aria-hidden /> : <Columns2 size={14} aria-hidden />}
            <span>{layout.orientation === 'row' ? 'Stack' : 'Side by side'}</span>
          </button>
          <button type="button" className={s.tool} onClick={swap} aria-label="Swap the panes"><ArrowLeftRight size={14} aria-hidden /><span>Swap</span></button>
          <button type="button" role="switch" aria-checked={layout.linked} className={`${s.tool} ${layout.linked ? s.toolOn : ''}`} onClick={() => update({ linked: !layout.linked })}
            title="Linked panes follow each other: the script's scene shows in the Studio, and the Studio can send the script to a scene">
            {layout.linked ? <Link2 size={14} aria-hidden /> : <Link2Off size={14} aria-hidden />}<span>Linked</span>
          </button>
          <button type="button" className={s.tool} onClick={() => full('a')} aria-label="Close split screen"><X size={14} aria-hidden /><span>Close</span></button>
        </div>
      </header>

      <div ref={wrapRef} className={`${s.panes} ${column ? s.column : s.row} ${dragging ? s.dragging : ''}`}
        style={{ gridTemplateColumns: column ? undefined : `${pct}fr 10px ${100 - pct}fr`, gridTemplateRows: column ? `${pct}fr 10px ${100 - pct}fr` : undefined }}>
        {(['a', 'b'] as Side[]).map((side, i) => (
          <React.Fragment key={side}>
            {i === 1 && (
              <div
                role="separator"
                tabIndex={0}
                aria-label="Resize the panes"
                aria-orientation={column ? 'horizontal' : 'vertical'}
                aria-valuemin={20}
                aria-valuemax={80}
                aria-valuenow={pct}
                aria-valuetext={`First pane ${pct}%`}
                className={s.divider}
                onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setDragging(true); }}
                onPointerMove={(e) => { if (dragging) update({ ratio: ratioAt(e.clientX, e.clientY) }); }}
                onPointerUp={(e) => { e.currentTarget.releasePointerCapture(e.pointerId); setDragging(false); }}
                onDoubleClick={() => update({ ratio: 0.5 })}
                onKeyDown={(e) => {
                  const step = e.shiftKey ? 0.1 : 0.05;
                  const next = { ArrowLeft: -step, ArrowUp: -step, ArrowRight: step, ArrowDown: step } as Record<string, number>;
                  if (e.key in next) { e.preventDefault(); update({ ratio: clampRatio(layout.ratio + next[e.key]) }); }
                  else if (e.key === 'Home') { e.preventDefault(); update({ ratio: 0.2 }); }
                  else if (e.key === 'End') { e.preventDefault(); update({ ratio: 0.8 }); }
                  else if (e.key === 'Enter') { e.preventDefault(); update({ ratio: 0.5 }); }
                }}
              >
                <span className={s.grip} aria-hidden />
              </div>
            )}
            <section className={`${s.pane} ${pulse === side ? s.pulse : ''}`} aria-label={`${i === 0 ? 'First' : 'Second'} pane: ${surfaceOf(here[side].href)?.label ?? here[side].title ?? 'page'}`}>
              <PaneBar
                current={here[side].href}
                title={here[side].title}
                onPick={(sf) => open(side, sf.href)}
                onFull={() => full(side)}
                onClose={() => full(side === 'a' ? 'b' : 'a')}
              />
              <iframe
                ref={frames[side]}
                className={s.frame}
                src={src[side]}
                title={`${i === 0 ? 'First' : 'Second'} pane — ${surfaceOf(here[side].href)?.label ?? 'page'}`}
              />
            </section>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function PaneBar({ current, title, onPick, onFull, onClose }: {
  current: string;
  title: string;
  onPick: (surface: Surface) => void;
  onFull: () => void;
  onClose: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const here = surfaceOf(current);
  const groups = Array.from(new Set(SURFACES.map((x) => x.group)));

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node) && !btnRef.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); btnRef.current?.focus(); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    menuRef.current?.querySelector<HTMLButtonElement>('button[aria-pressed="true"], button')?.focus();
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div className={s.paneBar}>
      <div className={s.pickWrap}>
        <button ref={btnRef} type="button" className={s.pick} aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((v) => !v)}>
          {here?.label ?? (title.replace(/ — Misfits Cavern.*$/, '') || 'Page')} <ChevronDown size={12} aria-hidden />
        </button>
        {open && (
          <div ref={menuRef} className={s.menu} role="dialog" aria-label="Show in this pane">
            {groups.map((g) => (
              <div key={g} className={s.menuGroup}>
                <div className={s.menuHead}>{g}</div>
                <div className={s.menuItems}>
                  {SURFACES.filter((x) => x.group === g).map((x) => (
                    <button key={x.id} type="button" className={`${s.menuItem} ${here?.id === x.id ? s.menuItemOn : ''}`} aria-pressed={here?.id === x.id}
                      onClick={() => { onPick(x); setOpen(false); }}>
                      {x.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <span className={s.where}>{current}</span>
      <button type="button" className={s.icon} onClick={onFull} aria-label="Open this pane full screen" title="Full screen"><Maximize2 size={13} aria-hidden /></button>
      <button type="button" className={s.icon} onClick={onClose} aria-label="Close this pane" title="Close this pane"><X size={13} aria-hidden /></button>
    </div>
  );
}
