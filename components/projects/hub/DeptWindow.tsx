'use client';

import React, { useState } from 'react';
import { useNow } from '@/lib/hooks/useNow';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import { type MilestoneRow } from '@/lib/supabase/project-hub';
import { readable } from '@/lib/util/color';
import type { ProjectHubViewModel } from './types';

interface DeptWindowProps {
  title: string;
  tag: string;
  color: string;
  href: string;
  stats: { label: string; value: string | number }[];
  preview: React.ReactNode;
  delay?: number;
  span?: 'single' | 'double';
}

export function DeptWindow({ title, tag, color: rawColor, href, stats, preview, delay = 0, span = 'single' }: DeptWindowProps) {
  const [hovered, setHovered] = useState(false);
  const color = rawColor;
  // Hex colours are corrected by readable(); theme colours (var(--accent)…)
  // can't be measured here, so they're mixed toward the text colour — enough
  // contrast for small labels in every theme.
  const ink = rawColor.startsWith('var(') ? `color-mix(in srgb, ${rawColor} 55%, var(--fg))` : readable(rawColor);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      style={{
        gridColumn: span === 'double' ? 'span 2' : 'span 1',
        background: 'var(--glass)',
        border: `1px solid ${hovered ? color + '30' : 'rgba(var(--ink-rgb), 0.06)'}`,
        borderRadius: 14,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'border-color 0.4s',
        boxShadow: hovered ? `0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px ${color}18` : 'none',
        position: 'relative',
      }}
    >
      <div style={{
        position: 'absolute', top: -40, right: -40, width: 140, height: 140,
        borderRadius: '50%', pointerEvents: 'none',
        background: `radial-gradient(circle, ${color}12 0%, transparent 65%)`,
        opacity: hovered ? 1 : 0.5, transition: 'opacity 0.4s',
      }} />

      <div style={{
        padding: '10px 14px',
        borderBottom: `1px solid ${hovered ? color + '18' : 'rgba(var(--ink-rgb), 0.04)'}`,
        display: 'flex', alignItems: 'center', gap: 8,
        transition: 'border-color 0.4s', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {['#3a3a3a', '#3a3a3a', '#3a3a3a'].map((c, i) => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />
          ))}
        </div>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 'max(7.5px, var(--mc-min-font, 0px))', color: ink, letterSpacing: 3, textTransform: 'uppercase', marginLeft: 6 }}>{tag}</span>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {preview}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 40, background: 'linear-gradient(transparent, var(--surface))', pointerEvents: 'none' }} />
      </div>

      <div style={{
        padding: '12px 16px',
        borderTop: `1px solid rgba(var(--ink-rgb), 0.04)`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: 18 }}>
          {stats.map(s => (
            <div key={s.label}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700, color: 'var(--fg)', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(7px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)', letterSpacing: 2, textTransform: 'uppercase', marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>
        <Link href={href} style={{ textDecoration: 'none' }}>
          <motion.div
            whileHover={{ scale: 1.06, x: 2 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontFamily: 'var(--mono)', fontSize: 'max(8.5px, var(--mc-min-font, 0px))', letterSpacing: 2,
              textTransform: 'uppercase', color: ink,
              padding: '6px 12px', borderRadius: 9999,
              background: `${color}12`, border: `1px solid ${color}28`,
            }}
          >
            Open <ExternalLink size={9} />
          </motion.div>
        </Link>
      </div>
    </motion.div>
  );
}

// ─── Script preview ──────────────────────────────────────────────────────────

export function ScriptPreview({ pages, scripts, scenes }: { pages: number; scripts: number; scenes: number }) {
  const bars = Math.min(14, Math.max(scenes || scripts || 0, pages > 0 ? 8 : 0));
  return (
    <div style={{ padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 14 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 28, fontWeight: 700, color: 'var(--fg)', lineHeight: 1 }}>{pages}</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)', letterSpacing: 2, textTransform: 'uppercase' }}>pages · {scripts} script{scripts === 1 ? '' : 's'} · {scenes} scene{scenes === 1 ? '' : 's'}</span>
      </div>
      {bars > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {Array.from({ length: bars }).map((_, i) => (
            <div key={i} style={{ height: 3, borderRadius: 4, background: 'rgba(var(--ink-rgb), 0.08)', width: `${40 + ((i * 53) % 60)}%` }} />
          ))}
        </div>
      ) : (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)', letterSpacing: 1 }}>No script yet — open ScriptOS to start.</div>
      )}
    </div>
  );
}

// ─── Asset preview ───────────────────────────────────────────────────────────

export function AssetPreview({ concepts, scenes }: { concepts: number; scenes: number }) {
  const total = concepts + scenes;
  const filled = Math.min(6, concepts);
  const palette = ['#6366f1', '#e8431a', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
  return (
    <div style={{ padding: '10px 12px' }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>{concepts} reference{concepts === 1 ? '' : 's'} · {scenes} scene{scenes === 1 ? '' : 's'}</div>
      {total > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ aspectRatio: '1/1', borderRadius: 8, background: i < filled ? `${palette[i]}22` : 'rgba(var(--ink-rgb), 0.03)', border: `1px solid ${i < filled ? palette[i] + '44' : 'rgba(var(--ink-rgb), 0.05)'}` }} />
          ))}
        </div>
      ) : (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)', letterSpacing: 1 }}>No assets yet — add them in Studio.</div>
      )}
    </div>
  );
}

// ─── Crew preview ─────────────────────────────────────────────────────────────

export function CrewPreview({ team }: { team: ProjectHubViewModel['team'] }) {
  return (
    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {team.map((member, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
            background: `hsl(${(i * 97) % 360}, 40%, 30%)`,
            border: '1px solid rgba(var(--ink-rgb), 0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', color: 'var(--fg)',
          }}>
            {member.name.charAt(0)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{member.name}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(7.5px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)', letterSpacing: 1 }}>{member.role}</div>
          </div>
          {member.online && (
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', flexShrink: 0, boxShadow: '0 0 6px #10b981' }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Timeline preview ────────────────────────────────────────────────────────


export function TimelinePreview({ deadline, milestones }: { deadline: string; milestones: MilestoneRow[] }) {
  const dl = deadline ? new Date(deadline).getTime() : NaN;
  const now = useNow();
  const daysLeft = isNaN(dl) ? null : Math.ceil((dl - now) / 86400000);
  const upcoming = [...milestones].sort((a, b) => String(a.end_date ?? '9999').localeCompare(String(b.end_date ?? '9999'))).slice(0, 5);

  return (
    <div style={{ padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 14 }}>
        {daysLeft === null ? (
          <span style={{ fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)', letterSpacing: 1.5, textTransform: 'uppercase' }}>No end date set</span>
        ) : (
          <>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 28, fontWeight: 700, color: daysLeft < 30 ? 'var(--accent)' : 'var(--fg)', lineHeight: 1 }}>{Math.abs(daysLeft)}</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)', letterSpacing: 2, textTransform: 'uppercase' }}>{daysLeft < 0 ? 'days past the end date' : 'days to the end date'}</span>
          </>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {upcoming.length === 0 && <span style={{ fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)' }}>No milestones yet — add them below.</span>}
        {upcoming.map((m) => {
          const done = m.status === 'done' || m.status === 'completed';
          return (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: done ? '#10b981' : 'rgba(var(--ink-rgb), 0.1)' }} />
              <span style={{ flex: 1, fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', color: done ? 'var(--fg-muted)' : 'var(--fg-dim)', textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.5 : 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.title}</span>
              {m.end_date && <span style={{ fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)' }}>{new Date(m.end_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Portfolio preview ───────────────────────────────────────────────────────

export function PortfolioPreview({ pieces }: { pieces: { id: string; title: string }[] }) {
  return (
    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {pieces.length === 0 && <span style={{ fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)' }}>Not in your portfolio yet.</span>}
      {pieces.slice(0, 4).map((p) => (
        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 'max(9.5px, var(--mc-min-font, 0px))', color: 'var(--fg-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</span>
        </div>
      ))}
    </div>
  );
}
