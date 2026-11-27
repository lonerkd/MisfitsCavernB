'use client';

import React from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import GrainOverlay from '@/components/ui/GrainOverlay';
import Navigation from '@/components/shell/Navigation';
import { useProject } from '@/lib/os';
import { STAGES, PipelineStage, PipelineConnector } from '@/components/landing/Pipeline';
import { StatsTicker } from '@/components/landing/StatsTicker';
import { Hero } from '@/components/landing/Hero';
import { StatsSection } from '@/components/landing/StatsSection';
import { ModuleGrid } from '@/components/landing/ModuleGrid';
import { useHomeData } from '@/components/home/useHomeData';
import dynamic from 'next/dynamic';
// Your day and the rest of the signed-in home load only for a signed-in person (a guest never downloads them).
const SignedInHome = dynamic(() => import('@/components/home/SignedInHome').then((m) => m.SignedInHome), { loading: () => null });
// The jump-back-in offer sits above the hero for a signed-in person (owner, Nov 26 2026: it should be higher) —
// resuming work is the first thing on the page, not a scroll past the pitch.
const ContinueOffer = dynamic(() => import('@/components/mobile/Continue').then((m) => m.ContinueOffer), { ssr: false, loading: () => null });
import { usePhoneLayout } from '@/lib/os/usePhone';

/* ─── Main page ───────────────────────────────────────────────────────────── */

export default function Home() {
  const { loggedIn, stats, live, ticker, works } = useHomeData();
  const { activeProject } = useProject();
  const { phone } = usePhoneLayout();

  const { scrollY } = useScroll();
  const springY = useSpring(scrollY, { stiffness: 50, damping: 18 });
  const heroOpacity = useTransform(springY, [0, 500], [1, 0]);
  const heroY = useTransform(springY, [0, 500], [0, 100]);

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--fg)', overflowX: 'hidden' }}>
      <GrainOverlay />
      <Navigation />

      {/* The offer starts below the fixed top bar (about 60 px on a phone, 80 on a desk): at 20 px it sat under it, the logo and menu drawn over it and "Not now" untappable (the mobile audit's underBar 2 on /, /hub, /today and /auth). */}
      {loggedIn && (
        <div className="mc-continue-slot" style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(64px, 12vw, 84px) 16px 0' }}>
          <ContinueOffer inline />
        </div>
      )}

      <Hero loggedIn={loggedIn} activeProjectTitle={activeProject?.title ?? null} heroOpacity={heroOpacity} heroY={heroY} />

      {/* The marketing story is for people who have not signed in: a signed-in person already knows it. */}
      {loggedIn === false && (<>
      {/* ══════════════════════════════════════════════
          WORKFLOW PIPELINE
      ══════════════════════════════════════════════ */}
      <section style={{ padding: '80px 40px', maxWidth: 900, margin: '0 auto' }}>
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={{ display: 'flex', alignItems: 'center', gap: 0 }}
        >
          {STAGES.map((stage, i) => (
            <React.Fragment key={stage.id}>
              <PipelineStage stage={stage} index={i} />
              {i < STAGES.length - 1 && <PipelineConnector index={i} />}
            </React.Fragment>
          ))}
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════
          LIVE STATS — real platform numbers
      ══════════════════════════════════════════════ */}
      <StatsSection stats={stats} />

      </>)}

      {/* ══════════════════════════════════════════════
          STATS TICKER
      ══════════════════════════════════════════════ */}
      <StatsTicker items={ticker} />

      {loggedIn && <SignedInHome />}

      {/* ══════════════════════════════════════════════
          MODULE GRID — asymmetric layout
      ══════════════════════════════════════════════ */}
      {loggedIn !== null && (
        <ModuleGrid loggedIn={loggedIn} phone={phone} live={live} works={works} />
      )}

      <footer style={{
        textAlign: 'center',
        // Clear of the dock (it reports its own height; 0 where it's hidden).
        padding: '20px 0 calc(var(--taskbar-height, 0px) + 44px)',
        fontSize: 'max(7.5px, var(--mc-min-font, 0px))',
        letterSpacing: 'var(--caps-track)',
        textTransform: 'var(--caps)',
        fontFamily: 'var(--mono)', color: 'var(--fg-dim)' }}>
        The Cavern · by Misfits Cavern · © 2026 Peter Olowude
        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'center', gap: 18 }}>
          <Link href="/privacy" style={{ color: 'inherit' }}>Privacy</Link>
          <Link href="/terms" style={{ color: 'inherit' }}>Terms</Link>
        </div>
      </footer>
    </div>
  );
}
