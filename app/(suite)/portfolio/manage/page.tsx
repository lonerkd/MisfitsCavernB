'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Link as LinkIcon, Copy, Film } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { getPortfolioProjects, createPortfolioProject, addPortfolioMedia, deletePortfolioProject, deletePortfolioMedia, setPortfolioCover, setPortfolioVisibility } from '@/lib/supabase/portfolio';
import { hasLiveLink, VISIBILITIES, VISIBILITY_LABEL, VISIBILITY_NOTE, visibilityOf, type PortfolioVisibility } from '@/lib/portfolio/visibility';
import { isCoverUrl } from '@/lib/portfolio/header';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/Confirm';
import EmptyState from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { awaitOSUser } from '@/lib/os';
import { useFormats } from '@/lib/formats/formats';


interface MediaItem { id: string; title: string; media_type: string; url: string; }
interface PortfolioProject {
  id: string;
  title: string;
  description?: string;
  category?: string;
  year?: number;
  role?: string;
  cover_url?: string | null;
  visibility?: string;
  share_token: string;
  portfolio_media: MediaItem[];
}

const fieldStyle: React.CSSProperties = {
  width: '100%', padding: 10, background: 'rgba(var(--ink-rgb), 0.05)',
  border: '1px solid rgba(var(--ink-rgb), 0.1)', color: 'var(--fg)',
  fontFamily: 'var(--mono)', fontSize: 11, boxSizing: 'border-box', outline: 'none',
};

export default function ManagePortfolioPage() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [user, setUser] = useState<any>(null);
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const { formats } = useFormats();
  const [newProject, setNewProject] = useState({ title: '', category: '', year: '', role: '', description: '', cover: '', visibility: 'private' as PortfolioVisibility });
  const [coverForm, setCoverForm] = useState<Record<string, string>>({});
  const [mediaForm, setMediaForm] = useState<Record<string, { title: string; url: string; media_type: string }>>({});

  const load = async (userId: string) => {
    const data = await getPortfolioProjects(userId);
    setProjects((data as PortfolioProject[]) || []);
  };

  useEffect(() => {
    awaitOSUser().then(async (user) => {
      setUser(user);
      if (user) await load(user.id);
      setLoading(false);
    });
  }, []);

  const createProject = async () => {
    if (!user || !newProject.title.trim()) return;
    if (newProject.cover.trim() && !isCoverUrl(newProject.cover)) { toast('A cover is a link to an image that starts with https://', 'error'); return; }
    try {
      const created = await createPortfolioProject({
        user_id: user.id,
        title: newProject.title,
        category: newProject.category || null,
        year: newProject.year ? parseInt(newProject.year, 10) : null,
        role: newProject.role || null,
        description: newProject.description || null,
        cover_url: newProject.cover.trim() || null,
        visibility: newProject.visibility,
      });
      setProjects(prev => [{ ...created, portfolio_media: [] } as unknown as PortfolioProject, ...prev]);
      setNewProject({ title: '', category: '', year: '', role: '', description: '', cover: '', visibility: 'private' });
      setShowNew(false);
      toast('Project added', 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to create project', 'error');
    }
  };

  const saveCover = async (id: string, url: string | null) => {
    try {
      await setPortfolioCover(id, url);
      setProjects(prev => prev.map(p => p.id === id ? { ...p, cover_url: url === null ? null : url.trim() } : p));
      setCoverForm(prev => ({ ...prev, [id]: '' }));
      toast(url === null ? 'Cover removed' : 'Cover set', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not save the cover', 'error');
    }
  };

  const changeVisibility = async (id: string, visibility: PortfolioVisibility) => {
    try {
      await setPortfolioVisibility(id, visibility);
      setProjects(prev => prev.map(p => p.id === id ? { ...p, visibility } : p));
      toast(`${VISIBILITY_LABEL[visibility]}: ${VISIBILITY_NOTE[visibility]}`, 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not change who can see it', 'error');
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
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, portfolio_media: [...p.portfolio_media, media as unknown as MediaItem] } : p));
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
          <p style={{ fontFamily: 'var(--mono)', fontSize: 11, marginBottom: 16, color: 'var(--fg-dim)' }}>Sign in to manage your portfolio.</p>
          <Link href="/auth" style={{ color: 'var(--accent)', fontFamily: 'var(--mono)', fontSize: 11 }}>Sign in →</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)' }}>
      <header style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, padding: '12px 24px 0' }}>
        <h1 className="sr-only">Manage portfolio</h1>
        <button onClick={() => setShowNew(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--accent)', color: 'var(--on-accent)', border: 'none', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 'var(--caps-track)', cursor: 'pointer' }}>
          <Plus size={12} /> NEW PROJECT
        </button>
      </header>

      <div style={{ maxWidth: 'var(--w-reading)', margin: '8px auto 0', padding: '40px 24px 80px' }}>
        {showNew && (
          <div style={{ padding: 20, background: 'var(--bg-2)', border: '1px solid rgba(var(--ink-rgb), 0.08)', marginBottom: 24, display: 'grid', gap: 12 }}>
            <Input label="Project title" value={newProject.title} onChange={e => setNewProject({ ...newProject, title: e.target.value })} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <select aria-label="Format" value={newProject.category} onChange={e => setNewProject({ ...newProject, category: e.target.value })} style={{ ...fieldStyle, cursor: 'pointer' }}>
                <option value="">Format…</option>
                {formats.map(f => <option key={f.name} value={f.name}>{f.name}</option>)}
              </select>
              <Input type="number" label="Year" value={newProject.year} onChange={e => setNewProject({ ...newProject, year: e.target.value })} />
              <Input label="Your role" value={newProject.role} onChange={e => setNewProject({ ...newProject, role: e.target.value })} />
            </div>
            <Input label="Cover image (a link to an image, https://…)" value={newProject.cover} onChange={e => setNewProject({ ...newProject, cover: e.target.value })} />
            <label style={{ display: 'grid', gap: 4, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-dim)' }}>Who can see it
              <select aria-label="Who can see it" value={newProject.visibility} onChange={e => setNewProject({ ...newProject, visibility: e.target.value as PortfolioVisibility })} style={{ ...fieldStyle, cursor: 'pointer' }}>
                {VISIBILITIES.map(v => <option key={v} value={v}>{VISIBILITY_LABEL[v]}: {VISIBILITY_NOTE[v]}</option>)}
              </select>
            </label>
            <Textarea label="Description" value={newProject.description} onChange={e => setNewProject({ ...newProject, description: e.target.value })} rows={3} />
            <Button onClick={createProject}>ADD PROJECT</Button>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'grid', gap: 20 }}>
            {[0, 1].map(i => (
              <div key={i} style={{ padding: 20, background: 'var(--bg-2)', border: '1px solid rgba(var(--ink-rgb), 0.06)', borderRadius: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div className="skeleton" style={{ width: 150, height: 14, borderRadius: 4 }} />
                  <div className="skeleton" style={{ width: 60, height: 14, borderRadius: 4 }} />
                </div>
                <div className="skeleton" style={{ width: '100%', height: 80, borderRadius: 8 }} />
              </div>
            ))}
          </div>
        ) : projects.length === 0 && !showNew ? (
          <EmptyState icon={<Film size={28} />} title="No portfolio projects yet"
            subtitle="Add a short, a reel or a music video, with a link."
            action={<button type="button" onClick={() => setShowNew(true)} style={{ padding: '8px 18px', background: 'var(--accent)', color: 'var(--on-accent)', border: 'none', borderRadius: 8, fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 'var(--caps-track)', cursor: 'pointer', fontWeight: 600 }}>Add your first piece</button>} />
        ) : (
        <div style={{ display: 'grid', gap: 20 }}>
          {projects.map(project => {
            const form = mediaForm[project.id] || { title: '', url: '', media_type: 'youtube' };
            return (
              <div key={project.id} style={{ padding: 20, background: 'var(--bg-2)', border: '1px solid rgba(var(--ink-rgb), 0.06)', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(232, 67, 26,0.3)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(232, 67, 26,0.15)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(var(--ink-rgb), 0.06)'; e.currentTarget.style.boxShadow = 'none'; }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 'bold' }}>{project.title}</div>
                    <div style={{ fontSize: 'max(9px, var(--mc-min-font, 0px))', fontFamily: 'var(--mono)', marginTop: 4, color: 'var(--fg-dim)' }}>
                      {[project.category, project.year, project.role].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => copyShareLink(project.share_token)} disabled={!hasLiveLink(visibilityOf(project.visibility))} title={hasLiveLink(visibilityOf(project.visibility)) ? 'Copy share link' : 'Private: make it link only or public to get a link'} aria-label="Copy share link"
                      style={{ background: 'rgba(var(--ink-rgb), 0.05)', border: '1px solid rgba(var(--ink-rgb), 0.1)', color: 'var(--fg)', cursor: 'pointer', padding: 6, display: 'flex' }}>
                      <Copy size={12} />
                    </button>
                    <button onClick={() => removeProject(project.id)} aria-label={`Delete ${project.title}`} title="Delete" style={{ background: 'none', border: 'none', color: 'var(--fg)', cursor: 'pointer', opacity: 0.4, padding: 6 }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap', fontSize: 'max(9px, var(--mc-min-font, 0px))', fontFamily: 'var(--mono)', color: 'var(--fg-dim)' }}>
                  <select aria-label={`Who can see ${project.title}`} value={visibilityOf(project.visibility)} onChange={e => void changeVisibility(project.id, e.target.value as PortfolioVisibility)} style={{ ...fieldStyle, width: 'auto', cursor: 'pointer' }}>
                    {VISIBILITIES.map(v => <option key={v} value={v}>{VISIBILITY_LABEL[v]}</option>)}
                  </select>
                  <span>{VISIBILITY_NOTE[visibilityOf(project.visibility)]}</span>
                  {hasLiveLink(visibilityOf(project.visibility)) && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><LinkIcon size={10} /> /p/{project.share_token}</span>}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                  {project.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- the person's own cover link
                    <img src={project.cover_url} alt={`Cover of ${project.title}`} width={128} height={72} style={{ width: 128, height: 72, objectFit: 'cover', background: 'var(--media-bg)' }} />
                  ) : (
                    <div aria-hidden style={{ width: 128, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--media-bg)', color: 'var(--fg-dim)', fontFamily: 'var(--mono)', fontSize: 11 }}>No cover</div>
                  )}
                  <input type="url" aria-label={`Cover image link for ${project.title}`} placeholder="Cover image link (https://…)" value={coverForm[project.id] ?? ''} onChange={e => setCoverForm(prev => ({ ...prev, [project.id]: e.target.value }))} style={{ ...fieldStyle, flex: 1, minWidth: 200 }} />
                  <Button onClick={() => saveCover(project.id, coverForm[project.id] ?? '')} disabled={!(coverForm[project.id] ?? '').trim()}>SET COVER</Button>
                  {project.cover_url && <Button variant="outline" onClick={() => saveCover(project.id, null)}>REMOVE</Button>}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                  {project.portfolio_media.map(media => (
                    <div key={media.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, background: 'rgba(var(--ink-rgb), 0.03)', border: '1px solid rgba(var(--ink-rgb), 0.06)' }}>
                      <span style={{ fontSize: 'max(9px, var(--mc-min-font, 0px))', fontFamily: 'var(--mono)', textTransform: 'var(--caps)', color: 'var(--fg-dim)' }}>{media.media_type}</span>
                      <span style={{ flex: 1, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{media.title || media.url}</span>
                      <button onClick={() => removeMedia(project.id, media.id)} aria-label={`Remove ${media.title || 'media'}`} title="Remove" style={{ background: 'none', border: 'none', color: 'var(--fg)', cursor: 'pointer', opacity: 0.3 }}><Trash2 size={12} /></button>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <select aria-label="Media type" value={form.media_type} onChange={e => setMediaForm(prev => ({ ...prev, [project.id]: { ...form, media_type: e.target.value } }))}
                    style={{ ...fieldStyle, width: 100, cursor: 'pointer' }}>
                    <option value="youtube">YouTube</option>
                    <option value="gdrive">G Drive</option>
                    <option value="image">Image</option>
                  </select>
                  <input type="text" placeholder="Title (optional)" value={form.title} onChange={e => setMediaForm(prev => ({ ...prev, [project.id]: { ...form, title: e.target.value } }))} style={{ ...fieldStyle, flex: 1 }} />
                  <input type="url" placeholder="Media URL" value={form.url} onChange={e => setMediaForm(prev => ({ ...prev, [project.id]: { ...form, url: e.target.value } }))} style={{ ...fieldStyle, flex: 2 }} />
                  <button onClick={() => addMedia(project.id)} style={{ padding: '0 16px', background: 'rgba(232, 67, 26,0.1)', border: '1px solid var(--accent)', color: 'var(--accent)', fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)', cursor: 'pointer', whiteSpace: 'nowrap' }}>+ ADD</button>
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
