'use client';

import type { ReactNode } from 'react';
import { ArrowRightToLine, ChevronDown, ChevronLeft, ChevronRight, MoreHorizontal, PanelRight, Redo2, Search, StickyNote, Undo2 } from 'lucide-react';

const ELEMENTS: Array<[string, string]> = [['scene', 'Scene'], ['action', 'Action'], ['character', 'Character'], ['dialogue', 'Dialogue'], ['transition', 'Transition']];

export interface PhoneToolStripProps {
  bottom: number;
  compact?: boolean;
  insert: (type: string) => void;
  /** Tab on a desk keyboard: cycle this line's element type (a phone keyboard has no Tab). */
  cycle: (reverse: boolean) => void;
  undo: () => void;
  redo: () => void;
  prevScene: () => void;
  nextScene: () => void;
  find: () => void;
  notes: () => void;
  tools: () => void;
  more: () => void;
  /** Put the keyboard away (the text stays). */
  hideKeyboard: () => void;
}

/**
 * What a phone keyboard lacks, on top of it. With the keyboard up half the screen is gone and there is no Tab, no Ctrl-Z, no
 * Ctrl-F; this strip keeps the writer's tools in the other half: put the keyboard away, undo and redo, change the line's
 * element type, hop between scenes, insert an element, find, notes, the tool sheet and the menu. It scrolls sideways (the one
 * place that is right: a row of tools), and `pointerdown` is cancelled on every button so the keyboard and the caret stay.
 */
export function PhoneToolStrip(p: PhoneToolStripProps) {
  const h = p.compact ? 40 : 44;
  const btn = (key: string, label: string, run: () => void, icon?: ReactNode, text = true) => (
    <button key={key} type="button" aria-label={label} onPointerDown={(e) => e.preventDefault()} onClick={run}
      style={{ flex: '0 0 auto', minHeight: h, minWidth: h, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: text && !icon ? '0 14px' : icon && text ? '0 12px' : 0, borderRadius: 14, border: '1px solid rgba(var(--ink-rgb), 0.12)', background: 'var(--bg)', color: 'var(--fg)', fontSize: 14, cursor: 'pointer' }}>
      {icon}{text && icon ? <span>{label}</span> : !icon ? label : null}
    </button>
  );
  const sep = (k: string) => <span key={k} aria-hidden style={{ flex: '0 0 1px', alignSelf: 'stretch', margin: '6px 2px', background: 'var(--border)' }} />;
  return (
    <div role="toolbar" aria-label="Writing tools" style={{
      position: 'fixed', left: 0, right: 0, bottom: p.bottom, zIndex: 150, display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto', WebkitOverflowScrolling: 'touch',
      padding: p.compact ? '4px 12px' : '8px 12px', background: 'var(--surface)', borderTop: '1px solid rgba(var(--ink-rgb), 0.08)',
      paddingLeft: 'max(12px, env(safe-area-inset-left))', paddingRight: 'max(12px, env(safe-area-inset-right))',
    }}>
      {btn('hide', 'Put the keyboard away', p.hideKeyboard, <ChevronDown size={20} />, false)}
      {btn('undo', 'Undo', p.undo, <Undo2 size={18} />, false)}
      {btn('redo', 'Redo', p.redo, <Redo2 size={18} />, false)}
      {sep('s1')}
      {btn('type', 'Change element type', () => p.cycle(false), <ArrowRightToLine size={18} />, false)}
      {btn('prev', 'Previous scene', p.prevScene, <ChevronLeft size={18} />, false)}
      {btn('next', 'Next scene', p.nextScene, <ChevronRight size={18} />, false)}
      {sep('s2')}
      {ELEMENTS.map(([type, label]) => btn(type, label, () => p.insert(type)))}
      {sep('s3')}
      {btn('find', 'Find and replace', p.find, <Search size={18} />, false)}
      {btn('notes', 'Notes', p.notes, <StickyNote size={18} />, false)}
      {btn('tools', 'Tools', p.tools, <PanelRight size={18} />, false)}
      {btn('more', 'More', p.more, <MoreHorizontal size={18} />, false)}
    </div>
  );
}
