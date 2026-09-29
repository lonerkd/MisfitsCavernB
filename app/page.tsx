'use client';

import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { tickerItems } from '@/lib/home/ticker';
import { getPlatformStats } from '@/lib/supabase/stats';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import {
  ArrowRight, PenTool, Layers, Users, Film,
  Briefcase, ChevronRight,
} from 'lucide-react';
import GrainOverlay from '@/components/GrainOverlay';
import Navigation from '@/components/Navigation';
import AnimatedSection from '@/components/AnimatedSection';
import { Button } from '@/components/ui/Button';
import { useProject } from '@/lib/os';
import { readable } from '@/lib/color';
import { awaitOSUser } from '@/lib/os';

/* ─── Viewfinder corner brackets ─────────────────────────────────────────── */
function Viewfinder({ size = 20, color = 'rgba(224, 221, 174,0.3)' }: { size?: number; color?: string }) {
  const s = `${size}px`;
  const corner = { width: s, height: s, position: 'absolute' as const, borderColor: color };
  return (
    <>
      <div style={{ ...corner, top: 0, left: 0, borderTop: `1.5px solid`, borderLeft: `1.5px solid` }} />
      <div style={{ ...corner, top: 0, right: 0, borderTop: `1.5px solid`, borderRight: `1.5px solid` }} />
      <div style={{ ...corner, bottom: 0, left: 0, borderBottom: `1.5px solid`, borderLeft: `1.5px solid` }} />
      <div style={{ ...corner, bottom: 0, right: 0, borderBottom: `1.5px solid`, borderRight: `1.5px solid` }} />
    </>
  );
}

/* ─── Workflow Pipeline ───────────────────────────────────────────────────── */
const STAGES = [
  { id: 'write',     label: 'Write',       icon: PenTool,   color: '#e8431a', href: '/editor'    },
  { id: 'organize',  label: 'Organize',    icon: Layers,    color: '#818cf8', href: '/studio'    },
  { id: 'crew',      label: 'Crew',        icon: Users,     color: '#10b981', href: '/lounge'    },
  { id: 'showcase',  label: 'Showcase',    icon: Film,      color: '#f59e0b', href: '/portfolio' },
  { id: 'launch',    label: 'Launch',      icon: Briefcase, color: '#8b5cf6', href: '/jobs'      },
];

function PipelineStage({ stage, index }: { stage: typeof STAGES[0]; index: number }) {
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
            background: hovered ? `${stage.color}18` : 'rgba(255,255,255,0.03)',
            border: `1px solid ${hovered ? stage.color + '45' : 'rgba(255,255,255,0.07)'}`,
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
        fontSize: 11,
        letterSpacing: 3,
        textTransform: 'uppercase',
        color: hovered ? stage.color : 'var(--fg-dim)',
        transition: 'color 0.3s',
      }}>
        {stage.label}
      </span>
    </motion.div>
  );
}

function PipelineConnector({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 + 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)', transformOrigin: 'left', position: 'relative', top: -15, overflow: 'hidden' }}
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

function ScriptOSPreview({ lines, caption }: { lines?: string[]; caption: string }) {
  if (lines && lines.length > 0) {
    return (
      <div className="screenplay-preview" style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 260, overflow: 'hidden' }}>
        {lines.slice(0, 9).map((l, i) => {
          const t = l.trim();
          if (!t) return <div key={i} style={{ height: 3 }} />;
          const isHead = /^(INT|EXT|EST|I\/E)[.\s]/i.test(t);
          const isChar = !isHead && t === t.toUpperCase() && t.length > 1 && t.length < 32 && !/[.!?,]$/.test(t);

          const display = isHead || isChar ? t : t.length > 80 ? t.slice(0, 80) + '…' : t;
          return (
            <div key={i}
              className={isHead ? 'screenplay-scene-hdr' : isChar ? 'screenplay-char' : ''}
              style={{
                fontSize: 11,
                color: isHead ? undefined : isChar ? undefined : 'var(--fg-dim)',
                lineHeight: 1.45,
                whiteSpace: isHead || isChar ? 'nowrap' : 'normal',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxHeight: isHead || isChar ? undefined : 32,
              }}>{display}</div>
          );
        })}
      </div>
    );
  }
  // No script to show (signed out, or nothing written yet): the shape of a
  // screenplay page, not invented words.
  return (
    <div style={{ padding: '22px 16px', display: 'flex', flexDirection: 'column', gap: 7 }} aria-hidden>
      {[['52%', 0, 'var(--accent)'], ['92%', 0], ['78%', 0], [0], ['22%', '38%'], ['52%', '20%'], ['40%', '20%'], [0], ['46%', 0, 'var(--accent)'], ['88%', 0]].map(([w, ml, c], i) => (
        w ? <div key={i} style={{ height: 5, width: w as string, marginLeft: ml as string, borderRadius: 4, background: (c as string) ?? 'rgba(255,255,255,0.08)', opacity: c ? 0.45 : 1 }} />
          : <div key={i} style={{ height: 4 }} />
      ))}
      <PreviewCaption>{caption}</PreviewCaption>
    </div>
  );
}

function PreviewCaption({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: '10px 0 0', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--fg-dim)' }}>{children}</p>;
}

function StudioPreview({ items, caption }: { items: { label: string; color: string }[]; caption: string }) {
  if (!items.length) {
    return (
      <div style={{ padding: '16px 14px' }} aria-hidden>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {['#818cf8', '#10b981', '#e8431a', '#f59e0b'].map((c) => (
            <div key={c} style={{ height: 34, borderRadius: 8, border: '1px dashed rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', padding: '0 12px', gap: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: c, opacity: 0.5 }} />
              <div style={{ height: 4, flex: 1, borderRadius: 4, background: 'rgba(255,255,255,0.06)' }} />
            </div>
          ))}
        </div>
        <PreviewCaption>{caption}</PreviewCaption>
      </div>
    );
  }
  return (
    <div style={{ padding: '16px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {items.map((item, i) => (
        <div key={i} style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 8,
          padding: '10px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <div style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: item.color,
            flexShrink: 0,
            boxShadow: `0 0 6px ${item.color}`,
          }} />
          <span style={{
            fontFamily: 'var(--mono)',
            fontSize: 11,
            color: 'var(--fg-dim)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function LoungePreview({ messages, caption }: { messages: { from: string; text: string; mine: boolean }[]; caption: string }) {
  if (!messages.length) {
    return (
      <div style={{ padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 10 }} aria-hidden>
        {[['58%', false], ['44%', true], ['66%', false]].map(([w, mine], i) => (
          <div key={i} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', width: w as string, height: 24, borderRadius: mine ? '12px 12px 3px 12px' : '12px 12px 12px 3px', border: `1px dashed ${mine ? 'rgba(232, 67, 26,0.25)' : 'rgba(255,255,255,0.08)'}` }} />
        ))}
        <PreviewCaption>{caption}</PreviewCaption>
      </div>
    );
  }
  return (
    <div style={{ padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {messages.map((m, i) => (
        <div key={i} style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: m.mine ? 'flex-end' : 'flex-start',
        }}>
          {!m.mine && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--success)', letterSpacing: 1, marginBottom: 3 }}>{m.from}</span>
          )}
          <div style={{
            background: m.mine ? 'rgba(232, 67, 26,0.15)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${m.mine ? 'rgba(232, 67, 26,0.2)' : 'rgba(255,255,255,0.07)'}`,
            borderRadius: m.mine ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
            padding: '7px 12px',
            maxWidth: '80%',
          }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'rgba(224, 221, 174,0.75)' }}>{m.text}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function PortfolioPreview({ works }: { works: Array<{ title: string; year: number | null; category: string | null; accent: string | null }> }) {
  if (works.length) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${works.length}, minmax(0, 1fr))`, gap: 10, padding: 14, minHeight: 140 }}>
        {works.map((w, i) => (
          <div key={i} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', minHeight: 120, background: `linear-gradient(160deg, #0d0d0f 0%, ${w.accent || '#1a1008'} 160%)`, border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ position: 'absolute', left: 12, right: 12, bottom: 12 }}>
              <div style={{ fontFamily: 'var(--display)', fontSize: 18, letterSpacing: 0.5, lineHeight: 1.1, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.title}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--fg-dim)', marginTop: 4 }}>{[w.category, w.year].filter(Boolean).join(' · ') || 'New work'}</div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', minHeight: 140 }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(160deg, #0d0d0f 0%, #1a1008 40%, #0a0806 100%)',
      }} />
      {[0.15, 0.4, 0.65, 0.85].map((y, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: 0, right: 0,
          top: `${y * 100}%`,
          height: 1,
          background: 'rgba(255,255,255,0.04)',
        }} />
      ))}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '14%', background: '#000', opacity: 0.6 }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '14%', background: '#000', opacity: 0.6 }} />
      <div style={{
        position: 'absolute',
        top: '20%', left: '35%',
        width: '40%', height: '60%',
        background: 'radial-gradient(ellipse, rgba(245,158,11,0.12) 0%, transparent 70%)',
        borderRadius: '50%',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '18%', right: 16,
        fontFamily: 'var(--mono)',
        fontSize: 11,
        letterSpacing: 3,
        textTransform: 'uppercase',
        color: 'var(--fg-dim)',
      }}>
        Published work shows here
      </div>
    </div>
  );
}

interface ModuleTileProps {
  title: string;
  tag: string;
  color: string;
  href: string;
  preview: React.ReactNode;
  style?: React.CSSProperties;
  index?: number;
}

function ModuleTile({ title, tag, color, href, preview, style, index = 0 }: ModuleTileProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <AnimatedSection delay={index * 0.08}>
      <Link href={href} aria-label={`Open ${title} — ${tag}`} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
        <motion.div
          onHoverStart={() => setHovered(true)}
          onHoverEnd={() => setHovered(false)}
          style={{
            height: '100%',
            position: 'relative',
            overflow: 'hidden',
            background: 'var(--bg-2)',
            border: `1px solid ${hovered ? color + '30' : 'rgba(255,255,255,0.05)'}`,
            borderRadius: 14,
            transition: 'border-color 0.45s var(--ease-expo)',
            boxShadow: hovered ? `0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px ${color}18` : 'none',
            display: 'flex',
            flexDirection: 'column',
            ...style,
          }}
        >
          <div style={{
            position: 'absolute',
            top: -60, right: -60,
            width: 180, height: 180,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${color}14 0%, transparent 65%)`,
            pointerEvents: 'none',
            transition: 'opacity 0.5s',
            opacity: hovered ? 1 : 0.4,
          }} />

          <div style={{
            flex: 1,
            overflow: 'hidden',
            borderBottom: `1px solid ${hovered ? color + '20' : 'rgba(255,255,255,0.04)'}`,
            transition: 'border-color 0.4s',
          }}>
            {preview}
          </div>

          <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{
                fontFamily: 'var(--mono)',
                fontSize: 11,
                letterSpacing: 3.5,
                textTransform: 'uppercase',
                color: readable(color),
                marginBottom: 4,
                opacity: 0.85,
              }}>
                {tag}
              </div>
              <div style={{
                fontFamily: 'var(--display)',
                fontSize: '1.5rem',
                letterSpacing: 3,
                color: 'var(--fg)',
                lineHeight: 1,
              }}>
                {title}
              </div>
            </div>
            <motion.div
              animate={{ x: hovered ? 0 : -4, opacity: hovered ? 1 : 0 }}
              transition={{ duration: 0.25 }}
              style={{ color: readable(color) }}
            >
              <ChevronRight size={18} />
            </motion.div>
          </div>
        </motion.div>
      </Link>
    </AnimatedSection>
  );
}

/* ─── Live ticker: real public activity (lib/home/ticker) ─────────────────── */
function StatsTicker({ items }: { items: string[] }) {
  if (!items.length) return null;
  const repeated = [...items, ...items];
  return (
    <div className="marquee-wrap" aria-label="Happening now" role="marquee" style={{
      borderTop: '1px solid var(--border)',
      borderBottom: '1px solid var(--border)',
      padding: '14px 0',
    }}>
      <div className="marquee-track">
        {repeated.map((item, i) => (
          <span key={i} style={{
            fontFamily: 'var(--mono)',
            fontSize: 11,
            letterSpacing: 3.5,
            textTransform: 'uppercase',
            color: 'var(--fg-dim)',
            padding: '0 36px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 36,
          }}>
            {item}
            <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--accent)', opacity: 0.6, display: 'inline-block' }} />
          </span>
        ))}
      </div>
    </div>
  );
}

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

  const { activeProject } = useProject();

  useEffect(() => {
    const palette = ['#6366f1', '#10b981', '#e8431a', '#f59e0b', '#8b5cf6', '#06b6d4'];
    // Public: platform totals, who's hiring, what was just published.
    (async () => {
      const [platformStats, jobsRes, worksRes] = await Promise.all([
        getPlatformStats(),
        supabase.from('jobs').select('title, role').eq('status', 'open').order('created_at', { ascending: false }).limit(4),
        supabase.from('portfolio_projects').select('title, year, category, role, accent_color').order('created_at', { ascending: false }).limit(3),
      ]);
      setStats({ creators: platformStats.users, scripts: platformStats.scripts, projects: platformStats.projects, concepts: platformStats.media });
      const published = worksRes.data ?? [];
      setWorks(published.map((w) => ({ title: w.title, year: w.year, category: w.category, accent: w.accent_color })));
      setTicker(tickerItems(platformStats, jobsRes.data ?? [], published));
    })().catch((err) => console.error('Home stats load failed:', err));

    awaitOSUser().then(async (user) => {
      setLoggedIn(!!user);
      if (!user) return;

      try {
        const [scriptRes, assetRes, msgRes] = await Promise.all([
          supabase.from('scripts').select('title,content').eq('last_edited_by', user.id).order('updated_at', { ascending: false }).limit(1),
          supabase.from('media').select('title').order('created_at', { ascending: false }).limit(6),

          supabase.from('messages').select('content,sender_id,profiles!messages_sender_id_fkey(username)').not('channel_uuid', 'is', null).order('created_at', { ascending: false }).limit(4),
        ]);
        const script = scriptRes.data?.[0];
        const scriptLines = script?.content ? String(script.content).split('\n').map(s => s.trim()).filter(Boolean).slice(0, 11) : [];
        const assets = (assetRes.data || []).map((a: any, i: number) => ({ label: a.title || 'Reference', color: palette[i % palette.length] }));
        const messages = (msgRes.data || []).slice().reverse().map((m: any) => ({ from: m.profiles?.username || 'Crew', text: m.content, mine: m.sender_id === user.id }));
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
              fontSize: 11,
              letterSpacing: 3,
              textTransform: 'uppercase',
              color: 'var(--accent)',
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', animation: 'pulse 2.5s ease-in-out infinite', display: 'inline-block' }} />
              Digital Film Studio
            </div>
          </motion.div>

          <h1 className="sr-only">Misfits Cavern — the production suite for independent filmmakers</h1>
          <div style={{ position: 'relative', display: 'inline-block' }} aria-hidden>
            <motion.div
              initial={{ opacity: 0, y: 50, filter: 'blur(16px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1] }}
              style={{
                fontFamily: 'var(--display)',
                fontSize: 'clamp(4rem, 18vw, 13rem)',
                lineHeight: 0.84,
                letterSpacing: -2,
                padding: '16px 8px',
                position: 'relative',
              }}
            >
              <span style={{
                WebkitTextStroke: '2px rgba(224, 221, 174,0.85)',
                color: 'transparent',
                display: 'block',
              }}>
                MISFITS
              </span>
              <span style={{
                color: 'var(--accent)',
                display: 'block',
                textShadow: '0 0 80px rgba(232, 67, 26,0.25)',
              }}>
                CAVERN
              </span>

              <Viewfinder size={22} color="rgba(232, 67, 26,0.45)" />
            </motion.div>
          </div>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 0.45, y: 0 }}
            transition={{ duration: 1, delay: 0.55 }}
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 'clamp(1rem, 2.5vw, 1.3rem)',
              fontStyle: 'italic',
              fontWeight: 300,
              letterSpacing: 1,
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
              {loggedIn ? 'Enter Studio' : 'Enter Cavern'}
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
            <div style={{ width: 1, height: 36, background: 'linear-gradient(180deg, transparent, rgba(224, 221, 174,0.4))' }} />
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', padding: '20px 24px', background: 'linear-gradient(120deg, rgba(232, 67, 26,0.08), rgba(99,102,241,0.05))', border: '1px solid rgba(232, 67, 26,0.18)', borderRadius: 14 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(232, 67, 26,0.8)', marginBottom: 6 }}>Welcome back</div>
              <div style={{ fontFamily: 'var(--display)', fontSize: '1.6rem', letterSpacing: 1, lineHeight: 1 }}>
                {activeProject ? `Resume ${activeProject.title}` : 'Continue your screenplay'}
              </div>
              {live.latestScriptTitle && <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-dim)', marginTop: 6 }}>Last edited · {live.latestScriptTitle}</div>}
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
          LIVE STATS — real platform numbers
      ══════════════════════════════════════════════ */}
      {!stats && (
        <section style={{ maxWidth: 1000, margin: '0 auto', padding: '20px 24px 60px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14 }}>
            {[
              { label: 'Creators', color: '#10b981' },
              { label: 'Screenplays', color: '#e8431a' },
              { label: 'Productions', color: '#818cf8' },
              { label: 'Concept Assets', color: '#f59e0b' },
            ].map((s, i) => (
              <div key={s.label}
                style={{ textAlign: 'center', padding: '20px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14 }}>
                <motion.div
                  animate={{ opacity: [0.15, 0.45, 0.15] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: i * 0.15 }}
                  style={{ height: 42, width: 80, margin: '0 auto', background: s.color, borderRadius: 8, filter: 'blur(4px)' }}
                />
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 2.5, textTransform: 'uppercase', color: 'var(--fg-dim)', marginTop: 8 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {stats && (stats.creators + stats.scripts + stats.projects + stats.concepts) > 0 && (
        <section style={{ maxWidth: 1000, margin: '0 auto', padding: '20px 24px 60px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14 }}>
            {[
              { n: stats.creators, label: 'Creators', color: '#10b981' },
              { n: stats.scripts, label: 'Screenplays', color: '#e8431a' },
              { n: stats.projects, label: 'Productions', color: '#818cf8' },
              { n: stats.concepts, label: 'References & Media', color: '#f59e0b' },
            ].map((s, i) => (
              <motion.div key={s.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.6 }}
                style={{ textAlign: 'center', padding: '20px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14 }}>
                <div style={{ fontFamily: 'var(--display)', fontSize: '2.6rem', letterSpacing: 1, lineHeight: 1, color: s.color }}>{s.n.toLocaleString()}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 2.5, textTransform: 'uppercase', color: 'var(--fg-dim)', marginTop: 8 }}>{s.label}</div>
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
            color="#e8431a"
            href="/editor"
            index={0}
            preview={
              <div style={{ minHeight: 220 }}>
                <div style={{
                  padding: '10px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  {['#ff5f57', '#febc2e', '#28c840'].map((c, i) => (
                    <div key={i} style={{ width: 9, height: 9, borderRadius: '50%', background: c, opacity: 0.7 }} />
                  ))}
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 2, color: 'var(--fg-dim)', marginLeft: 6 }}>{live.latestScriptTitle ?? 'ScriptOS'}</span>
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
              color="#10b981"
              href="/lounge"
              index={2}
              preview={<LoungePreview messages={live.messages} caption={loggedIn ? 'Your crew channels appear here' : 'Channels and calls with your crew'} />}
            />
          </div>
        </div>

        <ModuleTile
          title="Portfolio"
          tag="Cinematic Showcase"
          color="#f59e0b"
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
                background: 'linear-gradient(180deg, transparent, rgba(232, 67, 26,0.5))',
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
            <Button href="mailto:peterolowude@icloud.com" variant="ghost" size="lg" external>
              Contact Crew
            </Button>
          </div>
          </AnimatedSection>
        </div>
      </section>

      <footer style={{
        textAlign: 'center',
        padding: '20px 0 44px',
        fontSize: 11,
        letterSpacing: 4,
        textTransform: 'uppercase',
        fontFamily: 'var(--mono)', color: 'var(--fg-dim)' }}>
        © 2026 Peter Olowude · Misfits Cavern Productions
      </footer>
    </div>
  );
}
