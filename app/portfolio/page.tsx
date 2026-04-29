'use client';

import React, { useState, useEffect } from 'react';
import { Play, X, ArrowLeft, Trash2, Plus, Share2 } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

interface MediaItem { id: string; title: string; media_type: string; url: string; thumbnail_url?: string; }
interface Project { id: string; title: string; year?: number; role?: string; user_id?: string; share_token?: string; portfolio_media: MediaItem[]; profiles?: { username: string }; }

export default function PortfolioPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<Project | null>(null);
  const [playingMedia, setPlayingMedia] = useState<MediaItem | null>(null);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'mine' | 'discover'>('discover');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      // guests default to discover; signed-in users default to their own
      setTab(user ? 'mine' : 'discover');
    });
  }, []);

  useEffect(() => {
    load();
  }, [tab, user]);

  const load = async () => {
    setLoading(true);
    let query = supabase
      .from('portfolio_projects')
      .select('*, portfolio_media(*), profiles(username)')
      .order('created_at', { ascending: false });

    if (tab === 'mine' && user) {
      query = query.eq('user_id', user.id);
    }
    // discover: no filter — all public portfolios

    const { data } = await query;
    if (data) {
      setProjects(data as Project[]);
      setSelected(data.length > 0 ? data[0] as Project : null);
    }
    setLoading(false);
  };

  const isOwner = (project: Project) => user && project.user_id === user.id;

  const createProject = async () => {
    if (!user || !newProjectTitle.trim()) return;
    const { data } = await supabase
      .from('portfolio_projects')
      .insert({ user_id: user.id, title: newProjectTitle })
      .select('*, portfolio_media(*), profiles(username)')
      .single();
    if (data) {
      setProjects([data as Project, ...projects]);
      setSelected(data as Project);
      setNewProjectTitle('');
    }
  };

  const deleteProject = async (id: string) => {
    await supabase.from('portfolio_projects').delete().eq('id', id);
    const rest = projects.filter(p => p.id !== id);
    setProjects(rest);
    setSelected(rest[0] || null);
  };

  const addMedia = async () => {
    if (!selected || !newMediaUrl.trim()) return;
    const youtubeId = extractYouTubeId(newMediaUrl);
    if (!youtubeId) return alert('Enter a valid YouTube URL or 11-character video ID');
    const { data } = await supabase
      .from('portfolio_media')
      .insert({
        project_id: selected.id,
        title: 'YouTube Video',
        media_type: 'youtube',
        url: youtubeId,
        thumbnail_url: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`
      })
      .select().single();
    if (data) {
      const updated = { ...selected, portfolio_media: [...selected.portfolio_media, data] };
      setSelected(updated);
      setProjects(projects.map(p => p.id === selected.id ? updated : p));
      setNewMediaUrl('');
    }
  };

  const deleteMedia = async (mediaId: string) => {
    if (!selected) return;
    await supabase.from('portfolio_media').delete().eq('id', mediaId);
    const updated = { ...selected, portfolio_media: selected.portfolio_media.filter(m => m.id !== mediaId) };
    setSelected(updated);
    setProjects(projects.map(p => p.id === selected.id ? updated : p));
    setPlayingMedia(null);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)' }}>
      <header style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: 60, background: 'rgba(8,8,8,0.95)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.04)', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 100 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--fg)', textDecoration: 'none' }}>
          <ArrowLeft size={20} />
          <h1 style={{ fontFamily: 'var(--display)', fontSize: '1.2rem', letterSpacing: 4, margin: 0 }}>PORTFOLIO</h1>
        </Link>
        <div style={{ display: 'flex', gap: 8 }}>
          {user && (
            <button onClick={() => setTab('mine')}
              style={{ padding: '6px 14px', background: tab === 'mine' ? 'var(--accent)' : 'transparent', color: tab === 'mine' ? 'var(--bg)' : 'var(--fg)', border: `1px solid ${tab === 'mine' ? 'var(--accent)' : 'rgba(255,255,255,0.15)'}`, fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1, cursor: 'pointer' }}>
              MINE
            </button>
          )}
          <button onClick={() => setTab('discover')}
            style={{ padding: '6px 14px', background: tab === 'discover' ? 'var(--accent)' : 'transparent', color: tab === 'discover' ? 'var(--bg)' : 'var(--fg)', border: `1px solid ${tab === 'discover' ? 'var(--accent)' : 'rgba(255,255,255,0.15)'}`, fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1, cursor: 'pointer' }}>
            DISCOVER
          </button>
          {!user && (
            <Link href="/auth" style={{ padding: '6px 14px', border: '1px solid rgba(255,255,255,0.15)', color: 'var(--accent)', fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1 }}>
              SIGN IN
            </Link>
          )}
        </div>
      </header>

      <div style={{ marginTop: 60, display: 'flex', height: 'calc(100vh - 60px)' }}>
        {/* Sidebar */}
        <div style={{ width: 280, background: '#0a0a0a', borderRight: '1px solid rgba(255,255,255,0.04)', padding: 16, overflowY: 'auto' }}>
          <h3 style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2, marginBottom: 12, opacity: 0.5 }}>
            {tab === 'mine' ? 'YOUR PROJECTS' : 'ALL PORTFOLIOS'}
          </h3>

          {/* Create — only on Mine tab */}
          {tab === 'mine' && user && (
            <div style={{ marginBottom: 16 }}>
              <input type="text" value={newProjectTitle} onChange={e => setNewProjectTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createProject()}
                placeholder="New project..."
                style={{ width: '100%', padding: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 10, marginBottom: 8 }} />
              <button onClick={createProject}
                style={{ width: '100%', padding: 8, background: 'var(--accent)', color: 'var(--bg)', border: 'none', fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1, cursor: 'pointer' }}>
                + CREATE
              </button>
            </div>
          )}

          {loading ? (
            <div style={{ opacity: 0.4, fontFamily: 'var(--mono)', fontSize: 10, padding: 12 }}>Loading...</div>
          ) : projects.length === 0 ? (
            <div style={{ opacity: 0.3, fontFamily: 'var(--mono)', fontSize: 10, padding: 12 }}>
              {tab === 'mine' ? 'No projects yet.' : 'No portfolios yet.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {projects.map(p => (
                <button key={p.id} onClick={() => { setSelected(p); setPlayingMedia(null); }}
                  style={{ padding: 12, background: selected?.id === p.id ? 'rgba(255,60,0,0.1)' : 'transparent', border: `1px solid ${selected?.id === p.id ? 'var(--accent)' : 'rgba(255,255,255,0.1)'}`, color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 10, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}>
                  <div>{p.title}</div>
                  {tab === 'discover' && p.profiles?.username && (
                    <div style={{ fontSize: 8, color: 'var(--accent)', marginTop: 2, opacity: 0.7 }}>by {p.profiles.username}</div>
                  )}
                  <div style={{ fontSize: 8, opacity: 0.4, marginTop: 2 }}>{p.portfolio_media.length} clips</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main */}
        {selected && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ height: 80, borderBottom: '1px solid rgba(255,255,255,0.04)', padding: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--display)', fontSize: '1.8rem', letterSpacing: 2, margin: 0 }}>{selected.title}</h2>
                {tab === 'discover' && selected.profiles?.username && (
                  <div style={{ fontSize: 10, opacity: 0.5, marginTop: 4, fontFamily: 'var(--mono)' }}>by {selected.profiles.username}</div>
                )}
              </div>
              {isOwner(selected) && (
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  {selected.share_token && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/p/${selected.share_token}`);
                        alert('Share link copied!');
                      }}
                      title="Copy public share link"
                      style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', opacity: 0.7, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Share2 size={14} />
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 1 }}>SHARE</span>
                    </button>
                  )}
                  <button onClick={() => deleteProject(selected.id)} style={{ background: 'none', border: 'none', color: 'var(--fg)', cursor: 'pointer', opacity: 0.4 }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>

            <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
              {selected.portfolio_media.length === 0 ? (
                <div style={{ opacity: 0.3, fontFamily: 'var(--mono)', fontSize: 11, padding: 40, textAlign: 'center' }}>No media yet.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 16, marginBottom: 24 }}>
                  {selected.portfolio_media.map(media => (
                    <div key={media.id} onClick={() => setPlayingMedia(media)}
                      style={{ aspectRatio: '16/9', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', overflow: 'hidden', position: 'relative', transition: 'all 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}>
                      {media.thumbnail_url && (
                        <img src={media.thumbnail_url} alt={media.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      )}
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Play size={32} fill="rgba(255,255,255,0.7)" />
                      </div>
                      {isOwner(selected) && (
                        <button onClick={e => { e.stopPropagation(); deleteMedia(media.id); }}
                          style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', border: 'none', color: 'var(--fg)', cursor: 'pointer', padding: 4 }}>
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add media — only if owner */}
              {isOwner(selected) && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 20 }}>
                  <h3 style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2, marginBottom: 12, opacity: 0.5 }}>ADD YOUTUBE VIDEO</h3>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="text" value={newMediaUrl} onChange={e => setNewMediaUrl(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addMedia()}
                      placeholder="YouTube URL or video ID..."
                      style={{ flex: 1, padding: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 11 }} />
                    <button onClick={addMedia}
                      style={{ padding: '10px 20px', background: 'rgba(255,60,0,0.1)', border: '1px solid var(--accent)', color: 'var(--accent)', fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1, cursor: 'pointer' }}>
                      + ADD
                    </button>
                  </div>
                </div>
              )}

              {/* Soft sign-in nudge for guests */}
              {!user && (
                <div style={{ marginTop: 32, padding: 20, border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
                  <p style={{ fontFamily: 'var(--mono)', fontSize: 10, opacity: 0.5, marginBottom: 12 }}>Want to showcase your own work?</p>
                  <Link href="/auth" style={{ padding: '8px 20px', background: 'var(--accent)', color: 'var(--bg)', fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1 }}>
                    CREATE ACCOUNT
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {!selected && !loading && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>Select a project to view</div>
          </div>
        )}
      </div>

      {/* Video modal */}
      {playingMedia && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.94)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000 }}
          onClick={() => setPlayingMedia(null)}>
          <div style={{ width: '100%', maxWidth: 960, margin: '0 16px' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setPlayingMedia(null)}
              style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 8 }}>
              <X size={26} />
            </button>
            <div style={{ aspectRatio: '16/9', background: '#000' }}>
              <iframe
                src={`https://www.youtube.com/embed/${playingMedia.url}?autoplay=1`}
                width="100%" height="100%"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen style={{ border: 'none' }}
              />
            </div>
            <div style={{ marginTop: 20 }}>
              <h3 style={{ fontFamily: 'var(--display)', fontSize: '1.4rem', letterSpacing: 2 }}>{playingMedia.title}</h3>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
