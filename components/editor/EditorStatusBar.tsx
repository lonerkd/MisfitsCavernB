import React from 'react';
import { SyncStatusChip } from '@/components/editor/SyncStatusChip';
import type { useScriptSync } from '@/lib/scriptos/sync';
import type { useSprint } from '@/components/editor/WritingLoop';

// The editor's status bar (restructure phase 7 — moved out of the editor
// page unchanged): title and draft state on the left, counts, collaborators
// and the sync state on the right. One line at every width.
export function EditorStatusBar({ title, revisionMode, sprint, pageEst, sceneCount, wordCount, collaborators, isSyncing, hidden }: {
  title: string;
  revisionMode: boolean;
  sprint: Pick<ReturnType<typeof useSprint>, 'active' | 'running' | 'left' | 'words'>;
  pageEst: number;
  sceneCount: number;
  wordCount: number;
  collaborators: ReturnType<typeof useScriptSync>['collaborators'];
  isSyncing: boolean;
  hidden: boolean;
}) {
  return (
    <div data-testid="editor-status" style={{
      height: 26,
      overflow: 'hidden',
      background: 'var(--surface)',
      backdropFilter: 'blur(12px)',
      borderTop: '1px solid rgba(var(--ink-rgb), 0.04)',
      display: hidden ? 'none' : 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 clamp(12px, 4vw, 20px)',
      paddingBottom: 'env(safe-area-inset-bottom)', boxSizing: 'content-box',
      fontFamily: 'var(--mono)', fontSize: 'max(8.5px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)',
      color: 'var(--fg-dim)',
      zIndex: 50, flexShrink: 0,
    }}>
      {/* One line at every width: the title gives way (ellipsis), the counts don't wrap. */}
      <div style={{ display: 'flex', gap: 'clamp(8px, 3vw, 20px)', alignItems: 'center', minWidth: 0, flex: 1, whiteSpace: 'nowrap' }}>
        <span title={title} style={{ color: 'var(--fg-muted)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
        <span style={{
          flexShrink: 0,
          padding: '1px 7px', borderRadius: 4,
          background: revisionMode ? 'rgba(99,102,241,0.12)' : 'rgba(var(--ink-rgb), 0.04)',
          color: revisionMode ? 'var(--violet)' : 'var(--fg-dim)',
          letterSpacing: 'var(--caps-track)',
        }}>
          {revisionMode ? 'REVISION' : 'DRAFT'}
        </span>
        {(sprint.active || sprint.running) && (
          <span style={{ color: 'var(--violet)', letterSpacing: 'var(--caps-track)' }}>
            ◉ {Math.floor(sprint.left / 60).toString().padStart(2, '0')}:{(sprint.left % 60).toString().padStart(2, '0')} · {sprint.words}w
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 'clamp(8px, 3vw, 20px)', alignItems: 'center', flexShrink: 0, whiteSpace: 'nowrap', marginLeft: 12 }}>
        <span>{pageEst} pg</span>
        <span className="mc-hide-phone">{sceneCount} sc</span>
        <span>{wordCount.toLocaleString()} wds</span>
        {collaborators.length > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }} title={collaborators.map(c => `${c.username}${c.line ? ` · line ${c.line}` : ''}`).join('\n')}>
            <span style={{ display: 'flex' }}>
              {collaborators.slice(0, 4).map((c, i) => (
                <span key={c.userId} style={{ width: 16, height: 16, borderRadius: '50%', background: c.color, color: 'var(--on-accent)', fontSize: 'max(8px, var(--mc-min-font, 0px))', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #0a0a0a', marginLeft: i === 0 ? 0 : -5, textTransform: 'var(--caps)' }}>
                  {c.username.charAt(0)}
                </span>
              ))}
            </span>
            <span style={{ color: 'var(--fg-muted)', fontSize: 11 }}>{collaborators.length} editing</span>
          </span>
        )}
        <SyncStatusChip />
        <span style={{
          display: 'flex', alignItems: 'center', gap: 5,
          color: isSyncing ? 'var(--violet)' : 'var(--ok)',
        }}>
          <span style={{
            width: 5, height: 5, borderRadius: '50%',
            background: isSyncing ? 'var(--violet)' : 'var(--ok)',
            animation: isSyncing ? 'pulse 1.5s ease-in-out infinite' : 'none',
            display: 'inline-block',
          }} />
          {isSyncing ? 'Syncing' : 'Synced'}
        </span>
      </div>
    </div>
  );
}
