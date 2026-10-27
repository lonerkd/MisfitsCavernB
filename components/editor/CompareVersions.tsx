'use client';

// Compare two versions of the script — any locked revision against another, or
// against the draft in hand — scene by scene. Wishlist 4.12: a writer coming
// back to notes needs "which scenes moved", not only a wall of lines, so every
// changed scene opens to show exactly what was added and taken out.

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ChevronDown, ChevronRight, X } from 'lucide-react';
import * as Diff from 'diff';
import { changedScenes, summarizeVersions, type SceneChangeStatus, type VersionScene } from '@/lib/scriptos/version-diff';
import type { Revision } from '@/lib/scriptos/revisions';

const DRAFT = 'draft';

const STATUS: Record<SceneChangeStatus, { label: string; color: string; bg: string }> = {
  added: { label: 'Added', color: 'var(--ok)', bg: 'rgba(16,185,129,0.14)' },
  removed: { label: 'Cut', color: 'var(--danger)', bg: 'rgba(239,68,68,0.14)' },
  changed: { label: 'Changed', color: 'var(--warn)', bg: 'rgba(245,158,11,0.14)' },
  same: { label: 'Same', color: 'var(--fg-dim)', bg: 'rgba(var(--ink-rgb), 0.06)' },
};

function when(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** One scene's before/after, line by line. */
export function SceneLines({ scene }: { scene: VersionScene }) {
  const parts = useMemo(() => Diff.diffLines(scene.before, scene.after), [scene.before, scene.after]);
  return (
    <div style={{ fontFamily: 'var(--script)', fontSize: 12, lineHeight: 1.5, padding: '6px 0 10px 22px', whiteSpace: 'pre-wrap' }}>
      {parts.map((part, i) => {
        const rows = part.value.split('\n');
        if (rows[rows.length - 1] === '') rows.pop();
        return rows.map((line, k) => (
          <div
            key={`${i}-${k}`}
            style={{
              color: part.added ? 'var(--ok)' : part.removed ? 'var(--danger)' : 'var(--fg-dim)',
              background: part.added ? 'rgba(16,185,129,0.08)' : part.removed ? 'rgba(239,68,68,0.08)' : 'transparent',
              textDecoration: part.removed ? 'line-through' : undefined,
              padding: '0 6px',
              borderRadius: 4,
            }}
          >
            {part.added ? '+' : part.removed ? '−' : ' '} {line || '\u00a0'}
          </div>
        ));
      })}
    </div>
  );
}


export function CompareVersions({
  isOpen, onClose, revisions, draft,
}: {
  isOpen: boolean;
  onClose: () => void;
  revisions: Revision[];
  draft: string;
}) {
  const versions = useMemo(() => (
    [...revisions].sort((a, b) => b.date.localeCompare(a.date)).map((r) => ({ id: r.id, label: r.label, date: r.date }))
  ), [revisions]);

  const [fromId, setFromId] = useState<string>(() => versions[0]?.id ?? DRAFT);
  const [toId, setToId] = useState<string>(DRAFT);
  const [showSame, setShowSame] = useState(false);
  const [openScene, setOpenScene] = useState<string | null>(null);

  const textOf = (id: string) => (id === DRAFT ? draft : revisions.find((r) => r.id === id)?.snapshot ?? '');
  const fromText = textOf(fromId);
  const toText = textOf(toId);
  const summary = useMemo(() => summarizeVersions(fromText, toText), [fromText, toText]);
  const rows = showSame ? summary.scenes : changedScenes(summary);

  if (!isOpen) return null;

  const nameOf = (id: string) => (id === DRAFT ? 'the current draft' : versions.find((v) => v.id === id)?.label ?? 'that revision');

  const select = (value: string, onChange: (v: string) => void, label: string) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--fg-muted)' }}>
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={`Compare ${label.toLowerCase()}`}
        style={{ background: 'rgba(var(--ink-rgb), 0.06)', border: '1px solid rgba(var(--ink-rgb), 0.12)', borderRadius: 8, padding: '6px 8px', color: 'var(--fg-strong)', fontSize: 12, fontFamily: 'var(--mono)' }}
      >
        <option value={DRAFT}>Current draft</option>
        {versions.map((v) => (
          <option key={v.id} value={v.id}>{v.label}{v.date ? ` · ${when(v.date)}` : ''}</option>
        ))}
      </select>
    </label>
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
        style={{ position: 'fixed', inset: 0, zIndex: 100000, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        onClick={onClose}
        role="dialog" aria-modal="true" aria-label="Compare script versions"
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -12, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          style={{ background: 'var(--bg-2)', border: '1px solid rgba(var(--ink-rgb), 0.08)', borderRadius: 14, width: '100%', maxWidth: 960, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 40px 100px rgba(0,0,0,0.9)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 20px', borderBottom: '1px solid rgba(var(--ink-rgb), 0.06)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontFamily: 'var(--display)', letterSpacing: '-0.02em', color: 'var(--fg)', whiteSpace: 'nowrap' }}>Compare versions</h3>
              <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ok)', background: 'rgba(16,185,129,0.14)', padding: '2px 8px', borderRadius: 9999 }}>+{summary.added}</span>
              <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--danger)', background: 'rgba(239,68,68,0.14)', padding: '2px 8px', borderRadius: 9999 }}>−{summary.removed}</span>
            </div>
            <button aria-label="Close" onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--fg-dim)', cursor: 'pointer' }}><X size={18} /></button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', borderBottom: '1px solid rgba(var(--ink-rgb), 0.04)', flexWrap: 'wrap', flexShrink: 0 }}>
            {select(fromId, setFromId, 'From')}
            <ArrowRight size={14} style={{ color: 'var(--fg-dim)' }} aria-hidden />
            {select(toId, setToId, 'To')}
            <span style={{ flex: 1 }} />
            <button
              onClick={() => setShowSame((v) => !v)}
              aria-pressed={showSame}
              style={{ fontSize: 11, background: showSame ? 'rgba(var(--ink-rgb), 0.12)' : 'transparent', border: '1px solid rgba(var(--ink-rgb), 0.14)', borderRadius: 8, padding: '5px 10px', color: 'var(--fg-muted)', cursor: 'pointer' }}
            >
              {showSame ? 'Only what changed' : 'Show every scene'}
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px 16px' }}>
            {summary.identical ? (
              <div style={{ padding: 28, textAlign: 'center', fontSize: 13, color: 'var(--fg-muted)' }}>
                No changes between {nameOf(fromId)} and {nameOf(toId)}.
              </div>
            ) : rows.length === 0 ? (
              <div style={{ padding: 28, textAlign: 'center', fontSize: 13, color: 'var(--fg-muted)' }}>No scenes differ — only the pages before the first heading changed.</div>
            ) : (
              rows.map((scene, i) => {
                const key = `${scene.heading}-${i}`;
                const open = openScene === key;
                const tone = STATUS[scene.status];
                return (
                  <div key={key} style={{ borderBottom: '1px solid rgba(var(--ink-rgb), 0.05)' }}>
                    <button
                      onClick={() => setOpenScene(open ? null : key)}
                      aria-expanded={open}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: '9px 8px', cursor: 'pointer', color: 'var(--fg)' }}
                    >
                      {open ? <ChevronDown size={14} style={{ color: 'var(--fg-dim)' }} aria-hidden /> : <ChevronRight size={14} style={{ color: 'var(--fg-dim)' }} aria-hidden />}
                      <span style={{ fontSize: 11, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: 'var(--caps-track)', color: tone.color, background: tone.bg, borderRadius: 9999, padding: '2px 8px' }}>{tone.label}</span>
                      <span style={{ fontSize: 13, fontFamily: 'var(--mono)', color: 'var(--fg-strong)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{scene.heading || 'Before the first scene'}</span>
                      {scene.added > 0 && <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ok)' }}>+{scene.added}</span>}
                      {scene.removed > 0 && <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--danger)' }}>−{scene.removed}</span>}
                    </button>
                    {open && <SceneLines scene={scene} />}
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

