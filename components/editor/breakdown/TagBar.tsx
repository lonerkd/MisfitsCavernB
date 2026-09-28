'use client';

import React from 'react';
import { Check, X } from 'lucide-react';
import type { BreakdownCategory } from '@/lib/breakdown';
import type { Mark } from '@/lib/breakdown/marks';
import { CategoryChips, catStyle } from '@/components/breakdown/CategoryChips';
import b from '@/components/breakdown/breakdown.module.css';

/**
 * Floats under the line being worked on in breakdown mode. With text selected:
 * pick a category to tag it. On a highlighted word: accept or dismiss a
 * suggestion, or open/untag a tagged element.
 */
export function TagBar({ top, left, selection, mark, categories, onTag, onAccept, onDismiss, onUntag, onOpen, onClose }: {
  top: number;
  left: number;
  selection: string | null;
  mark: Mark | null;
  categories: BreakdownCategory[];
  onTag: (name: string, category: BreakdownCategory) => void;
  onAccept: (mark: Mark, categoryId: string) => void;
  onDismiss: (mark: Mark) => void;
  onUntag: (mark: Mark) => void;
  onOpen: (mark: Mark) => void;
  onClose: () => void;
}) {
  const categoryOf = (id: string) => categories.find((c) => c.id === id);

  if (selection) {
    return (
      <div className={b.bar} style={{ top, left }} role="dialog" aria-label={`Tag “${selection}”`}>
        <div className={b.barHead}>
          Tag <span className={b.barName}>“{selection}”</span> as
          <span className={b.barHint}>Alt+1–9 · Esc</span>
          <button type="button" className={b.iconBtn} aria-label="Close" onMouseDown={(e) => e.preventDefault()} onClick={onClose}><X size={12} /></button>
        </div>
        <CategoryChips categories={categories} numbered label="Categories" onPick={(c) => onTag(selection, c)} />
      </div>
    );
  }

  if (!mark) return null;
  const cat = categoryOf(mark.categoryId);
  if (mark.kind === 'tag') {
    return (
      <div className={b.bar} style={{ top, left }} role="dialog" aria-label={`${mark.name}, tagged`}>
        <div className={b.barHead}>
          <span className={b.dot} style={catStyle(mark.color)} aria-hidden />
          <span className={b.barName}>{mark.name}</span> · {cat?.label ?? 'Tagged'}
          <span className={b.barHint}>Alt+⌫ untag</span>
        </div>
        <div className={b.barActions}>
          <button type="button" className={b.btn} onMouseDown={(e) => e.preventDefault()} onClick={() => onOpen(mark)}>Open element</button>
          <button type="button" className={b.btn} onMouseDown={(e) => e.preventDefault()} onClick={() => onUntag(mark)}>Untag in this scene</button>
        </div>
      </div>
    );
  }
  return (
    <div className={b.bar} style={{ top, left }} role="dialog" aria-label={`Suggestion: ${mark.name}`}>
      <div className={b.barHead}>
        Suggested <span className={b.barName}>{mark.name}</span>
        <span className={b.barHint}>Alt+↵ tag · Alt+⌫ dismiss</span>
      </div>
      <CategoryChips categories={categories} selected={mark.categoryId} label="Tag as" onPick={(c) => onAccept(mark, c.id)} />
      <div className={b.barActions}>
        <button type="button" className={`${b.btn} ${b.btnYes}`} onMouseDown={(e) => e.preventDefault()} onClick={() => onAccept(mark, mark.categoryId)}>
          <Check size={12} aria-hidden /> Tag as {cat?.label ?? 'suggested'}
        </button>
        <button type="button" className={`${b.btn} ${b.btnNo}`} onMouseDown={(e) => e.preventDefault()} onClick={() => onDismiss(mark)}>
          <X size={12} aria-hidden /> Not an element
        </button>
      </div>
    </div>
  );
}
