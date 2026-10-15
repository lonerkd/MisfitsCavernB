'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import GrainOverlay from '@/components/GrainOverlay';
import AnimatedSection from '@/components/AnimatedSection';

// Dynamic imports for 3D and particles (client-side only)
const OrbitGallery = dynamic(() => import('@/components/3D/OrbitGallery'), { ssr: false });
const ParticleBackground = dynamic(() => import('@/components/ParticleBackground'), { ssr: false });

export default function ShowcasePage() {
  return (
    <main style={{ background: 'var(--bg)', color: 'var(--fg)', minHeight: '100vh' }}>
      <GrainOverlay />

      {/* Header */}
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          padding: '18px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 100,
          background: 'rgba(8, 8, 8, 0.8)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.04)'
        }}
      >
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
          <ArrowLeft size={18} color="var(--fg)" />
          <div style={{ fontFamily: 'var(--display)', fontSize: '1.15rem', letterSpacing: 6, color: 'var(--fg)' }}>
            MISFITS CAVERN
          </div>
        </Link>
      </nav>

      {/* Hero with Particles */}
      <section
        style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <ParticleBackground />

        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
          <h1
            style={{
              fontFamily: 'var(--display)',
              fontSize: 'clamp(3rem, 10vw, 7rem)',
              letterSpacing: -2,
              lineHeight: 0.9,
              marginBottom: 20,
              animation: 'slideUp 1s ease-out'
            }}
          >
            <span style={{ color: 'var(--accent)' }}>IMMERSIVE</span>
            <br />
            <span className="text-stroke">DESIGN</span>
          </h1>

          <p
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 'clamp(1rem, 2vw, 1.3rem)',
              fontStyle: 'italic',
              opacity: 0.5,
              animation: 'slideUp 1s ease-out 0.2s both'
            }}
          >
            Where technology meets artistry
          </p>
        </div>
      </section>

      {/* 3D Gallery Section */}
      <section style={{ padding: '90px 18px', position: 'relative' }}>
        <AnimatedSection>
          <div style={{ maxWidth: 1160, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 36 }}>
              <div style={{ width: 32, height: 1, background: 'var(--accent)' }} />
              <span style={{ fontSize: 9, letterSpacing: 6, textTransform: 'uppercase', color: 'var(--accent)' }}>
                3D Orbit Gallery
              </span>
            </div>

            <OrbitGallery />

            <p
              style={{
                fontFamily: 'var(--serif)',
                fontSize: '1rem',
                textAlign: 'center',
                marginTop: 30,
                opacity: 0.5,
                fontStyle: 'italic'
              }}
            >
              Interactive 3D photo gallery with auto-rotation. Hover over frames to highlight them.
            </p>
          </div>
        </AnimatedSection>
      </section>

      {/* Visual Effects Demo */}
      <section style={{ padding: '90px 18px', background: '#0a0a0a' }}>
        <AnimatedSection delay={0.2}>
          <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 36 }}>
              <div style={{ width: 32, height: 1, background: 'var(--accent)' }} />
              <span style={{ fontSize: 9, letterSpacing: 6, textTransform: 'uppercase', color: 'var(--accent)' }}>
                Technical Excellence
              </span>
              <div style={{ width: 32, height: 1, background: 'var(--accent)' }} />
            </div>

            <h2
              style={{
                fontFamily: 'var(--display)',
                fontSize: 'clamp(2rem, 6vw, 3.5rem)',
                letterSpacing: 2,
                marginBottom: 20
              }}
            >
              NO COMPROMISES
            </h2>

            <div
              style={{
                fontFamily: 'var(--serif)',
                fontSize: '1.1rem',
                lineHeight: 2,
                color: 'rgba(255, 255, 255, 0.5)'
              }}
            >
              <p style={{ marginBottom: 20 }}>
                Every element of Misfits Cavern is crafted with precision. From the grain texture overlay that adds cinematic depth, 
                to the particle systems that respond to your interactions.
              </p>

              <p style={{ marginBottom: 20 }}>
                The 3D orbit gallery uses React Three Fiber and WebGL to create smooth, performant animations. 
                Particle effects are powered by tsParticles for optimal performance.
              </p>

              <p style={{ color: 'var(--fg)', fontWeight: 400 }}>
                This is what happens when creative vision meets technical excellence. Zero compromise.
              </p>
            </div>
          </div>
        </AnimatedSection>
      </section>
    </main>
  );
}
