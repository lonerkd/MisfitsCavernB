'use client';

import { PROJECT_VISIBILITY } from '@/lib/supabase/projects';
import type { ProjectHubViewModel } from './types';

/**
 * Who can see the project, plus the share-link copy when visibility is
 * link. One of the owner's controls in the hub's office section at the foot
 * of the page — it used to sit in the top strip, where the admin stack
 * opened the page (owner, Nov 26 2026: that stack should not lead).
 */
export function VisibilityPicker({
  visibility, onVisibilityChange, onCopyShareLink,
}: {
  visibility: ProjectHubViewModel['visibility'];
  onVisibilityChange: (v: 'private' | 'team' | 'link' | 'public') => void;
  onCopyShareLink: () => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <span aria-hidden style={{ fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)', color: 'var(--fg-dim)' }}>Visible to</span>
      <select
        value={visibility}
        onChange={e => onVisibilityChange(e.target.value as 'private' | 'team' | 'link' | 'public')}
        aria-label="Project visibility"
        title="Who can see this project"
        style={{
          fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)', color: 'var(--fg-muted)',
          background: 'rgba(var(--ink-rgb), 0.04)', border: '1px solid rgba(var(--ink-rgb), 0.1)',
          borderRadius: 8, padding: '5px 8px', cursor: 'pointer', outline: 'none', maxWidth: '100%',
        }}
      >
        {PROJECT_VISIBILITY.map(v => (
          <option key={v.id} value={v.id}>{v.label}</option>
        ))}
      </select>
      {visibility === 'link' && (
        <button
          onClick={onCopyShareLink}
          title="Copy the share link — anyone with it can view this project"
          style={{
            fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)', color: 'var(--jobs-text)',
            background: 'color-mix(in srgb, var(--jobs-color) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--jobs-color) 30%, transparent)',
            borderRadius: 8, padding: '5px 10px', cursor: 'pointer', whiteSpace: 'nowrap',
          }}
        >Copy link</button>
      )}
    </div>
  );
}
