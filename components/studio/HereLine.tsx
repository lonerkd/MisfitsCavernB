'use client';

import React, { useEffect } from 'react';
import { usePresence } from '@/lib/os/PresenceContext';
import { useCurrentUser } from '@/lib/os';
import { hereLine, othersInTool } from '@/lib/studio/tool-presence';
import h from './toolHeader.module.css';

/** For a project page outside the Studio's tabs: names this page in the project's presence room and says who else has it open. Nothing shows when nobody does. */
export function HereLine({ tool }: { tool: string }) {
  const { onlineUsers, updateToolPresence } = usePresence();
  const { user } = useCurrentUser();
  useEffect(() => {
    void updateToolPresence(tool);
    return () => { void updateToolPresence(null); };
  }, [tool, updateToolPresence]);
  const others = othersInTool(onlineUsers, tool, user?.id);
  const line = hereLine(others);
  if (!line) return null;
  return (
    <span className={h.here} role="status">
      <span className={h.dots} aria-hidden>{others.slice(0, 4).map((o) => <span key={o.userId} className={h.dot} style={{ background: o.color }} />)}</span>
      {line}
    </span>
  );
}
