'use client';

import React from 'react';
import { Eye } from 'lucide-react';
import { setViewAs, useViewAs, VIEW_AS_LABEL, type ViewAsMode } from '@/lib/os/viewAs';

const MODES: ViewAsMode[] = ['owner', 'crew', 'outsider'];

const NOTE: Record<ViewAsMode, string> = {
  owner: '',
  crew: 'Previewing as crew: the controls a crew member sees. Your real access has not changed.',
  outsider: 'Previewing as an outsider: someone with no link and no invite sees nothing of this project.',
};

/** The owner's switch: Me · Crew · Outsider. Shown only to the project's real owner. */
export function ViewAsSwitch({ projectId }: { projectId: string }) {
  const mode = useViewAs(projectId);
  return (
    <div role="group" aria-label="View this project as" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <Eye size={13} aria-hidden style={{ color: 'var(--fg-muted)' }} />
      <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>View as</span>
      <span style={{ display: 'inline-flex', border: '1px solid rgba(var(--ink-rgb), 0.14)', borderRadius: 8, overflow: 'hidden' }}>
        {MODES.map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => setViewAs(projectId, m)}
            style={{ padding: '4px 10px', fontSize: 12, cursor: 'pointer', border: 'none', background: mode === m ? 'rgba(var(--ink-rgb), 0.14)' : 'transparent', color: 'var(--fg)' }}
          >{VIEW_AS_LABEL[m]}</button>
        ))}
      </span>
    </div>
  );
}

/** A bar across the page while previewing, with the way back. Renders nothing in the real view. */
export function ViewAsBanner({ projectId }: { projectId: string }) {
  const mode = useViewAs(projectId);
  if (mode === 'owner') return null;
  return (
    <div role="status" style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap', padding: '8px 16px', background: 'var(--warn)', color: '#1a1200', fontSize: 13 }}>
      <span>{NOTE[mode]}</span>
      <button type="button" onClick={() => setViewAs(projectId, 'owner')} style={{ padding: '3px 10px', borderRadius: 8, border: '1px solid rgba(26,18,0,0.4)', background: 'transparent', color: 'inherit', cursor: 'pointer', fontSize: 12 }}>Back to me</button>
    </div>
  );
}

/** What an outsider sees of a project: the same as a project that does not exist. */
export function OutsiderPreview({ projectId }: { projectId: string }) {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
      <ViewAsBanner projectId={projectId} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24, textAlign: 'center' }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>This page doesn’t exist.</h1>
        <p style={{ margin: 0, color: 'var(--fg-muted)', maxWidth: 44 + 'ch' }}>Check the link, or head back home. An outsider gets exactly this: no title, no crew, no files.</p>
      </div>
    </div>
  );
}
