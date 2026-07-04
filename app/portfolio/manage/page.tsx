'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Link as LinkIcon, Copy, Film } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { getPortfolioProjects, createPortfolioProject, addPortfolioMedia, deletePortfolioProject, deletePortfolioMedia } from '@/lib/supabase/portfolio';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/Confirm';
import EmptyState from '@/components/EmptyState';

const CATEGORIES = ['Short Film', 'Music Video', 'Documentary', 'Commercial', 'Feature', 'Web Series', 'Other'];

interface MediaItem { id: string; title: string; media_type: string; url: string; }
interface PortfolioProject {
  id: string;
  title: string;
  description?: string;
  category?: string;
  year?: number;
  role?: string;
  share_token: string;
  portfolio_media: MediaItem[];
}

const fieldStyle: React.CSSProperties = {
  width: '100%', padding: 10, background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)', color: 'var(--fg)',
  fontFamily: 'var(--mono)', fontSize: 11, boxSizing: 'border-box', outline: 'none',
};

export default function ManagePortfolioPage() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [user, setUser] = useState<any>(null);
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newProject, setNewProject] = useState({ title: '', category: '', year: '', role: '', description: '' });
  const [mediaForm, setMediaForm] = useState<Record<string, { title: string; url: string; media_type: string }>>({});

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUser(user);
      if (user) await load(user.id);
      setLoading(false);
    });
  }, []);

  const load = async (userId: string) => {
    const data = await getPortfolioProjects(userId);
    setProjects((data as PortfolioProject[]) || []);
  };

  const createProject = async () => {
    if (!user || !newProject.title.trim()) return;
    try {
      const created = await createPortfolioProject({
        user_id: user.id,
        title: newProject.title,
        category: newProject.category || null,
        year: newProject.year ? parseInt(newProject.year, 10) : null,
        role: newProject.role || null,
        description: newProject.description || null,
      });
      setProjects(prev => [{ ...created, portfolio_media: [] }, ...prev]);
      setNewProject({ title: '', category: '', year: '', role: '', description: '' });
      setShowNew(false);
      toast('Project added', 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to create project', 'error');
    }
  };

  const removeProject = async (id: string) => {
    if (!await confirm('Delete this portfolio project and its media? This cannot be undone.')) return;
    try {
      await deletePortfolioProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
      toast('Project removed', 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to delete project', 'error');
    }
  };

  const addMedia = async (projectId: string) => {
    const form = mediaForm[projectId];
    if (!form?.url?.trim()) return;
    try {
      const media = await addPortfolioMedia({
        project_id: projectId,
        title: form.title || null,
        url: form.url,
        media_type: form.media_type || 'youtube',
      });
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, portfolio_media: [...p.portfolio_media, media] } : p));
      setMediaForm(prev => ({ ...prev, [projectId]: { title: '', url: '', media_type: 'youtube' } }));
      toast('Media added', 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to add media', 'error');
    }
  };

  const removeMedia = async (projectId: string, mediaId: string) => {
    if (!await confirm('Remove this media item?')) return;
    try {
      await deletePortfolioMedia(mediaId);
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, portfolio_media: p.portfolio_media.filter(m => m.id !== mediaId) } : p));
    } catch (err: any) {
      toast(err.message || 'Failed to remove media', 'error');
    }
  };

  const copyShareLink = (token: string) => {
    const link = `${window.location.origin}/p/${token}`;
    navigator.clipboard.writeText(link);
    toast('Share link copied', 'success');
  };

  if (!loading && !user) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 11, opacity: 0.5, marginBottom: 16 }}>Sign in to manage your portfolio.</p>
          <Link href="/auth" style={{ color: 'var(--accent)', fontFamily: 'var(--mono)', fontSize: 11 }}>Sign in →</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)' }}>
      <header style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: 60,
        background: 'rgba(8,8,8,0.95)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 100,
      }}>
        <Link href="/profile" style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--fg)', textDecoration: 'none' }}>
          <ArrowLeft size={20} />
          <h1 style={{ fontFamily: 'var(--display)', fontSize: '1.2rem', letterSpacing: 4, margin: 0 }}>MANAGE PORTFOLIO</h1>
        </Link>
        <button onClick={() => setShowNew(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--accent)', color: 'var(--bg)', border: 'none', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 1, cursor: 'pointer' }}>
          <Plus size={12} /> NEW PROJECT
        </button>
      </header>

      <div style={{ marginTop: 60, maxWidth: 720, margin: '60px auto 0', padding: '40px 24px 80px' }}>
        {showNew && (
          <div style={{ padding: 20, background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 24, display: 'grid', gap: 12 }}>
            <input type="text" placeholder="Project title" value={newProject.title} onChange={e => setNewProject({ ...newProject, title: e.target.value })} style={fieldStyle} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <select value={newProject.category} onChange={e => setNewProject({ ...newProject, category: e.target.value })} style={{ ...fieldStyle, cursor: 'pointer' }}>
                <option value="">Category...</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input type="number" placeholder="Year" value={newProject.year} onChange={e => setNewProject({ ...newProject, year: e.target.value })} style={fieldStyle} />
              <input type="text" placeholder="Your role" value={newProject.role} onChange={e => setNewProject({ ...newProject, role: e.target.value })} style={fieldStyle} />
            </div>
            <textarea placeholder="Description" value={newProject.description} onChange={e => setNewProject({ ...newProject, description: e.target.value })} style={{ ...fieldStyle, height: 70, resize: 'vertical' }} />
            <button onClick={createProject} style={{ padding: 10, background: 'var(--accent)', color: 'var(--bg)', border: 'none', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 1, cursor: 'pointer' }}>ADD PROJECT</button>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'grid', gap: 20 }}>
            {[0, 1].map(i => (
              <div key={i} className="skeleton" style={{ height: 140, borderRadius: 12 }} />
            ))}
          </div>
        ) : projects.length === 0 && !showNew ? (
          <EmptyState icon={<Film size={28} />} title="No portfolio projects yet" subtitle='Click "New Project" to add your first piece of work' />
        ) : (
        <div style={{ display: 'grid', gap: 20 }}>
          {projects.map(project => {
            const form = mediaForm[project.id] || { title: '', url: '', media_type: 'youtube' };
            return (
              <div key={project.id} style={{ padding: 20, background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(215, 52, 11,0.3)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(215, 52, 11,0.15)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.boxShadow = 'none'; }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 'bold' }}>{project.title}</div>
                    <div style={{ fontSize: 9, opacity: 0.4, fontFamily: 'var(--mono)', marginTop: 4 }}>
                      {[project.category, project.year, project.role].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => copyShareLink(project.share_token)} title="Copy share link"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--fg)', cursor: 'pointer', padding: 6, display: 'flex' }}>
                      <Copy size={12} />
                    </button>
                    <button onClick={() => removeProject(project.id)} style={{ background: 'none', border: 'none', color: 'var(--fg)', cursor: 'pointer', opacity: 0.4, padding: 6 }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, fontSize: 9, fontFamily: 'var(--mono)', opacity: 0.5 }}>
                  <LinkIcon size={10} /> /p/{project.share_token}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                  {project.portfolio_media.map(media => (
                    <div key={media.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ fontSize: 9, opacity: 0.4, fontFamily: 'var(--mono)', textTransform: 'uppercase' }}>{media.media_type}</span>
                      <span style={{ flex: 1, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{media.title || media.url}</span>
                      <button onClick={() => removeMedia(project.id, media.id)} style={{ background: 'none', border: 'none', color: 'var(--fg)', cursor: 'pointer', opacity: 0.3 }}><Trash2 size={12} /></button>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <select value={form.media_type} onChange={e => setMediaForm(prev => ({ ...prev, [project.id]: { ...form, media_type: e.target.value } }))}
                    style={{ ...fieldStyle, width: 100, cursor: 'pointer' }}>
                    <option value="youtube">YouTube</option>
                    <option value="gdrive">G Drive</option>
                    <option value="image">Image</option>
                  </select>
                  <input type="text" placeholder="Title (optional)" value={form.title} onChange={e => setMediaForm(prev => ({ ...prev, [project.id]: { ...form, title: e.target.value } }))} style={{ ...fieldStyle, flex: 1 }} />
                  <input type="url" placeholder="Media URL" value={form.url} onChange={e => setMediaForm(prev => ({ ...prev, [project.id]: { ...form, url: e.target.value } }))} style={{ ...fieldStyle, flex: 2 }} />
                  <button onClick={() => addMedia(project.id)} style={{ padding: '0 16px', background: 'rgba(215, 52, 11,0.1)', border: '1px solid var(--accent)', color: 'var(--accent)', fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ ADD</button>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>
    </div>
  );
}
