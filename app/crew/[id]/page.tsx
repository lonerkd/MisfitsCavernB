'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, MapPin, MessageSquare, Film, User } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
  bio?: string;
  role?: string;
  location?: string;
  status: 'OPEN' | 'BUSY';
  discord_username?: string;
  created_at: string;
}

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
  portfolio_media: MediaItem[];
}

export default function CrewMemberPage() {
  const params = useParams();
  const id = params?.id as string;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      setLoading(true);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (profileError || !profileData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setProfile(profileData as Profile);

      const { data: projectData } = await supabase
        .from('portfolio_projects')
        .select('*, portfolio_media(*)')
        .eq('user_id', id)
        .order('created_at', { ascending: false });

      setProjects((projectData as PortfolioProject[]) || []);
      setLoading(false);
    };

    load();
  }, [id]);

  // ── Loading state ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, opacity: 0.4, letterSpacing: 2 }}>LOADING...</div>
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
          <div style={{ fontFamily: 'var(--display)', fontSize: '2rem', letterSpacing: 4, opacity: 0.3 }}>PROFILE NOT FOUND</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, opacity: 0.4, marginTop: 4 }}>This crew member doesn't exist or has been removed.</div>
          <Link href="/crew" style={{ marginTop: 24, padding: '10px 24px', border: '1px solid rgba(255,255,255,0.15)', color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 2, textDecoration: 'none', transition: 'border-color 0.2s' }}>
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
          fontSize: 9, padding: '4px 10px',
          border: `1px solid ${profile.status === 'OPEN' ? 'rgba(0,200,80,0.6)' : 'rgba(255,255,255,0.15)'}`,
          color: profile.status === 'OPEN' ? '#00c850' : 'rgba(255,255,255,0.35)',
          fontFamily: 'var(--mono)', letterSpacing: 2
        }}>
          {profile.status}
        </span>
      </header>

      {/* ── Page Body ──────────────────────────────────────────────────────────── */}
      <div style={{ marginTop: 60, maxWidth: 760, margin: '60px auto 0', padding: '60px 24px 80px' }}>

        {/* ── Hero Block ───────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', marginBottom: 56 }}>

          {/* Avatar */}
          <div style={{ flexShrink: 0 }}>
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.username}
                style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', display: 'block' }}
              />
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

          {/* Identity */}
          <div style={{ flex: 1, minWidth: 0 }}>

            {/* Username */}
            <h1 style={{
              fontFamily: 'var(--display)', fontSize: 'clamp(2rem, 6vw, 3.6rem)',
              letterSpacing: 4, margin: '0 0 10px', lineHeight: 1, textTransform: 'uppercase'
            }}>
              {profile.username}
            </h1>

            {/* Role + Status row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
              {profile.role && (
                <span style={{
                  fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 2,
                  color: 'var(--accent)', textTransform: 'uppercase'
                }}>
                  {profile.role}
                </span>
              )}
              <span style={{
                fontSize: 9, padding: '3px 9px',
                border: `1px solid ${profile.status === 'OPEN' ? 'rgba(0,200,80,0.5)' : 'rgba(255,255,255,0.12)'}`,
                color: profile.status === 'OPEN' ? '#00c850' : 'rgba(255,255,255,0.3)',
                fontFamily: 'var(--mono)', letterSpacing: 2
              }}>
                {profile.status}
              </span>
            </div>

            {/* Meta row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center' }}>
              {profile.location && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.45 }}>
                  <MapPin size={11} />
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10 }}>{profile.location}</span>
                </div>
              )}
              {profile.discord_username && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.45 }}>
                  <MessageSquare size={11} />
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10 }}>{profile.discord_username}</span>
                </div>
              )}
              {joinYear && (
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, opacity: 0.28 }}>
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
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 3, opacity: 0.4, marginBottom: 16, textTransform: 'uppercase' }}>
              About
            </div>
            <p style={{
              fontFamily: 'var(--serif)', fontSize: '1.2rem', lineHeight: 1.75,
              color: 'rgba(240,236,228,0.82)', margin: 0, maxWidth: 620
            }}>
              {profile.bio}
            </p>
          </div>
        )}

        {/* ── Portfolio Section ─────────────────────────────────────────────────── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 24 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 3, opacity: 0.4, textTransform: 'uppercase' }}>
              Portfolio
            </div>
            {projects.length > 0 && (
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, opacity: 0.25 }}>
                {projects.length} {projects.length === 1 ? 'project' : 'projects'} · {totalClips} {totalClips === 1 ? 'clip' : 'clips'}
              </div>
            )}
          </div>

          {projects.length === 0 ? (
            <div style={{
              padding: '40px 24px', border: '1px solid rgba(255,255,255,0.05)',
              textAlign: 'center', background: 'rgba(255,255,255,0.015)'
            }}>
              <Film size={24} style={{ opacity: 0.2, margin: '0 auto 12px', display: 'block' }} />
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, opacity: 0.3 }}>No portfolio projects yet.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
              {projects.map(project => (
                <Link
                  key={project.id}
                  href="/portfolio"
                  style={{ textDecoration: 'none', color: 'var(--fg)' }}
                >
                  <div
                    style={{
                      padding: '20px 22px',
                      background: '#0a0a0a',
                      border: `1px solid ${hoveredCard === project.id ? 'rgba(255,60,0,0.3)' : 'rgba(255,255,255,0.06)'}`,
                      transition: 'border-color 0.2s',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={() => setHoveredCard(project.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    {/* Project thumbnail strip */}
                    {project.portfolio_media.length > 0 && project.portfolio_media[0].thumbnail_url && (
                      <div style={{
                        width: '100%', aspectRatio: '16/9', background: '#111',
                        marginBottom: 14, overflow: 'hidden', position: 'relative'
                      }}>
                        <img
                          src={project.portfolio_media[0].thumbnail_url}
                          alt={project.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: 0.75 }}
                        />
                        {project.portfolio_media.length > 1 && (
                          <div style={{
                            position: 'absolute', bottom: 6, right: 8,
                            fontFamily: 'var(--mono)', fontSize: 8,
                            background: 'rgba(0,0,0,0.75)', padding: '2px 6px',
                            color: 'rgba(255,255,255,0.6)', letterSpacing: 1
                          }}>
                            +{project.portfolio_media.length - 1}
                          </div>
                        )}
                      </div>
                    )}

                    {/* No media placeholder */}
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
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 9, opacity: 0.35, letterSpacing: 1 }}>
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
