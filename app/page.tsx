'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import {
  ArrowRight, PenTool, Layers, Users, Film,
  Briefcase, ChevronRight,
} from 'lucide-react';
import GrainOverlay from '@/components/GrainOverlay';
import Navigation from '@/components/Navigation';
import AnimatedSection from '@/components/AnimatedSection';

/* ─── Viewfinder corner brackets ─────────────────────────────────────────── */
function Viewfinder({ size = 20, color = 'rgba(240,236,228,0.3)' }: { size?: number; color?: string }) {
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
  { id: 'write',     label: 'Write',       icon: PenTool,   color: '#ff3c00', href: '/editor'    },
  { id: 'organize',  label: 'Organize',    icon: Layers,    color: '#6366f1', href: '/studio'    },
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
      <Link href={stage.href} style={{ textDecoration: 'none' }}>
        <motion.div
          onHoverStart={() => setHovered(true)}
          onHoverEnd={() => setHovered(false)}
          whileHover={{ y: -5, scale: 1.08 }}
          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
          style={{
            width: 54,
            height: 54,
            borderRadius: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: hovered ? `${stage.color}18` : 'rgba(255,255,255,0.03)',
            border: `1px solid ${hovered ? stage.color + '45' : 'rgba(255,255,255,0.07)'}`,
            color: hovered ? stage.color : 'rgba(240,236,228,0.45)',
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
                borderRadius: 18,
                border: `1px solid ${stage.color}30`,
                pointerEvents: 'none',
              }}
            />
          )}
        </motion.div>
      </Link>
      <span style={{
        fontFamily: 'var(--mono)',
        fontSize: 8,
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
        background: 'linear-gradient(90deg, transparent, rgba(255,60,0,0.6), transparent)',
        animation: `travel ${3 + index * 0.4}s ease-in-out ${index * 0.6}s infinite`,
      }} />
    </motion.div>
  );
}

/* ─── Module Tile — screen-preview cards ─────────────────────────────────── */

function ScriptOSPreview() {
  return (
    <div className="screenplay-preview" style={{ padding: '20px 16px' }}>
      <div className="screenplay-scene-hdr">INT. UNDERGROUND STUDIO — NIGHT</div>
      <br />
      <div style={{ color: 'rgba(240,236,228,0.55)', fontSize: 11 }}>
        The room hums with electricity. Monitors cast blue light across stacks of handwritten notes.
      </div>
      <br />
      <div className="screenplay-char">DIRECTOR</div>
      <div className="screenplay-dialog">Every frame is a decision. Every decision, a statement.</div>
      <br />
      <div className="screenplay-scene-hdr">EXT. CITY ROOFTOP — GOLDEN HOUR</div>
      <br />
      <div style={{ color: 'rgba(240,236,228,0.55)', fontSize: 11 }}>
        A city that never stops moving. She lights a cigarette and stares at the horizon.
      </div>
      <br />
      <div className="screenplay-char">MARA</div>
      <div className="screenplay-dialog">You can't make art in a vacuum. You need friction.</div>
    </div>
  );
}

function StudioPreview() {
  const items = [
    { label: 'Opening_v3.mov', type: 'video', color: '#6366f1' },
    { label: 'Score_Final.wav', type: 'audio', color: '#10b981' },
    { label: 'Act1_Draft.fdx',  type: 'script', color: '#ff3c00' },
    { label: 'Cast_Photos.zip', type: 'image', color: '#f59e0b' },
    { label: 'Budget_R2.xlsx',  type: 'doc',   color: '#8b5cf6' },
    { label: 'Storyboard.pdf',  type: 'doc',   color: '#06b6d4' },
  ];
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
            fontSize: 8.5,
            color: 'rgba(240,236,228,0.5)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function LoungePreview() {
  const messages = [
    { from: 'Maya',   text: 'Scene 14 is landing perfectly ✓',  mine: false },
    { from: 'You',    text: 'Color grade on act 2 is insane',    mine: true  },
    { from: 'Jordan', text: 'Music cue syncs at 2:34 exactly',   mine: false },
    { from: 'You',    text: 'Ship it.',                          mine: true  },
  ];
  return (
    <div style={{ padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {messages.map((m, i) => (
        <div key={i} style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: m.mine ? 'flex-end' : 'flex-start',
        }}>
          {!m.mine && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 7.5, color: '#10b981', letterSpacing: 1, marginBottom: 3 }}>{m.from}</span>
          )}
          <div style={{
            background: m.mine ? 'rgba(255,60,0,0.15)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${m.mine ? 'rgba(255,60,0,0.2)' : 'rgba(255,255,255,0.07)'}`,
            borderRadius: m.mine ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
            padding: '7px 12px',
            maxWidth: '80%',
          }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'rgba(240,236,228,0.75)' }}>{m.text}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function PortfolioPreview() {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', minHeight: 140 }}>
      {/* Simulated widescreen film frame */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(160deg, #0d0d0f 0%, #1a1008 40%, #0a0806 100%)',
      }} />
      {/* Horizontal bands — film grain aesthetic */}
      {[0.15, 0.4, 0.65, 0.85].map((y, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: 0, right: 0,
          top: `${y * 100}%`,
          height: 1,
          background: 'rgba(255,255,255,0.04)',
        }} />
      ))}
      {/* Letterbox bars */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '14%', background: '#000', opacity: 0.6 }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '14%', background: '#000', opacity: 0.6 }} />
      {/* Central light source */}
      <div style={{
        position: 'absolute',
        top: '20%', left: '35%',
        width: '40%', height: '60%',
        background: 'radial-gradient(ellipse, rgba(245,158,11,0.12) 0%, transparent 70%)',
        borderRadius: '50%',
      }} />
      {/* Frame label */}
      <div style={{
        position: 'absolute',
        bottom: '18%', right: 16,
        fontFamily: 'var(--mono)',
        fontSize: 7,
        letterSpacing: 3,
        textTransform: 'uppercase',
        color: 'rgba(240,236,228,0.25)',
      }}>
        CAVERN · 2026
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
      <Link href={href} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
        <motion.div
          onHoverStart={() => setHovered(true)}
          onHoverEnd={() => setHovered(false)}
          style={{
            height: '100%',
            position: 'relative',
            overflow: 'hidden',
            background: 'var(--bg-2)',
            border: `1px solid ${hovered ? color + '30' : 'rgba(255,255,255,0.05)'}`,
            borderRadius: 16,
            transition: 'border-color 0.45s var(--ease-expo)',
            boxShadow: hovered ? `0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px ${color}18` : 'none',
            display: 'flex',
            flexDirection: 'column',
            ...style,
          }}
        >
          {/* Corner accent glow */}
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

          {/* Preview area */}
          <div style={{
            flex: 1,
            overflow: 'hidden',
            borderBottom: `1px solid ${hovered ? color + '20' : 'rgba(255,255,255,0.04)'}`,
            transition: 'border-color 0.4s',
          }}>
            {preview}
          </div>

          {/* Footer bar */}
          <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{
                fontFamily: 'var(--mono)',
                fontSize: 7.5,
                letterSpacing: 3.5,
                textTransform: 'uppercase',
                color: color,
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
              style={{ color: color }}
            >
              <ChevronRight size={18} />
            </motion.div>
          </div>
        </motion.div>
      </Link>
    </AnimatedSection>
  );
}

/* ─── Stats ticker ────────────────────────────────────────────────────────── */
const TICKER_ITEMS = [
  'Industry-Format Screenplay',
  'Real-Time Collaboration',
  'Cloud-Sync + Offline-First',
  'Character Analytics',
  'Asset Management',
  'Crew Scheduling',
  'Portfolio Publishing',
  'Film-Grade Typography',
  'Live Presence',
  'One Ecosystem',
];

function StatsTicker() {
  const repeated = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div className="marquee-wrap" style={{
      borderTop: '1px solid var(--border)',
      borderBottom: '1px solid var(--border)',
      padding: '14px 0',
    }}>
      <div className="marquee-track">
        {repeated.map((item, i) => (
          <span key={i} style={{
            fontFamily: 'var(--mono)',
            fontSize: 9,
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
export default function Home() {
  const { scrollY } = useScroll();
  const springY = useSpring(scrollY, { stiffness: 50, damping: 18 });
  const heroOpacity = useTransform(springY, [0, 500], [1, 0]);
  const heroY = useTransform(springY, [0, 500], [0, 100]);

  return (
    <main style={{ background: 'var(--bg)', color: 'var(--fg)', overflowX: 'hidden' }}>
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
        {/* Ambient orbs */}
        <div style={{
          position: 'absolute',
          width: '70vw',
          height: '70vw',
          maxWidth: 800,
          maxHeight: 800,
          borderRadius: '50%',
          pointerEvents: 'none',
          background: 'radial-gradient(circle, rgba(255,60,0,0.10) 0%, transparent 65%)',
          animation: 'orb-breathe 10s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '10%', right: '5%',
          width: '40vw', height: '40vw',
          maxWidth: 500, maxHeight: 500,
          borderRadius: '50%',
          pointerEvents: 'none',
          background: 'radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 65%)',
          animation: 'orb-breathe 14s ease-in-out 3s infinite',
        }} />

        <motion.div style={{ opacity: heroOpacity, y: heroY, position: 'relative', zIndex: 2, textAlign: 'center', width: '100%' }}>

          {/* Status chip */}
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
              background: 'rgba(255,60,0,0.08)',
              border: '1px solid rgba(255,60,0,0.20)',
              borderRadius: 9999,
              fontFamily: 'var(--mono)',
              fontSize: 8.5,
              letterSpacing: 3,
              textTransform: 'uppercase',
              color: 'rgba(255,60,0,0.85)',
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ff3c00', animation: 'pulse 2.5s ease-in-out infinite', display: 'inline-block' }} />
              Digital Film Studio
            </div>
          </motion.div>

          {/* Wordmark with viewfinder */}
          <div style={{ position: 'relative', display: 'inline-block' }}>
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
                WebkitTextStroke: '2px rgba(240,236,228,0.85)',
                color: 'transparent',
                display: 'block',
              }}>
                MISFITS
              </span>
              <span style={{
                color: 'var(--accent)',
                display: 'block',
                textShadow: '0 0 80px rgba(255,60,0,0.25)',
              }}>
                CAVERN
              </span>

              {/* Viewfinder corners */}
              <Viewfinder size={22} color="rgba(255,60,0,0.45)" />
            </motion.div>
          </div>

          {/* Sub-line */}
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

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85, duration: 0.9 }}
            style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 40, flexWrap: 'wrap' }}
          >
            <Link href="/editor" className="btn-primary">
              Enter Studio <ArrowRight size={13} />
            </Link>
            <Link href="/portfolio" className="btn-ghost">
              The Work
            </Link>
          </motion.div>
        </motion.div>

        {/* Scroll cue */}
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
            <div style={{ width: 1, height: 36, background: 'linear-gradient(180deg, transparent, rgba(240,236,228,0.4))' }} />
          </motion.div>
        </motion.div>
      </section>

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
          STATS TICKER
      ══════════════════════════════════════════════ */}
      <StatsTicker />

      {/* ══════════════════════════════════════════════
          MODULE GRID — asymmetric layout
      ══════════════════════════════════════════════ */}
      <section style={{ padding: '80px 24px 100px', maxWidth: 1200, margin: '0 auto' }}>

        {/* Top row — 2 columns: large left + right */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>

          {/* ScriptOS — large left */}
          <ModuleTile
            title="ScriptOS"
            tag="Screenplay Editor"
            color="#ff3c00"
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
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 2, color: 'var(--fg-dim)', marginLeft: 6 }}>untitled_script.fdx</span>
                </div>
                <ScriptOSPreview />
              </div>
            }
          />

          {/* Right column: Studio + Lounge stacked */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <ModuleTile
              title="Studio"
              tag="Asset Hub"
              color="#6366f1"
              href="/studio"
              index={1}
              preview={<StudioPreview />}
            />
            <ModuleTile
              title="Lounge"
              tag="Crew Collaboration"
              color="#10b981"
              href="/lounge"
              index={2}
              preview={<LoungePreview />}
            />
          </div>
        </div>

        {/* Bottom row — Portfolio, full width */}
        <ModuleTile
          title="Portfolio"
          tag="Cinematic Showcase"
          color="#f59e0b"
          href="/portfolio"
          index={3}
          preview={<PortfolioPreview />}
          style={{ minHeight: 0 }}
        />
      </section>

      {/* ══════════════════════════════════════════════
          CLOSING CTA
      ══════════════════════════════════════════════ */}
      <section style={{ padding: '100px 24px 160px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* Background glow */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 50% 60%, rgba(255,60,0,0.07) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 2 }}>
          <AnimatedSection>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
              <div style={{
                width: 1,
                height: 64,
                background: 'linear-gradient(180deg, transparent, rgba(255,60,0,0.5))',
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
              <span style={{ color: 'var(--accent)', textShadow: '0 0 80px rgba(255,60,0,0.2)' }}>FILM</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              <Link href="/auth" className="btn-primary" style={{ fontSize: 11, letterSpacing: 4, padding: '15px 36px' }}>
                Join The Cavern
              </Link>
              <a href="mailto:peterolowude@icloud.com" className="btn-ghost" style={{ fontSize: 11, letterSpacing: 4, padding: '15px 36px' }}>
                Say Hello
              </a>
            </div>
          </AnimatedSection>
        </div>
      </section>

      <footer style={{
        textAlign: 'center',
        padding: '20px 0 44px',
        fontSize: 7.5,
        letterSpacing: 4,
        textTransform: 'uppercase',
        opacity: 0.07,
        fontFamily: 'var(--mono)',
      }}>
        © 2026 Peter Olowude · Misfits Cavern Productions
      </footer>
    </main>
  );
}
