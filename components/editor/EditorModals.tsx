'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Search, X } from 'lucide-react';

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

// ── Go-to-Scene quick dialog ───────────────────────────────────────────────
export function GoToSceneModal({
  sceneCount, value, onChange, onJump, onClose, characters, onJumpCharacter,
}: {
  sceneCount: number;
  value: string;
  onChange: (v: string) => void;
  onJump: (sceneNum: number) => void;
  onClose: () => void;
  characters?: string[];
  onJumpCharacter?: (name: string) => void;
}) {
  const matches = characters?.filter((c) => c.toLowerCase().includes(value.trim().toLowerCase())) ?? [];
  return (
    <motion.div initial={{ opacity: 0, y: -12, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -12, scale: 0.96 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }} style={{ position: 'fixed', top: 72, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: 'var(--surface)', backdropFilter: 'blur(24px)', border: '1px solid rgba(var(--ink-rgb), 0.09)', borderRadius: 14, padding: '16px 20px', width: 320, boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-strong)', marginBottom: 8 }}>Go to Scene</div>
      <input autoFocus type="text" value={value} onChange={e => onChange(e.target.value)} onKeyDown={e => {
        if (e.key === 'Enter') {
          const num = parseInt(value);
          if (num >= 1 && num <= sceneCount) onJump(num);
          else if (value.trim() && onJumpCharacter) onJumpCharacter(value.trim());
        }
        if (e.key === 'Escape') onClose();
      }} placeholder={`1 - ${sceneCount} or a character`} style={{ width: '100%', background: 'rgba(var(--ink-rgb), 0.05)', border: '1px solid rgba(var(--ink-rgb), 0.1)', borderRadius: 8, padding: '8px 12px', color: 'var(--fg-strong)', fontSize: 14, outline: 'none', fontFamily: 'var(--mono)' }} />
      {matches.length > 0 && (
        <div style={{ marginTop: 6, display: 'grid', gap: 2 }}>
          {matches.slice(0, 5).map((c) => (
            <button key={c} type="button" onClick={() => onJumpCharacter?.(c)} style={{ textAlign: 'left', background: 'rgba(var(--ink-rgb), 0.04)', border: 'none', borderRadius: 8, padding: '5px 8px', color: 'var(--fg-strong)', fontSize: 12, cursor: 'pointer' }}>{c}</button>
          ))}
        </div>
      )}
      <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 6 }}>{sceneCount} scenes · Enter to jump</div>
    </motion.div>
  );
}
