'use client';

import { PROJECT_VISIBILITY } from '@/lib/supabase/projects';
import type { ProjectHubViewModel } from './types';

/**
 * The hub's top strip: who's online, the task tally, and — for the owner —
 * the visibility picker with its share-link copy. Back, title and project
 * live in the island; this is the project's own tools.
 */
export function HubTopBar({
  onlineCount, tasks, tasksDone, ownerView, visibility, onVisibilityChange, onCopyShareLink,
}: {
  onlineCount: number;
  tasks: number;
  tasksDone: number;
  ownerView: boolean;
  visibility: ProjectHubViewModel['visibility'];
  onVisibilityChange: (v: 'private' | 'team' | 'link' | 'public') => void;
  onCopyShareLink: () => void;
}) {
  return (
    <div className="mc-project-top" style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'flex-end', padding: '16px 28px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {onlineCount > 0 && (
          <div className="mc-hide-phone" style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', color: 'var(--ok)', letterSpacing: 'var(--caps-track)' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--success)', display: 'inline-block', animation: 'pulse 2.5s ease-in-out infinite' }} />
            {onlineCount} online
          </div>
        )}
        {tasks > 0 && (
        <div title="Tasks completed" className="mc-hide-phone" style={{
          fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)', letterSpacing: 'var(--caps-track)',
          padding: '5px 10px', borderRadius: 8, background: 'rgba(var(--ink-rgb), 0.04)',
        }}>
          {tasksDone}/{tasks} tasks done
        </div>
        )}
        {ownerView && (
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
        )}
      </div>
    </div>
  );
}
