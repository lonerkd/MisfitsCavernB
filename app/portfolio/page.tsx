'use client';

import React, { useState, useCallback } from 'react';
import { Play, X, ExternalLink, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import GrainOverlay from '@/components/GrainOverlay';
import SectionLabel from '@/components/SectionLabel';
import AnimatedSection from '@/components/AnimatedSection';
import { getPortfolioProjects } from '@/lib/supabase/portfolio';
import { supabase } from '@/lib/supabase/client';
import { useEffect } from 'react';
import { ProtectedPage } from '@/lib/os';
import { usePillStage } from '@/lib/context/PillContext';
import { awaitOSUser } from '@/lib/os';
import { videoEmbed } from '@/lib/studio/media-kind';

interface Video {
  id: string;
  title: string;
  category: string;
  role: string;
  description: string;
  year: string;
  /** The piece's first media link (YouTube, Vimeo, Google Drive, an image, or any page). */
  url: string | null;
  thumb: string | null;
  embedSrc: string | null;
  sourceProjectId: string | null;
}

const isImageUrl = (url: string | null) => !!url && /\.(png|jpe?g|gif|webp|avif)(\?|$)/i.test(url);

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
        border: '1px solid rgba(var(--ink-rgb), 0.04)',
        cursor: 'none',
        gridColumn: span === 'wide' ? '1 / -1' : undefined,
        gridRow: span === 'tall' ? 'span 2' : undefined,
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => onClick(video)}
    >
      {video.thumb ? (
        // eslint-disable-next-line @next/next/no-img-element -- thumbnails come from YouTube, Drive or the owner's own links
        <img
          src={video.thumb}
          alt={video.title}
          loading="lazy"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.7s var(--ease-expo)', transform: hover ? 'scale(1.05)' : 'scale(1)' }}
        />
      ) : (
        <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 30% 30%, rgba(245,158,11,0.18), transparent 60%), #0e0e0e' }} />
      )}

      <div style={{
        position: 'absolute',
        inset: 0,
        background: hover
          ? 'linear-gradient(transparent 10%, rgba(0,0,0,0.85))'
          : 'linear-gradient(transparent 30%, rgba(0,0,0,0.92))',
        transition: 'background 0.5s',
      }} />

      <div style={{
        position: 'absolute',
        top: 14,
        right: 14,
        fontSize: 8,
        letterSpacing: 3,
        textTransform: 'uppercase',
        color: 'light-dark(#ffb199, var(--accent))',
        fontFamily: 'var(--mono)',
        padding: '4px 8px',
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(6px)',
      }}>
        {video.category}
      </div>

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
          background: hover ? 'rgba(232, 67, 26,0.12)' : 'rgba(0,0,0,0.3)',
          backdropFilter: 'blur(6px)',
          transition: 'border-color 0.4s, background 0.4s',
        }}
      >
        <Play size={16} fill={hover ? '#e8431a' : '#fff'} color={hover ? 'var(--accent)' : '#fff'} style={{ marginLeft: 2 }} />
      </motion.div>

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
        <h2 style={{
          fontFamily: 'var(--display)',
          fontSize: 'clamp(1rem, 2vw, 1.5rem)',
          letterSpacing: 2,
          lineHeight: 1,
          marginBottom: 4,
        }}>
          {video.title}
        </h2>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 2, color: 'var(--fg-dim)', textTransform: 'uppercase' }}>
          {[video.role, video.year].filter(Boolean).join(' · ')}
        </div>
        {hover && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 12,
              color: 'var(--fg-dim)',
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
          background: 'var(--surface)',
          backdropFilter: 'blur(40px)',
          overflowY: 'auto',
          padding: '80px 20px',
        }}
        onClick={onClose}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }} onClick={e => e.stopPropagation()}>
          <button onClick={onClose} style={{ position: 'fixed', top: 32, right: 32, background: 'none', border: 'none', color: 'var(--fg-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, textTransform: 'uppercase', letterSpacing: 2 }}>
            <X size={18} /> Close Bible
          </button>

          <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
            <SectionLabel text={project.year ? `Project Bible — ${project.year}` : 'Project Bible'} />
            <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(3rem, 10vw, 7rem)', letterSpacing: 8, lineHeight: 1, marginBottom: 20 }}>{project.title}</h1>
            <div style={{ display: 'flex', gap: 24, marginBottom: 60 }}>
               <div>
                 <div style={{ fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>Role</div>
                 <div style={{ fontSize: 14, color: 'var(--fg-strong)' }}>{project.role}</div>
               </div>
               <div>
                 <div style={{ fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>Category</div>
                 <div style={{ fontSize: 14, color: 'var(--fg-strong)' }}>{project.category}</div>
               </div>
            </div>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 80 }}>
            <div style={{ aspectRatio: '16/9', background: '#000', border: '1px solid rgba(var(--ink-rgb), 0.06)', borderRadius: 8, overflow: 'hidden' }}>
              {project.embedSrc ? (
                <iframe
                  src={project.embedSrc}
                  title={project.title}
                  width="100%" height="100%"
                  allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen
                  style={{ border: 'none', display: 'block' }}
                />
              ) : isImageUrl(project.url) ? (
                // eslint-disable-next-line @next/next/no-img-element -- the owner's own image link
                <img src={project.url!} alt={project.title} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
              ) : project.url ? (
                <a href={project.url} target="_blank" rel="noopener noreferrer" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 2, textDecoration: 'none' }}>
                  <ExternalLink size={14} /> OPEN MEDIA
                </a>
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-dim)', fontFamily: 'var(--mono)', fontSize: 11 }}>No media added yet</div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {project.description && (
                <div style={{ padding: 24, background: 'rgba(var(--ink-rgb), 0.02)', border: '1px solid rgba(var(--ink-rgb), 0.05)', borderRadius: 8 }}>
                  <h2 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Summary</h2>
                  <p style={{ fontFamily: 'var(--serif)', fontSize: 14, lineHeight: 1.6, color: 'var(--fg-muted)', fontStyle: 'italic' }}>{project.description}</p>
                </div>
              )}
              {project.sourceProjectId && (
                <Link href={`/projects/${project.sourceProjectId}`} style={{ padding: 20, background: 'var(--accent)', color: 'var(--on-accent)', borderRadius: 8, textDecoration: 'none', textAlign: 'center', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 2 }}>
                  Open the project
                </Link>
              )}
            </div>
          </div>


        </div>
      </motion.div>
    </AnimatePresence>
  );
}

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
  const [loadError, setLoadError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const [view, setView] = useState<'showcase' | 'distribution'>(searchParams.get('tab') === 'distribution' ? 'distribution' : 'showcase');
  const [festivals, setFestivals] = useState<FestivalEntry[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignEntry[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const user = await awaitOSUser();
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
      } catch (err: any) {
        setLoadError(err?.message || 'Could not load festivals and campaigns');
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const user = await awaitOSUser();
        if (!user) { setLoading(false); return; }

        const data = await getPortfolioProjects(user.id);
        const fetchedVideos: Video[] = (data || []).map((p: any) => {
          const media = p.portfolio_media?.[0];
          const url: string | null = media?.url || null;
          const embed = videoEmbed(url);
          return {
            id: p.id,
            title: p.title,
            category: p.category || '',
            role: p.role || '',
            description: p.description || '',
            year: p.year?.toString() || '',
            url,
            thumb: media?.thumbnail_url || embed?.thumbnail || (isImageUrl(url) ? url : null),
            embedSrc: embed?.src ?? null,
            sourceProjectId: p.source_project_id ?? null,
          };
        });
        setVideosList(fetchedVideos);
      } catch (err: any) {
        setLoadError(err?.message || 'Could not load your portfolio');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // The first two pieces lead in a wider row; the rest follow in threes.
  const lead = videosList.slice(0, 2);
  const rest = videosList.slice(2);
  // What this person actually does, from their own pieces.
  const crafts = Array.from(new Set(videosList.flatMap(v => [v.role, v.category]).filter(Boolean).map(t => t.toUpperCase())));

  usePillStage(
    {
      module: 'portfolio',
      title: 'The Cavern Collection',
      accent: '#f59e0b',
      fields: [
        { label: 'Works', value: `${videosList.length}`, color: 'var(--warn)' },
      ],
    },
    [videosList.length],
  );

  return (
    <ProtectedPage requiredPermission="manage_portfolio">
      <div style={{ background: 'var(--bg)', color: 'var(--fg)', minHeight: '100vh' }}>
      <GrainOverlay />

      <nav style={{
        position: 'fixed', top: 0, left: 0, width: '100%',
        padding: '0 32px', height: 62,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        zIndex: 100,
        background: 'var(--glass)',
        backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(var(--ink-rgb), 0.04)',
        boxShadow: '0 1px 0 rgba(245,158,11,0.08) inset',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div style={{ fontFamily: 'var(--display)', fontSize: '0.9rem', letterSpacing: 6, color: 'var(--fg-dim)', transition: 'opacity 0.2s' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '0.7')}
            >MC</div>
          </Link>
          <div style={{ width: 1, height: 16, background: 'rgba(var(--ink-rgb), 0.08)' }} />
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 3, color: 'var(--warn)', textTransform: 'uppercase' }}>Portfolio</div>
        </div>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: 2, color: 'var(--fg-dim)', textTransform: 'uppercase' }}>
          {videosList.length} Projects
        </span>
      </nav>

      <div style={{ position: 'relative', height: '80vh', width: '100%', overflow: 'hidden', display: 'flex', alignItems: 'flex-end', padding: '0 20px 80px', borderBottom: '1px solid rgba(var(--ink-rgb), 0.05)' }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
           <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 80% at 50% 0%, rgba(245,158,11,0.10), transparent 60%), radial-gradient(80% 60% at 80% 20%, rgba(232, 67, 26,0.08), transparent 55%), #060606' }} />
           <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--bg) 10%, transparent 80%)' }} />
        </div>
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', width: '100%' }}>
           <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8, delay: 0.2 }}>
             <SectionLabel text="Featured Work" />
             <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(4rem, 8vw, 6rem)', letterSpacing: 4, lineHeight: 1, marginBottom: 20 }}>THE CAVERN<br/>COLLECTION</h1>
             <p style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--fg-muted)', maxWidth: 500, lineHeight: 1.6 }}>A curated selection of cinematic projects, from conceptual ideation to final delivery. Built with precision, driven by story.</p>
           </motion.div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px', display: 'flex', gap: 4, borderBottom: '1px solid rgba(var(--ink-rgb), 0.06)' }}>
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
                  <div key={f.id} style={{ background: 'rgba(var(--ink-rgb), 0.02)', border: '1px solid rgba(var(--ink-rgb), 0.06)', borderLeft: `3px solid ${col}`, borderRadius: 10, padding: 16 }}>
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
                <div key={c.id} style={{ background: 'rgba(var(--ink-rgb), 0.02)', border: '1px solid rgba(var(--ink-rgb), 0.06)', borderRadius: 10, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontFamily: 'var(--display)', fontSize: '1.15rem', letterSpacing: 1 }}>{c.title}</span>
                    {c.platform && <span style={{ flexShrink: 0, fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--jobs-text)', background: 'rgba(139,92,246,0.14)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 99, padding: '3px 9px' }}>{c.platform}</span>}
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
          <div style={{ padding: '80px 0', textAlign: 'center', border: '1px dashed rgba(var(--ink-rgb), 0.1)', borderRadius: 16 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: 2, color: 'var(--fg-dim)', marginBottom: 10 }}>
              {loading ? 'LOADING…' : loadError ? `⚠ ${loadError}` : 'NO PUBLISHED WORK YET'}
            </div>
            {!loading && (
              <div style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--fg-dim)'}}>
                Published portfolio projects will appear here.
              </div>
            )}
          </div>
        ) : (
          <>
            <AnimatedSection>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 4 }}>
                {lead.map(v => <VideoCard key={v.id} video={v} onClick={setActiveVideo} />)}
              </div>
            </AnimatedSection>

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

      {crafts.length > 0 && (
      <div style={{
        padding: '28px 0',
        overflow: 'hidden',
        borderTop: '1px solid rgba(var(--ink-rgb), 0.03)',
        borderBottom: '1px solid rgba(var(--ink-rgb), 0.03)',
        marginBottom: 0,
      }}>
        <div style={{ display: 'flex', gap: 44, animation: 'marquee 28s linear infinite', whiteSpace: 'nowrap' }}>
          {[...crafts, ...crafts, ...crafts].map((text, i) => (
            <span key={i} style={{
              fontFamily: 'var(--display)',
              fontSize: '1rem',
              letterSpacing: 6,
              flexShrink: 0,
              color: i % 2 === 0 ? 'var(--accent)' : 'var(--fg-dim)',
            }}>
              {text}
            </span>
          ))}
        </div>
      </div>
      )}
      </>)}

      <ProjectBible project={activeVideo} onClose={() => setActiveVideo(null)} />
      </div>
    </ProtectedPage>
  );
}
