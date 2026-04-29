'use client';

import React, { useState, useCallback } from 'react';
import { Play, X, ExternalLink, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import GrainOverlay from '@/components/GrainOverlay';
import SectionLabel from '@/components/SectionLabel';
import AnimatedSection from '@/components/AnimatedSection';
import { getPortfolioProjects } from '@/lib/supabase/portfolio';
import { useEffect } from 'react';

const IMG = (id: string) => `https://lh3.googleusercontent.com/d/${id}=w800`;
const IMG_FB = (id: string) => `https://drive.google.com/thumbnail?id=${id}&sz=w800`;

interface Video {
  id: string;
  title: string;
  category: string;
  role: string;
  description: string;
  driveId: string;
  year: string;
  featured?: boolean;
}

const VIDEOS: Video[] = [
  {
    id: '10m',
    title: '10 Million',
    category: 'Music Video',
    role: 'Director of Photography / Editor',
    description: 'High-energy visual rhythm. Every cut lands on the beat, every frame tells a story of ambition.',
    driveId: '10A2uzDxrEEgx-6tiS3M_qbhAq72dglZt',
    year: '2026',
    featured: true,
  },
  {
    id: 'brief',
    title: 'The Briefcase',
    category: 'Short Film',
    role: 'Writer / Cinematographer',
    description: 'A crime thriller about two couriers, a mysterious briefcase, and a deal that has to go right.',
    driveId: '1EM1AVe-50e6IMKL2m8teeakg6aSL3ctr',
    year: '2024',
    featured: true,
  },
  {
    id: 'audio',
    title: 'The Audio Blueprint',
    category: 'Documentary Teaser',
    role: 'Director / Writer / Editor',
    description: 'The invisible art of sound design — why audio is the secret weapon behind iconic movie moments.',
    driveId: '1hpS5fIfDRthOgzCD0jda5IcuHiverR8n',
    year: '2025',
  },
  {
    id: 'psa',
    title: 'The Grand PSA',
    category: 'Commercial / PSA',
    role: 'Writer / Director / DP / Editor',
    description: 'A love letter to The Grand Theatre. Wrote the script, directed the shoot, graded the final cut.',
    driveId: '1Mmk_nM_WXCskja0NEIa6PlM51cul-z00',
    year: '2025',
  },
  {
    id: 'altitude',
    title: 'The Pursuit of Altitude',
    category: 'Documentary',
    role: 'Cinematographer / Editor',
    description: 'Chasing elevation, both literal and metaphorical. Visual storytelling through landscape.',
    driveId: '1-bPAYnQROhT9awRMEBWuDCGSw04CtBgE',
    year: '2024',
  },
  {
    id: 'cook',
    title: 'Live Cooking Demo',
    category: 'Live Multi-Cam',
    role: 'Camera Operator / Switcher',
    description: 'Live multi-camera production. Real-time switching, no second takes, all precision.',
    driveId: '13fmSRFNiGZl2b57-cd0qVnjcPx9IDUUZ',
    year: '2025',
  },
];

function VideoCard({ video, onClick, span }: { video: Video; onClick: (v: Video) => void; span?: 'wide' | 'tall' }) {
  const [hover, setHover] = useState(false);

  const aspectRatio = span === 'wide' ? '21/9' : span === 'tall' ? '9/14' : '16/9';

  return (
    <motion.div
      whileHover={{ scale: 1.008 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'relative',
        overflow: 'hidden',
        aspectRatio,
        background: '#0e0e0e',
        border: '1px solid rgba(255,255,255,0.04)',
        cursor: 'none',
        gridColumn: span === 'wide' ? '1 / -1' : undefined,
        gridRow: span === 'tall' ? 'span 2' : undefined,
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => onClick(video)}
    >
      {/* Thumbnail */}
      <img
        src={IMG(video.driveId)}
        alt={video.title}
        loading="lazy"
        style={{ objectFit: 'cover', width: '100%', height: '100%', display: 'block', transition: 'transform 0.7s var(--ease-expo)', transform: hover ? 'scale(1.05)' : 'scale(1)' }}
        onError={e => {
          const t = e.target as HTMLImageElement;
          if (!t.dataset.fb) { t.dataset.fb = '1'; t.src = IMG_FB(video.driveId); }
        }}
      />

      {/* Gradient */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: hover
          ? 'linear-gradient(transparent 10%, rgba(0,0,0,0.85))'
          : 'linear-gradient(transparent 30%, rgba(0,0,0,0.92))',
        transition: 'background 0.5s',
      }} />

      {/* Category badge */}
      <div style={{
        position: 'absolute',
        top: 14,
        right: 14,
        fontSize: 8,
        letterSpacing: 3,
        textTransform: 'uppercase',
        color: 'var(--accent)',
        fontFamily: 'var(--mono)',
        padding: '4px 8px',
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(6px)',
      }}>
        {video.category}
      </div>

      {/* Play button */}
      <motion.div
        animate={{ scale: hover ? 1.1 : 1, opacity: hover ? 1 : 0.6 }}
        transition={{ duration: 0.3 }}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 48,
          height: 48,
          borderRadius: '50%',
          border: `1.5px solid ${hover ? 'var(--accent)' : 'rgba(255,255,255,0.4)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: hover ? 'rgba(255,60,0,0.12)' : 'rgba(0,0,0,0.3)',
          backdropFilter: 'blur(6px)',
          transition: 'border-color 0.4s, background 0.4s',
        }}
      >
        <Play size={16} fill={hover ? '#ff3c00' : '#fff'} color={hover ? '#ff3c00' : '#fff'} style={{ marginLeft: 2 }} />
      </motion.div>

      {/* Info */}
      <motion.div
        animate={{ y: hover ? 0 : 4 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          padding: 20,
          width: '100%',
        }}
      >
        <h3 style={{
          fontFamily: 'var(--display)',
          fontSize: 'clamp(1rem, 2vw, 1.5rem)',
          letterSpacing: 2,
          lineHeight: 1,
          marginBottom: 4,
        }}>
          {video.title}
        </h3>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 2, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>
          {video.role} · {video.year}
        </div>
        {hover && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 12,
              color: 'rgba(255,255,255,0.45)',
              marginTop: 6,
              fontStyle: 'italic',
              maxWidth: 380,
            }}
          >
            {video.description}
          </motion.p>
        )}
      </motion.div>
    </motion.div>
  );
}

function VideoModal({ video, onClose }: { video: Video | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {video && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9000,
            background: 'rgba(0,0,0,0.95)',
            backdropFilter: 'blur(24px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 20 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            style={{ width: '100%', maxWidth: 1000, margin: '0 20px' }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              style={{
                position: 'absolute', top: -44, right: 0,
                background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
                display: 'flex', alignItems: 'center', gap: 6,
                fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2,
              }}
            >
              <X size={14} /> Close
            </button>

            <div style={{ aspectRatio: '16/9', background: '#000', border: '1px solid rgba(255,255,255,0.06)' }}>
              <iframe
                src={`https://drive.google.com/file/d/${video.driveId}/preview`}
                width="100%" height="100%"
                allow="autoplay;encrypted-media" allowFullScreen
                style={{ border: 'none', display: 'block' }}
              />
            </div>

            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
              <div>
                <h3 style={{ fontFamily: 'var(--display)', fontSize: '2rem', letterSpacing: 2 }}>
                  {video.title}
                </h3>
                <p style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2, color: 'var(--accent)', textTransform: 'uppercase', marginTop: 4 }}>
                  {video.category} · {video.role} · {video.year}
                </p>
                <p style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 8, fontStyle: 'italic', maxWidth: 540 }}>
                  {video.description}
                </p>
              </div>
              <a
                href={`https://drive.google.com/file/d/${video.driveId}/view`}
                target="_blank" rel="noopener noreferrer"
                className="link-btn"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
              >
                <ExternalLink size={11} /> Full Quality
              </a>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function PortfolioPage() {
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);
  const [videosList, setVideosList] = useState<Video[]>(VIDEOS);

  useEffect(() => {
    getPortfolioProjects().then(data => {
      if (data && data.length > 0) {
        const fetchedVideos: Video[] = data.map((p: any) => {
          const media = p.portfolio_media?.[0];
          return {
            id: p.id,
            title: p.title,
            category: p.category || 'Video',
            role: p.role || 'Creator',
            description: p.description || '',
            driveId: media?.url?.split('id=')?.[1] || media?.url || '',
            year: p.year?.toString() || new Date(p.created_at).getFullYear().toString(),
            featured: true
          };
        });
        setVideosList(fetchedVideos);
      }
    }).catch(console.error);
  }, []);

  const featured = videosList.filter(v => v.featured);
  const rest = videosList.filter(v => !v.featured);

  return (
    <main style={{ background: 'var(--bg)', color: 'var(--fg)', minHeight: '100vh' }}>
      <GrainOverlay />

      {/* Nav */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, width: '100%',
        padding: '18px 32px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        zIndex: 100,
        background: 'rgba(8,8,8,0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.6')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
          <ArrowLeft size={17} color="var(--fg)" />
          <div style={{ fontFamily: 'var(--display)', fontSize: '1.05rem', letterSpacing: 6, color: 'var(--fg)' }}>
            MISFITS CAVERN
          </div>
        </Link>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 3, color: 'var(--fg-muted)', textTransform: 'uppercase' }}>
          {videosList.length} Projects
        </span>
      </nav>

      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '110px 20px 80px' }}>
        <AnimatedSection>
          <SectionLabel text={`The Work — ${videosList.length} Projects`} />
        </AnimatedSection>

        {/* Featured — 2 col */}
        <AnimatedSection>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 4 }}>
            {featured.map(v => <VideoCard key={v.id} video={v} onClick={setActiveVideo} />)}
          </div>
        </AnimatedSection>

        {/* Rest — 3 col */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
          {rest.map((v, i) => (
            <AnimatedSection key={v.id} delay={i * 0.08}>
              <VideoCard video={v} onClick={setActiveVideo} />
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* Marquee */}
      <div style={{
        padding: '28px 0',
        overflow: 'hidden',
        borderTop: '1px solid rgba(255,255,255,0.03)',
        borderBottom: '1px solid rgba(255,255,255,0.03)',
        marginBottom: 0,
      }}>
        <div style={{ display: 'flex', gap: 44, animation: 'marquee 28s linear infinite', whiteSpace: 'nowrap' }}>
          {['CINEMATOGRAPHY', 'DIRECTING', 'MUSIC VIDEOS', 'COLOR GRADING', 'CREATIVE DIRECTION', 'EDITING', 'STORYTELLING', 'LIGHTING', 'WRITING', 'SOUND DESIGN', 'LIVE MULTI-CAM',
            'CINEMATOGRAPHY', 'DIRECTING', 'MUSIC VIDEOS', 'COLOR GRADING'].map((text, i) => (
            <span key={i} style={{
              fontFamily: 'var(--display)',
              fontSize: '1rem',
              letterSpacing: 6,
              flexShrink: 0,
              color: i % 2 === 0 ? 'var(--accent)' : 'var(--fg)',
              opacity: i % 2 === 0 ? 1 : 0.1,
            }}>
              {text}
            </span>
          ))}
        </div>
      </div>

      <VideoModal video={activeVideo} onClose={() => setActiveVideo(null)} />
    </main>
  );
}
