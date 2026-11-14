'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlignLeft, Type, ChevronDown, ChevronUp } from 'lucide-react';
import * as Diff from 'diff';
import { listChangeReviews, setChangeReview, clearChangeReview } from '@/lib/supabase/changeReviews';

interface DiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalText: string;
  modifiedText: string;
  label: string;
  /** The element kind of each line of `modifiedText`, by 0-based line number. */
  kindOf?: (lineNumber: number) => DiffKind;
  /** Review mode: accept/reject each change, stored per script. */
  projectId?: string;
  scriptId?: string;
  userId?: string;
}

type DiffMode = 'lines' | 'words' | 'side';

export type DiffKind = 'dialogue' | 'action' | 'scene' | 'other';

interface ProcessedHunk {
  header: string;
  parts: { type: 'added' | 'removed' | 'unchanged'; text: string; kind: DiffKind }[];
}

function buildHunks(
  changes: Diff.Change[],
  contextLines = 3,
  kindOf?: (lineNumber: number) => DiffKind,
): ProcessedHunk[] {

  interface LineInfo {
    text: string;
    type: 'added' | 'removed' | 'unchanged';
    oldLine: number | null;
    newLine: number | null;
  }
  const lines: LineInfo[] = [];
  let oldLine = 1;
  let newLine = 1;

  for (const part of changes) {
    const partLines = part.value.split('\n');

    if (partLines[partLines.length - 1] === '') partLines.pop();
    for (const text of partLines) {
      if (part.added) {
        lines.push({ text, type: 'added', oldLine: null, newLine: newLine++ });
      } else if (part.removed) {
        lines.push({ text, type: 'removed', oldLine: oldLine++, newLine: null });
      } else {
        lines.push({ text, type: 'unchanged', oldLine: oldLine++, newLine: newLine++ });
      }
    }
  }

  const changedIdx = new Set(
    lines.map((l, i) => (l.type !== 'unchanged' ? i : -1)).filter(i => i !== -1)
  );

  if (changedIdx.size === 0) return [];

  const ranges: [number, number][] = [];
  let rangeStart = -1;
  let rangeEnd = -1;

  for (const ci of Array.from(changedIdx).sort((a, b) => a - b)) {
    const s = Math.max(0, ci - contextLines);
    const e = Math.min(lines.length - 1, ci + contextLines);
    if (rangeStart === -1) {
      rangeStart = s;
      rangeEnd = e;
    } else if (s <= rangeEnd + 1) {
      rangeEnd = Math.max(rangeEnd, e);
    } else {
      ranges.push([rangeStart, rangeEnd]);
      rangeStart = s;
      rangeEnd = e;
    }
  }
  if (rangeStart !== -1) ranges.push([rangeStart, rangeEnd]);

  return ranges.map(([s, e]) => {
    const firstOld = lines[s].oldLine ?? (lines[s].newLine ?? 1);
    const firstNew = lines[s].newLine ?? (lines[s].oldLine ?? 1);
    const header = `@@ -${firstOld} +${firstNew} @@`;
    const parts = lines.slice(s, e + 1).map(l => ({
      type: l.type,
      text: l.text,
      kind: kindOf ? kindOf((l.newLine ?? l.oldLine ?? 1) - 1) : 'other',
    }));
    return { header, parts };
  });
}

function inlineWordDiff(removed: string, added: string): {
  removedParts: { text: string; highlight: boolean }[];
  addedParts: { text: string; highlight: boolean }[];
} {
  const wordChanges = Diff.diffWords(removed, added);
  const removedParts: { text: string; highlight: boolean }[] = [];
  const addedParts: { text: string; highlight: boolean }[] = [];
  for (const c of wordChanges) {
    if (c.removed) removedParts.push({ text: c.value, highlight: true });
    else if (c.added) addedParts.push({ text: c.value, highlight: true });
    else {
      removedParts.push({ text: c.value, highlight: false });
      addedParts.push({ text: c.value, highlight: false });
    }
  }
  return { removedParts, addedParts };
}

function computeStats(changes: Diff.Change[]) {
  let added = 0, removed = 0, unchanged = 0;
  for (const c of changes) {
    const n = c.value.split('\n').filter(Boolean).length;
    if (c.added) added += n;
    else if (c.removed) removed += n;
    else unchanged += n;
  }
  return { added, removed, unchanged };
}

function exportDiffToPrint(label: string, originalText: string, modifiedText: string) {
  const w = window.open('', '_blank');
  if (!w) return;
  const changes = Diff.diffLines(originalText, modifiedText);
  const rows = changes.map((c) => {
    const lines = c.value.split('\n'); if (lines[lines.length - 1] === '') lines.pop();
    const color = c.added ? '#059669' : c.removed ? '#dc2626' : '#666';
    const bg = c.added ? 'rgba(16,185,129,0.12)' : c.removed ? 'rgba(239,68,68,0.12)' : 'transparent';
    return lines.map((t) => `<div style="background:${bg};color:${color};white-space:pre-wrap;">${c.added ? '+' : c.removed ? '−' : ' '}${t}</div>`).join('');
  }).join('');
  w.document.write(`<!doctype html><html><head><title>Diff — ${label}</title></head><body style="font-family: monospace; max-width: 800px; margin: 24px auto; line-height: 1.5;"><h1>Diff — ${label}</h1>${rows}<script>window.print()</script></body></html>`);
  w.document.close();
}

export function DiffModal({ isOpen, onClose, originalText, modifiedText, label, kindOf, projectId, scriptId, userId }: DiffModalProps) {
  const [mode, setMode] = useState<DiffMode>('lines');
  const [collapsedHunks, setCollapsedHunks] = useState<Set<number>>(new Set());
  const [context, setContext] = useState(3);
  const [kindFilter, setKindFilter] = useState<'all' | DiffKind>('all');
  const [reviewMode, setReviewMode] = useState(false);
  const [reviews, setReviews] = useState<Record<string, 'accept' | 'reject'>>({});
  const hunkRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [currentHunk, setCurrentHunk] = useState(0);

  const changeKey = (hunk: ProcessedHunk): string => {
    const s = hunk.parts.map((p) => `${p.type}:${p.text}`).join('\n');
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h.toString(36);
  };

  useEffect(() => {
    let active = true;
    if (!isOpen || !projectId || !scriptId) {
      void Promise.resolve().then(() => { if (active) setReviews({}); });
      return () => { active = false; };
    }
    listChangeReviews(projectId, scriptId).then(
      (r) => { if (active) setReviews(Object.fromEntries(r.map((x) => [x.change_key, x.kind]))); },
      () => { if (active) setReviews({}); },
    );
    return () => { active = false; };
  }, [isOpen, projectId, scriptId, originalText, modifiedText]);

  const decide = async (key: string, kind: 'accept' | 'reject') => {
    if (!projectId || !scriptId || !userId) return;
    const next = reviews[key] === kind ? undefined : kind;
    setReviews((r) => {
      const copy = { ...r };
      if (next) copy[key] = next; else delete copy[key];
      return copy;
    });
    try {
      if (next) await setChangeReview(projectId, scriptId, key, next, userId);
      else await clearChangeReview(projectId, scriptId, key);
    } catch { /* the next open reloads */ }
  };

  const jumpToHunk = (i: number) => {
    if (hunks.length === 0) return;
    const next = ((i % hunks.length) + hunks.length) % hunks.length;
    setCurrentHunk(next);
    setCollapsedHunks(prev => {
      if (!prev.has(next)) return prev;
      const copy = new Set(prev); copy.delete(next); return copy;
    });
    hunkRefs.current[next]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const { hunks, stats } = useMemo(() => {
    if (!isOpen) return { hunks: [], stats: { added: 0, removed: 0, unchanged: 0 } };
    const changes = Diff.diffLines(originalText, modifiedText, { newlineIsToken: false });
    return {
      hunks: buildHunks(changes, context, kindOf),
      stats: computeStats(changes),
    };
  }, [isOpen, originalText, modifiedText, context, kindOf]);

  const wordChanges = useMemo(() => {
    if (!isOpen || mode !== 'words') return [];
    return Diff.diffWords(originalText, modifiedText);
  }, [isOpen, mode, originalText, modifiedText]);

  const sideRows = useMemo(() => {
    if (!isOpen || mode !== 'side') return [] as Array<{ left: string | null; right: string | null; type: 'same' | 'add' | 'remove' | 'changed' }>;
    const changes = Diff.diffLines(originalText, modifiedText);
    const rows: Array<{ left: string | null; right: string | null; type: 'same' | 'add' | 'remove' | 'changed' }> = [];
    let pendingRemoved: string[] = [];
    const split = (v: string) => { const l = v.split('\n'); if (l[l.length - 1] === '') l.pop(); return l; };
    for (const part of changes) {
      if (part.removed) { pendingRemoved.push(...split(part.value)); continue; }
      if (part.added) {
        const added = split(part.value);
        const n = Math.max(pendingRemoved.length, added.length);
        for (let i = 0; i < n; i++) {
          const l = pendingRemoved[i] ?? null; const r = added[i] ?? null;
          rows.push({ left: l, right: r, type: l == null ? 'add' : r == null ? 'remove' : 'changed' });
        }
        pendingRemoved = [];
        continue;
      }
      for (const t of split(part.value)) rows.push({ left: t, right: t, type: 'same' });
    }
    for (const l of pendingRemoved) rows.push({ left: l, right: null, type: 'remove' });
    return rows;
  }, [isOpen, mode, originalText, modifiedText]);

  const toggleHunk = (i: number) => {
    setCollapsedHunks(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  if (!isOpen) return null;

  const noChanges = hunks.length === 0;

  return (
    <AnimatePresence>
      <motion.div
        key="diff-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 100000,
          background: 'var(--surface)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }}
        onClick={onClose}
      >
        <motion.div
          key="diff-panel"
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          style={{
            background: 'var(--bg-2)', border: '1px solid rgba(var(--ink-rgb), 0.08)',
            borderRadius: 14, width: '100%', maxWidth: 960, maxHeight: '90vh',
            display: 'flex', flexDirection: 'column',
            boxShadow: '0 40px 100px rgba(0,0,0,0.9)',
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px', borderBottom: '1px solid rgba(var(--ink-rgb), 0.06)',
            gap: 12, flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontFamily: 'var(--display)', color: 'var(--fg)', letterSpacing: '-0.02em' }}>
                Diff — <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{label}</span>
              </h3>
              <span style={{ fontSize: 11, background: 'color-mix(in srgb, var(--ok) 15%, transparent)', color: 'var(--ok)', padding: '2px 8px', borderRadius: 9999, fontFamily: 'var(--mono)' }}>
                +{stats.added}
              </span>
              <span style={{ fontSize: 11, background: 'color-mix(in srgb, var(--danger) 15%, transparent)', color: 'var(--danger)', padding: '2px 8px', borderRadius: 9999, fontFamily: 'var(--mono)' }}>
                −{stats.removed}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', background: 'rgba(var(--ink-rgb), 0.05)', borderRadius: 8, padding: 2 }}>
                {(['lines', 'words', 'side'] as DiffMode[]).map(m => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    title={m === 'lines' ? 'Line diff' : 'Word diff'}
                    style={{
                      background: mode === m ? 'rgba(var(--ink-rgb), 0.1)' : 'transparent',
                      border: 'none', borderRadius: 8, padding: '4px 10px',
                      color: mode === m ? 'var(--fg-strong)' : 'var(--fg-dim)',
                      cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4,
                      transition: 'all 0.15s',
                    }}
                  >
                    {m === 'lines' ? <AlignLeft size={12} /> : m === 'words' ? <Type size={12} /> : <ChevronDown size={12} />}
                    {m}
                  </button>
                ))}
              </div>
              {mode === 'lines' && kindOf && (
                <div style={{ display: 'flex', gap: 4 }}>
                  {(['all', 'dialogue', 'action', 'scene'] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setKindFilter(k)}
                      style={{
                        background: kindFilter === k ? 'rgba(var(--ink-rgb), 0.12)' : 'rgba(var(--ink-rgb), 0.05)',
                        border: 'none', borderRadius: 8, padding: '4px 10px',
                        color: kindFilter === k ? 'var(--fg-strong)' : 'var(--fg-dim)',
                        cursor: 'pointer', fontSize: 11, textTransform: k === 'all' ? 'none' : 'var(--caps)',
                      }}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              )}
              {projectId && scriptId && userId && (
                <button
                  type="button"
                  role="switch"
                  aria-checked={reviewMode}
                  onClick={() => setReviewMode((v) => !v)}
                  title="Accept or reject each change; stored per script"
                  style={{
                    background: reviewMode ? 'rgba(var(--ink-rgb), 0.12)' : 'rgba(var(--ink-rgb), 0.05)',
                    border: 'none', borderRadius: 8, padding: '4px 10px',
                    color: reviewMode ? 'var(--accent)' : 'var(--fg-dim)', cursor: 'pointer', fontSize: 11,
                  }}
                >
                  Review
                </button>
              )}
              {mode === 'lines' && (
                <button
                  type="button"
                  onClick={() => setContext((c) => (c === 0 ? 3 : 0))}
                  title="Show or hide unchanged context lines"
                  style={{
                    background: 'rgba(var(--ink-rgb), 0.05)', border: 'none', borderRadius: 8, padding: '4px 10px',
                    color: context === 0 ? 'var(--accent)' : 'var(--fg-dim)', cursor: 'pointer', fontSize: 11,
                  }}
                >
                  {context === 0 ? 'Changes only' : 'Context'}
                </button>
              )}
              <button aria-label="Close"
                onClick={onClose}
                style={{ background: 'rgba(var(--ink-rgb), 0.06)', border: 'none', borderRadius: 8, color: 'var(--fg-muted)', cursor: 'pointer', padding: '6px 8px', display: 'flex', alignItems: 'center' }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
            {noChanges ? (
              <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--fg-dim)', fontFamily: 'var(--mono)', fontSize: 13 }}>
                No changes detected between snapshots.
              </div>
            ) : mode === 'words' ? (
              /* ── Word diff ───────────────────────────────────── */
              <div style={{ padding: '0 20px', fontFamily: 'var(--mono)', fontSize: 13, lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'rgba(var(--ink-rgb), 0.65)' }}>
                {wordChanges.map((part, i) => (
                  <span
                    key={i}
                    style={{
                      background: part.added
                        ? 'rgba(16,185,129,0.25)'
                        : part.removed
                          ? 'rgba(239,68,68,0.25)'
                          : 'transparent',
                      color: part.added ? 'var(--ok)' : part.removed ? 'var(--danger)' : 'rgba(var(--ink-rgb), 0.65)',
                      textDecoration: part.removed ? 'line-through' : 'none',
                      borderRadius: 4,
                      padding: part.added || part.removed ? '0 2px' : 0,
                    }}
                  >
                    {part.value}
                  </span>
                ))}
              </div>
            ) : mode === 'side' ? (
              /* ── Side by side ────────────────────────────────── */
              <div style={{ padding: '0 20px', fontFamily: 'var(--mono)', fontSize: 13 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, paddingBottom: 6, color: 'var(--fg-dim)', fontSize: 11, letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)' }}>
                  <span>{label} — before</span>
                  <span>current</span>
                </div>
                {sideRows.map((row, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {(['left', 'right'] as const).map((side) => {
                      const text = row[side];
                      const changed = row.type !== 'same';
                      const bg = text == null ? 'transparent' : changed ? (side === 'left' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)') : 'transparent';
                      const fg = text == null ? 'transparent' : changed ? (side === 'left' ? '#f87171' : '#34d399') : 'rgba(var(--ink-rgb), 0.55)';
                      return (
                        <div key={side} style={{ background: bg, borderLeft: changed ? `3px solid ${side === 'left' ? '#f87171' : '#34d399'}` : '3px solid transparent', padding: '2px 8px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: fg, lineHeight: 1.6 }}>
                          {text ?? ''}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            ) : (
              /* ── Line diff with hunks ────────────────────────── */
              <div style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>
                {hunks.map((hunk, hi) => {
                  const collapsed = collapsedHunks.has(hi);

                  interface EnrichedPart {
                    type: 'added' | 'removed' | 'unchanged';
                    text: string;
                    kind: DiffKind;
                    removedParts?: { text: string; highlight: boolean }[];
                    addedParts?: { text: string; highlight: boolean }[];
                    skipRender?: boolean;
                  }
                  const enriched: EnrichedPart[] = [];
                  const parts = hunk.parts;
                  let i = 0;
                  while (i < parts.length) {
                    const cur = parts[i];

                    if (cur.type === 'removed' && i + 1 < parts.length && parts[i + 1].type === 'added') {
                      const { removedParts, addedParts } = inlineWordDiff(cur.text, parts[i + 1].text);
                      enriched.push({ type: 'removed', text: cur.text, kind: cur.kind, removedParts });
                      enriched.push({ type: 'added', text: parts[i + 1].text, kind: parts[i + 1].kind, addedParts });
                      i += 2;
                    } else {
                      enriched.push({ type: cur.type, text: cur.text, kind: cur.kind });
                      i++;
                    }
                  }
                  const visible = kindFilter === 'all' ? enriched : enriched.filter((p) => p.kind === kindFilter);

                  return (
                    <div key={hi} ref={el => { hunkRefs.current[hi] = el; }} style={{ marginBottom: 2 }}>
                      <div
                        onClick={() => toggleHunk(hi)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '4px 20px', cursor: 'pointer',
                          background: 'color-mix(in srgb, var(--accent) 8%, transparent)',
                          borderTop: hi > 0 ? '1px solid rgba(var(--ink-rgb), 0.04)' : 'none',
                          color: 'var(--jobs-text)', fontSize: 12, userSelect: 'none',
                        }}
                      >
                        {collapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                        <span style={{ opacity: 0.7, fontStyle: 'italic' }}>{hunk.header}</span>
                      </div>

                      {reviewMode && projectId && scriptId && userId && (() => {
                        const key = changeKey(hunk);
                        const state = reviews[key];
                        return (
                          <div style={{ display: 'flex', gap: 6, padding: '2px 20px 4px', alignItems: 'center' }}>
                            <button type="button" onClick={() => void decide(key, 'accept')} style={{ padding: '3px 10px', borderRadius: 8, border: 'none', background: state === 'accept' ? 'var(--ok)' : 'rgba(var(--ink-rgb), 0.06)', color: state === 'accept' ? 'var(--on-accent)' : 'var(--fg-muted)', cursor: 'pointer', fontSize: 11 }}>Accept</button>
                            <button type="button" onClick={() => void decide(key, 'reject')} style={{ padding: '3px 10px', borderRadius: 8, border: 'none', background: state === 'reject' ? 'var(--danger)' : 'rgba(var(--ink-rgb), 0.06)', color: state === 'reject' ? 'var(--on-accent)' : 'var(--fg-muted)', cursor: 'pointer', fontSize: 11 }}>Reject</button>
                            {state && <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-dim)', textTransform: 'var(--caps)' }}>{state}</span>}
                          </div>
                        );
                      })()}

                      {!collapsed && visible.length === 0 && (
                        <div style={{ padding: '4px 20px', fontSize: 12, color: 'var(--fg-dim)' }}>No {kindFilter} lines in this change.</div>
                      )}
                      {!collapsed && visible.map((part, pi) => {
                        const bg =
                          part.type === 'added' ? 'rgba(16,185,129,0.1)' :
                          part.type === 'removed' ? 'rgba(239,68,68,0.1)' :
                          'transparent';
                        const fg =
                          part.type === 'added' ? '#34d399' :
                          part.type === 'removed' ? '#f87171' :
                          'rgba(var(--ink-rgb), 0.4)';
                        const gutter =
                          part.type === 'added' ? '+' :
                          part.type === 'removed' ? '−' : ' ';

                        return (
                          <div
                            key={pi}
                            style={{
                              display: 'flex', alignItems: 'baseline', gap: 0,
                              background: bg,
                              borderLeft: part.type !== 'unchanged'
                                ? `3px solid ${part.type === 'added' ? '#34d399' : '#f87171'}`
                                : '3px solid transparent',
                            }}
                          >
                            <span style={{
                              width: 36, flexShrink: 0, textAlign: 'center',
                              fontSize: 12, color: fg, padding: '2px 0',
                              userSelect: 'none', opacity: part.type === 'unchanged' ? 0.3 : 1,
                            }}>
                              {gutter}
                            </span>
                            <span style={{
                              flex: 1, padding: '2px 12px 2px 0',
                              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                              color: part.type === 'unchanged' ? 'rgba(var(--ink-rgb), 0.38)' : fg,
                              fontSize: 13, lineHeight: 1.65,
                            }}>
                              {part.removedParts ? (
                                part.removedParts.map((w, wi) => (
                                  <span key={wi} style={{
                                    background: w.highlight ? 'rgba(239,68,68,0.35)' : 'transparent',
                                    borderRadius: 4, padding: w.highlight ? '0 1px' : 0,
                                  }}>{w.text}</span>
                                ))
                              ) : part.addedParts ? (
                                part.addedParts.map((w, wi) => (
                                  <span key={wi} style={{
                                    background: w.highlight ? 'rgba(16,185,129,0.35)' : 'transparent',
                                    borderRadius: 4, padding: w.highlight ? '0 1px' : 0,
                                  }}>{w.text}</span>
                                ))
                              ) : (
                                part.text || ' '
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{
            padding: '10px 20px', borderTop: '1px solid rgba(var(--ink-rgb), 0.06)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 11, color: 'var(--fg-dim)', fontFamily: 'var(--mono)' }}>
              {stats.unchanged} unchanged · {hunks.length} hunk{hunks.length !== 1 ? 's' : ''}
              {hunks.length > 0 && ` · change ${currentHunk + 1}/${hunks.length}`}
            </span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {hunks.length > 0 && (
                <>
                  <button onClick={() => jumpToHunk(currentHunk - 1)} style={{ fontSize: 12, padding: '6px 12px', borderRadius: 8, background: 'rgba(var(--ink-rgb), 0.07)', border: 'none', color: 'rgba(var(--ink-rgb), 0.6)', cursor: 'pointer' }}>‹ Prev</button>
                  <button onClick={() => jumpToHunk(currentHunk + 1)} style={{ fontSize: 12, padding: '6px 12px', borderRadius: 8, background: 'rgba(var(--ink-rgb), 0.07)', border: 'none', color: 'rgba(var(--ink-rgb), 0.6)', cursor: 'pointer' }}>Next ›</button>
                </>
              )}
              <button
                onClick={() => exportDiffToPrint(label, originalText, modifiedText)}
                style={{
                  fontSize: 12, padding: '6px 16px', borderRadius: 8,
                  background: 'rgba(var(--ink-rgb), 0.07)', border: 'none',
                  color: 'rgba(var(--ink-rgb), 0.6)', cursor: 'pointer',
                }}
              >
                Export
              </button>
              <button
                onClick={onClose}
                style={{
                  fontSize: 12, padding: '6px 16px', borderRadius: 8,
                  background: 'rgba(var(--ink-rgb), 0.07)', border: 'none',
                  color: 'rgba(var(--ink-rgb), 0.6)', cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
