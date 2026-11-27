'use client';

import { motion } from 'framer-motion';
import { showPeopleTotal } from '@/lib/home/ticker';
import type { PlatformStats } from '@/components/home/useHomeData';

/**
 * The live platform numbers: a pulsing skeleton while they load, then the
 * real totals (the Creators tile hides itself until the people total is
 * worth showing). Renders nothing once loaded if every total is zero.
 */
export function StatsSection({ stats }: { stats: PlatformStats | null }) {
  if (!stats) {
    return (
      <section style={{ maxWidth: 1000, margin: '0 auto', padding: '20px 24px 60px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14 }}>
          {[
            { label: 'Creators', color: 'var(--ok)' },
            { label: 'Screenplays', color: 'var(--accent)' },
            { label: 'Productions', color: 'var(--violet)' },
            { label: 'Concept Assets', color: 'var(--warn)' },
          ].map((s, i) => (
            <div key={s.label}
              style={{ textAlign: 'center', padding: '20px 12px', background: 'rgba(var(--ink-rgb), 0.02)', border: '1px solid rgba(var(--ink-rgb), 0.06)', borderRadius: 14 }}>
              <motion.div
                animate={{ opacity: [0.15, 0.45, 0.15] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: i * 0.15 }}
                style={{ height: 42, width: 80, margin: '0 auto', background: s.color, borderRadius: 8, filter: 'blur(4px)' }}
              />
              <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)', color: 'var(--fg-dim)', marginTop: 8 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if ((stats.creators + stats.scripts + stats.projects + stats.concepts) <= 0) return null;

  return (
    <section style={{ maxWidth: 1000, margin: '0 auto', padding: '20px 24px 60px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14 }}>
        {[
          { n: stats.creators, label: 'Creators', color: 'var(--ok)' },
          { n: stats.scripts, label: 'Screenplays', color: 'var(--accent)' },
          { n: stats.projects, label: 'Productions', color: 'var(--violet)' },
          { n: stats.concepts, label: 'References & Media', color: 'var(--warn)' },
        ].filter((s) => s.label !== 'Creators' || showPeopleTotal(s.n)).map((s, i) => (
          <motion.div key={s.label}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, duration: 0.6 }}
            style={{ textAlign: 'center', padding: '20px 12px', background: 'rgba(var(--ink-rgb), 0.02)', border: '1px solid rgba(var(--ink-rgb), 0.06)', borderRadius: 14 }}>
            <div style={{ fontFamily: 'var(--display)', fontSize: '2.6rem', letterSpacing: '-0.02em', lineHeight: 1, color: s.color }}>{s.n.toLocaleString()}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)', color: 'var(--fg-dim)', marginTop: 8 }}>{s.label}</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
