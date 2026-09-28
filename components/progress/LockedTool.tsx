'use client';

import React, { createContext, useContext } from 'react';
import { Lock } from 'lucide-react';
import type { ProjectProgressState } from '@/lib/hooks/useProjectProgress';
import type { ToolState } from '@/lib/os/progress';
import { TOOL_ICON, accentVars } from './Bricks';
import p from './progress.module.css';

/** The Studio's project progress, read once and shared by its tabs. */
export const ProgressContext = createContext<ProjectProgressState | null>(null);
export function useProgressContext() {
  return useContext(ProgressContext);
}

/**
 * A tool before its phase. Not a wall: it says when it opens and why, and
 * lets you look now — early work (a cut during the shoot) opens it for good.
 */
export function LockedTool({ tool, accent, onOpen, onShowPhase }: { tool: ToolState; accent?: string | null; onOpen: () => void; onShowPhase?: () => void }) {
  const Icon = TOOL_ICON[tool.id];
  return (
    <section className={p.locked} style={accentVars(accent)} aria-labelledby={`locked-${tool.id}`}>
      <div className={p.lockedIcon} aria-hidden><Icon size={22} /></div>
      <h2 id={`locked-${tool.id}`} className={p.lockedTitle}>{tool.label}</h2>
      <p className={p.lockedText}>
        <Lock size={10} aria-hidden style={{ verticalAlign: '-1px', marginRight: 4 }} />
        Opens in {tool.phaseLabel}. {tool.blurb} It joins the project when you get there — or as soon as you start using it.
      </p>
      <div className={p.lockedActions}>
        <button type="button" className={p.primary} onClick={onOpen}>Open it now</button>
        {onShowPhase && <button type="button" className={p.ghost} onClick={onShowPhase}>See this phase’s milestones</button>}
      </div>
    </section>
  );
}
