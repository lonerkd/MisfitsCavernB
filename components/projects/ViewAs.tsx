'use client';

import React from 'react';
import { Eye } from 'lucide-react';
import { setViewAs, setViewAsRole, useViewAs, useViewAsRole, VIEW_AS_LABEL, type PreviewTier, type ViewAsMode } from '@/lib/os/viewAs';
import { CraftPicker } from '@/components/crafts/CraftPicker';
import { useRoleSentence } from '@/lib/roles/capabilities';

const MODES: ViewAsMode[] = ['owner', 'crew', 'outsider'];

const NOTE: Record<ViewAsMode, string> = {
  owner: '',
  crew: '',
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
      {mode === 'crew' && <RolePicker projectId={projectId} />}
    </div>
  );
}

/** While previewing as crew: which craft and access to preview as. */
function RolePicker({ projectId }: { projectId: string }) {
  const role = useViewAsRole(projectId);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <CraftPicker label="Preview as craft" value={role.craft} onChange={(craft) => setViewAsRole(projectId, { ...role, craft })} placeholder="Any crew member" noneLabel="No craft" />
      <select
        aria-label="Preview with access"
        value={role.tier}
        onChange={(e) => setViewAsRole(projectId, { ...role, tier: e.target.value as PreviewTier })}
        style={{ fontSize: 12, padding: '4px 6px', borderRadius: 8, background: 'var(--bg-2)', color: 'var(--fg)', border: '1px solid rgba(var(--ink-rgb), 0.14)' }}
      >
        <option value="contributor">Crew access</option>
        <option value="lead">Lead access</option>
        <option value="viewer">View only</option>
      </select>
    </span>
  );
}

/** The preview state and the way back, inline with the switch on the project page — shown only
 *  while previewing (owner, Nov 27, 2026: only when you need it, never a bar pinned to the top
 *  of every screen). The outsider screen keeps its own, as the way off a dead end. */
export function ViewAsBanner({ projectId }: { projectId: string }) {
  const mode = useViewAs(projectId);
  const role = useViewAsRole(projectId);
  const sentence = useRoleSentence(role.craft, role.tier);
  if (mode === 'owner') return null;
  return (
    <div role="status" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '8px 12px', borderRadius: 12, background: 'color-mix(in srgb, var(--warn) 16%, transparent)', border: '1px solid color-mix(in srgb, var(--warn) 55%, var(--border))', color: 'var(--fg)', fontSize: 13 }}>
      <span>{mode === 'crew'
        ? `Previewing as ${role.craft ?? 'a crew member'}: ${sentence ? `${sentence} ` : ''}The screens show what this role sees; your real access has not changed.`
        : NOTE[mode]}</span>
      <button type="button" onClick={() => setViewAs(projectId, 'owner')} style={{ padding: '3px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'inherit', cursor: 'pointer', fontSize: 12 }}>Back to me</button>
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
