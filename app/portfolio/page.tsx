'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Play, X, Plus, Share2, Check } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import GrainOverlay from '@/components/GrainOverlay';
import SectionLabel from '@/components/SectionLabel';
import AnimatedSection from '@/components/AnimatedSection';
import NotificationBell from '@/components/NotificationBell';
import { supabase } from '@/lib/supabase/client';
import { getPortfolioProjects, createPortfolioProject, addPortfolioMedia } from '@/lib/supabase/portfolio';
import { logActivity } from '@/lib/supabase/activity';
import { usePillStage, usePillZone } from '@/lib/context/PillContext';

type MediaType = 'youtube' | 'gdrive' | 'image';

interface MediaItem {
  id: string;
  title?: string;
  media_type: MediaType;
  url: string;
  thumbnail_url?: string;
}

interface Project {
  id: string;
  title: string;
  category: string;
  role: string;
  description: string;
  year: string;
  media: MediaItem[];
  shareToken?: string;
}

function getThumbnailUrl(media?: MediaItem): string | null {
  if (!media) return null;
  if (media.thumbnail_url) return media.thumbnail_url;
  if (media.media_type === 'image') return media.url;
  if (media.media_type === 'youtube') return `https://img.youtube.com/vi/${media.url}/hqdefault.jpg`;
  if (media.media_type === 'gdrive') return `https://lh3.googleusercontent.com/d/${media.url}=w800`;
  return null;
}

function getThumbnailFallback(media?: MediaItem): string | null {
  if (media?.media_type === 'gdrive') return `https://drive.google.com/thumbnail?id=${media.url}&sz=w800`;
  return null;
}

function getEmbedUrl(media?: MediaItem): string | null {
  if (!media) return null;
  if (media.media_type === 'youtube') return `https://www.youtube.com/embed/${media.url}`;
  if (media.media_type === 'gdrive') return `https://drive.google.com/file/d/${media.url}/preview`;
  return null;
}

function VideoCard({ project, onClick, span }: { project: Project; onClick: (p: Project) => void; span?: 'wide' | 'tall' }) {
  const [hover, setHover] = useState(false);
  const primary = project.media[0];
  const thumb = getThumbnailUrl(primary);

  const aspectRatio = span === 'wide' ? '21/9' : span === 'tall' ? '9/14' : '16/9';

  // Per-tile Pill zone: hovering a tile sharpens the satellite onto that
  // project — role/category, media count — with a jump to its full Bible.
  const zone = useMemo(() => ({
    module: 'portfolio',
    accent: '#f59e0b',
    title: project.title,
    fields: [
      { label: 'Role', value: project.role || '—' },
      { label: 'Media', value: `${project.media.length}` },
    ],
    actions: [
      { id: 'open-bible', label: '→ Open Bible', onClick: () => onClick(project) },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [project.id, project.title, project.role, project.media.length, onClick]);
  const zoneHandlers = usePillZone(zone, 1);

  return (
    <motion.div
      {...zoneHandlers}
      whileHover={{ scale: 1.008 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'relative',
        overflow: 'hidden',
        aspectRatio,
        background: '#0e0e0e',
        border: '1px solid rgba(224,221,174,0.04)',
        cursor: 'none',
        gridColumn: span === 'wide' ? '1 / -1' : undefined,
        gridRow: span === 'tall' ? 'span 2' : undefined,
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => onClick(project)}
    >
      {/* Thumbnail */}
      {thumb ? (
        <img
          src={thumb}
          alt={project.title}
          loading="lazy"
          style={{ objectFit: 'cover', width: '100%', height: '100%', display: 'block', transition: 'transform 0.7s var(--ease-expo)', transform: hover ? 'scale(1.05)' : 'scale(1)' }}
          onError={e => {
            const t = e.target as HTMLImageElement;
            const fb = getThumbnailFallback(primary);
            if (!t.dataset.fb && fb) { t.dataset.fb = '1'; t.src = fb; }
          }}
        />
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase' }}>
          No Media
        </div>
      )}

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
        {project.category}
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
          border: `1.5px solid ${hover ? 'var(--accent)' : 'rgba(224,221,174,0.4)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: hover ? 'rgba(215,52,11,0.12)' : 'rgba(0,0,0,0.3)',
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
          {project.title}
        </h3>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 2, color: 'rgba(224,221,174,0.35)', textTransform: 'uppercase' }}>
          {project.role} · {project.year}
        </div>
        {hover && project.description && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 12,
              color: 'rgba(224,221,174,0.45)',
              marginTop: 6,
              fontStyle: 'italic',
              maxWidth: 380,
            }}
          >
            {project.description}
          </motion.p>
        )}
      </motion.div>
    </motion.div>
  );
}

function ProjectBible({ project, onClose }: { project: Project | null; onClose: () => void }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setSelectedIndex(0);
    setCopied(false);
  }, [project?.id]);

  if (!project) return null;

  const handleCopyShareLink = () => {
    if (!project.shareToken || typeof window === 'undefined') return;
    const url = `${window.location.origin}/p/${project.shareToken}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const media = project.media[selectedIndex];
  const embedUrl = getEmbedUrl(media);

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

          {project.shareToken && (
            <button
              onClick={handleCopyShareLink}
              style={{
                position: 'fixed', top: 32, right: 160, background: 'none',
                border: '1px solid rgba(224,221,174,0.15)', borderRadius: 6, padding: '6px 12px',
                color: copied ? '#00cc66' : '#888', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8, fontSize: 10,
                textTransform: 'uppercase', letterSpacing: 2, fontFamily: 'var(--mono)',
              }}
            >
              {copied ? <><Check size={14} /> Link Copied</> : <><Share2 size={14} /> Copy Public Link</>}
            </button>
          )}

          {/* Header */}
          <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
            <SectionLabel text={`Project Bible — ${project.year}`} />
            <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(3rem, 10vw, 7rem)', letterSpacing: 8, lineHeight: 1, marginBottom: 20 }}>{project.title}</h1>
            <div style={{ display: 'flex', gap: 24, marginBottom: 60 }}>
               <div>
                 <div style={{ fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>Role</div>
                 <div style={{ fontSize: 14, color: '#fff' }}>{project.role || '—'}</div>
               </div>
               <div>
                 <div style={{ fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>Category</div>
                 <div style={{ fontSize: 14, color: '#fff' }}>{project.category}</div>
               </div>
            </div>
          </motion.div>

          {/* Media Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 80 }}>
            <div style={{ aspectRatio: '16/9', background: '#000', border: '1px solid rgba(224,221,174,0.06)', borderRadius: 8, overflow: 'hidden' }}>
              {media?.media_type === 'image' ? (
                <img src={media.url} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              ) : embedUrl ? (
                <iframe
                  src={embedUrl}
                  width="100%" height="100%"
                  allow="autoplay;encrypted-media" allowFullScreen
                  style={{ border: 'none', display: 'block' }}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' }}>
                  No Media Attached
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ padding: 24, background: 'rgba(224,221,174,0.02)', border: '1px solid rgba(224,221,174,0.05)', borderRadius: 8 }}>
                <h3 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Executive Summary</h3>
                <p style={{ fontFamily: 'var(--serif)', fontSize: 14, lineHeight: 1.6, color: 'var(--fg-muted)', fontStyle: 'italic' }}>
                  {project.description || 'No description added yet.'}
                </p>
              </div>
              <Link href={`/editor?p=${project.id}`} style={{ padding: 20, background: 'var(--accent)', color: 'var(--bg)', borderRadius: 8, textDecoration: 'none', textAlign: 'center', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 2 }}>
                Read ScriptOS Draft
              </Link>
            </div>
          </div>

          {/* Additional Media */}
          {project.media.length > 1 && (
            <div style={{ marginBottom: 80 }}>
              <SectionLabel text="Additional Media" />
              <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 20 }}>
                {project.media.map((m, i) => {
                  const thumb = getThumbnailUrl(m);
                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelectedIndex(i)}
                      style={{
                        minWidth: 220, aspectRatio: '16/9', borderRadius: 8, overflow: 'hidden',
                        background: '#111', cursor: 'pointer', padding: 0, flexShrink: 0,
                        border: i === selectedIndex ? '1px solid var(--accent)' : '1px solid rgba(224,221,174,0.08)',
                      }}
                    >
                      {thumb ? (
                        <img src={thumb} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontSize: 9, fontFamily: 'var(--mono)' }}>
                          {m.title || m.media_type}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function AddProjectModal({ isOpen, onClose, userId, onCreated }: {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  onCreated: (project: Project) => void;
}) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [role, setRole] = useState('');
  const [year, setYear] = useState('');
  const [description, setDescription] = useState('');
  const [mediaType, setMediaType] = useState<MediaType>('youtube');
  const [mediaUrl, setMediaUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setTitle(''); setCategory(''); setRole(''); setYear(''); setDescription('');
    setMediaType('youtube'); setMediaUrl(''); setError(null);
  };

  const handleSubmit = async () => {
    if (!userId || !title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const created = await createPortfolioProject({
        user_id: userId,
        title: title.trim(),
        description: description.trim() || null,
        category: category.trim() || null,
        role: role.trim() || null,
        year: year ? parseInt(year, 10) : null,
      });

      let media: MediaItem[] = [];
      if (mediaUrl.trim()) {
        const createdMedia = await addPortfolioMedia({
          project_id: created.id,
          title: title.trim(),
          media_type: mediaType,
          url: mediaUrl.trim(),
        });
        media = [createdMedia as MediaItem];
      }

      await logActivity(userId, 'created_portfolio_project', 'portfolio_project', created.id, { title: title.trim() });

      onCreated({
        id: created.id,
        title: created.title,
        category: created.category || 'Project',
        role: created.role || '',
        description: created.description || '',
        year: created.year?.toString() || '',
        media,
      });
      reset();
      onClose();
    } catch {
      setError('Could not save project — please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => { reset(); onClose(); }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            style={{ width: 520, maxHeight: '85vh', overflowY: 'auto', background: '#111', border: '1px solid rgba(224,221,174,0.1)', borderRadius: 16, padding: 32 }}
          >
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Add Project</h2>
            <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 24 }}>Add a finished project to your public portfolio.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 9, textTransform: 'uppercase', color: '#666', marginBottom: 6, display: 'block' }}>Title</label>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Project title"
                  style={{ width: '100%', background: '#050a14', border: '1px solid #333', color: '#fff', padding: 10, borderRadius: 6, fontSize: 12 }} />
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 9, textTransform: 'uppercase', color: '#666', marginBottom: 6, display: 'block' }}>Category</label>
                  <input value={category} onChange={e => setCategory(e.target.value)} placeholder="Short Film, Music Video…"
                    style={{ width: '100%', background: '#050a14', border: '1px solid #333', color: '#fff', padding: 10, borderRadius: 6, fontSize: 12 }} />
                </div>
                <div style={{ width: 100 }}>
                  <label style={{ fontSize: 9, textTransform: 'uppercase', color: '#666', marginBottom: 6, display: 'block' }}>Year</label>
                  <input value={year} onChange={e => setYear(e.target.value)} placeholder="2026" inputMode="numeric"
                    style={{ width: '100%', background: '#050a14', border: '1px solid #333', color: '#fff', padding: 10, borderRadius: 6, fontSize: 12 }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 9, textTransform: 'uppercase', color: '#666', marginBottom: 6, display: 'block' }}>Role</label>
                <input value={role} onChange={e => setRole(e.target.value)} placeholder="Director / Editor / DP…"
                  style={{ width: '100%', background: '#050a14', border: '1px solid #333', color: '#fff', padding: 10, borderRadius: 6, fontSize: 12 }} />
              </div>

              <div>
                <label style={{ fontSize: 9, textTransform: 'uppercase', color: '#666', marginBottom: 6, display: 'block' }}>Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="What's this project about?"
                  style={{ width: '100%', background: '#050a14', border: '1px solid #333', color: '#fff', padding: 10, borderRadius: 6, fontSize: 12, fontFamily: 'inherit', resize: 'vertical' }} />
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 140 }}>
                  <label style={{ fontSize: 9, textTransform: 'uppercase', color: '#666', marginBottom: 6, display: 'block' }}>Media Type</label>
                  <select value={mediaType} onChange={e => setMediaType(e.target.value as MediaType)}
                    style={{ width: '100%', background: '#050a14', border: '1px solid #333', color: '#fff', padding: 10, borderRadius: 6, fontSize: 12 }}>
                    <option value="youtube">YouTube</option>
                    <option value="gdrive">Google Drive</option>
                    <option value="image">Image</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 9, textTransform: 'uppercase', color: '#666', marginBottom: 6, display: 'block' }}>
                    {mediaType === 'youtube' ? 'YouTube Video ID' : mediaType === 'gdrive' ? 'Google Drive File ID' : 'Image URL'}
                  </label>
                  <input value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} placeholder={mediaType === 'image' ? 'https://…' : 'e.g. dQw4w9WgXcQ'}
                    style={{ width: '100%', background: '#050a14', border: '1px solid #333', color: '#fff', padding: 10, borderRadius: 6, fontSize: 12 }} />
                </div>
              </div>

              {error && <div style={{ fontSize: 11, color: '#ff5555' }}>{error}</div>}

              <button
                onClick={handleSubmit}
                disabled={!title.trim() || saving}
                style={{
                  marginTop: 12, padding: 14, background: 'var(--accent)', color: 'var(--bg)', border: 'none', borderRadius: 8,
                  fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 2,
                  cursor: !title.trim() || saving ? 'default' : 'pointer',
                  opacity: !title.trim() || saving ? 0.5 : 1,
                }}
              >
                {saving ? 'Saving…' : 'Add to Portfolio'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function PortfolioPage() {
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [projectsList, setProjectsList] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);
      getPortfolioProjects(user.id).then(data => {
        const mapped: Project[] = (data || []).map((p: any) => ({
          id: p.id,
          title: p.title,
          category: p.category || 'Project',
          role: p.role || '',
          description: p.description || '',
          year: p.year?.toString() || '',
          media: (p.portfolio_media || []) as MediaItem[],
          shareToken: p.share_token,
        }));
        setProjectsList(mapped);
        setLoading(false);
      }).catch(err => {
        console.error(err);
        setLoading(false);
      });
    });
  }, []);

  const handleCreated = (project: Project) => {
    setProjectsList(prev => [project, ...prev]);
  };

  const featured = projectsList.slice(0, 2);
  const rest = projectsList.slice(2);

  // Portfolio's contextual strip: real project/media counts, plus the same
  // "Add Project" handler the header button uses.
  const portfolioPill = useMemo(() => {
    if (!userId) return null;
    const mediaCount = projectsList.reduce((sum, p) => sum + p.media.length, 0);
    return {
      module: 'portfolio',
      title: 'The Cavern Collection',
      fields: [
        { label: 'Projects', value: `${projectsList.length}`, color: '#f59e0b' },
        { label: 'Media', value: `${mediaCount}` },
      ],
      actions: [
        { id: 'add-project', label: '+ Add Project', onClick: () => setShowAddModal(true) },
      ],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, projectsList]);

  usePillStage(portfolioPill, [portfolioPill]);

  return (
    <main style={{ background: 'var(--bg)', color: 'var(--fg)', minHeight: '100vh' }}>
      <GrainOverlay />

      {/* Nav */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, width: '100%',
        padding: '0 32px', height: 62,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        zIndex: 100,
        background: 'rgba(7,11,19,0.88)',
        backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(224,221,174,0.04)',
        boxShadow: '0 1px 0 rgba(245,158,11,0.08) inset',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div style={{ fontFamily: 'var(--display)', fontSize: '0.9rem', letterSpacing: 6, color: 'var(--fg)', opacity: 0.7, transition: 'opacity 0.2s' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '0.7')}
            >MC</div>
          </Link>
          <div style={{ width: 1, height: 16, background: 'rgba(224,221,174,0.08)' }} />
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 3, color: '#f59e0b', textTransform: 'uppercase' }}>Portfolio</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: 2, color: 'rgba(240,236,228,0.3)', textTransform: 'uppercase' }}>
            {projectsList.length} Projects
          </span>
          {userId && (
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(245,158,11,0.1)',
                border: '1px solid rgba(245,158,11,0.3)', color: 'var(--accent)', borderRadius: 6,
                padding: '6px 12px', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase',
                fontFamily: 'var(--mono)', cursor: 'pointer',
              }}
            >
              <Plus size={12} /> Add Project
            </button>
          )}
          {userId && <NotificationBell />}
        </div>
      </nav>

      {/* Hero Section */}
      <div style={{ position: 'relative', height: '80vh', width: '100%', overflow: 'hidden', display: 'flex', alignItems: 'flex-end', padding: '0 20px 80px', borderBottom: '1px solid rgba(224,221,174,0.05)' }}>
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
          <SectionLabel text={`The Work — ${projectsList.length} Projects`} />
        </AnimatedSection>

        {loading ? (
          <div style={{ padding: '80px 0', textAlign: 'center', color: '#444', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 2 }}>
            LOADING PORTFOLIO…
          </div>
        ) : projectsList.length === 0 ? (
          <div style={{ padding: '80px 0', textAlign: 'center', color: '#444', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 2 }}>
            NO PROJECTS YET — ADD YOUR FIRST PROJECT TO BUILD YOUR PORTFOLIO
          </div>
        ) : (
          <>
            {/* Featured — 2 col */}
            <AnimatedSection>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 4 }}>
                {featured.map(p => <VideoCard key={p.id} project={p} onClick={setActiveProject} />)}
              </div>
            </AnimatedSection>

            {/* Rest — 3 col */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
              {rest.map((p, i) => (
                <AnimatedSection key={p.id} delay={i * 0.08}>
                  <VideoCard project={p} onClick={setActiveProject} />
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
        borderTop: '1px solid rgba(224,221,174,0.03)',
        borderBottom: '1px solid rgba(224,221,174,0.03)',
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

      <ProjectBible project={activeProject} onClose={() => setActiveProject(null)} />
      <AddProjectModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} userId={userId} onCreated={handleCreated} />
    </main>
  );
}
