'use client';

/**
 * The hub's top strip: who's online and the task tally — status only.
 * Back, title and project live in the island, and the owner's controls
 * (visibility, view-as, logo, announcements) live in the office section
 * at the foot of the hub: the admin stack used to open the page, and the
 * owner hated the look of that (Nov 26, 2026).
 */
export function HubTopBar({
  onlineCount, tasks, tasksDone,
}: {
  onlineCount: number;
  tasks: number;
  tasksDone: number;
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
      </div>
    </div>
  );
}
