'use client';

import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { CheckCircle2, Circle, Play, Scissors, X } from 'lucide-react';
import { POST_DEPT_COLOR, POST_DEPT_LABEL, type LineCutNote, type PostDepartment } from '@/lib/studio';
import type { PlacedNote } from '@/lib/studio/cutlines';
import { formatTimecode } from '@/lib/studio/timecode';

/** Where a note's moment opens in Studio › Post. */
export const cutNoteHref = (n: Pick<LineCutNote, 'project_id' | 'cut_id' | 'at_seconds'>) =>
  `/studio?tab=post&project=${n.project_id}&cut=${n.cut_id}&t=${Number(n.at_seconds)}`;

/**
 * Cut notes in the script's right margin, beside the line each is about. Sits
 * above the textarea (so it can be clicked) and follows its scroll; positions
 * come from the highlight layer, which lays the lines out identically.
 */
export function CutNoteMarkers({ byLine, highlightRef, textareaRef, content, openLine, setOpenLine, onResolve, canResolve }: {
  byLine: Map<number, PlacedNote<LineCutNote>[]>;
  highlightRef: React.RefObject<HTMLDivElement | null>;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  content: string;
  openLine: number | null;
  setOpenLine: (line: number | null) => void;
  onResolve: (note: LineCutNote, resolved: boolean) => void;
  canResolve: boolean;
}) {
  const [tops, setTops] = useState<Map<number, number>>(new Map());
  const [scroll, setScroll] = useState(0);
  const [height, setHeight] = useState(0);

  const measure = useCallback(() => {
    const layer = highlightRef.current;
    if (!layer) return;
    const next = new Map<number, number>();
    for (const line of byLine.keys()) {
      const el = layer.children[line] as HTMLElement | undefined;
      if (el) next.set(line, el.offsetTop);
    }
    setTops(next);
    setHeight(layer.clientHeight);
  }, [byLine, highlightRef]);

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

  useEffect(() => {
    if (openLine == null) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpenLine(null); textareaRef.current?.focus(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openLine, setOpenLine, textareaRef]);

  if (!byLine.size) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 6 }}>
      {[...byLine.entries()].map(([line, placed]) => {
        const top = (tops.get(line) ?? -1000) - scroll;
        if (top < -40 || (height && top > height)) return null;
        const open = placed.filter((p) => !p.note.resolved_at);
        const lead = (open[0] ?? placed[0]).note;
        const color = POST_DEPT_COLOR[lead.department as PostDepartment] ?? '#9ca3af';
        const isOpen = openLine === line;
        return (
          <React.Fragment key={line}>
            <button
              type="button"
              onClick={() => setOpenLine(isOpen ? null : line)}
              aria-expanded={isOpen}
              aria-label={`Cut notes on line ${line + 1}: ${placed.length}${open.length < placed.length ? ` (${open.length} open)` : ''}`}
              style={{
                position: 'absolute', right: 10, top: top + 2, pointerEvents: 'auto',
                display: 'inline-flex', alignItems: 'center', gap: 4, height: 22, padding: '0 8px', borderRadius: 9999,
                border: `1px solid ${color}66`, background: open.length ? `${color}1f` : 'rgba(var(--ink-rgb), 0.03)',
                color: open.length ? color : 'var(--fg-muted)', fontFamily: 'var(--mono)', fontSize: 11, cursor: 'pointer',
              }}
            >
              <Scissors size={10} aria-hidden /> {formatTimecode(Number(lead.at_seconds))}{placed.length > 1 ? ` +${placed.length - 1}` : ''}
            </button>
            {isOpen && (
              <div role="dialog" aria-label={`Cut notes on line ${line + 1}`}
                style={{
                  position: 'absolute', right: 10, top: top + 28, width: 300, maxWidth: 'calc(100% - 20px)', pointerEvents: 'auto',
                  background: 'var(--surface)', border: '1px solid rgba(var(--ink-rgb), 0.12)', borderRadius: 8, padding: 10,
                  boxShadow: '0 16px 40px rgba(0,0,0,0.55)', fontFamily: 'var(--sans, inherit)', zIndex: 2,
                }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 2, textTransform: 'uppercase', color: 'var(--fg-muted)' }}>From the cut</span>
                  <button type="button" onClick={() => setOpenLine(null)} aria-label="Close"
                    style={{ width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer' }}>
                    <X size={12} />
                  </button>
                </div>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
                  {placed.map(({ note: n, lost }) => (
                    <li key={n.id} style={{ opacity: n.resolved_at ? 0.55 : 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <a href={cutNoteHref(n)} title="Watch this moment in Studio › Post"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 8, background: 'rgba(129,140,248,0.14)', color: '#c7c9ff', fontFamily: 'var(--mono)', fontSize: 11, textDecoration: 'none' }}>
                          <Play size={9} aria-hidden /> {formatTimecode(Number(n.at_seconds))}
                        </a>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: POST_DEPT_COLOR[n.department as PostDepartment] ?? '#9ca3af' }}>{POST_DEPT_LABEL[n.department as PostDepartment] ?? n.department}</span>
                        <span style={{ fontSize: 11, color: 'var(--fg-muted)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{n.cut_title}</span>
                        {canResolve && (
                          <button type="button" onClick={() => onResolve(n, !n.resolved_at)} aria-label={n.resolved_at ? 'Reopen note' : 'Resolve note'} title={n.resolved_at ? 'Reopen' : 'Resolve'}
                            style={{ width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: n.resolved_at ? 'var(--ok)' : 'var(--fg-muted)', cursor: 'pointer' }}>
                            {n.resolved_at ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                          </button>
                        )}
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: 13, lineHeight: 1.5, color: 'var(--fg)', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{n.body}</p>
                      {lost && <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--fg-muted)' }}>Its line was rewritten — it was on “{n.line_text}”.</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
