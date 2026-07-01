'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { X, Keyboard } from 'lucide-react';

// Grouped reference of the app's keyboard shortcuts. Opened with "?" from
// anywhere you're not typing.
const GROUPS: { title: string; items: [string, string][] }[] = [
  {
    title: 'Global',
    items: [
      ['⌘ K  /  Ctrl K', 'Open the command palette'],
      ['?', 'Show this shortcuts panel'],
      ['Esc', 'Close any dialog or palette'],
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
      // "?" is Shift+/ — ignore while typing in a field.
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

  useEffect(() => { setOpen(false); }, [pathname]);

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
            style={{ width: 'min(94vw, 520px)', maxHeight: '84vh', overflowY: 'auto', background: 'rgba(14,14,14,0.98)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, boxShadow: '0 32px 90px rgba(0,0,0,0.7)', padding: 24 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--accent)' }}>
                <Keyboard size={17} />
                <h2 style={{ fontFamily: 'var(--display)', fontSize: '1.3rem', letterSpacing: 2, margin: 0, color: 'var(--fg)' }}>KEYBOARD SHORTCUTS</h2>
              </div>
              <button onClick={() => setOpen(false)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'grid', gap: 20 }}>
              {GROUPS.map(g => (
                <div key={g.title}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: 2.5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>{g.title}</div>
                  <div style={{ display: 'grid', gap: 4 }}>
                    {g.items.map(([keys, desc]) => (
                      <div key={desc} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '6px 0' }}>
                        <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.75)' }}>{desc}</span>
                        <kbd style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--fg)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 5, padding: '3px 8px', whiteSpace: 'nowrap' }}>{keys}</kbd>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1, color: 'rgba(255,255,255,0.3)' }}>
              Press <kbd style={{ fontSize: 9, border: '1px solid rgba(255,255,255,0.15)', borderRadius: 3, padding: '1px 5px' }}>?</kbd> anytime to reopen
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
