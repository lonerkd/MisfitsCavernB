'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { X, Keyboard } from 'lucide-react';
import { useOnChange } from '@/lib/hooks/useOnChange';
import { isMac, matchChord } from '@/lib/os/chords';
import { shortcuts, matchesShortcut } from '@/lib/os/shortcuts';

// The list is shared with the command palette's shortcut search (lib/os/shortcuts.ts); the chords come from the table the handlers use.
const grouped = (list: ReturnType<typeof shortcuts>) => {
  const out: { title: string; items: ReturnType<typeof shortcuts> }[] = [];
  for (const it of list) {
    let g = out.find((x) => x.title === it.group);
    if (!g) { g = { title: it.group, items: [] }; out.push(g); }
    g.items.push(it);
  }
  return out;
};

export default function ShortcutsOverlay() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mac] = useState(() => isMac());
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); return; }
      if (matchChord(e)?.id === 'help') { e.preventDefault(); setOpen(o => !o); return; }

      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        const t = e.target as HTMLElement;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    // The palette can open the panel already filtered to what was searched.
    const onOpen = (e: Event) => { setFilter(String((e as CustomEvent<{ query?: string }>).detail?.query ?? '')); setOpen(true); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mc-open-shortcuts', onOpen);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('mc-open-shortcuts', onOpen); };
  }, []);

  useOnChange(pathname, () => setOpen(false));

  if (pathname === '/auth' || pathname === '/login') return null;

  const shown = grouped(shortcuts(mac).filter((x) => matchesShortcut(filter, x)));

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onMouseDown={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 100001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onMouseDown={e => e.stopPropagation()}
            style={{ width: 'min(94vw, 520px)', maxHeight: '84vh', overflowY: 'auto', background: 'var(--surface)', border: '1px solid rgba(var(--ink-rgb), 0.1)', borderRadius: 14, boxShadow: '0 32px 90px rgba(0,0,0,0.7)', padding: 24 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--accent)' }}>
                <Keyboard size={17} />
                <h2 style={{ fontFamily: 'var(--display)', fontSize: '1.3rem', letterSpacing: '-0.02em', margin: 0, color: 'var(--fg)' }}>KEYBOARD SHORTCUTS</h2>
              </div>
              <button aria-label="Close" onClick={() => setOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--fg-dim)', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Find a shortcut by its keys or its name…"
              aria-label="Find a shortcut"
              autoFocus
              style={{ width: '100%', boxSizing: 'border-box', marginBottom: 16, padding: '9px 12px', borderRadius: 8, background: 'rgba(var(--ink-rgb), 0.04)', border: '1px solid rgba(var(--ink-rgb), 0.12)', color: 'var(--fg)', fontSize: 13, fontFamily: 'var(--mono)', outline: 'none' }}
            />

            <div style={{ display: 'grid', gap: 20 }}>
              {shown.length === 0 && <div role="status" style={{ textAlign: 'center', color: 'var(--fg-dim)', fontSize: 12, fontFamily: 'var(--mono)' }}>No shortcut matches “{filter}”</div>}
              {shown.map(g => (
                <div key={g.title}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)', color: 'var(--fg-dim)', marginBottom: 8 }}>{g.title}</div>
                  <div style={{ display: 'grid', gap: 4 }}>
                    {g.items.map((it) => (
                      <div key={`${it.keys}|${it.desc}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '6px 0' }}>
                        <span style={{ fontSize: 13, color: 'rgba(var(--ink-rgb), 0.75)' }}>{it.desc}</span>
                        <kbd style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg)', background: 'rgba(var(--ink-rgb), 0.06)', border: '1px solid rgba(var(--ink-rgb), 0.12)', borderRadius: 4, padding: '3px 8px', whiteSpace: 'nowrap' }}>{it.keys}</kbd>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid rgba(var(--ink-rgb), 0.06)', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 'var(--caps-track)', color: 'var(--fg-dim)' }}>
              Press <kbd style={{ fontSize: 11, border: '1px solid rgba(var(--ink-rgb), 0.15)', borderRadius: 4, padding: '1px 5px' }}>?</kbd> anytime to reopen
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
