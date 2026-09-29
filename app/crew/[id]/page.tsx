'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, MapPin, MessageSquare, Film, User } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { PUBLIC_PROFILE_COLUMNS } from '@/lib/supabase/profile-columns';
import EmptyState from '@/components/EmptyState';
import { addCreditToPortfolio, getPersonCredits, groupByProject, type ProjectCredits } from '@/lib/credits';
import { useToast } from '@/components/Toast';
import { useOnlinePresence } from '@/lib/hooks/usePresence';
import type { Profile } from '@/lib/supabase/profiles';
import { videoEmbed } from '@/lib/studio/media-kind';

const portfolioThumb = (m?: { thumbnail_url?: string | null; url: string } | null) =>
  !m ? null : m.thumbnail_url || videoEmbed(m.url)?.thumbnail || (/\.(png|jpe?g|gif|webp|avif)(\?|$)/i.test(m.url) ? m.url : null);
import Avatar from '@/components/Avatar';
import { awaitOSUser } from '@/lib/os';

interface MediaItem {
  id: string;
  title: string;
  media_type: string;
  url: string;
  thumbnail_url?: string;
}

interface PortfolioProject {
  id: string;
  user_id: string;
  title: string;
  share_token: string;
  portfolio_media: MediaItem[];
}

export default function CrewMemberPage() {
  const params = useParams();
  const id = params?.id as string;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [credits, setCredits] = useState<ProjectCredits[]>([]);
  const [adding, setAdding] = useState<string | null>(null);
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const onlineIds = useOnlinePresence(viewerId);
  const isOnline = !!profile && onlineIds.has(profile.id);

  useEffect(() => {
    awaitOSUser().then((user) => setViewerId(user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      setLoading(true);
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select(PUBLIC_PROFILE_COLUMNS)
          .eq('id', id)
          .single();

        if (profileError || !profileData) {
          setNotFound(true);
          return;
        }

        setProfile(profileData as Profile);

        const { data: projectData } = await supabase
          .from('portfolio_projects')
          .select('*, portfolio_media(*)')
          .eq('user_id', id)
          .order('created_at', { ascending: false });

        setProjects((projectData as PortfolioProject[]) || []);

        getPersonCredits(id).then((rows) => setCredits(groupByProject(rows))).catch(() => setCredits([]));
      } catch (err) {

        console.error('Failed to load crew member:', err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  // ── Loading state ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 2, color: 'var(--fg-dim)' }}>LOADING...</div>
      </div>
    );
  }

  // ── Not found state ──────────────────────────────────────────────────────────
  if (notFound || !profile) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)' }}>
        <header style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: 60,
          background: 'rgba(8,8,8,0.95)', backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          padding: '0 24px', display: 'flex', alignItems: 'center', zIndex: 100,
          boxSizing: 'border-box'
        }}>
          <Link href="/crew" style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--fg)', textDecoration: 'none' }}>
            <ArrowLeft size={20} />
            <span style={{ fontFamily: 'var(--display)', fontSize: '1.2rem', letterSpacing: 4 }}>CREW</span>
          </Link>
        </header>
        <div style={{ marginTop: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 60px)', gap: 16 }}>
          <User size={40} style={{ opacity: 0.2 }} />
          <div style={{ fontFamily: 'var(--display)', fontSize: '2rem', letterSpacing: 4, color: 'var(--fg-dim)' }}>PROFILE NOT FOUND</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, marginTop: 4, color: 'var(--fg-dim)' }}>This crew member doesn&apos;t exist or has been removed.</div>
          <Link href="/crew" style={{ marginTop: 24, padding: '10px 24px', border: '1px solid rgba(255,255,255,0.15)', color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 2, textDecoration: 'none', transition: 'border-color 0.2s' }}>
            BACK TO CREW
          </Link>
        </div>
      </div>
    );
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const initial = profile.username?.[0]?.toUpperCase() || '?';
  const totalClips = projects.reduce((sum, p) => sum + (p.portfolio_media?.length || 0), 0);
  const joinYear = profile.created_at ? new Date(profile.created_at).getFullYear() : null;

  // ── Full profile ─────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)' }}>

      {/* ── Fixed Header ───────────────────────────────────────────────────────── */}
      <header style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: 60,
        background: 'rgba(8,8,8,0.95)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        padding: '0 24px', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', zIndex: 100, boxSizing: 'border-box'
      }}>
        <Link href="/crew" style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--fg)', textDecoration: 'none' }}>
          <ArrowLeft size={20} />
          <span style={{ fontFamily: 'var(--display)', fontSize: '1.2rem', letterSpacing: 4 }}>CREW</span>
        </Link>
        <span style={{
          fontSize: 11, padding: '4px 10px',
          border: `1px solid ${profile.status === 'OPEN' ? 'rgba(0,200,80,0.6)' : 'rgba(255,255,255,0.15)'}`,
          color: profile.status === 'OPEN' ? '#00c850' : 'var(--fg-dim)',
          fontFamily: 'var(--mono)', letterSpacing: 2
        }}>
          {profile.status}
        </span>
      </header>

      {/* ── Page Body ──────────────────────────────────────────────────────────── */}
      <div style={{ marginTop: 60, maxWidth: 760, margin: '60px auto 0', padding: '60px 24px 80px' }}>

        {/* ── Hero Block ───────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', marginBottom: 56 }}>

          <div style={{ flexShrink: 0 }}>
            {profile.avatar_url ? (
              <Avatar src={profile.avatar_url} name={profile.username} size={80} />
            ) : (
              <div style={{
                width: 80, height: 80, borderRadius: '50%',
                background: 'var(--accent)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontFamily: 'var(--display)',
                fontSize: '2.2rem', color: 'var(--bg)', userSelect: 'none'
              }}>
                {initial}
              </div>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>

            <h1 style={{
              fontFamily: 'var(--display)', fontSize: 'clamp(2rem, 6vw, 3.6rem)',
              letterSpacing: 4, margin: '0 0 10px', lineHeight: 1, textTransform: 'uppercase'
            }}>
              {profile.username}
            </h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
              {profile.role && (
                <span style={{
                  fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 2,
                  color: 'var(--accent)', textTransform: 'uppercase'
                }}>
                  {profile.role}
                </span>
              )}
              <span style={{
                fontSize: 11, padding: '3px 9px',
                border: `1px solid ${profile.status === 'OPEN' ? 'rgba(0,200,80,0.5)' : 'rgba(255,255,255,0.12)'}`,
                color: profile.status === 'OPEN' ? '#00c850' : 'var(--fg-dim)',
                fontFamily: 'var(--mono)', letterSpacing: 2
              }}>
                {profile.status}
              </span>
              {isOnline && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontFamily: 'var(--mono)', letterSpacing: 1, color: '#10b981' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px rgba(16,185,129,0.8)' }} />
                  Online now
                </span>
              )}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center' }}>
              {profile.location && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.45 }}>
                  <MapPin size={11} />
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{profile.location}</span>
                </div>
              )}
              {profile.discord_username && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.45 }}>
                  <MessageSquare size={11} />
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{profile.discord_username}</span>
                </div>
              )}
              {joinYear && (
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-dim)' }}>
                  member since {joinYear}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Divider ──────────────────────────────────────────────────────────── */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', marginBottom: 40 }} />

        {/* ── Bio ──────────────────────────────────────────────────────────────── */}
        {profile.bio && (
          <div style={{ marginBottom: 56 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 3, marginBottom: 16, textTransform: 'uppercase', color: 'var(--fg-dim)' }}>
              About
            </div>
            <p style={{
              fontFamily: 'var(--serif)', fontSize: '1.2rem', lineHeight: 1.75,
              color: 'rgba(224, 221, 174,0.82)', margin: 0, maxWidth: 620
            }}>
              {profile.bio}
            </p>
          </div>
        )}

        {/* ── Credits: from the work itself (crew, cast, films made) ─────────────── */}
        {credits.length > 0 && (
          <section aria-labelledby="credits-title" style={{ marginBottom: 48, padding: 0 }}>
            <h2 id="credits-title" style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 3, margin: '0 0 16px', textTransform: 'uppercase', color: 'var(--fg-dim)', fontWeight: 400 }}>
              Credits · {credits.length}
            </h2>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {credits.map((c) => (
                <li key={c.project_id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderLeft: `3px solid ${c.accent_color || '#e8431a'}` }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--fg)' }}>
                      {c.title}{c.year ? <span style={{ color: 'var(--fg-dim)', fontSize: 13 }}> ({c.year})</span> : null}
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-muted)', marginTop: 3 }}>
                      {c.labels.join(' · ')}{c.project_type ? ` — ${c.project_type}` : ''}
                    </div>
                  </div>
                  {viewerId === profile.id && (c.portfolio_project_id ? (
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#5fd99a' }}>In your portfolio</span>
                  ) : (
                    <button type="button" disabled={adding === c.project_id}
                      aria-label={`Add ${c.title} to your portfolio`}
                      onClick={async () => {
                        setAdding(c.project_id);
                        try {
                          const pf = await addCreditToPortfolio(profile.id, c);
                          setCredits((prev) => prev.map((x) => (x.project_id === c.project_id ? { ...x, portfolio_project_id: pf.id } : x)));
                          toast(`“${c.title}” is in your portfolio — add clips and stills there`, 'success');
                        } catch (e) { toast(e instanceof Error ? e.message : 'Could not add it', 'error'); }
                        finally { setAdding(null); }
                      }}
                      style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', padding: '8px 12px', minHeight: 32, borderRadius: 8, border: '1px solid rgba(232, 67, 26,0.4)', background: 'rgba(232, 67, 26,0.1)', color: 'var(--fg)', cursor: 'pointer' }}>
                      {adding === c.project_id ? 'Adding…' : 'Add to portfolio'}
                    </button>
                  ))}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Portfolio Section ─────────────────────────────────────────────────── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 24 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--fg-dim)' }}>
              Portfolio
            </div>
            {projects.length > 0 && (
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-dim)' }}>
                {projects.length} {projects.length === 1 ? 'project' : 'projects'} · {totalClips} {totalClips === 1 ? 'clip' : 'clips'}
              </div>
            )}
          </div>

          {projects.length === 0 ? (
            <EmptyState icon={<Film size={28} />} title="No portfolio projects yet" />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
              {projects.map(project => (
                <Link
                  key={project.id}
                  href={`/p/${project.share_token}`}
                  style={{ textDecoration: 'none', color: 'var(--fg)' }}
                >
                  <div
                    style={{
                      padding: '20px 22px',
                      background: '#0a0a0a',
                      border: `1px solid ${hoveredCard === project.id ? 'rgba(232, 67, 26,0.3)' : 'rgba(255,255,255,0.06)'}`,
                      boxShadow: hoveredCard === project.id ? '0 8px 24px rgba(0,0,0,0.5)' : 'none',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={() => setHoveredCard(project.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    {portfolioThumb(project.portfolio_media[0]) && (
                      <div style={{
                        width: '100%', aspectRatio: '16/9', background: '#111',
                        marginBottom: 14, overflow: 'hidden', position: 'relative'
                      }}>
                        {/* eslint-disable-next-line @next/next/no-img-element -- thumbnails come from YouTube, Drive or the owner's links */}
                        <img
                          src={portfolioThumb(project.portfolio_media[0])!}
                          alt={project.title}
                          loading="lazy"
                          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: 0.75 }}
                        />
                        {project.portfolio_media.length > 1 && (
                          <div style={{
                            position: 'absolute', bottom: 6, right: 8,
                            fontFamily: 'var(--mono)', fontSize: 11,
                            background: 'rgba(0,0,0,0.75)', padding: '2px 6px',
                            color: 'rgba(255,255,255,0.6)', letterSpacing: 1
                          }}>
                            +{project.portfolio_media.length - 1}
                          </div>
                        )}
                      </div>
                    )}

                    {project.portfolio_media.length === 0 && (
                      <div style={{
                        width: '100%', aspectRatio: '16/9',
                        background: 'rgba(255,255,255,0.02)',
                        marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <Film size={20} style={{ opacity: 0.15 }} />
                      </div>
                    )}

                    <div style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, marginBottom: 6, lineHeight: 1.3 }}>
                      {project.title}
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 1, color: 'var(--fg-dim)' }}>
                      {project.portfolio_media.length} {project.portfolio_media.length === 1 ? 'CLIP' : 'CLIPS'}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
