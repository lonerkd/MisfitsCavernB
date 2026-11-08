'use client';

import Link from 'next/link';
import { ArrowLeft, ChevronDown, Layers, MoreHorizontal, PanelRight } from 'lucide-react';
import type { EditorCtx } from './editorCtx';

export const VIEW_LABELS: Record<EditorCtx['activeView'], string> = { write: 'Write', board: 'Board', outline: 'Outline', preview: 'Preview', stats: 'Stats' };

const tap = { minWidth: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, background: 'transparent', border: 'none', color: 'var(--fg)', cursor: 'pointer', borderRadius: 14, padding: '0 8px', fontSize: 14 } as const;

/**
 * The editor's top bar on a phone: back, the script (tap for the list of scripts and scenes), the view, the tools and a "more"
 * sheet. Nothing scrolls sideways and nothing is hidden: every action the desk bar has is one of these four doors. Held
 * sideways while typing it shrinks to a slim strip so the page keeps the screen.
 */
export function PhoneEditorBar({ ctx, slim, onScripts, onViews, onTools, onMore }: { ctx: EditorCtx; slim: boolean; onScripts: () => void; onViews: () => void; onTools: () => void; onMore: () => void }) {
  const { currentScript, activeView, saving } = ctx;
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 2,
      height: slim ? 40 : 52, boxSizing: 'content-box',
      paddingTop: 'env(safe-area-inset-top)', paddingLeft: 'max(4px, env(safe-area-inset-left))', paddingRight: 'max(4px, env(safe-area-inset-right))',
      background: 'var(--surface)', borderBottom: '1px solid rgba(var(--ink-rgb), 0.06)',
    }}>
      <Link href="/projects" aria-label="Back to projects" style={{ ...tap, color: 'var(--fg-muted)' }}><ArrowLeft size={20} /></Link>
      <button type="button" onClick={onScripts} aria-label="Scripts and scenes" style={{ ...tap, flex: 1, minWidth: 0, justifyContent: 'flex-start', fontWeight: 600, fontSize: 16 }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentScript?.title || 'Untitled'}</span>
        {saving && <span aria-live="polite" style={{ fontSize: 11, color: 'var(--fg-muted)', fontWeight: 400 }}>Saving…</span>}
      </button>
      <button type="button" onClick={onViews} aria-label={`View: ${VIEW_LABELS[activeView]}. Change view`} style={tap}><Layers size={18} /><span>{VIEW_LABELS[activeView]}</span><ChevronDown size={14} /></button>
      <button type="button" onClick={onTools} aria-label="Tools: breakdown, notes, references, history" style={tap}><PanelRight size={20} /></button>
      <button type="button" onClick={onMore} aria-label="More: save, export, share, find" style={tap}><MoreHorizontal size={20} /></button>
    </header>
  );
}
