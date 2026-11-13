'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { resolveGoTo, type GoToTarget } from '@/lib/scriptos/goto';

// ── Find & Replace bar (drops down under the toolbar) ──────────────────────
export function FindReplaceBar({
  findText, setFindText, replaceText, setReplaceText, matchCase, setMatchCase,
  findCount, onReplaceOne, onReplaceAll, onClose,
}: {
  findText: string;
  setFindText: (v: string) => void;
  replaceText: string;
  setReplaceText: (v: string) => void;
  matchCase: boolean;
  setMatchCase: (v: boolean) => void;
  findCount: number;
  onReplaceOne: () => void;
  onReplaceAll: () => void;
  onClose: () => void;
}) {
  return (
    <motion.div initial={{ y: -32, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -32, opacity: 0 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }} style={{ background: 'var(--surface)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(var(--ink-rgb), 0.05)', padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
      <Search size={14} style={{ color: 'var(--fg-muted)' }} />
      <input value={findText} onChange={e => setFindText(e.target.value)} placeholder="Find..." style={{ flex: 1, maxWidth: 240, background: 'rgba(var(--ink-rgb), 0.05)', border: '1px solid rgba(var(--ink-rgb), 0.1)', borderRadius: 4, padding: '6px 10px', color: 'var(--fg-strong)', fontSize: 12, outline: 'none' }} />
      <input value={replaceText} onChange={e => setReplaceText(e.target.value)} placeholder="Replace..." style={{ flex: 1, maxWidth: 240, background: 'rgba(var(--ink-rgb), 0.05)', border: '1px solid rgba(var(--ink-rgb), 0.1)', borderRadius: 4, padding: '6px 10px', color: 'var(--fg-strong)', fontSize: 12, outline: 'none' }} />
      <button type="button" aria-pressed={matchCase} title="Match case" onClick={() => setMatchCase(!matchCase)} style={{ background: matchCase ? 'rgba(var(--ink-rgb), 0.14)' : 'rgba(var(--ink-rgb), 0.05)', border: 'none', borderRadius: 4, padding: '5px 8px', color: 'var(--fg-strong)', fontSize: 11, cursor: 'pointer' }}>Aa</button>
      <span style={{ fontSize: 11, color: 'var(--fg-muted)', fontFamily: 'var(--mono)' }}>{findCount} found</span>
      <button onClick={onReplaceOne} style={{ background: 'rgba(var(--ink-rgb), 0.05)', border: 'none', borderRadius: 4, padding: '5px 10px', color: 'var(--fg-strong)', fontSize: 11, cursor: 'pointer' }}>Replace</button>
      <button onClick={onReplaceAll} style={{ background: 'rgba(var(--ink-rgb), 0.05)', border: 'none', borderRadius: 4, padding: '5px 10px', color: 'var(--fg-strong)', fontSize: 11, cursor: 'pointer' }}>All</button>
      <button aria-label="Close" onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--fg-dim)', cursor: 'pointer' }}><X size={14} /></button>
    </motion.div>
  );
}

// ── Go to: a scene, a page or a character ─────────────────────────────────
export function GoToSceneModal({
  sceneCount, headings = [], pages = [], perScene = [], currentScene = -1, value, onChange, onJump, onClose,
}: {
  sceneCount: number;
  headings?: string[];
  pages?: { page: number; scene: number }[];
  perScene?: string[][];
  currentScene?: number;
  value: string;
  onChange: (v: string) => void;
  onJump: (target: GoToTarget) => void;
  onClose: () => void;
}) {
  const resolved = resolveGoTo(value, { sceneCount, headings, pages, perScene, currentScene });
  const typed = value.trim() !== '';
  const ok = 'target' in resolved;
  const detail = ok ? describeTarget(resolved.target, sceneCount, pages.length) : '';
  return (
    <motion.div initial={{ opacity: 0, y: -12, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -12, scale: 0.96 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }} style={{ position: 'fixed', top: 72, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: 'var(--surface)', backdropFilter: 'blur(24px)', border: '1px solid rgba(var(--ink-rgb), 0.09)', borderRadius: 14, padding: '16px 20px', width: 320, boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-strong)', marginBottom: 8 }}>Go to</div>
      <input autoFocus type="text" aria-label="Scene, page or character" aria-describedby="go-to-hint" aria-invalid={typed && !ok} value={value} onChange={e => onChange(e.target.value)} onKeyDown={e => {
        if (e.key === 'Enter' && ok) onJump(resolved.target);
        if (e.key === 'Escape') onClose();
      }} placeholder="12 · p12 · a name" style={{ width: '100%', background: 'rgba(var(--ink-rgb), 0.05)', border: `1px solid ${typed && !ok ? 'var(--danger)' : 'rgba(var(--ink-rgb), 0.1)'}`, borderRadius: 8, padding: '8px 12px', color: 'var(--fg-strong)', fontSize: 14, outline: 'none', fontFamily: 'var(--mono)' }} />
      {/* What Enter would land on, before it does. */}
      <div id="go-to-hint" role="status" style={{ fontSize: 11, color: typed && !ok ? 'var(--danger)' : 'var(--fg-muted)', marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {ok ? resolved.label : resolved.problem}
      </div>
      {detail && (
        <div style={{ fontSize: 11, color: 'var(--fg-dim)', marginTop: 2 }}>{detail}</div>
      )}
    </motion.div>
  );
}

/** The second line: where the target sits in the script. */
function describeTarget(target: GoToTarget, sceneCount: number, pageCount: number): string {
  if (target.kind === 'scene') return `Scene ${target.scene} of ${sceneCount}`;
  if (target.kind === 'page') return `Page ${target.page} of ${Math.max(1, pageCount)}`;
  return `${target.name} · their scene ${target.index} of ${target.total} · Enter again for the next`;
}

