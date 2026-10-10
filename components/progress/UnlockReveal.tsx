'use client';

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import type { Place, ToolState } from '@/lib/os/progress';
import { Brick } from './Bricks';
import p from './progress.module.css';

/**
 * The moment a project reaches a new phase: its tools snap into place.
 * Framer's MotionConfig (components/ui/MotionPreference) turns the motion off
 * for people who asked for less.
 */
export function UnlockReveal({ phaseLabel, tools, projectId, style, onClose, onNavigate }: {
  phaseLabel: string;
  tools: ToolState[];
  projectId: string;
  style: React.CSSProperties;
  onClose: () => void;
  onNavigate?: (place: Place) => boolean;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      // Keep focus inside the dialog.
      const items = dialogRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); previous?.focus?.(); };
  }, [onClose]);

  // Portalled: the pages that show it keep their content in a layer of its own, under the dock.
  return createPortal(
    <div className={p.scope} style={style}>
    <motion.div className={p.backdrop} initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose}>
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="unlock-title"
        aria-describedby="unlock-text"
        className={p.reveal}
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={p.revealEyebrow}>Phase unlocked</div>
        <h2 id="unlock-title" className={p.revealTitle}>{phaseLabel}</h2>
        <p id="unlock-text" className={p.revealText}>
          {tools.length ? `${tools.length === 1 ? 'A new tool snaps' : `${tools.length} new tools snap`} into your project.` : 'Everything you need is already open.'}
        </p>
        {tools.length > 0 && (
          <div className={p.revealBricks}>
            {tools.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: -28, rotate: -4 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                transition={{ delay: 0.25 + i * 0.12, type: 'spring', stiffness: 420, damping: 22 }}
              >
                <Brick tool={t} projectId={projectId} onNavigate={(place) => { onClose(); return onNavigate?.(place) ?? false; }} />
              </motion.div>
            ))}
          </div>
        )}
        <button ref={closeRef} type="button" className={p.primary} onClick={onClose}>Let’s build</button>
      </motion.div>
    </motion.div>
    </div>,
    document.body,
  );
}
