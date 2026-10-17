'use client';

import { DISCORD_INVITE } from '@/lib/community/discord';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { listOpenJobTitles } from '@/lib/supabase/jobs';
import { latestScriptEditedBy } from '@/lib/supabase/scripts';
import { listRecentMediaTitles } from '@/lib/supabase/media';
import { listRecentChannelMessages } from '@/lib/supabase/messages';
import { tickerItems } from '@/lib/home/ticker';
import { getPlatformStats } from '@/lib/supabase/stats';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import GrainOverlay from '@/components/ui/GrainOverlay';
import Navigation from '@/components/shell/Navigation';
import AnimatedSection from '@/components/ui/AnimatedSection';
import { Button } from '@/components/ui/Button';
import { Mark3D } from '@/components/brand/Mark3D';
import { useProject } from '@/lib/os';
import { awaitOSUser } from '@/lib/os';
import { Viewfinder } from '@/components/landing/Viewfinder';
import { STAGES, PipelineStage, PipelineConnector } from '@/components/landing/Pipeline';
import { ScriptOSPreview, StudioPreview, LoungePreview, PortfolioPreview } from '@/components/landing/Previews';
import { ModuleTile } from '@/components/landing/ModuleTile';
import { StatsTicker } from '@/components/landing/StatsTicker';

/* ─── Main page ───────────────────────────────────────────────────────────── */
interface LiveData {
  scriptLines: string[];
  assets: { label: string; color: string }[];
  messages: { from: string; text: string; mine: boolean }[];
  latestScriptTitle: string | null;
}
interface PlatformStats { creators: number; scripts: number; projects: number; concepts: number }

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [live, setLive] = useState<LiveData>({ scriptLines: [], assets: [], messages: [], latestScriptTitle: null });
  const [ticker, setTicker] = useState<string[]>([]);
  const [works, setWorks] = useState<Array<{ title: string; year: number | null; category: string | null; accent: string | null }>>([]);
  const [roles, setRoles] = useState<string[]>([]);

  const { activeProject } = useProject();

  useEffect(() => {
    const palette = ['#6366f1', '#10b981', '#e8431a', '#f59e0b', '#8b5cf6', '#06b6d4'];
    // Public: platform totals, who's hiring, what was just published.
    (async () => {
      const [platformStats, jobsRes, worksRes] = await Promise.all([
        getPlatformStats(),
        listOpenJobTitles(4).catch(() => []),
        supabase.rpc('get_recent_work', { p_limit: 3 }),
      ]);
      setStats({ creators: platformStats.users, scripts: platformStats.scripts, projects: platformStats.projects, concepts: platformStats.media });
      setRoles(jobsRes.map((j) => j.title));
      const published = worksRes.data ?? [];
      setWorks(published.map((w) => ({ title: w.title, year: w.year, category: w.category, accent: w.accent_color })));
      setTicker(tickerItems(platformStats, jobsRes, published));
    })().catch((err) => console.error('Home stats load failed:', err));

    awaitOSUser().then(async (user) => {
      setLoggedIn(!!user);
      if (!user) return;

      try {
        // The landing page's live preview: each part shows what loaded.
        const [script, recentMedia, recentMessages] = await Promise.all([
          latestScriptEditedBy(user.id).catch(() => null),
          listRecentMediaTitles(6).catch(() => []),
          listRecentChannelMessages(4).catch(() => []),
        ]);
        const scriptLines = script?.content ? String(script.content).split('\n').map(s => s.trim()).filter(Boolean).slice(0, 11) : [];
        const assets = recentMedia.map((a, i) => ({ label: a.title || 'Reference', color: palette[i % palette.length] }));
        const messages = recentMessages.slice().reverse().map((m) => ({ from: m.username || 'Crew', text: m.content, mine: m.sender_id === user.id }));
        setLive({
          scriptLines,
          assets,
          messages,
          latestScriptTitle: script?.title || null,
        });
      } catch (err) {
        console.error('Home data load failed:', err);
      }
    }).catch(err => console.error('Auth check failed:', err));
  }, []);

  const { scrollY } = useScroll();
  const springY = useSpring(scrollY, { stiffness: 50, damping: 18 });
  const heroOpacity = useTransform(springY, [0, 500], [1, 0]);
  const heroY = useTransform(springY, [0, 500], [0, 100]);

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--fg)', overflowX: 'hidden' }}>
      <GrainOverlay />
      <Navigation />

      {/* ══════════════════════════════════════════════
          HERO — cinematic full-screen
      ══════════════════════════════════════════════ */}
      <section style={{
        minHeight: '100svh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        padding: '0 24px',
      }}>
        <div style={{
          position: 'absolute',
          width: '70vw',
          height: '70vw',
          maxWidth: 800,
          maxHeight: 800,
          borderRadius: '50%',
          pointerEvents: 'none',
          background: 'radial-gradient(circle, rgba(232, 67, 26,0.10) 0%, transparent 65%)',
          animation: 'orb-breathe 10s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '10%', right: '5%',
          width: '40vw', height: '40vw',
          maxWidth: 'var(--w-form)', maxHeight: 500,
          borderRadius: '50%',
          pointerEvents: 'none',
          background: 'radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 65%)',
          animation: 'orb-breathe 14s ease-in-out 3s infinite',
        }} />

        <motion.div style={{ opacity: heroOpacity, y: heroY, position: 'relative', zIndex: 2, textAlign: 'center', width: '100%' }}>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            style={{ display: 'flex', justifyContent: 'center', marginBottom: 36 }}
          >
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 16px',
              background: 'rgba(232, 67, 26,0.08)',
              border: '1px solid rgba(232, 67, 26,0.20)',
              borderRadius: 9999,
              fontFamily: 'var(--mono)',
              fontSize: 'max(8.5px, var(--mc-min-font, 0px)',
              letterSpacing: 'var(--caps-track)',
              textTransform: 'var(--caps)',
              color: 'var(--accent)',
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', animation: 'pulse 2.5s ease-in-out infinite', display: 'inline-block' }} />
              The Cavern
            </div>
          </motion.div>

          <h1 className="sr-only">The Cavern — the production suite for independent filmmakers, by Misfits Cavern</h1>
          <motion.div
            initial={{ opacity: 0, y: 40, filter: 'blur(16px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: 'relative', display: 'inline-block', padding: 8 }}
          >
            <Mark3D />
            <Viewfinder size={22} color="rgba(232, 67, 26,0.45)" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4 }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              marginTop: 18,
              fontFamily: 'var(--mono)',
              fontSize: 'max(8.5px, var(--mc-min-font, 0px)',
              letterSpacing: 'var(--caps-track)',
              textTransform: 'var(--caps)',
              color: 'var(--fg-dim)',
            }}
            aria-hidden
          >
            by Misfits Cavern
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.55 }}
            style={{
              // --fg-dim is the 4.5:1 floor; a faded opacity fell below it.
              color: 'var(--fg-dim)',
              fontFamily: 'var(--serif)',
              fontSize: 'clamp(1rem, 2.5vw, 1.3rem)',
              fontStyle: 'italic',
              fontWeight: 300,
              letterSpacing: 'var(--caps-track)',
              marginTop: 28,
            }}
          >
            Script to Screen — one integrated studio.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85, duration: 0.9 }}
          >
           <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 40 }}>
            <Button href={loggedIn ? '/projects' : '/auth'} variant="solid" size="lg">
              {loggedIn ? 'Enter Studio' : 'Enter The Cavern'}
            </Button>
            <Button href="/portfolio" variant="ghost" size="lg">
              View Work
            </Button>
          </div>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.2 }}
          transition={{ delay: 2 }}
          style={{ position: 'absolute', bottom: 36, left: '50%', transform: 'translateX(-50%)' }}
        >
          <motion.div
            animate={{ y: [0, 7, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}
          >
            <div style={{ width: 1, height: 36, background: 'linear-gradient(180deg, transparent, rgba(var(--fg-rgb), 0.4)' }} />
          </motion.div>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════
          RESUME BAND — returning creators land back in their studio
      ══════════════════════════════════════════════ */}
      {loggedIn && (activeProject || live.latestScriptTitle) && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={{ maxWidth: 900, margin: '-20px auto 0', padding: '0 24px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', padding: '20px 24px', background: 'linear-gradient(120deg, rgba(232, 67, 26,0.08), rgba(99,102,241,0.05)', border: '1px solid rgba(232, 67, 26,0.18)', borderRadius: 14 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(8.5px, var(--mc-min-font, 0px)', letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)', color: 'rgba(232, 67, 26,0.8)', marginBottom: 6 }}>Welcome back</div>
              <div style={{ fontFamily: 'var(--display)', fontSize: '1.6rem', letterSpacing: '-0.02em', lineHeight: 1 }}>
                {activeProject ? `Resume ${activeProject.title}` : 'Continue your screenplay'}
              </div>
              {live.latestScriptTitle && <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px)', color: 'var(--fg-dim)', marginTop: 6 }}>Last edited · {live.latestScriptTitle}</div>}
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <Button href="/editor" variant="ghost" size="sm">Open ScriptOS</Button>
              <Button href={activeProject ? '/studio' : '/projects'} variant="solid" size="sm">
                Open Studio
              </Button>
            </div>
          </div>
        </motion.section>
      )}

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
          WHAT NEEDS YOUR ATTENTION — next action, by stage
      ══════════════════════════════════════════════ */}
       {loggedIn && (
         <section style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px 28px' }}>
           <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(var(--ink-rgb), 0.06)', fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px)', letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)', color: 'var(--fg-dim)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
             <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', animation: 'pulse 2.5s ease-in-out infinite', display: 'inline-block' }} />
             WHAT NEEDS YOUR ATTENTION — next action, by stage
           </div>
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr)', gap: 14 }}>
             <Link href="/editor" style={{ textDecoration: 'none', display: 'block', background: 'var(--bg-2)', border: '1px solid rgba(var(--ink-rgb), 0.05)', borderRadius: 14, overflow: 'hidden', cursor: 'pointer', color: 'var(--fg)' }}>
               <div style={{ padding: 14 }}>
                 <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(7px, var(--mc-min-font, 0px)', letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)', color: 'var(--accent)', marginBottom: 5 }}>Write</div>
                 <div style={{ fontFamily: 'var(--serif)', fontSize: '1.02rem', lineHeight: 1.2, color: 'var(--fg)' }}>{live.latestScriptTitle ?? 'Continue your screenplay'}</div>
                 {live.latestScriptTitle ? <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(7px, var(--mc-min-font, 0px)', color: 'var(--fg-dim)', marginTop: 5 }}>{live.latestScriptTitle}</div> : null}
                 <Button variant="solid" size="sm" href="/editor">Open ScriptOS</Button>
               </div>
             </Link>
             <Link href="/studio" style={{ textDecoration: 'none', display: 'block', background: 'var(--bg-2)', border: '1px solid rgba(var(--ink-rgb), 0.05)', borderRadius: 14, overflow: 'hidden', cursor: 'pointer', color: 'var(--fg)' }}>
               <div style={{ padding: 14 }}>
                 <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(7px, var(--mc-min-font, 0px)', letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)', color: 'var(--violet)', marginBottom: 5 }}>Organize</div>
                 <div style={{ fontFamily: 'var(--serif)', fontSize: '1.02rem', lineHeight: 1.2, color: 'var(--fg)' }}>No open items — everything is in place</div>
                 <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(7px, var(--mc-min-font, 0px)', color: 'var(--fg-dim)', marginTop: 5 }}>Breakdown and cast ready to build</div>
                 <Button variant="ghost" size="sm" href="/studio">Open Studio</Button>
               </div>
             </Link>
             <Link href="/lounge" style={{ textDecoration: 'none', display: 'block', background: 'var(--bg-2)', border: '1px solid rgba(var(--ink-rgb), 0.05)', borderRadius: 14, overflow: 'hidden', cursor: 'pointer', color: 'var(--fg)' }}>
               <div style={{ padding: 14 }}>
                 <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(7px, var(--mc-min-font, 0px)', letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)', color: 'var(--ok)', marginBottom: 5 }}>Crew</div>
                 <div style={{ fontFamily: 'var(--serif)', fontSize: '1.02rem', lineHeight: 1.2, color: 'var(--fg)' }}>Open roles ({roles.length})</div>
                 {roles.slice(0, 3).map((r, i) => <div key={i} style={{ fontFamily: 'var(--mono)', fontSize: 'max(7px, var(--mc-min-font, 0px)', color: 'var(--fg-dim)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r}</div>)}
                 <Button variant="solid" size="sm" href="/lounge">Open crew</Button>
               </div>
             </Link>

             <Link href="/portfolio" style={{ textDecoration: 'none', display: 'block', background: 'var(--bg-2)', border: '1px solid rgba(var(--ink-rgb), 0.05)', borderRadius: 14, overflow: 'hidden', cursor: 'pointer', color: 'var(--fg)' }}>
               <div style={{ padding: 14 }}>
                 <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(7px, var(--mc-min-font, 0px)', letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)', color: 'var(--warn)', marginBottom: 5 }}>Showcase</div>
                 <div style={{ fontFamily: 'var(--serif)', fontSize: '1.02rem', lineHeight: 1.2, color: 'var(--fg)' }}>Published works ({works.length})</div>
                 {works.slice(0, 3).map((w, i) => <div key={i} style={{ fontFamily: 'var(--mono)', fontSize: 'max(7px, var(--mc-min-font, 0px)', color: 'var(--fg-dim)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.title}</div>)}
                 <Button variant="solid" size="sm" href="/portfolio">View portfolio</Button>
               </div>
             </Link>
             <Link href="/jobs" style={{ textDecoration: 'none', display: 'block', background: 'var(--bg-2)', border: '1px solid rgba(var(--ink-rgb), 0.05)', borderRadius: 14, overflow: 'hidden', cursor: 'pointer', color: 'var(--fg)' }}>
               <div style={{ padding: 14 }}>
                 <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(7px, var(--mc-min-font, 0px)', letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)', color: 'var(--jobs-text)', marginBottom: 5 }}>Launch</div>
                 <div style={{ fontFamily: 'var(--serif)', fontSize: '1.02rem', lineHeight: 1.2, color: 'var(--fg)' }}>Open roles ({roles.length}) — jobs board</div>
                 {roles.slice(0, 3).map((r, i) => <div key={i} style={{ fontFamily: 'var(--mono)', fontSize: 'max(7px, var(--mc-min-font, 0px)', color: 'var(--fg-dim)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r}</div>)}
                 <Button variant="solid" size="sm" href="/jobs">Open jobs board</Button>
               </div>
             </Link>
             <Link href="/lounge" style={{ textDecoration: 'none', display: 'block', background: 'var(--bg-2)', border: '1px solid rgba(var(--ink-rgb), 0.05)', borderRadius: 14, overflow: 'hidden', cursor: 'pointer', color: 'var(--fg)' }}>
               <div style={{ padding: 14 }}>
                 <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(7px, var(--mc-min-font, 0px)', letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)', color: 'var(--missive)', marginBottom: 5 }}>Together</div>
                 <div style={{ fontFamily: 'var(--serif)', fontSize: '1.02rem', lineHeight: 1.2, color: 'var(--fg)' }}>Unread messages ({live.messages.filter(m => !m.mine).length})</div>
                 {live.messages.filter(m => !m.mine).slice(0, 2).map((m, i) => <div key={i} style={{ fontFamily: 'var(--mono)', fontSize: 'max(7px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.from}: {m.text}</div>)}
                 <Button variant="solid" size="sm" href="/lounge">Open Lounge</Button>
               </div>
             </Link>
           </div>
         </section>
       )}

      {/* ══════════════════════════════════════════════
          LIVE STATS — real platform numbers
      ══════════════════════════════════════════════ */}
      {!stats && (
        <section style={{ maxWidth: 1000, margin: '0 auto', padding: '20px 24px 60px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr)', gap: 14 }}>
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
                <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px)', letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)', color: 'var(--fg-dim)', marginTop: 8 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {stats && (stats.creators + stats.scripts + stats.projects + stats.concepts) > 0 && (
        <section style={{ maxWidth: 1000, margin: '0 auto', padding: '20px 24px 60px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr)', gap: 14 }}>
            {[
              { n: stats.creators, label: 'Creators', color: 'var(--ok)' },
              { n: stats.scripts, label: 'Screenplays', color: 'var(--accent)' },
              { n: stats.projects, label: 'Productions', color: 'var(--violet)' },
              { n: stats.concepts, label: 'References & Media', color: 'var(--warn)' },
            ].map((s, i) => (
              <motion.div key={s.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.6 }}
                style={{ textAlign: 'center', padding: '20px 12px', background: 'rgba(var(--ink-rgb), 0.02)', border: '1px solid rgba(var(--ink-rgb), 0.06)', borderRadius: 14 }}>
                <div style={{ fontFamily: 'var(--display)', fontSize: '2.6rem', letterSpacing: '-0.02em', lineHeight: 1, color: s.color }}>{s.n.toLocaleString()}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px)', letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)', color: 'var(--fg-dim)', marginTop: 8 }}>{s.label}</div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════
          STATS TICKER
      ══════════════════════════════════════════════ */}
      <StatsTicker items={ticker} />

      {/* ══════════════════════════════════════════════
          MODULE GRID — asymmetric layout
      ══════════════════════════════════════════════ */}
      <section style={{ padding: '80px 24px 100px', maxWidth: 'var(--w-content)', margin: '0 auto' }}>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>

          <ModuleTile
            title="ScriptOS"
            tag="Screenplay Editor"
            color="var(--accent)"
            href="/editor"
            index={0}
            preview={
              <div style={{ minHeight: 220 }}>
                <div style={{
                  padding: '10px 16px',
                  borderBottom: '1px solid rgba(var(--ink-rgb), 0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  {['#ff5f57', '#febc2e', '#28c840'].map((c, i) => (
                    <div key={i} style={{ width: 9, height: 9, borderRadius: '50%', background: c, opacity: 0.7 }} />
                  ))}
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px)', letterSpacing: 'var(--caps-track)', color: 'var(--fg-dim)', marginLeft: 6 }}>{live.latestScriptTitle ?? 'ScriptOS'}</span>
                </div>
                <ScriptOSPreview lines={live.scriptLines} caption={loggedIn ? 'Your latest script appears here' : 'Screenplay formatting as you type'} />
              </div>
            }
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <ModuleTile
              title="Studio"
              tag="Asset Hub"
              color="#6366f1"
              href="/studio"
              index={1}
              preview={<StudioPreview items={live.assets} caption={loggedIn ? 'Your references and media appear here' : 'Every reference, clip and track in one library'} />}
            />
            <ModuleTile
              title="Lounge"
              tag="Crew Collaboration"
              color="var(--ok)"
              href="/lounge"
              index={2}
              preview={<LoungePreview messages={live.messages} caption={loggedIn ? 'Your crew channels appear here' : 'Channels and calls with your crew'} />}
            />
          </div>
        </div>

        <ModuleTile
          title="Portfolio"
          tag="Cinematic Showcase"
          color="var(--warn)"
          href="/portfolio"
          index={3}
          preview={<PortfolioPreview works={works} />}
          style={{ minHeight: 0 }}
        />
      </section>

      {/* ══════════════════════════════════════════════
          CLOSING CTA
      ══════════════════════════════════════════════ */}
      <section style={{ padding: '100px 24px 160px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 50% 60%, rgba(232, 67, 26,0.07) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 2 }}>
          <AnimatedSection>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
              <div style={{
                width: 1,
                height: 64,
                background: 'linear-gradient(180deg, transparent, rgba(232, 67, 26,0.5)',
              }} />
            </div>

            <div style={{
              fontFamily: 'var(--display)',
              fontSize: 'clamp(3rem, 14vw, 9rem)',
              lineHeight: 0.88,
              letterSpacing: -1,
              marginBottom: 44,
            }}>
              BEGIN YOUR<br />
              <span style={{ color: 'var(--accent)', textShadow: '0 0 80px rgba(232, 67, 26,0.2)' }}>FILM</span>
            </div>

            <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 16 }}>
            <Button href="/auth" variant="solid" size="lg">
              Start Writing
            </Button>
            {DISCORD_INVITE && (
              <Button href={DISCORD_INVITE} variant="ghost" size="lg" external>
                Join the Discord
              </Button>
            )}
            <Button href="https://instagram.com/lonerkid" variant="ghost" size="lg" external>
              Contact Crew
            </Button>
          </div>
          </AnimatedSection>
        </div>
      </section>

      <footer style={{
        textAlign: 'center',
        // Clear of the dock (it reports its own height; 0 where it's hidden).
        padding: '20px 0 calc(var(--taskbar-height, 0px) + 44px)',
        fontSize: 'max(7.5px, var(--mc-min-font, 0px)',
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
