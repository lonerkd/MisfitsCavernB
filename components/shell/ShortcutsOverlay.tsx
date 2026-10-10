'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { X, Keyboard } from 'lucide-react';
import { useOnChange } from '@/lib/hooks/useOnChange';

const GROUPS: { title: string; items: [string, string][] }[] = [
  {
    title: 'Global',
    items: [
      ['⌘ K  /  Ctrl K', 'Open the command palette'],
      ['⌘ \\  /  Ctrl \\', 'Split screen: this page and another side by side'],
      ['?', 'Show this shortcuts panel'],
      ['Esc', 'Close any dialog or palette'],
    ],
  },
  {
    title: 'The island (Caps Lock on)',
    items: [
      ['Caps Lock', 'Hold the island open, with a key on every control'],
      ['1 – 6', 'Go to that app'],
      ['Q W E R …', 'Run that control of the page you’re on'],
      ['← →  ·  Enter', 'Move between the page’s controls and run one'],
      ['/  ·  \  ·  P', 'Search · split screen · switch project'],
      ['Esc', 'Put the island away until Caps Lock is next turned on'],
    ],
  },
  {
    title: 'ScriptOS editor',
    items: [
      ['Tab', 'Smart element insert (scene / dialogue)'],
      ['↑ ↓ · Enter', 'Navigate & accept autocomplete'],
      ['(', 'Auto-close parenthetical'],
      ['Enter', 'Auto-format a scene heading'],
    ],
  },
  {
    title: 'Plot board',
    items: [
      ['Drag card', 'Reorder the scene in the script'],
      ['Click card', 'Jump to that scene'],
    ],
  },
];

export default function ShortcutsOverlay() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); return; }

      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        const t = e.target as HTMLElement;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('mc-open-shortcuts', onOpen);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('mc-open-shortcuts', onOpen); };
  }, []);

  useOnChange(pathname, () => setOpen(false));

  if (pathname === '/auth' || pathname === '/login') return null;

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
                <h2 style={{ fontFamily: 'var(--display)', fontSize: '1.3rem', letterSpacing: 2, margin: 0, color: 'var(--fg)' }}>KEYBOARD SHORTCUTS</h2>
              </div>
              <button aria-label="Close" onClick={() => setOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--fg-dim)', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'grid', gap: 20 }}>
              {GROUPS.map(g => (
                <div key={g.title}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 2.5, textTransform: 'uppercase', color: 'var(--fg-dim)', marginBottom: 8 }}>{g.title}</div>
                  <div style={{ display: 'grid', gap: 4 }}>
                    {g.items.map(([keys, desc]) => (
                      <div key={desc} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '6px 0' }}>
                        <span style={{ fontSize: 13, color: 'rgba(var(--ink-rgb), 0.75)' }}>{desc}</span>
                        <kbd style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg)', background: 'rgba(var(--ink-rgb), 0.06)', border: '1px solid rgba(var(--ink-rgb), 0.12)', borderRadius: 4, padding: '3px 8px', whiteSpace: 'nowrap' }}>{keys}</kbd>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid rgba(var(--ink-rgb), 0.06)', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 1, color: 'var(--fg-dim)' }}>
              Press <kbd style={{ fontSize: 11, border: '1px solid rgba(var(--ink-rgb), 0.15)', borderRadius: 4, padding: '1px 5px' }}>?</kbd> anytime to reopen
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
