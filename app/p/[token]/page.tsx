'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Film } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import EmptyState from '@/components/EmptyState';
import type { PublicProfile } from '@/lib/supabase/profiles';
import type { PortfolioBlock } from '@/lib/supabase/portfolio';

interface MediaItem {
  id: string;
  title: string;
  media_type: string;
  url: string;
  thumbnail_url?: string;
}

interface Project {
  id: string;
  title: string;
  year: number | null;
  role: string | null;
  description: string | null;
  share_token: string;
  created_at: string;
  portfolio_media: MediaItem[];
  portfolio_blocks: PortfolioBlock[];
  profiles: PublicProfile | null;
}

export default function PublicPortfolioPage({ params }: { params: { token: string } }) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [playingMedia, setPlayingMedia] = useState<MediaItem | null>(null);

  useEffect(() => {
    const fetchProject = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('portfolio_projects')
          .select('*, portfolio_media(*), portfolio_blocks(*), profiles(username, role, avatar_url)')
          .eq('share_token', params.token)
          .order('position', { foreignTable: 'portfolio_blocks' })
          .single();

        if (error || !data) {
          setNotFound(true);
        } else {
          setProject(data as Project);
        }
      } catch (err) {
        // Network/connection failure — don't leave the page stuck on "LOADING"
        console.error('Failed to load portfolio:', err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [params.token]);

  const closeModal = useCallback(() => setPlayingMedia(null), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeModal]);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          fontFamily: 'var(--mono)',
          fontSize: 11,
          letterSpacing: 3,
          color: 'var(--fg)',
          opacity: 0.3,
          animation: 'pulse 1.6s ease-in-out infinite',
        }}>
          LOADING
        </div>
        <style>{`@keyframes pulse { 0%,100%{opacity:.15} 50%{opacity:.5} }`}</style>
      </div>
    );
  }

  // ── Not Found ─────────────────────────────────────────────────────────────────
  if (notFound || !project) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        color: 'var(--fg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        fontFamily: 'var(--mono)',
      }}>
        <div style={{
          fontFamily: 'var(--display)',
          fontSize: 'clamp(3rem, 10vw, 7rem)',
          letterSpacing: 6,
          color: 'var(--accent)',
          lineHeight: 1,
        }}>
          404
        </div>
        <p style={{ fontSize: 13, letterSpacing: 2, opacity: 0.5 }}>
          PORTFOLIO NOT FOUND
        </p>
        <p style={{ fontSize: 11, opacity: 0.3, maxWidth: 320, textAlign: 'center', lineHeight: 1.7 }}>
          This portfolio link may have expired or the project no longer exists.
        </p>
        <Link
          href="/portfolio"
          style={{
            marginTop: 8,
            padding: '10px 28px',
            border: '1px solid rgba(255,255,255,0.15)',
            color: 'var(--fg)',
            fontFamily: 'var(--mono)',
            fontSize: 10,
            letterSpacing: 2,
            textDecoration: 'none',
            transition: 'border-color 0.2s, color 0.2s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--accent)';
            (e.currentTarget as HTMLAnchorElement).style.color = 'var(--accent)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.15)';
            (e.currentTarget as HTMLAnchorElement).style.color = 'var(--fg)';
          }}
        >
          BROWSE PORTFOLIOS
        </Link>

        {/* Footer */}
        <div style={{ position: 'fixed', bottom: 28, left: 0, right: 0, textAlign: 'center' }}>
          <FooterLink />
        </div>
      </div>
    );
  }

  const { title, year, role, description, portfolio_media, profiles } = project;
  const avatarInitial = profiles?.username?.[0]?.toUpperCase() ?? '?';

  // Pitch-board blocks (already ordered by `position` from the query).
  // The cover block's body is this deck's write-up when the portfolio row
  // itself has no description — the builder seeds it from the source
  // project, so it's usually the real content, not the row column.
  const blocks = (project.portfolio_blocks || []).filter(b => b.block_type !== 'cover');
  const coverBlock = (project.portfolio_blocks || []).find(b => b.block_type === 'cover');
  const effectiveDescription = description || coverBlock?.body || null;

  // ── Main Page ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)' }}>

      {/* ── Hero Header ── */}
      <header style={{
        position: 'relative',
        width: '100%',
        minHeight: 'clamp(260px, 38vw, 480px)',
        background: 'linear-gradient(160deg, #111 0%, #080808 60%, rgba(215, 52, 11,0.06) 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: 'clamp(32px, 5vw, 64px)',
        overflow: 'hidden',
      }}>
        {/* Subtle grid texture */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          pointerEvents: 'none',
        }} />

        {/* Accent line */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 'clamp(32px, 5vw, 64px)',
          width: 64,
          height: 2,
          background: 'var(--accent)',
        }} />

        {/* Title */}
        <h1 style={{
          fontFamily: 'var(--display)',
          fontSize: 'clamp(2.8rem, 8vw, 6.5rem)',
          letterSpacing: 4,
          lineHeight: 0.95,
          margin: 0,
          marginBottom: 20,
          position: 'relative',
          zIndex: 1,
          wordBreak: 'break-word',
        }}>
          {title}
        </h1>

        {/* Creator info */}
        {profiles && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            position: 'relative',
            zIndex: 1,
          }}>
            {/* Avatar */}
            <div style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: profiles.avatar_url ? 'transparent' : 'rgba(215, 52, 11,0.25)',
              border: '1px solid rgba(215, 52, 11,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              flexShrink: 0,
            }}>
              {profiles.avatar_url ? (
                <Image
                  src={profiles.avatar_url}
                  alt={profiles.username}
                  fill
                  style={{ objectFit: 'cover' }}
                />
              ) : (
                <span style={{
                  fontFamily: 'var(--display)',
                  fontSize: '1rem',
                  color: 'var(--accent)',
                  letterSpacing: 0,
                }}>
                  {avatarInitial}
                </span>
              )}
            </div>

            {/* Name + role */}
            <div>
              <div style={{
                fontFamily: 'var(--mono)',
                fontSize: 12,
                letterSpacing: 1,
                opacity: 0.85,
              }}>
                {profiles.username}
              </div>
              {profiles.role && (
                <div style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 9,
                  letterSpacing: 2,
                  opacity: 0.4,
                  marginTop: 2,
                }}>
                  {profiles.role.toUpperCase()}
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── Meta + Description ── */}
      <section style={{
        maxWidth: 900,
        margin: '0 auto',
        padding: 'clamp(32px, 5vw, 56px) clamp(20px, 5vw, 64px)',
      }}>
        {/* Year / Role metadata */}
        {(year || role) && (
          <div style={{
            display: 'flex',
            gap: 32,
            marginBottom: description ? 32 : 0,
            flexWrap: 'wrap',
          }}>
            {year && (
              <div>
                <div style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 8,
                  letterSpacing: 3,
                  opacity: 0.35,
                  marginBottom: 6,
                }}>
                  YEAR
                </div>
                <div style={{
                  fontFamily: 'var(--display)',
                  fontSize: '1.6rem',
                  letterSpacing: 3,
                  color: 'var(--fg)',
                }}>
                  {year}
                </div>
              </div>
            )}
            {role && (
              <div>
                <div style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 8,
                  letterSpacing: 3,
                  opacity: 0.35,
                  marginBottom: 6,
                }}>
                  ROLE
                </div>
                <div style={{
                  fontFamily: 'var(--serif)',
                  fontSize: '1.15rem',
                  fontStyle: 'italic',
                  color: 'var(--fg)',
                  opacity: 0.9,
                }}>
                  {role}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Description */}
        {effectiveDescription && (
          <p style={{
            fontFamily: 'var(--serif)',
            fontSize: 'clamp(1rem, 2vw, 1.2rem)',
            lineHeight: 1.8,
            color: 'var(--fg)',
            opacity: 0.75,
            maxWidth: 720,
            marginTop: (year || role) ? 0 : 0,
          }}>
            {effectiveDescription}
          </p>
        )}
      </section>

      {/* ── Pitch Deck (blocks assembled from the source project) ── */}
      {blocks.length > 0 && (
        <section style={{
          maxWidth: 900,
          margin: '0 auto',
          padding: '0 clamp(20px, 5vw, 64px) clamp(40px, 6vw, 72px)',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {blocks.map(b => <DeckBlock key={b.id} block={b} />)}
          </div>
        </section>
      )}

      {/* ── Video Grid — only when there's no assembled deck, so media isn't
          shown twice (deck blocks of type 'media' already cover it) ── */}
      {blocks.length === 0 && portfolio_media.length > 0 && (
        <section style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 clamp(20px, 5vw, 64px) clamp(56px, 8vw, 100px)',
        }}>
          <div style={{
            fontFamily: 'var(--mono)',
            fontSize: 8,
            letterSpacing: 3,
            opacity: 0.3,
            marginBottom: 20,
          }}>
            {portfolio_media.length === 1 ? '1 CLIP' : `${portfolio_media.length} CLIPS`}
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
            gap: 16,
          }}>
            {portfolio_media.map((media) => (
              <VideoCard
                key={media.id}
                media={media}
                onClick={() => setPlayingMedia(media)}
              />
            ))}
          </div>
        </section>
      )}

      {blocks.length === 0 && portfolio_media.length === 0 && (
        <div style={{
          maxWidth: 900,
          margin: '0 auto',
          padding: '0 clamp(20px, 5vw, 64px) 80px',
        }}>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 32 }}>
            <EmptyState icon={<Film size={28} />} title="No media yet" />
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.04)',
        padding: '28px 24px',
        textAlign: 'center',
      }}>
        <FooterLink />
      </footer>

      {/* ── Video Modal ── */}
      {playingMedia && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.96)',
            backdropFilter: 'blur(24px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9000,
          }}
          onClick={closeModal}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 1040,
              margin: '0 20px',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={closeModal}
              aria-label="Close video"
              style={{
                position: 'fixed',
                top: 20,
                right: 24,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--fg)',
                cursor: 'pointer',
                width: 40,
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 2,
                transition: 'background 0.2s',
                zIndex: 9001,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(215, 52, 11,0.18)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
            >
              {/* X icon drawn inline */}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="1" y1="1" x2="13" y2="13" />
                <line x1="13" y1="1" x2="1" y2="13" />
              </svg>
            </button>

            {/* Video embed */}
            <div style={{ aspectRatio: '16/9', background: '#000', width: '100%' }}>
              <iframe
                src={`https://www.youtube.com/embed/${playingMedia.url}?autoplay=1&rel=0&modestbranding=1`}
                width="100%"
                height="100%"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
                style={{ border: 'none', display: 'block' }}
                title={playingMedia.title}
              />
            </div>

            {/* Video title */}
            {playingMedia.title && playingMedia.title !== 'YouTube Video' && (
              <div style={{ marginTop: 16, paddingLeft: 2 }}>
                <h3 style={{
                  fontFamily: 'var(--display)',
                  fontSize: '1.3rem',
                  letterSpacing: 3,
                  margin: 0,
                  opacity: 0.85,
                }}>
                  {playingMedia.title}
                </h3>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

// Renders one pitch-board block for the anonymous public visitor. Every field
// here comes from the block's own snapshot columns — never a join back to the
// source project's protected tables (concept_assets/scenes/budget_items/
// project_crew), which anon can't read anyway.
function DeckBlock({ block }: { block: PortfolioBlock }) {
  const label: React.CSSProperties = {
    fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 3, opacity: 0.3, marginBottom: 8, textTransform: 'uppercase',
  };
  const wrap: React.CSSProperties = {
    padding: 'clamp(16px, 3vw, 24px)', borderRadius: 12,
    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
  };
  const heading: React.CSSProperties = { fontFamily: 'var(--display)', fontSize: '1.1rem', letterSpacing: 1, margin: 0 };
  const body: React.CSSProperties = { fontFamily: 'var(--serif)', fontSize: 13, lineHeight: 1.7, opacity: 0.75, marginTop: 8 };

  switch (block.block_type) {
    case 'concept':
      return (
        <div style={wrap}>
          <div style={label}>Concept</div>
          {block.image_url && (
            <Image src={block.image_url} alt={block.title || ''} width={800} height={420} style={{ width: '100%', maxHeight: 420, objectFit: 'cover', borderRadius: 8, display: 'block' }} />
          )}
          {block.title && <h3 style={{ ...heading, marginTop: 10 }}>{block.title}</h3>}
        </div>
      );

    case 'scene': {
      const loc = [block.meta?.location, block.meta?.time_of_day].filter(Boolean).join(' · ');
      return (
        <div style={wrap}>
          <div style={label}>Scene</div>
          <h3 style={heading}>{block.title}</h3>
          {loc && <div style={{ fontFamily: 'var(--mono)', fontSize: 10, opacity: 0.4, marginTop: 4 }}>{loc}</div>}
        </div>
      );
    }

    case 'budget': {
      const total = block.meta?.total ?? 0;
      const lines: { category: string; amount: number }[] = block.meta?.lines || [];
      return (
        <div style={wrap}>
          <div style={label}>Budget</div>
          <div style={{ fontFamily: 'var(--display)', fontSize: '1.6rem', letterSpacing: 2 }}>${Number(total).toLocaleString()}</div>
          {lines.length > 0 && (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {lines.map((l, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: 10.5, opacity: 0.6 }}>
                  <span>{l.category}</span>
                  <span>${Number(l.amount).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    case 'crew':
      return (
        <div style={{ ...wrap, display: 'flex', alignItems: 'center', gap: 14 }}>
          {block.image_url ? (
            <Image src={block.image_url} alt={block.title || ''} width={48} height={48} style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(215,52,11,0.15)', flexShrink: 0 }} />
          )}
          <div>
            <div style={label}>Crew</div>
            <h3 style={{ ...heading, marginTop: -6 }}>{block.title}</h3>
            {block.body && <div style={{ fontFamily: 'var(--mono)', fontSize: 10, opacity: 0.5, marginTop: 2 }}>{block.body}</div>}
          </div>
        </div>
      );

    case 'script':
      return (
        <div style={wrap}>
          <div style={label}>Script Excerpt</div>
          <h3 style={heading}>{block.title}</h3>
          {block.body && <pre style={{ ...body, whiteSpace: 'pre-wrap', fontFamily: 'var(--mono)', fontSize: 11.5 }}>{block.body}</pre>}
        </div>
      );

    case 'media': {
      const isYt = block.meta?.media_type === 'youtube';
      const url = block.meta?.url;
      if (isYt && url) {
        return (
          <div style={wrap}>
            <div style={label}>Media</div>
            <div style={{ aspectRatio: '16/9', background: '#000', borderRadius: 8, overflow: 'hidden' }}>
              <iframe
                src={`https://www.youtube.com/embed/${extractYouTubeId(url)}?rel=0&modestbranding=1`}
                width="100%" height="100%" style={{ border: 'none', display: 'block' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen title={block.title || 'Video'}
              />
            </div>
          </div>
        );
      }
      return (
        <div style={wrap}>
          <div style={label}>Media</div>
          {url && <Image src={url} alt={block.title || ''} width={800} height={420} style={{ width: '100%', maxHeight: 420, objectFit: 'cover', borderRadius: 8, display: 'block' }} />}
        </div>
      );
    }

    case 'text':
    default:
      if (!block.title && !block.body) return null;
      return (
        <div style={wrap}>
          {block.title && <h3 style={heading}>{block.title}</h3>}
          {block.body && <p style={body}>{block.body}</p>}
        </div>
      );
  }
}

function extractYouTubeId(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1);
    return u.searchParams.get('v') || url;
  } catch {
    return url;
  }
}

function VideoCard({ media, onClick }: { media: MediaItem; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  const thumb = media.thumbnail_url
    ?? `https://img.youtube.com/vi/${media.url}/hqdefault.jpg`;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        aspectRatio: '16/9',
        background: '#111',
        border: `1px solid ${hovered ? 'var(--accent)' : 'rgba(255,255,255,0.07)'}`,
        boxShadow: hovered ? '0 12px 28px rgba(0,0,0,0.5), 0 0 16px rgba(215, 52, 11,0.25)' : 'none',
        cursor: 'pointer',
        overflow: 'hidden',
        position: 'relative',
        transition: 'border-color 0.2s, transform 0.2s, box-shadow 0.2s',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        outline: 'none',
      }}
    >
      {/* Thumbnail */}
      <Image
        src={thumb}
        alt={media.title}
        fill
        style={{
          objectFit: 'cover',
          display: 'block',
          transition: 'transform 0.3s',
          transform: hovered ? 'scale(1.04)' : 'scale(1)',
        }}
        loading="lazy"
      />

      {/* Overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: hovered
          ? 'rgba(0,0,0,0.55)'
          : 'rgba(0,0,0,0.38)',
        transition: 'background 0.2s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {/* Play button */}
        <div style={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: hovered ? 'var(--accent)' : 'rgba(255,255,255,0.18)',
          border: `2px solid ${hovered ? 'var(--accent)' : 'rgba(255,255,255,0.5)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.2s, border-color 0.2s, transform 0.2s',
          transform: hovered ? 'scale(1.1)' : 'scale(1)',
        }}>
          {/* Triangle play icon */}
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <polygon
              points="5,3 15,9 5,15"
              fill={hovered ? '#080808' : 'rgba(255,255,255,0.9)'}
            />
          </svg>
        </div>
      </div>

      {/* Video title at bottom */}
      {media.title && media.title !== 'YouTube Video' && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
          padding: '24px 12px 10px',
        }}>
          <div style={{
            fontFamily: 'var(--mono)',
            fontSize: 10,
            letterSpacing: 0.5,
            color: 'var(--fg)',
            opacity: 0.85,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {media.title}
          </div>
        </div>
      )}
    </div>
  );
}

function FooterLink() {
  return (
    <span style={{
      fontFamily: 'var(--mono)',
      fontSize: 9,
      letterSpacing: 2,
      color: 'var(--fg)',
      opacity: 0.25,
    }}>
      POWERED BY{' '}
      <Link
        href="/auth"
        style={{
          color: 'var(--fg)',
          textDecoration: 'none',
          borderBottom: '1px solid rgba(255,255,255,0.15)',
          paddingBottom: 1,
          transition: 'color 0.2s, border-color 0.2s',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLAnchorElement).style.color = 'var(--accent)';
          (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--accent)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLAnchorElement).style.color = 'var(--fg)';
          (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.15)';
        }}
      >
        MISFITS CAVERN
      </Link>
      {' · '}
      <Link
        href="/auth"
        style={{
          color: 'var(--fg)',
          textDecoration: 'none',
          borderBottom: '1px solid rgba(255,255,255,0.15)',
          paddingBottom: 1,
          transition: 'color 0.2s, border-color 0.2s',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLAnchorElement).style.color = 'var(--accent)';
          (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--accent)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLAnchorElement).style.color = 'var(--fg)';
          (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.15)';
        }}
      >
        CREATE YOUR OWN
      </Link>
    </span>
  );
}
