'use client';

import React, { useState, useEffect } from 'react';
import { ArrowDown, Film, Code, Users, Briefcase } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import GrainOverlay from '@/components/GrainOverlay';
import PhotoScatter from '@/components/PhotoScatter';
import Navigation from '@/components/Navigation';
import AnimatedSection from '@/components/AnimatedSection';

// Dynamic import for particles
const ParticleBackground = dynamic(() => import('@/components/ParticleBackground'), { ssr: false });

export default function Home() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <main style={{ background: 'var(--bg)', color: 'var(--fg)', fontFamily: 'var(--mono)' }}>
      <GrainOverlay />

      {/* Navigation */}
      <Navigation />

      {/* HERO SECTION */}
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

        {/* Radial gradient background */}
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

          <p
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 'clamp(0.9rem, 2vw, 1.3rem)',
              fontWeight: 300,
              fontStyle: 'italic',
              letterSpacing: 1,
              marginTop: 22,
              opacity: 0.5,
              animation: 'slideUp 1s ease-out 0.2s both',
              maxWidth: 600,
              margin: '22px auto 0',
            }}
          >
            Where creative vision meets technical excellence. The ultimate platform for screenwriting, 
            portfolio showcase, and immersive digital collaboration.
          </p>

          <div
            style={{
              display: 'flex',
              gap: 18,
              justifyContent: 'center',
              marginTop: 32,
              animation: 'slideUp 1s ease-out 0.35s both',
              flexWrap: 'wrap',
            }}
          >
            {[
              { label: 'Screenwriting', icon: '✎' },
              { label: 'Portfolio', icon: '⬛' },
              { label: 'Collaboration', icon: '◆' },
            ].map((item, i) => (
              <span
                key={i}
                style={{
                  fontSize: 9,
                  letterSpacing: 3,
                  textTransform: 'uppercase',
                  color: 'rgba(240, 236, 228, 0.28)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                {item.icon} {item.label}
              </span>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <a
          href="#about"
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
          <ArrowDown size={18} style={{ marginLeft: 'auto', marginRight: 'auto' }} />
        </a>
      </section>

      {/* ABOUT SECTION */}
      <section
        id="about"
        style={{
          maxWidth: 700,
          margin: '0 auto',
          padding: '90px 18px',
          position: 'relative',
        }}
      >
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 36 }}>
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

          <div style={{ fontFamily: 'var(--serif)', fontSize: '1.12rem', lineHeight: 2, color: 'rgba(255, 255, 255, 0.5)' }}>
            <p style={{ marginBottom: 20 }}>
              Misfits Cavern is not just another creative tool. It's a digital sanctuary for storytellers, 
              filmmakers, and creative minds who refuse to compromise on quality.
            </p>

            <p style={{ marginBottom: 20 }}>
              At the core is <span style={{ color: 'var(--accent)', fontStyle: 'italic' }}>ScriptOS</span> — 
              a professional-grade screenplay editor with intelligent parsing, character analytics, and table read capabilities. 
              Built entirely locally, no APIs needed.
            </p>

            <p style={{ marginBottom: 20 }}>
              Surrounding it is a creative ecosystem: showcase your work, collaborate with your crew, 
              manage projects, and build your production company's brand — all in one place.
            </p>

            <p style={{ color: 'var(--fg)', fontWeight: 400 }}>
              This is the platform for creators who understand that the best ideas come from precision, 
              privacy, and a relentless commitment to the craft.
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section style={{ padding: '90px 18px', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.4 }}>
          <ParticleBackground />
        </div>
        
        <AnimatedSection>
          <div style={{ maxWidth: 1160, margin: '0 auto', position: 'relative', zIndex: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48, justifyContent: 'center' }}>
              <div style={{ width: 32, height: 1, background: 'var(--accent)' }} />
              <span style={{ fontSize: 9, letterSpacing: 6, textTransform: 'uppercase', color: 'var(--accent)' }}>
                The Platform
              </span>
              <div style={{ width: 32, height: 1, background: 'var(--accent)' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
              {[
                {
                  icon: <Code size={24} />,
                  title: 'ScriptOS Editor',
                  description: 'Professional screenplay editor with intelligent parsing, analytics, and table read capabilities.',
                  href: '/editor',
                  color: '#ff3c00'
                },
                {
                  icon: <Film size={24} />,
                  title: 'Portfolio',
                  description: 'Showcase your creative work with beautiful video galleries and project presentations.',
                  href: '/portfolio',
                  color: '#ffaa00'
                },
                {
                  icon: <Briefcase size={24} />,
                  title: 'Studio',
                  description: 'Asset library and production workspace for managing your creative projects.',
                  href: '/studio',
                  color: '#00ff88'
                },
                {
                  icon: <Users size={24} />,
                  title: 'Lounge',
                  description: 'Collaborate with your crew, share ideas, and build together.',
                  href: '/lounge',
                  color: '#00aaff'
                }
              ].map((feature, i) => (
                <AnimatedSection key={i} delay={i * 0.1}>
                  <Link href={feature.href} style={{ textDecoration: 'none', display: 'block' }}>
                    <div
                      style={{
                        padding: 32,
                        background: '#0a0a0a',
                        border: '1px solid rgba(255, 255, 255, 0.04)',
                        transition: 'all 0.4s',
                        cursor: 'pointer',
                        height: '100%'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = feature.color;
                        e.currentTarget.style.transform = 'translateY(-4px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.04)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <div style={{ color: feature.color, marginBottom: 16 }}>{feature.icon}</div>
                      <h3
                        style={{
                          fontFamily: 'var(--display)',
                          fontSize: '1.4rem',
                          letterSpacing: 2,
                          marginBottom: 12
                        }}
                      >
                        {feature.title}
                      </h3>
                      <p
                        style={{
                          fontFamily: 'var(--serif)',
                          fontSize: 13,
                          lineHeight: 1.6,
                          opacity: 0.6
                        }}
                      >
                        {feature.description}
                      </p>
                    </div>
                  </Link>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* Call to Action */}
      <section id="contact" style={{ padding: '130px 18px', textAlign: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, rgba(255, 60, 0, 0.04) 0%, transparent 55%)' }} />
        
        <AnimatedSection>
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div
              style={{
                fontFamily: 'var(--display)',
                fontSize: 'clamp(3rem, 10vw, 7rem)',
                lineHeight: 0.9,
                letterSpacing: -2,
                marginBottom: 40
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
                marginBottom: 32
              }}
            >
              Available immediately · Calgary, AB · Ready to relocate
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
              {[
                { label: 'Email', href: 'mailto:peterolowude@gmail.com' },
                { label: 'X / Twitter', href: 'https://twitter.com/5stariah' },
                { label: 'Full Drive', href: 'https://drive.google.com/drive/folders/10kpdBuTKIWpCrARqTNSCW3OtyWzQnAg0' }
              ].map((link, i) => (
                <a key={i} href={link.href} target="_blank" rel="noopener noreferrer" className="cta-btn">
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </AnimatedSection>
      </section>

      <footer style={{ textAlign: 'center', padding: 20, fontSize: 8, letterSpacing: 4, textTransform: 'uppercase', opacity: 0.1 }}>
        © 2026 Peter Olowude · Misfits Cavern Productions
      </footer>
    </main>
  );
}
