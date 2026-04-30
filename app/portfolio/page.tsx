'use client';

import React, { useState, useCallback } from 'react';
import { Play, X, ExternalLink, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import GrainOverlay from '@/components/GrainOverlay';
import SectionLabel from '@/components/SectionLabel';
import AnimatedSection from '@/components/AnimatedSection';
import { getAllProjects as getPortfolioData } from '@/lib/storage/portfolio';
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
  laurels?: string[];
  stills?: string[];
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
    laurels: ['Official Selection - SXSW 2026', 'Best Editing - Music Video Awards'],
    stills: [
      'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&q=80'
    ]
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

function ProjectBible({ project, onClose }: { project: Video | null; onClose: () => void }) {
  if (!project) return null;
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 9000,
          background: 'rgba(5,5,5,0.98)',
          backdropFilter: 'blur(40px)',
          overflowY: 'auto',
          padding: '80px 20px',
        }}
        onClick={onClose}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }} onClick={e => e.stopPropagation()}>
          <button onClick={onClose} style={{ position: 'fixed', top: 32, right: 32, background: 'none', border: 'none', color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, textTransform: 'uppercase', letterSpacing: 2 }}>
            <X size={18} /> Close Bible
          </button>

          {/* Header */}
          <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
            <SectionLabel text={`Project Bible — ${project.year}`} />
            <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(3rem, 10vw, 7rem)', letterSpacing: 8, lineHeight: 1, marginBottom: 20 }}>{project.title}</h1>
            <div style={{ display: 'flex', gap: 24, marginBottom: 60 }}>
               <div>
                 <div style={{ fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>Role</div>
                 <div style={{ fontSize: 14, color: '#fff' }}>{project.role}</div>
               </div>
               <div>
                 <div style={{ fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>Category</div>
                 <div style={{ fontSize: 14, color: '#fff' }}>{project.category}</div>
               </div>
               {project.laurels && project.laurels.length > 0 && (
                 <div style={{ marginLeft: 'auto', display: 'flex', gap: 16 }}>
                   {project.laurels.map((laurel, i) => (
                     <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.8 }}>
                       <div style={{ fontSize: 24, fontFamily: 'var(--serif)', color: 'var(--accent)' }}>❦</div>
                       <div style={{ fontSize: 8, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center', maxWidth: 120 }}>{laurel}</div>
                     </div>
                   ))}
                 </div>
               )}
            </div>
          </motion.div>

          {/* Media Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 80 }}>
            <div style={{ aspectRatio: '16/9', background: '#000', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, overflow: 'hidden' }}>
              <iframe
                src={`https://drive.google.com/file/d/${project.driveId}/preview`}
                width="100%" height="100%"
                allow="autoplay;encrypted-media" allowFullScreen
                style={{ border: 'none', display: 'block' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ padding: 24, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8 }}>
                <h3 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Executive Summary</h3>
                <p style={{ fontFamily: 'var(--serif)', fontSize: 14, lineHeight: 1.6, color: 'var(--fg-muted)', fontStyle: 'italic' }}>
                  {project.description || "In the heart of the Cavern, this project represents a shift in visual storytelling. A blend of atmospheric tension and technical precision."}
                </p>
              </div>
              <Link href={`/editor?p=${project.id}`} style={{ padding: 20, background: 'var(--accent)', color: 'var(--bg)', borderRadius: 8, textDecoration: 'none', textAlign: 'center', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 2 }}>
                Read ScriptOS Draft
              </Link>
            </div>
          </div>

          {/* Stills Gallery */}
          {project.stills && project.stills.length > 0 && (
            <div style={{ marginBottom: 80 }}>
              <SectionLabel text="Cinematic Stills" />
              <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 20, scrollSnapType: 'x mandatory' }}>
                {project.stills.map((still, i) => (
                  <div key={i} style={{ minWidth: '60%', aspectRatio: '21/9', background: '#111', borderRadius: 8, overflow: 'hidden', scrollSnapAlign: 'start', flexShrink: 0 }}>
                    <img src={still} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mood & Aesthetic */}
          <div>
            <SectionLabel text="Visual Architecture" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} style={{ aspectRatio: '1/1', background: 'rgba(255,255,255,0.03)', borderRadius: 4, overflow: 'hidden' }}>
                  <img src={`https://images.unsplash.com/photo-${1500000000000 + i * 1000000}?auto=format&fit=crop&q=60`} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.4 }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function PortfolioPage() {
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);
  const [videosList, setVideosList] = useState<Video[]>(VIDEOS);

  useEffect(() => {
    getPortfolioData().then(data => {
      if (data && data.length > 0) {
        const fetchedVideos: Video[] = data.map((p: any) => {
          const media = p.media?.[0];
          return {
            id: p.id,
            title: p.title,
            category: p.category || 'Video',
            role: p.role || 'Creator',
            description: p.description || '',
            driveId: media?.url?.split('id=')?.[1] || media?.url || '',
            year: p.year?.toString() || '2026',
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

      {/* Hero Section */}
      <div style={{ position: 'relative', height: '80vh', width: '100%', overflow: 'hidden', display: 'flex', alignItems: 'flex-end', padding: '0 20px 80px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
           <img src="https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.4, filter: 'grayscale(50%)' }} />
           <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--bg) 10%, transparent 80%)' }} />
        </div>
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', width: '100%' }}>
           <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8, delay: 0.2 }}>
             <SectionLabel text="Featured Work" />
             <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(4rem, 8vw, 6rem)', letterSpacing: 4, lineHeight: 1, marginBottom: 20 }}>THE CAVERN<br/>COLLECTION</h1>
             <p style={{ fontFamily: 'var(--serif)', fontSize: 16, color: '#ccc', maxWidth: 500, lineHeight: 1.6 }}>A curated selection of cinematic projects, from conceptual ideation to final delivery. Built with precision, driven by story.</p>
           </motion.div>
        </div>
      </div>

      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 20px 80px' }}>
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

      <ProjectBible project={activeVideo} onClose={() => setActiveVideo(null)} />
    </main>
  );
}
