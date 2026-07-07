'use client';

import React, { useState, useCallback } from 'react';
import { Play, X, ExternalLink, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import GrainOverlay from '@/components/GrainOverlay';
import SectionLabel from '@/components/SectionLabel';
import AnimatedSection from '@/components/AnimatedSection';
import { getPortfolioProjects } from '@/lib/supabase/portfolio';
import { supabase } from '@/lib/supabase/client';
import { useEffect } from 'react';
import { ProtectedPage } from '@/lib/permissions/access-control';
import { usePillStage } from '@/lib/context/PillContext';

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
  // Showcase entries are frozen snapshots, not a live view of the source
  // project (anon visitors can't read the underlying tables under RLS) —
  // surfaced on the card so nobody mistakes this for a live project view.
  frozenAt?: string;
}

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
          background: hover ? 'rgba(215, 52, 11,0.12)' : 'rgba(0,0,0,0.3)',
          backdropFilter: 'blur(6px)',
          transition: 'border-color 0.4s, background 0.4s',
        }}
      >
        <Play size={16} fill={hover ? '#d7340b' : '#fff'} color={hover ? '#d7340b' : '#fff'} style={{ marginLeft: 2 }} />
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
        {video.frozenAt && (
          <div title="This showcase entry is a frozen snapshot — it does not reflect the live project" style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 1.5, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', marginTop: 3 }}>
            ❄ frozen {new Date(video.frozenAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
        )}
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

        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Status treatment for festival submissions — shared with the project hub's
// FESTIVAL_STATUS_COLOR so a submission reads the same colour everywhere.
const FEST_COLOR: Record<string, string> = {
  planned: '#6b7280',
  submitted: '#f59e0b',
  accepted: '#10b981',
  rejected: '#ef4444',
};

interface FestivalEntry { id: string; name: string; status: string; deadline?: string; projectTitle: string; }
interface CampaignEntry { id: string; title: string; platform?: string; budget?: number | null; projectTitle: string; }

export default function PortfolioPage() {
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);
  const [videosList, setVideosList] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  // Showcase = the public collection; Distribution = the campaign + festival
  // pipeline that used to be scattered across the project hub and Studio.
  const [view, setView] = useState<'showcase' | 'distribution'>('showcase');
  const [festivals, setFestivals] = useState<FestivalEntry[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignEntry[]>([]);

  // Aggregate the distribution pipeline across every project the viewer can
  // reach — festival submissions live on projects.festival_submissions, and
  // campaigns in their own table. Both are RLS-scoped to the viewer.
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const [projRes, campRes] = await Promise.all([
          supabase.from('projects').select('id,title,festival_submissions'),
          supabase.from('campaigns').select('id,title,platform,budget,project_id'),
        ]);
        const titleById = new Map((projRes.data || []).map((p: any) => [p.id, p.title]));
        const fests: FestivalEntry[] = [];
        (projRes.data || []).forEach((p: any) => {
          (p.festival_submissions || []).forEach((f: any) => {
            fests.push({ id: f.id || `${p.id}-${f.name}`, name: f.name, status: f.status || 'planned', deadline: f.deadline, projectTitle: p.title });
          });
        });
        setFestivals(fests);
        setCampaigns((campRes.data || []).map((c: any) => ({ id: c.id, title: c.title, platform: c.platform, budget: c.budget, projectTitle: titleById.get(c.project_id) || 'Untitled' })));
      } catch (err) {
        console.error('Failed to load distribution:', err);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }
        // Read the curated `portfolio_projects` table — the one "Publish to
        // Portfolio" (Studio/project hub) actually writes to — instead of
        // auto-listing every production project regardless of whether it was
        // ever published.
        const data = await getPortfolioProjects(user.id);
        const fetchedVideos: Video[] = (data || []).map((p: any) => {
          const media = p.portfolio_media?.[0];
          return {
            id: p.id,
            title: p.title,
            category: p.category || 'Video',
            role: p.role || 'Creator',
            description: p.description || '',
            driveId: media?.url?.split('id=')?.[1] || media?.url || '',
            year: p.year?.toString() || '',
            featured: true,
            frozenAt: p.created_at,
          };
        });
        setVideosList(fetchedVideos);
      } catch (err) {
        console.error('Failed to load portfolio:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const featured = videosList.filter(v => v.featured);
  const rest = videosList.filter(v => !v.featured);

  // Publish the portfolio's live counts to the Pill's context capsule.
  usePillStage(
    {
      module: 'portfolio',
      title: 'The Cavern Collection',
      accent: '#f59e0b',
      fields: [
        { label: 'Works', value: `${videosList.length}`, color: '#f59e0b' },
        { label: 'Featured', value: `${featured.length}` },
      ],
    },
    [videosList.length, featured.length],
  );

  return (
    <ProtectedPage requiredPermission="manage_portfolio">
      <main style={{ background: 'var(--bg)', color: 'var(--fg)', minHeight: '100vh' }}>
      <GrainOverlay />

      {/* Nav */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, width: '100%',
        padding: '0 32px', height: 62,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        zIndex: 100,
        background: 'rgba(6,6,6,0.88)',
        backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        boxShadow: '0 1px 0 rgba(245,158,11,0.08) inset',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div style={{ fontFamily: 'var(--display)', fontSize: '0.9rem', letterSpacing: 6, color: 'var(--fg)', opacity: 0.7, transition: 'opacity 0.2s' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '0.7')}
            >MC</div>
          </Link>
          <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 3, color: '#f59e0b', textTransform: 'uppercase' }}>Portfolio</div>
        </div>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: 2, color: 'rgba(224, 221, 174,0.3)', textTransform: 'uppercase' }}>
          {videosList.length} Projects
        </span>
      </nav>

      {/* Hero Section */}
      <div style={{ position: 'relative', height: '80vh', width: '100%', overflow: 'hidden', display: 'flex', alignItems: 'flex-end', padding: '0 20px 80px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
           <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 80% at 50% 0%, rgba(245,158,11,0.10), transparent 60%), radial-gradient(80% 60% at 80% 20%, rgba(215, 52, 11,0.08), transparent 55%), #060606' }} />
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

      {/* Showcase / Distribution tab set */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px', display: 'flex', gap: 4, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {([['showcase', 'Showcase'], ['distribution', 'Distribution']] as const).map(([key, label]) => {
          const active = view === key;
          return (
            <button key={key} onClick={() => setView(key)} style={{
              padding: '18px 22px', background: 'transparent', border: 'none', cursor: 'pointer',
              borderBottom: active ? '2px solid #f59e0b' : '2px solid transparent', marginBottom: -1,
              color: active ? 'var(--fg)' : 'var(--fg-dim)', fontFamily: 'var(--mono)',
              fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', transition: 'color 0.2s',
            }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--fg-muted)'; }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--fg-dim)'; }}
            >{label}</button>
          );
        })}
      </div>

      {view === 'distribution' && (
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 20px 80px' }}>
          <AnimatedSection>
            <SectionLabel text="Festival Circuit" />
            <p style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--fg-muted)', maxWidth: 560, lineHeight: 1.6, marginBottom: 28 }}>
              Where the finished work is going — festival submissions and promotional campaigns across every production.
            </p>
          </AnimatedSection>
          {festivals.length === 0 ? (
            <div style={{ padding: '48px 0', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--fg-dim)', letterSpacing: 1 }}>No festival submissions tracked yet — add them from a project&rsquo;s Distribution panel.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14, marginBottom: 64 }}>
              {festivals.map(f => {
                const col = FEST_COLOR[f.status] || '#6b7280';
                return (
                  <div key={f.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderLeft: `3px solid ${col}`, borderRadius: 10, padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                      <span style={{ fontFamily: 'var(--display)', fontSize: '1.15rem', letterSpacing: 1 }}>{f.name}</span>
                      <span style={{ flexShrink: 0, fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: col, background: `${col}1e`, border: `1px solid ${col}44`, borderRadius: 99, padding: '3px 9px' }}>{f.status}</span>
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--fg-dim)' }}>{f.projectTitle}{f.deadline ? ` · ${f.deadline}` : ''}</div>
                  </div>
                );
              })}
            </div>
          )}

          <AnimatedSection>
            <SectionLabel text="Campaigns" />
          </AnimatedSection>
          {campaigns.length === 0 ? (
            <div style={{ padding: '32px 0', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--fg-dim)', letterSpacing: 1 }}>No campaigns planned yet — build them in Studio&rsquo;s Promos tab.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
              {campaigns.map(c => (
                <div key={c.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontFamily: 'var(--display)', fontSize: '1.15rem', letterSpacing: 1 }}>{c.title}</span>
                    {c.platform && <span style={{ flexShrink: 0, fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: '#8b5cf6', background: 'rgba(139,92,246,0.14)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 99, padding: '3px 9px' }}>{c.platform}</span>}
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--fg-dim)' }}>{c.projectTitle}{c.budget ? ` · $${Number(c.budget).toLocaleString()}` : ''}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {view === 'showcase' && (<>
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 20px 80px' }}>
        <AnimatedSection>
          <SectionLabel text={`The Work — ${videosList.length} Projects`} />
        </AnimatedSection>

        {videosList.length === 0 ? (
          <div style={{ padding: '80px 0', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 16 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: 2, color: 'var(--fg-dim)', marginBottom: 10 }}>
              {loading ? 'LOADING…' : 'NO PUBLISHED WORK YET'}
            </div>
            {!loading && (
              <div style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--fg-dim)', opacity: 0.6 }}>
                Published portfolio projects will appear here.
              </div>
            )}
          </div>
        ) : (
          <>
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
          </>
        )}
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
      </>)}

      <ProjectBible project={activeVideo} onClose={() => setActiveVideo(null)} />
      </main>
    </ProtectedPage>
  );
}
