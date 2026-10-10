'use client';

import React from 'react';
import Link from 'next/link';
import {
  Archive, BookOpen, Briefcase, Calendar, Clapperboard, DollarSign, Film, Globe, History,
  Lock, Maximize2, Megaphone, Music, PenTool, Tags, Timer, Trophy, UserSquare, Users, type LucideIcon,
} from 'lucide-react';
import { readable, textOnReadable } from '@/lib/util/color';
import { placeHref, type Place, type ToolId, type ToolState } from '@/lib/os/progress';
import p from './progress.module.css';

export const TOOL_ICON: Record<ToolId, LucideIcon> = {
  script: PenTool, library: Archive, story: BookOpen, pitch: Maximize2, soundtrack: Music,
  scenes: Clapperboard, breakdown: Tags, revisions: History, schedule: Calendar, crew: Users, budget: DollarSign, share: Globe, jobs: Briefcase,
  onset: Timer, post: Film, promos: Megaphone, festivals: Trophy, portfolio: UserSquare,
};

/**
 * The project accent as CSS variables, legible on the panels, with the ink for
 * text on a fill of it. Pass the accent as chosen (a hex colour). Anything
 * else — the theme's `var(--accent)`, an already-adjusted colour — can't be
 * measured here, so it takes the theme's own ink for its accent rather than a
 * guess (white on the suite's orange is 4:1, under AA).
 */
export function accentVars(accent: string | null | undefined): React.CSSProperties {
  const raw = accent || '#e8431a';
  const measurable = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw.trim());
  return { ['--pa' as string]: readable(raw), ['--pa-ink' as string]: measurable ? textOnReadable(raw) : 'var(--on-accent)' };
}

/** Goes to a place: in-page when the host handles it (the Studio switching tabs), else a link. */
export function PlaceLink({ place, projectId, onNavigate, className, children, label }: {
  place: Place;
  projectId: string;
  onNavigate?: (place: Place) => boolean;
  className: string;
  children: React.ReactNode;
  label?: string;
}) {
  const href = placeHref(place, projectId);
  return (
    <Link
      href={href}
      className={className}
      aria-label={label}
      onClick={(e) => {
        if (place.kind === 'hub' && place.anchor && window.location.pathname === `/projects/${projectId}`) {
          const el = document.getElementById(place.anchor);
          if (el) { e.preventDefault(); el.scrollIntoView({ behavior: 'smooth', block: 'start' }); el.querySelector<HTMLElement>('textarea, input, button')?.focus({ preventScroll: true }); }
          return;
        }
        if (onNavigate?.(place)) e.preventDefault();
      }}
    >
      {children}
    </Link>
  );
}

/** One tool as a Lego brick: open ones link to the tool; locked ones say when they open. */
export function Brick({ tool, projectId, onNavigate }: { tool: ToolState; projectId: string; onNavigate?: (place: Place) => boolean }) {
  const Icon = TOOL_ICON[tool.id];
  if (!tool.unlocked) {
    return (
      <div className={`${p.brick} ${p.brickLocked}`}>
        <span className={p.brickIcon} aria-hidden><Icon size={15} /></span>
        <span className={p.brickLabel}>{tool.label}</span>
        <span className={p.lockLine}><Lock size={9} aria-hidden /> Opens in {tool.phaseLabel}</span>
      </div>
    );
  }
  return (
    <PlaceLink place={tool.place} projectId={projectId} onNavigate={onNavigate} className={p.brick}>
      {tool.early && <span className={p.brickTag}>Early</span>}
      <span className={p.brickIcon} aria-hidden><Icon size={15} /></span>
      <span className={p.brickLabel}>{tool.label}</span>
      <span className={p.brickBlurb}>{tool.blurb}</span>
    </PlaceLink>
  );
}
