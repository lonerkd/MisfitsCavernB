'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlignLeft, Type, ChevronDown, ChevronUp } from 'lucide-react';
import * as Diff from 'diff';

interface DiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalText: string;
  modifiedText: string;
  label: string;
}

type DiffMode = 'lines' | 'words';

interface ProcessedHunk {
  header: string;
  parts: { type: 'added' | 'removed' | 'unchanged'; text: string }[];
}

function buildHunks(
  changes: Diff.Change[],
  contextLines = 3
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

export function DiffModal({ isOpen, onClose, originalText, modifiedText, label }: DiffModalProps) {
  const [mode, setMode] = useState<DiffMode>('lines');
  const [collapsedHunks, setCollapsedHunks] = useState<Set<number>>(new Set());

  const { hunks, stats } = useMemo(() => {
    if (!isOpen) return { hunks: [], stats: { added: 0, removed: 0, unchanged: 0 } };
    const changes = Diff.diffLines(originalText, modifiedText, { newlineIsToken: false });
    return {
      hunks: buildHunks(changes),
      stats: computeStats(changes),
    };
  }, [isOpen, originalText, modifiedText]);

  const wordChanges = useMemo(() => {
    if (!isOpen || mode !== 'words') return [];
    return Diff.diffWords(originalText, modifiedText);
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
          background: 'rgba(4, 7, 16, 0.92)', backdropFilter: 'blur(10px)',
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
            background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16, width: '100%', maxWidth: 960, maxHeight: '90vh',
            display: 'flex', flexDirection: 'column',
            boxShadow: '0 40px 100px rgba(0,0,0,0.9)',
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)',
            gap: 12, flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontFamily: 'var(--display)', color: 'var(--fg)', letterSpacing: 0.5 }}>
                Diff — <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{label}</span>
              </h3>
              <span style={{ fontSize: 11, background: 'rgba(16,185,129,0.15)', color: '#34d399', padding: '2px 8px', borderRadius: 99, fontFamily: 'var(--mono)' }}>
                +{stats.added}
              </span>
              <span style={{ fontSize: 11, background: 'rgba(239,68,68,0.15)', color: '#f87171', padding: '2px 8px', borderRadius: 99, fontFamily: 'var(--mono)' }}>
                −{stats.removed}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 2 }}>
                {(['lines', 'words'] as DiffMode[]).map(m => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    title={m === 'lines' ? 'Line diff' : 'Word diff'}
                    style={{
                      background: mode === m ? 'rgba(255,255,255,0.1)' : 'transparent',
                      border: 'none', borderRadius: 6, padding: '4px 10px',
                      color: mode === m ? '#fff' : 'rgba(255,255,255,0.4)',
                      cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4,
                      transition: 'all 0.15s',
                    }}
                  >
                    {m === 'lines' ? <AlignLeft size={12} /> : <Type size={12} />}
                    {m}
                  </button>
                ))}
              </div>
              <button
                onClick={onClose}
                style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, color: 'var(--fg-muted)', cursor: 'pointer', padding: '6px 8px', display: 'flex', alignItems: 'center' }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
            {noChanges ? (
              <div style={{ textAlign: 'center', padding: '60px 24px', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--mono)', fontSize: 13 }}>
                No changes detected between snapshots.
              </div>
            ) : mode === 'words' ? (
              /* ── Word diff ───────────────────────────────────── */
              <div style={{ padding: '0 20px', fontFamily: 'var(--mono)', fontSize: 13, lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'rgba(255,255,255,0.65)' }}>
                {wordChanges.map((part, i) => (
                  <span
                    key={i}
                    style={{
                      background: part.added
                        ? 'rgba(16,185,129,0.25)'
                        : part.removed
                          ? 'rgba(239,68,68,0.25)'
                          : 'transparent',
                      color: part.added ? '#34d399' : part.removed ? '#f87171' : 'rgba(255,255,255,0.65)',
                      textDecoration: part.removed ? 'line-through' : 'none',
                      borderRadius: 3,
                      padding: part.added || part.removed ? '0 2px' : 0,
                    }}
                  >
                    {part.value}
                  </span>
                ))}
              </div>
            ) : (
              /* ── Line diff with hunks ────────────────────────── */
              <div style={{ fontFamily: 'var(--mono)', fontSize: 12.5 }}>
                {hunks.map((hunk, hi) => {
                  const collapsed = collapsedHunks.has(hi);

                  interface EnrichedPart {
                    type: 'added' | 'removed' | 'unchanged';
                    text: string;
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
                      enriched.push({ type: 'removed', text: cur.text, removedParts });
                      enriched.push({ type: 'added', text: parts[i + 1].text, addedParts });
                      i += 2;
                    } else {
                      enriched.push({ type: cur.type, text: cur.text });
                      i++;
                    }
                  }

                  return (
                    <div key={hi} style={{ marginBottom: 2 }}>
                      <div
                        onClick={() => toggleHunk(hi)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '4px 20px', cursor: 'pointer',
                          background: 'rgba(139,92,246,0.08)',
                          borderTop: hi > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                          color: '#8b5cf6', fontSize: 11.5, userSelect: 'none',
                        }}
                      >
                        {collapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                        <span style={{ opacity: 0.7, fontStyle: 'italic' }}>{hunk.header}</span>
                      </div>

                      {!collapsed && enriched.map((part, pi) => {
                        const bg =
                          part.type === 'added' ? 'rgba(16,185,129,0.1)' :
                          part.type === 'removed' ? 'rgba(239,68,68,0.1)' :
                          'transparent';
                        const fg =
                          part.type === 'added' ? '#34d399' :
                          part.type === 'removed' ? '#f87171' :
                          'rgba(255,255,255,0.4)';
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
                              color: part.type === 'unchanged' ? 'rgba(255,255,255,0.38)' : fg,
                              fontSize: 12.5, lineHeight: 1.65,
                            }}>
                              {part.removedParts ? (
                                part.removedParts.map((w, wi) => (
                                  <span key={wi} style={{
                                    background: w.highlight ? 'rgba(239,68,68,0.35)' : 'transparent',
                                    borderRadius: 2, padding: w.highlight ? '0 1px' : 0,
                                  }}>{w.text}</span>
                                ))
                              ) : part.addedParts ? (
                                part.addedParts.map((w, wi) => (
                                  <span key={wi} style={{
                                    background: w.highlight ? 'rgba(16,185,129,0.35)' : 'transparent',
                                    borderRadius: 2, padding: w.highlight ? '0 1px' : 0,
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
            padding: '10px 20px', borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--mono)' }}>
              {stats.unchanged} unchanged · {hunks.length} hunk{hunks.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={onClose}
              style={{
                fontSize: 12, padding: '6px 16px', borderRadius: 8,
                background: 'rgba(255,255,255,0.07)', border: 'none',
                color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
