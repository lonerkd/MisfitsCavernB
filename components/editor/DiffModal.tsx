'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface DiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalText: string;
  modifiedText: string;
  label: string;
}

// A very simple line-by-line diff
function computeLineDiff(original: string, modified: string) {
  const origLines = original.split('\n');
  const modLines = modified.split('\n');
  
  const diffs: { type: 'added' | 'removed' | 'unchanged'; text: string; num?: number }[] = [];
  
  // Basic heuristic: check line by line. If a line is in both, unchanged.
  // This is a naive O(N^2) but fine for average scripts, or we can use a simpler approach:
  // Just show added/removed using a map
  
  const origSet = new Set(origLines.map(l => l.trim()));
  const modSet = new Set(modLines.map(l => l.trim()));
  
  let lineNum = 1;
  for (const line of modLines) {
    if (line.trim() === '') {
      diffs.push({ type: 'unchanged', text: line, num: lineNum++ });
      continue;
    }
    if (!origSet.has(line.trim())) {
      diffs.push({ type: 'added', text: line, num: lineNum++ });
    } else {
      diffs.push({ type: 'unchanged', text: line, num: lineNum++ });
    }
  }
  
  for (const line of origLines) {
    if (line.trim() !== '' && !modSet.has(line.trim())) {
      diffs.push({ type: 'removed', text: line });
    }
  }
  
  return diffs;
}

export function DiffModal({ isOpen, onClose, originalText, modifiedText, label }: DiffModalProps) {
  const diffs = useMemo(() => {
    if (!isOpen) return [];
    return computeLineDiff(originalText, modifiedText);
  }, [isOpen, originalText, modifiedText]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 100000,
          background: 'rgba(5, 5, 5, 0.9)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.98 }}
          transition={{ duration: 0.2 }}
          style={{
            background: 'var(--bg)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 16, width: '100%', maxWidth: 900, maxHeight: '90vh',
            display: 'flex', flexDirection: 'column', boxShadow: '0 30px 80px rgba(0,0,0,0.8)'
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 style={{ margin: 0, fontSize: 16, fontFamily: 'var(--display)', color: 'var(--fg)', letterSpacing: 1 }}>Compare with {label}</h3>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer' }}><X size={18} /></button>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: 20, fontFamily: 'var(--mono)', fontSize: 13, lineHeight: 1.6 }}>
            {diffs.map((d, i) => (
              <div key={i} style={{ 
                display: 'flex', gap: 16, padding: '2px 8px', borderRadius: 4,
                background: d.type === 'added' ? 'rgba(16, 185, 129, 0.15)' : d.type === 'removed' ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                color: d.type === 'added' ? '#34d399' : d.type === 'removed' ? '#f87171' : 'var(--fg-muted)'
              }}>
                <span style={{ width: 40, textAlign: 'right', color: 'rgba(255,255,255,0.2)', userSelect: 'none' }}>
                  {d.type === 'added' ? '+' : d.type === 'removed' ? '-' : d.num}
                </span>
                <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', flex: 1 }}>
                  {d.text || ' '}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
