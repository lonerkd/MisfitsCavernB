'use client';

import React, { createContext, useContext } from 'react';
import { Lock } from 'lucide-react';
import type { ProjectProgressState } from '@/lib/hooks/useProjectProgress';
import type { Place, ToolState } from '@/lib/os/progress';
import { TOOL_ICON, PlaceLink, accentVars } from './Bricks';
import { lockNeeds } from '@/lib/os/phase-needs';
import p from './progress.module.css';

/** The Studio's project progress, read once and shared by its tabs. */
export const ProgressContext = createContext<ProjectProgressState | null>(null);
export function useProgressContext() {
  return useContext(ProgressContext);
}

/**
 * A tool before its phase. Not a wall: it says what it takes to open it (the milestones still to finish, each with who usually does it
 * and a link to where it is done), what opens it early (the work it holds has started), which roles work in it, and lets you look now.
 */
export function LockedTool({ tool, accent, projectId, isOwner, onOpen, onShowPhase, onNavigate }: {
  tool: ToolState;
  accent?: string | null;
  projectId?: string | null;
  isOwner?: boolean;
  onOpen: () => void;
  onShowPhase?: () => void;
  onNavigate?: (place: Place) => boolean;
}) {
  const Icon = TOOL_ICON[tool.id];
  const ctx = useProgressContext();
  const needs = ctx?.progress ? lockNeeds(ctx.progress, tool) : null;
  const left = needs ? needs.steps.filter((x) => !x.done) : [];
  return (
    <section className={p.locked} style={accentVars(accent)} aria-labelledby={`locked-${tool.id}`}>
      <div className={p.lockedIcon} aria-hidden><Icon size={22} /></div>
      <h2 id={`locked-${tool.id}`} className={p.lockedTitle}>{tool.label}</h2>
      <p className={p.lockedText}>
        <span className={p.lockedLine}><Lock size={11} aria-hidden className={p.lockedGlyph} /><span>Opens in {tool.phaseLabel}. {tool.blurb}</span></span>
      </p>

      {needs && (
        <div className={p.needs}>
          <h3 className={p.needsHead}>{left.length ? `Before ${needs.phaseLabel}: ${left.length} to finish` : `Before ${needs.phaseLabel}: everything is done`}</h3>
          {left.length > 0 && (
            <ul className={p.needsList}>
              {left.slice(0, 3).map((m) => (
                <li key={m.id} className={p.needsItem}>
                  <div style={{ minWidth: 0 }}>
                    <div className={p.mLabel}>{m.label}</div>
                    <div className={p.mHint}>{m.hint}</div>
                    {m.roles.length > 0 && <div className={p.mWho}>Usually: {m.roles.join(', ')}</div>}
                    {m.progress && <div className={p.mHint}>{m.progress.value} of {m.progress.of}</div>}
                  </div>
                  {projectId && <PlaceLink place={m.place} projectId={projectId} onNavigate={onNavigate} className={p.go} label={`Go: ${m.label}`}>Go</PlaceLink>}
                </li>
              ))}
              {left.length > 3 && <li className={p.mHint}>and {left.length - 3} more in the phase panel</li>}
            </ul>
          )}
          {needs.ready && <p className={p.mHint}>{isOwner ? `Every milestone is done: move the project to ${needs.phaseLabel} from the Overview.` : `Every milestone is done: the project’s owner can move it to ${needs.phaseLabel}.`}</p>}
          {needs.earlyOpens && <p className={p.mHint}><strong>Or start the work:</strong> {needs.earlyOpens}</p>}
          {needs.roles.length > 0 && <p className={p.mWho}>Works in it: {needs.roles.slice(0, 6).join(', ')}</p>}
        </div>
      )}

      <div className={p.lockedActions}>
        <button type="button" className={p.primary} onClick={onOpen}>Open it now</button>
        {onShowPhase && <button type="button" className={p.ghost} onClick={onShowPhase}>See this phase’s milestones</button>}
      </div>
    </section>
  );
}
