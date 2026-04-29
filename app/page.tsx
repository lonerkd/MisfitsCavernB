'use client';

import React, { useState } from 'react';
import {
  ArrowDown,
  Film,
  Code,
  Users,
  Briefcase,
  LayoutGrid,
  MessageSquare,
  Palette,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import GrainOverlay from '@/components/GrainOverlay';
import PhotoScatter from '@/components/PhotoScatter';
import Navigation from '@/components/Navigation';
import AnimatedSection from '@/components/AnimatedSection';

// Dynamic import for particles
const ParticleBackground = dynamic(() => import('@/components/ParticleBackground'), { ssr: false });

const FEATURES = [
  {
    icon: <Code size={22} />,
    title: 'ScriptOS Editor',
    description: 'Professional screenplay editor with intelligent parsing, analytics, and table read.',
    href: '/editor',
  },
  {
    icon: <LayoutGrid size={22} />,
    title: 'Projects',
    description: 'Kanban-style project management. From concept to release.',
    href: '/projects',
  },
  {
    icon: <Briefcase size={22} />,
    title: 'Jobs',
    description: 'Hire and get hired. Post opportunities, apply, manage your crew.',
    href: '/jobs',
  },
  {
    icon: <Users size={22} />,
    title: 'Crew',
    description: 'The talent directory. Find collaborators by role and availability.',
    href: '/crew',
  },
  {
    icon: <Palette size={22} />,
    title: 'Studio',
    description: 'Mood board canvas. Pin references, build the visual language of your film.',
    href: '/studio',
  },
  {
    icon: <MessageSquare size={22} />,
    title: 'Lounge',
    description: 'Real-time channels. Talk shop, share work, build community.',
    href: '/lounge',
  },
  {
    icon: <Film size={22} />,
    title: 'Portfolio',
    description: 'Beautiful video galleries and project showcases for your best work.',
    href: '/portfolio',
  },
  {
    icon: <BookOpen size={22} />,
    title: 'Table Read',
    description: 'Bring your script to life. Cast roles, generate audio, hear your words out loud.',
    href: '/editor',
  },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    heading: 'Create your profile',
    body: 'Set your role, skills, and location. Tell the community who you are and what you make.',
  },
  {
    step: '02',
    heading: 'Build your portfolio',
    body: 'Upload reels, stills, scripts. Let your work speak before you say a word.',
  },
  {
    step: '03',
    heading: 'Find your crew',
    body: 'Browse the talent directory, post a job, or drop into the Lounge. Your next collaborator is already here.',
  },
];

export default function Home() {
  return (
    <main style={{ background: 'var(--bg)', color: 'var(--fg)', fontFamily: 'var(--mono)' }}>
      <GrainOverlay />

      {/* Navigation */}
      <Navigation />

      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <section
        style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
          paddingTop: 80,
        }}
      >
        <PhotoScatter opacity={0.09} count={24} />

        {/* Radial glow */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse at 40% 55%, rgba(255, 60, 0, 0.06) 0%, transparent 55%)',
            zIndex: 1,
          }}
        />

        {/* Hero content */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            textAlign: 'center',
            animation: 'slideUp 1s ease-out',
          }}
        >
          {/* Headline */}
          <div
            style={{
              fontFamily: 'var(--display)',
              fontSize: 'clamp(2.5rem, 12vw, 8rem)',
              lineHeight: 0.85,
              letterSpacing: -2,
              marginBottom: 20,
            }}
          >
            <span style={{ WebkitTextStroke: '2px var(--fg)', color: 'transparent' }}>MISFITS</span>
            <br />
            <span style={{ color: 'var(--accent)' }}>CAVERN</span>
          </div>

          {/* Tagline */}
          <p
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 'clamp(0.9rem, 2vw, 1.3rem)',
              fontWeight: 300,
              fontStyle: 'italic',
              letterSpacing: 1,
              opacity: 0.5,
              animation: 'slideUp 1s ease-out 0.2s both',
              maxWidth: 580,
              margin: '22px auto 0',
              lineHeight: 1.7,
            }}
          >
            The creative platform for filmmakers and storytellers who refuse to compromise.
          </p>

          {/* CTA row */}
          <div
            style={{
              display: 'flex',
              gap: 14,
              justifyContent: 'center',
              marginTop: 40,
              animation: 'slideUp 1s ease-out 0.35s both',
              flexWrap: 'wrap',
            }}
          >
            <HeroCTA href="/editor" primary label="START WRITING" />
            <HeroCTA href="/crew" label="BROWSE CREW" />
            <HeroCTA href="/jobs" label="FIND WORK" />
          </div>
        </div>

        {/* Scroll indicator */}
        <a
          href="#stats"
          style={{
            position: 'absolute',
            bottom: 32,
            color: 'var(--fg)',
            opacity: 0.2,
            textDecoration: 'none',
            zIndex: 10,
            animation: 'fadeIn 1s ease-out 0.5s both',
          }}
        >
          <ArrowDown size={18} />
        </a>
      </section>

      {/* ── STATS BAR ──────────────────────────────────────────────────── */}
      <div
        id="stats"
        style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(255,255,255,0.015)',
        }}
      >
        <div
          style={{
            maxWidth: 960,
            margin: '0 auto',
            padding: '28px 18px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 0,
          }}
        >
          {[
            '7 creative tools',
            'Real-time collaboration',
            'Professional-grade screenwriting',
          ].map((item, i, arr) => (
            <React.Fragment key={i}>
              <span
                style={{
                  fontSize: 10,
                  letterSpacing: 3,
                  textTransform: 'uppercase',
                  color: 'rgba(240, 236, 228, 0.45)',
                  padding: '0 32px',
                  textAlign: 'center',
                }}
              >
                {item}
              </span>
              {i < arr.length - 1 && (
                <span
                  style={{
                    width: 1,
                    height: 18,
                    background: 'rgba(255,255,255,0.12)',
                    flexShrink: 0,
                  }}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── ABOUT / MANIFESTO ──────────────────────────────────────────── */}
      <section
        id="about"
        style={{
          maxWidth: 700,
          margin: '0 auto',
          padding: '100px 18px',
          position: 'relative',
        }}
      >
        <AnimatedSection>
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
              <div style={{ width: 32, height: 1, background: 'var(--accent)' }} />
              <span
                style={{
                  fontSize: 9,
                  letterSpacing: 6,
                  textTransform: 'uppercase',
                  color: 'var(--accent)',
                }}
              >
                The Concept
              </span>
            </div>

            <div
              style={{
                fontFamily: 'var(--serif)',
                fontSize: '1.1rem',
                lineHeight: 1.9,
                color: 'rgba(255, 255, 255, 0.5)',
              }}
            >
              <p style={{ marginBottom: 24 }}>
                This is not another app. It is a digital sanctuary — built for the filmmakers,
                writers, and creative minds who know that craft comes first.
              </p>

              <p style={{ marginBottom: 24 }}>
                At the core:{' '}
                <span style={{ color: 'var(--accent)', fontStyle: 'italic' }}>ScriptOS</span> —
                a professional screenplay editor with intelligent parsing, character analytics,
                and table read. Built for the page. Built to last.
              </p>

              <p style={{ marginBottom: 24 }}>
                Around it, a full creative ecosystem. Post your work. Hire your crew.
                Run your projects. Build in public, without the noise.
              </p>

              <p style={{ color: 'var(--fg)', fontWeight: 400 }}>
                Misfits Cavern exists because great stories deserve great tools —
                and great collaborators deserve a place to find each other.
              </p>
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* ── FEATURE GRID (8 cards) ─────────────────────────────────────── */}
      <section id="platform" style={{ padding: '90px 18px', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.4 }}>
          <ParticleBackground />
        </div>

        <AnimatedSection>
          <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 2 }}>
            {/* Section label */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 56,
                justifyContent: 'center',
              }}
            >
              <div style={{ width: 32, height: 1, background: 'var(--accent)' }} />
              <span
                style={{
                  fontSize: 9,
                  letterSpacing: 6,
                  textTransform: 'uppercase',
                  color: 'var(--accent)',
                }}
              >
                The Platform
              </span>
              <div style={{ width: 32, height: 1, background: 'var(--accent)' }} />
            </div>

            {/* Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: 16,
              }}
            >
              {FEATURES.map((feature, i) => (
                <AnimatedSection key={i} delay={i * 0.06}>
                  <FeatureCard feature={feature} />
                </AnimatedSection>
              ))}
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────────────────── */}
      <section
        id="how-it-works"
        style={{
          padding: '100px 18px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse at 60% 50%, rgba(255, 60, 0, 0.04) 0%, transparent 60%)',
          }}
        />

        <AnimatedSection>
          <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 2 }}>
            {/* Label */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 60,
                justifyContent: 'center',
              }}
            >
              <div style={{ width: 32, height: 1, background: 'var(--accent)' }} />
              <span
                style={{
                  fontSize: 9,
                  letterSpacing: 6,
                  textTransform: 'uppercase',
                  color: 'var(--accent)',
                }}
              >
                How It Works
              </span>
              <div style={{ width: 32, height: 1, background: 'var(--accent)' }} />
            </div>

            {/* Steps */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: 48,
              }}
            >
              {HOW_IT_WORKS.map((s, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <div
                    style={{
                      fontFamily: 'var(--display)',
                      fontSize: 'clamp(3rem, 6vw, 4.5rem)',
                      lineHeight: 1,
                      color: 'var(--accent)',
                      opacity: 0.18,
                      marginBottom: 16,
                      letterSpacing: -2,
                    }}
                  >
                    {s.step}
                  </div>
                  <h3
                    style={{
                      fontFamily: 'var(--display)',
                      fontSize: '1.15rem',
                      letterSpacing: 2,
                      marginBottom: 14,
                      color: 'var(--fg)',
                    }}
                  >
                    {s.heading}
                  </h3>
                  <p
                    style={{
                      fontFamily: 'var(--serif)',
                      fontSize: 13,
                      lineHeight: 1.8,
                      color: 'rgba(255,255,255,0.45)',
                    }}
                  >
                    {s.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────── */}
      <section
        id="contact"
        style={{ padding: '140px 18px', textAlign: 'center', position: 'relative' }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse at 50% 50%, rgba(255, 60, 0, 0.04) 0%, transparent 55%)',
          }}
        />

        <AnimatedSection>
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div
              style={{
                fontFamily: 'var(--display)',
                fontSize: 'clamp(3rem, 10vw, 7rem)',
                lineHeight: 0.9,
                letterSpacing: -2,
                marginBottom: 40,
              }}
            >
              LET'S
              <br />
              <span style={{ color: 'var(--accent)' }}>BUILD</span>
              <br />
              SOMETHING
            </div>

            <p
              style={{
                fontFamily: 'var(--serif)',
                fontSize: '1rem',
                fontStyle: 'italic',
                opacity: 0.3,
                marginBottom: 36,
              }}
            >
              Available immediately · Calgary, AB · Ready to relocate
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
              {[
                { label: 'Email', href: 'mailto:peterolowude@gmail.com' },
                { label: 'X / Twitter', href: 'https://twitter.com/5stariah' },
                {
                  label: 'Full Drive',
                  href: 'https://drive.google.com/drive/folders/10kpdBuTKIWpCrARqTNSCW3OtyWzQnAg0',
                },
              ].map((link, i) => (
                <a key={i} href={link.href} target="_blank" rel="noopener noreferrer" className="cta-btn">
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </AnimatedSection>
      </section>

      <footer
        style={{
          textAlign: 'center',
          padding: 20,
          fontSize: 8,
          letterSpacing: 4,
          textTransform: 'uppercase',
          opacity: 0.1,
        }}
      >
        © 2026 Peter Olowude · Misfits Cavern Productions
      </footer>
    </main>
  );
}

/* ── Sub-components ───────────────────────────────────────────────────── */

function HeroCTA({
  href,
  label,
  primary = false,
}: {
  href: string;
  label: string;
  primary?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  const base: React.CSSProperties = {
    display: 'inline-block',
    padding: '11px 26px',
    fontSize: 10,
    letterSpacing: 3,
    textTransform: 'uppercase',
    textDecoration: 'none',
    fontFamily: 'var(--mono)',
    border: '1px solid',
    transition: 'all 0.25s',
    cursor: 'pointer',
  };

  const styles: React.CSSProperties = primary
    ? {
        ...base,
        background: hovered ? 'transparent' : 'var(--accent)',
        borderColor: 'var(--accent)',
        color: hovered ? 'var(--accent)' : 'var(--bg)',
      }
    : {
        ...base,
        background: hovered ? 'rgba(255,60,0,0.08)' : 'transparent',
        borderColor: hovered ? 'var(--accent)' : 'rgba(255,255,255,0.18)',
        color: hovered ? 'var(--accent)' : 'var(--fg)',
      };

  return (
    <Link
      href={href}
      style={styles}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {label}
    </Link>
  );
}

function FeatureCard({
  feature,
}: {
  feature: { icon: React.ReactNode; title: string; description: string; href: string };
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link href={feature.href} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
      <div
        style={{
          padding: '28px 28px 24px',
          background: '#0a0a0a',
          border: `1px solid ${hovered ? 'var(--accent)' : 'rgba(255, 255, 255, 0.05)'}`,
          transition: 'border-color 0.3s, transform 0.3s, box-shadow 0.3s',
          transform: hovered ? 'translateY(-5px)' : 'translateY(0)',
          boxShadow: hovered ? '0 12px 32px rgba(255, 60, 0, 0.08)' : 'none',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          cursor: 'pointer',
          boxSizing: 'border-box',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Icon */}
        <div
          style={{
            color: hovered ? 'var(--accent)' : 'rgba(255,255,255,0.3)',
            transition: 'color 0.3s',
          }}
        >
          {feature.icon}
        </div>

        {/* Title row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <h3
            style={{
              fontFamily: 'var(--display)',
              fontSize: '1.05rem',
              letterSpacing: 2,
              margin: 0,
              color: 'var(--fg)',
            }}
          >
            {feature.title}
          </h3>
          <ArrowRight
            size={14}
            style={{
              color: hovered ? 'var(--accent)' : 'rgba(255,255,255,0.15)',
              transition: 'color 0.3s, transform 0.3s',
              transform: hovered ? 'translateX(3px)' : 'translateX(0)',
              flexShrink: 0,
            }}
          />
        </div>

        {/* Description */}
        <p
          style={{
            fontFamily: 'var(--serif)',
            fontSize: 12,
            lineHeight: 1.7,
            color: 'rgba(255, 255, 255, 0.45)',
            margin: 0,
          }}
        >
          {feature.description}
        </p>
      </div>
    </Link>
  );
}
