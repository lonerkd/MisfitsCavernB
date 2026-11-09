'use client';

import React from 'react';
import { readable } from '@/lib/util/color';
import h from './toolHeader.module.css';

export interface ToolHeaderProps {
  icon: React.ReactNode;
  /** The group it lives in ("Money", "Pre-production"). */
  eyebrow?: string;
  title: string;
  /** What the tool is for, in one line. */
  purpose?: string;
  /** Live counts in one line ("3 of 8 ready · 2 pending"). */
  summary?: React.ReactNode;
  /** The project's colour. */
  accent?: string | null;
  /** How far along the tool's data is. Shown as a bar and "n of m". */
  progress?: { value: number; of: number; label?: string } | null;
  stats?: Array<{ label: string; value: string | number }>;
  /** What to do next when the tool's data is incomplete (the project page's hint voice). Omit when there is nothing to do. */
  next?: { text: string; action?: React.ReactNode } | null;
  /** Print / CSV / Share, in one row. */
  actions?: React.ReactNode;
}

/** The one header every Studio tool opens with: what it is, where it stands, what is next, and its actions. The project page's phase panel, scaled to a tool. */
export function ToolHeader({ icon, eyebrow, title, purpose, summary, accent, progress, stats, next, actions }: ToolHeaderProps) {
  const pa = accent ? readable(accent) : undefined;
  const pct = progress && progress.of > 0 ? Math.min(100, Math.round((progress.value / progress.of) * 100)) : null;
  return (
    <header className={h.head} style={pa ? ({ '--pa': pa } as React.CSSProperties) : undefined}>
      <div className={h.top}>
        <span className={h.icon} aria-hidden>{icon}</span>
        <div className={h.text}>
          {eyebrow && <div className={h.eyebrow}>{eyebrow}</div>}
          <h3 className={h.title}>{title}</h3>
          {purpose && <p className={h.purpose}>{purpose}</p>}
          {summary != null && <div className={h.summary}>{summary}</div>}
        </div>
        {actions && <div className={h.actions}>{actions}</div>}
      </div>
      {(stats?.length || progress) && (
        <div className={h.stats}>
          {progress && (
            <span className={h.stat}>
              <span className={h.statValue}>{progress.value} of {progress.of}</span>
              <span className={h.statLabel}>{progress.label ?? 'done'}</span>
            </span>
          )}
          {stats?.map((s) => (
            <span key={s.label} className={h.stat}><span className={h.statValue}>{s.value}</span><span className={h.statLabel}>{s.label}</span></span>
          ))}
        </div>
      )}
      {pct !== null && progress && (
        <div className={h.bar} role="progressbar" aria-label={`${title} progress`} aria-valuemin={0} aria-valuemax={progress.of} aria-valuenow={progress.value}>
          <div className={h.barFill} style={{ width: `${pct}%` }} />
        </div>
      )}
      {next && (
        <div className={h.next}>
          <span className={h.nextTag}>Next</span>
          <span>{next.text}</span>
          {next.action}
        </div>
      )}
    </header>
  );
}
