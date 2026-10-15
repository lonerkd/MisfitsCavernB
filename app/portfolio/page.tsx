'use client';

import React, { useState } from 'react';
import { Play, X, ExternalLink, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import GrainOverlay from '@/components/GrainOverlay';

// Helper for Google Drive thumbnails
const IMG = (id: string, w: number = 800) => `https://lh3.googleusercontent.com/d/${id}=w${w}`;
const IMG_FB = (id: string, w: number = 800) => `https://drive.google.com/thumbnail?id=${id}&sz=w${w}`;

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
    featured: true
  },
  {
    id: 'brief',
    title: 'The Briefcase',
    category: 'Short Film',
    role: 'Writer / Cinematographer',
    description: 'A crime thriller about two couriers, a mysterious briefcase, and a deal that has to go right.',
    driveId: '1EM1AVe-50e6IMKL2m8teeakg6aSL3ctr',
    year: '2024',
    featured: true
  },
  {
    id: 'audio',
    title: 'The Audio Blueprint',
    category: 'Documentary Teaser',
    role: 'Director / Writer / Editor',
    description: 'The invisible art of sound design in film — why audio is the secret weapon behind iconic movie moments.',
    driveId: '1hpS5fIfDRthOgzCD0jda5IcuHiverR8n',
    year: '2025'
  },
  {
    id: 'psa',
    title: 'The Grand PSA',
    category: 'Commercial / PSA',
    role: 'Writer / Director / DP / Editor',
    description: 'A love letter to The Grand Theatre. Wrote the script, directed the shoot, graded the final cut.',
    driveId: '1Mmk_nM_WXCskja0NEIa6PlM51cul-z00',
    year: '2025'
  },
  {
    id: 'altitude',
    title: 'The Pursuit of Altitude',
    category: 'Documentary',
    role: 'Cinematographer / Editor',
    description: 'Chasing elevation, both literal and metaphorical. Visual storytelling through landscape and movement.',
    driveId: '1-bPAYnQROhT9awRMEBWuDCGSw04CtBgE',
    year: '2024'
  },
  {
    id: 'cook',
    title: 'Live Cooking Demo',
    category: 'Live Multi-Cam',
    role: 'Camera Operator / Switcher',
    description: 'Live multi-camera production. Real-time switching, no second takes, all precision.',
    driveId: '13fmSRFNiGZl2b57-cd0qVnjcPx9IDUUZ',
    year: '2025'
  }
];

function Thumb({ driveId, alt }: { driveId: string; alt: string }) {
  return (
    <img
      src={IMG(driveId, 800)}
      alt={alt}
      loading="lazy"
      style={{ objectFit: 'cover', display: 'block', width: '100%', height: '100%' }}
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        if (!target.dataset.fb) {
          target.dataset.fb = '1';
          target.src = IMG_FB(driveId, 800);
        } else {
          target.style.opacity = '0';
        }
      }}
    />
  );
}

function VideoCard({ video, onClick, large }: { video: Video; onClick: (v: Video) => void; large?: boolean }) {
  const [hover, setHover] = useState(false);

  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
        aspectRatio: large ? '21/9' : '16/9',
        background: '#0e0e0e',
        border: '1px solid rgba(255, 255, 255, 0.04)',
        transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        transform: hover ? 'scale(1.006)' : 'scale(1)',
        gridColumn: large ? '1 / -1' : undefined
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => onClick(video)}
    >
      <Thumb driveId={video.driveId} alt={video.title} />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: hover
            ? 'linear-gradient(transparent 20%, rgba(0, 0, 0, 0.88))'
            : 'linear-gradient(transparent 30%, rgba(0, 0, 0, 0.92))',
          transition: 'all 0.5s'
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 14,
          right: 14,
          zIndex: 10,
          fontSize: 9,
          letterSpacing: 3,
          textTransform: 'uppercase',
          color: 'var(--accent)',
          fontFamily: 'var(--mono)'
        }}
      >
        {video.category}
      </div>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10
        }}
      >
        <div
          style={{
            width: large ? 64 : 44,
            height: large ? 64 : 44,
            borderRadius: '50%',
            border: `2px solid ${hover ? 'var(--accent)' : 'rgba(255, 255, 255, 0.3)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.4s',
            transform: hover ? 'scale(1.1)' : 'scale(1)',
            background: hover ? 'rgba(255, 60, 0, 0.1)' : 'transparent'
          }}
        >
          <Play
            size={large ? 22 : 15}
            fill={hover ? '#ff3c00' : '#fff'}
            color={hover ? '#ff3c00' : '#fff'}
            style={{ marginLeft: 3 }}
          />
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          padding: large ? 24 : 16,
          zIndex: 10,
          width: '100%',
          transform: hover ? 'translateY(0)' : 'translateY(3px)',
          transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <h3
          style={{
            fontFamily: 'var(--display)',
            fontSize: large ? 'clamp(1.8rem, 3.5vw, 2.8rem)' : 'clamp(1rem, 1.8vw, 1.4rem)',
            letterSpacing: 2,
            lineHeight: 1,
            color: 'var(--fg)'
          }}
        >
          {video.title}
        </h3>
        <p
          style={{
            fontSize: 9,
            fontFamily: 'var(--mono)',
            letterSpacing: 2,
            color: 'rgba(255, 255, 255, 0.3)',
            marginTop: 3,
            textTransform: 'uppercase'
          }}
        >
          {video.role} · {video.year}
        </p>
        {large && (
          <p
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 13,
              color: 'rgba(255, 255, 255, 0.4)',
              marginTop: 6,
              maxWidth: 480,
              fontStyle: 'italic',
              opacity: hover ? 1 : 0,
              transform: hover ? 'translateY(0)' : 'translateY(8px)',
              transition: 'all 0.4s 0.1s'
            }}
          >
            {video.description}
          </p>
        )}
      </div>
    </div>
  );
}

function VideoModal({ video, onClose }: { video: Video | null; onClose: () => void }) {
  if (!video) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9000,
        background: 'rgba(0, 0, 0, 0.94)',
        backdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'fadeIn 0.3s ease-out'
      }}
      onClick={onClose}
    >
      <div style={{ width: '100%', maxWidth: 960, margin: '0 16px' }} onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            background: 'none',
            border: 'none',
            color: 'rgba(255, 255, 255, 0.4)',
            cursor: 'pointer',
            padding: 8
          }}
        >
          <X size={26} />
        </button>
        <div style={{ aspectRatio: '16/9', background: '#000', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <iframe
            src={`https://drive.google.com/file/d/${video.driveId}/preview`}
            width="100%"
            height="100%"
            allow="autoplay;encrypted-media"
            allowFullScreen
            style={{ border: 'none' }}
          />
        </div>
        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <h3 style={{ fontFamily: 'var(--display)', fontSize: '1.8rem', letterSpacing: 2, color: 'var(--fg)' }}>
              {video.title}
            </h3>
            <p
              style={{
                fontSize: 9,
                fontFamily: 'var(--mono)',
                letterSpacing: 2,
                color: 'var(--accent)',
                textTransform: 'uppercase'
              }}
            >
              {video.category} · {video.role} · {video.year}
            </p>
            <p
              style={{
                fontFamily: 'var(--serif)',
                fontSize: 13,
                color: 'rgba(255, 255, 255, 0.4)',
                marginTop: 6,
                fontStyle: 'italic',
                maxWidth: 520
              }}
            >
              {video.description}
            </p>
          </div>
          <a
            href={`https://drive.google.com/file/d/${video.driveId}/view`}
            target="_blank"
            rel="noopener noreferrer"
            className="link-btn"
          >
            <ExternalLink size={11} /> Full Quality
          </a>
        </div>
      </div>
    </div>
  );
}

export default function PortfolioPage() {
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);

  const featured = VIDEOS.filter((v) => v.featured);
  const rest = VIDEOS.filter((v) => !v.featured);

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

      {/* Portfolio Section */}
      <section style={{ maxWidth: 1160, margin: '0 auto', padding: '120px 18px 90px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 36 }}>
          <div style={{ width: 32, height: 1, background: 'var(--accent)' }} />
          <span style={{ fontSize: 9, letterSpacing: 6, textTransform: 'uppercase', color: 'var(--accent)' }}>
            The Work — {VIDEOS.length} Projects
          </span>
        </div>

        {/* Featured */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, marginBottom: 3 }}>
          {featured.map((video) => (
            <VideoCard key={video.id} video={video} onClick={setActiveVideo} />
          ))}
        </div>

        {/* Rest */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
          {rest.map((video) => (
            <VideoCard key={video.id} video={video} onClick={setActiveVideo} />
          ))}
        </div>
      </section>

      {/* Marquee */}
      <div
        style={{
          padding: '32px 0',
          overflow: 'hidden',
          borderTop: '1px solid rgba(255, 255, 255, 0.03)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.03)'
        }}
      >
        <div style={{ display: 'flex', gap: 44, animation: 'marquee 30s linear infinite', whiteSpace: 'nowrap' }}>
          {[
            'CINEMATOGRAPHY',
            'DIRECTING',
            'MUSIC VIDEOS',
            'COLOR GRADING',
            'CREATIVE DIRECTION',
            'EDITING',
            'STORYTELLING',
            'LIGHTING',
            'WRITING',
            'SOUND DESIGN',
            'LIVE MULTI-CAM',
            'CINEMATOGRAPHY',
            'DIRECTING',
            'MUSIC VIDEOS'
          ].map((text, i) => (
            <span
              key={i}
              style={{
                fontFamily: 'var(--display)',
                fontSize: '1.1rem',
                letterSpacing: 6,
                flexShrink: 0,
                opacity: i % 2 === 0 ? 1 : 0.12,
                color: i % 2 === 0 ? 'var(--accent)' : 'var(--fg)'
              }}
            >
              {text}
            </span>
          ))}
        </div>
      </div>

      <VideoModal video={activeVideo} onClose={() => setActiveVideo(null)} />
    </main>
  );
}
