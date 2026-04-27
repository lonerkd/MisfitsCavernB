'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { ArrowDown, PenTool, Film, Layers, Users, ArrowRight } from 'lucide-react';
import GrainOverlay from '@/components/GrainOverlay';
import Navigation from '@/components/Navigation';
import AnimatedSection from '@/components/AnimatedSection';
import SectionLabel from '@/components/SectionLabel';

const ParticleBackground = dynamic(() => import('@/components/ParticleBackground'), { ssr: false });

const FEATURES = [
  {
    icon: <PenTool size={22} />,
    title: 'ScriptOS',
    subtitle: 'Intelligent Screenplay Editor',
    description: 'Professional-grade writing with live parsing, character analytics, and scene intelligence. No fluff — pure craft.',
    href: '/editor',
    color: '#ff3c00',
  },
  {
    icon: <Film size={22} />,
    title: 'Portfolio',
    subtitle: 'Cinematic Showcase',
    description: 'Present your work the way it deserves. Bento grids, ambient color, video overlays — built for filmmakers.',
    href: '/portfolio',
    color: '#ff8800',
  },
  {
    icon: <Layers size={22} />,
    title: 'Studio',
    subtitle: 'Asset & Project Hub',
    description: 'Organize scripts, video, audio, and stills under one roof. Your entire production workspace.',
    href: '/studio',
    color: '#00cc66',
  },
  {
    icon: <Users size={22} />,
    title: 'Lounge',
    subtitle: 'Crew Collaboration',
    description: 'A digital hang. Live chat, music, presence — the creative ecosystem that bridges distance.',
    href: '/lounge',
    color: '#0099ff',
  },
];

function FeatureCard({ feature, index }: { feature: typeof FEATURES[0]; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const r = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width - 0.5) * 12;
    const y = ((e.clientY - r.top) / r.height - 0.5) * 8;
    cardRef.current.style.transform = `perspective(800px) rotateX(${-y}deg) rotateY(${x}deg) translateY(-4px)`;
  };
  const handleLeave = () => {
    if (cardRef.current) cardRef.current.style.transform = '';
  };

  return (
    <AnimatedSection delay={index * 0.1}>
      <Link href={feature.href} style={{ textDecoration: 'none', display: 'block' }}>
        <div
          ref={cardRef}
          onMouseMove={handleMove}
          style={{
            padding: '36px 28px',
            background: 'var(--bg-2)',
            border: '1px solid var(--border)',
            height: '100%',
            transition: 'border-color 0.4s, box-shadow 0.4s, transform 0.5s var(--ease-expo)',
            position: 'relative',
            overflow: 'hidden',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = `${feature.color}55`;
            e.currentTarget.style.boxShadow = `0 20px 60px rgba(0,0,0,0.8), 0 0 40px ${feature.color}10`;
          }}
          onMouseLeave={e => {
            handleLeave();
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          {/* Corner glow */}
          <div style={{
            position: 'absolute',
            top: -40,
            right: -40,
            width: 120,
            height: 120,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${feature.color}18 0%, transparent 70%)`,
            pointerEvents: 'none',
          }} />

          <div style={{ color: feature.color, marginBottom: 20 }}>{feature.icon}</div>

          <div style={{
            fontSize: 8,
            letterSpacing: 4,
            textTransform: 'uppercase',
            color: feature.color,
            fontFamily: 'var(--mono)',
            marginBottom: 6,
            opacity: 0.8,
          }}>
            {feature.subtitle}
          </div>

          <h3 style={{
            fontFamily: 'var(--display)',
            fontSize: 'clamp(1.8rem, 3vw, 2.4rem)',
            letterSpacing: 2,
            marginBottom: 14,
            color: 'var(--fg)',
          }}>
            {feature.title}
          </h3>

          <p style={{
            fontFamily: 'var(--serif)',
            fontSize: '0.95rem',
            lineHeight: 1.75,
            color: 'var(--fg-muted)',
            marginBottom: 28,
          }}>
            {feature.description}
          </p>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontFamily: 'var(--mono)',
            fontSize: 9,
            letterSpacing: 3,
            textTransform: 'uppercase',
            color: feature.color,
          }}>
            Enter <ArrowRight size={11} />
          </div>
        </div>
      </Link>
    </AnimatedSection>
  );
}

export default function Home() {
  const { scrollY } = useScroll();
  const springY = useSpring(scrollY, { stiffness: 60, damping: 20 });
  const heroOpacity = useTransform(springY, [0, 400], [1, 0]);
  const heroY = useTransform(springY, [0, 400], [0, 80]);

  return (
    <main style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
      <GrainOverlay />
      <Navigation />

      {/* ── HERO ── */}
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
        {/* Ambient orb */}
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.05, 0.12, 0.05] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            width: '80vw',
            height: '80vw',
            maxWidth: 900,
            maxHeight: 900,
            borderRadius: '50%',
            pointerEvents: 'none',
            background: 'radial-gradient(circle, rgba(255,60,0,0.18) 0%, transparent 65%)',
          }}
        />

        <motion.div
          style={{ opacity: heroOpacity, y: heroY, position: 'relative', zIndex: 2, textAlign: 'center' }}
        >
          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            style={{
              fontFamily: 'var(--display)',
              fontSize: 'clamp(3.5rem, 16vw, 11rem)',
              lineHeight: 0.85,
              letterSpacing: -2,
            }}
          >
            <span style={{ WebkitTextStroke: '2px rgba(240,236,228,0.9)', color: 'transparent' }}>
              MISFITS
            </span>
            <br />
            <span style={{ color: 'var(--accent)' }}>CAVERN</span>
          </motion.div>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
            animate={{ opacity: 0.5, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 1, delay: 0.5 }}
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 'clamp(0.95rem, 2.5vw, 1.25rem)',
              fontStyle: 'italic',
              fontWeight: 300,
              letterSpacing: 1,
              marginTop: 24,
              maxWidth: 560,
              margin: '24px auto 0',
            }}
          >
            The ultimate creative platform for storytellers who refuse to compromise.
          </motion.p>

          {/* Pill tags */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.8 }}
            style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 24, flexWrap: 'wrap' }}
          >
            {['Screenwriting', 'Portfolio', 'Collaboration', 'Production'].map((t, i) => (
              <span key={i} style={{
                fontSize: 8,
                letterSpacing: 4,
                textTransform: 'uppercase',
                color: 'rgba(240,236,228,0.22)',
                fontFamily: 'var(--mono)',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}>
                <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--accent)', opacity: 0.6, display: 'inline-block' }} />
                {t}
              </span>
            ))}
          </motion.div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.95, duration: 0.8 }}
            style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 36, flexWrap: 'wrap' }}
          >
            <motion.div whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/editor"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '13px 28px',
                  background: 'var(--accent)',
                  color: 'var(--bg)',
                  fontFamily: 'var(--mono)',
                  fontSize: 10,
                  letterSpacing: 3,
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-full)',
                }}
              >
                Open ScriptOS <ArrowRight size={12} />
              </Link>
            </motion.div>
            <motion.div whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/portfolio"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '13px 28px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.02)',
                  color: 'var(--fg)',
                  fontFamily: 'var(--mono)',
                  fontSize: 10,
                  letterSpacing: 3,
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                  borderRadius: 'var(--radius-full)',
                }}
              >
                The Work
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Scroll cue */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.25 }}
          transition={{ delay: 1.5 }}
          style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)' }}
        >
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ArrowDown size={18} />
          </motion.div>
        </motion.div>
      </section>

      {/* ── CONCEPT ── */}
      <section style={{ maxWidth: 700, margin: '0 auto', padding: '100px 24px' }}>
        <SectionLabel text="The Concept" />
        <AnimatedSection>
          <div style={{ fontFamily: 'var(--serif)', fontSize: '1.08rem', lineHeight: 2, color: 'var(--fg-muted)' }}>
            <p style={{ marginBottom: 22 }}>
              Misfits Cavern isn't a tool. It's a digital sanctuary — built for storytellers, filmmakers,
              and creative minds who operate at a different frequency.
            </p>
            <p style={{ marginBottom: 22 }}>
              At the core is <span style={{ color: 'var(--accent)', fontStyle: 'italic' }}>ScriptOS</span> —
              a screenplay editor with intelligent parsing, character analytics, and live preview.
              Built offline-first. No subscriptions, no bloat.
            </p>
            <p style={{ color: 'var(--fg)', fontWeight: 400 }}>
              Surrounding it is a full creative ecosystem: showcase your work, collaborate with your crew,
              manage production, and build your brand — all in one place that looks the part.
            </p>
          </div>
        </AnimatedSection>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ padding: '60px 24px 120px', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.35, pointerEvents: 'none' }}>
          <ParticleBackground />
        </div>

        <div style={{ maxWidth: 1160, margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <SectionLabel text="The Platform" center />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 16 }}>
            {FEATURES.map((f, i) => (
              <FeatureCard key={f.title} feature={f} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: '120px 24px 160px', textAlign: 'center', position: 'relative' }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'radial-gradient(ellipse at 50% 50%, rgba(255,60,0,0.05) 0%, transparent 60%)',
        }} />

        <div style={{ position: 'relative', zIndex: 2 }}>
          <AnimatedSection>
            <motion.div
              style={{
                fontFamily: 'var(--display)',
                fontSize: 'clamp(3.5rem, 12vw, 8rem)',
                lineHeight: 0.88,
                letterSpacing: -1,
                marginBottom: 40,
              }}
            >
              LET'S<br />
              <span style={{ color: 'var(--accent)' }}>BUILD</span><br />
              SOMETHING
            </motion.div>

            <p style={{
              fontFamily: 'var(--serif)',
              fontSize: '1rem',
              fontStyle: 'italic',
              color: 'var(--fg-muted)',
              marginBottom: 36,
            }}>
              Creative vision meets technical precision.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
              <motion.div whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href="/auth"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '14px 32px',
                    background: 'var(--accent)',
                    color: 'var(--bg)',
                    fontFamily: 'var(--mono)',
                    fontSize: 10,
                    letterSpacing: 4,
                    textTransform: 'uppercase',
                    textDecoration: 'none',
                    fontWeight: 600,
                    borderRadius: 'var(--radius-full)',
                  }}
                >
                  Join the Cavern
                </Link>
              </motion.div>
              <motion.div whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                <a
                  href="mailto:peterolowude@icloud.com"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '14px 32px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: 'rgba(255,255,255,0.02)',
                    color: 'var(--fg)',
                    fontFamily: 'var(--mono)',
                    fontSize: 10,
                    letterSpacing: 4,
                    textTransform: 'uppercase',
                    textDecoration: 'none',
                    borderRadius: 'var(--radius-full)',
                  }}
                >
                  Say Hello
                </a>
              </motion.div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      <footer style={{ textAlign: 'center', padding: '20px 0 44px', fontSize: 8, letterSpacing: 4, textTransform: 'uppercase', opacity: 0.08, fontFamily: 'var(--mono)' }}>
        © 2026 Peter Olowude · Misfits Cavern Productions
      </footer>
    </main>
  );
}
