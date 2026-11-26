import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import type { TitlePage } from '@/lib/scriptos/titlepage';

// The Title Page editor modal (restructure phase 7 — moved out of the
// editor page unchanged).
export function TitlePageModal({ open, onClose, titlePage, onChange }: {
  open: boolean;
  onClose: () => void;
  titlePage: TitlePage;
  onChange: (field: keyof TitlePage, value: string) => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'var(--scrim-flat)', zIndex: 'var(--z-modal)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
          <motion.div initial={{ scale: 0.94, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.94, opacity: 0, y: 12 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', backdropFilter: 'blur(32px)', border: '1px solid rgba(var(--ink-rgb), 0.09)', borderRadius: 20, padding: 32, width: 480, maxWidth: '100%', maxHeight: '100%', overflowY: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg-strong)', margin: 0 }}>Title Page</h2>
              <button aria-label="Close" onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--fg-dim)', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            {(['title', 'credit', 'author', 'source', 'draftDate', 'contact', 'copyright', 'notes'] as const).map(field => (
              <Input
                key={field}
                label={field.replace(/([A-Z])/g, ' $1').trim()}
                value={titlePage[field]}
                onChange={e => onChange(field, e.target.value)}
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
