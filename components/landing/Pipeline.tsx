'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { PenTool, Layers, Users, Film, Briefcase } from 'lucide-react';

/* ─── Workflow Pipeline ───────────────────────────────────────────────────── */
export const STAGES = [
  { id: 'write',     label: 'Write',       icon: PenTool,   color: 'var(--accent)', href: '/editor'    },
  { id: 'organize',  label: 'Organize',    icon: Layers,    color: 'var(--violet)', href: '/studio'    },
  { id: 'crew',      label: 'Crew',        icon: Users,     color: 'var(--ok)', href: '/lounge'    },
  { id: 'showcase',  label: 'Showcase',    icon: Film,      color: 'var(--warn)', href: '/portfolio' },
  { id: 'launch',    label: 'Launch',      icon: Briefcase, color: 'var(--jobs-text)', href: '/jobs'      },
];

export function PipelineStage({ stage, index }: { stage: typeof STAGES[0]; index: number }) {
  const [hovered, setHovered] = useState(false);
  const Icon = stage.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, cursor: 'default' }}
    >
      <Link href={stage.href} aria-label={stage.label} style={{ textDecoration: 'none' }}>
        <motion.div
          onHoverStart={() => setHovered(true)}
          onHoverEnd={() => setHovered(false)}
          whileHover={{ y: -5, scale: 1.08 }}
          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
          style={{
            width: 54,
            height: 54,
            borderRadius: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: hovered ? `${stage.color}18` : 'rgba(var(--ink-rgb), 0.03)',
            border: `1px solid ${hovered ? stage.color + '45' : 'rgba(var(--ink-rgb), 0.07)'}`,
            color: hovered ? stage.color : 'var(--fg-dim)',
            transition: 'all 0.35s cubic-bezier(0.16,1,0.3,1)',
            boxShadow: hovered ? `0 8px 28px ${stage.color}22` : 'none',
            position: 'relative',
          }}
        >
          <Icon size={20} strokeWidth={1.5} />
          {hovered && (
            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                position: 'absolute',
                inset: -1,
                borderRadius: 20,
                border: `1px solid ${stage.color}30`,
                pointerEvents: 'none',
              }}
            />
          )}
        </motion.div>
      </Link>
      <span style={{
        fontFamily: 'var(--mono)',
        fontSize: 'max(8px, var(--mc-min-font, 0px))',
        letterSpacing: 'var(--caps-track)',
        textTransform: 'var(--caps)',
        color: hovered ? stage.color : 'var(--fg-dim)',
        transition: 'color 0.3s',
      }}>
        {stage.label}
      </span>
    </motion.div>
  );
}

export function PipelineConnector({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 + 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      style={{ flex: 1, height: 1, background: 'rgba(var(--ink-rgb), 0.07)', transformOrigin: 'left', position: 'relative', top: -15, overflow: 'hidden' }}
    >
      <div style={{
        position: 'absolute',
        top: 0, left: '-60%',
        width: '60%',
        height: '100%',
        background: 'linear-gradient(90deg, transparent, rgba(232, 67, 26,0.6), transparent)',
        animation: `travel ${3 + index * 0.4}s ease-in-out ${index * 0.6}s infinite`,
      }} />
    </motion.div>
  );
}

/* ─── Module Tile — screen-preview cards ─────────────────────────────────── */
