'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ExternalLink, Copy, Plus, Trash2, GripVertical, Image as ImageIcon, Film, DollarSign, Users, FileText, Type, Video } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/Confirm';
import { getProjectCrew } from '@/lib/supabase/crew-management';
import { parseScript } from '@/lib/scriptos/parser';
import { awaitOSUser } from '@/lib/os';
import {
  createPortfolioProject,
  getPortfolioBlocks,
  addPortfolioBlock,
  updatePortfolioBlock,
  deletePortfolioBlock,
  reorderPortfolioBlocks,
  type PortfolioBlock,
  type PortfolioBlockType,
} from '@/lib/supabase/portfolio';

type LibPayload = Omit<Partial<PortfolioBlock>, 'block_type'> & { block_type: PortfolioBlockType };

type LibTab = 'concept' | 'scene' | 'budget' | 'crew' | 'script' | 'custom';

const TAB_META: { id: LibTab; label: string; icon: React.ReactNode }[] = [
  { id: 'concept', label: 'Concept', icon: <ImageIcon size={13} /> },
  { id: 'scene', label: 'Scenes', icon: <Film size={13} /> },
  { id: 'budget', label: 'Budget', icon: <DollarSign size={13} /> },
  { id: 'crew', label: 'Crew', icon: <Users size={13} /> },
  { id: 'script', label: 'Script', icon: <FileText size={13} /> },
  { id: 'custom', label: 'Custom', icon: <Type size={13} /> },
];

const BLOCK_ICON: Record<PortfolioBlockType, React.ReactNode> = {
  cover: <Type size={13} />,
  concept: <ImageIcon size={13} />,
  scene: <Film size={13} />,
  budget: <DollarSign size={13} />,
  crew: <Users size={13} />,
  script: <FileText size={13} />,
  text: <Type size={13} />,
  media: <Video size={13} />,
};

export default function PitchBoardPage() {
  const params = useParams();
  const projectId = String(params.id);
  const { toast } = useToast();
  const confirm = useConfirm();

  const [userId, setUserId] = useState<string | null>(null);
  const [project, setProject] = useState<{ title: string; description: string | null; accent_color: string | null; project_type: string | null } | null>(null);
  const [portfolioId, setPortfolioId] = useState<string | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<PortfolioBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState<string | null>(null);

  const [tab, setTab] = useState<LibTab>('concept');
  const [concepts, setConcepts] = useState<{ id: string; title: string | null; image_url: string }[]>([]);
  const [scenes, setScenes] = useState<{ id: string; scene_number: number | null; title: string | null; location: string | null; time_of_day: string | null }[]>([]);
  const [budget, setBudget] = useState<{ category: string; amount: number }[]>([]);
  const [crew, setCrew] = useState<{ user_id: string; username?: string; role: string; avatar_url?: string }[]>([]);
  const [scriptScenes, setScriptScenes] = useState<{ heading: string; excerpt: string }[]>([]);

  const [customTitle, setCustomTitle] = useState('');
  const [customBody, setCustomBody] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');

  const accent = project?.accent_color || '#8b5cf6';

  const libDragRef = useRef<LibPayload | null>(null);
  const [blockDragIdx, setBlockDragIdx] = useState<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);
  const [canvasHot, setCanvasHot] = useState(false);

  // ── bootstrap ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const user = await awaitOSUser();
        if (!alive) return;
        if (!user) { setFatal('Sign in to build a pitch board.'); setLoading(false); return; }
        setUserId(user.id);

        const { data: proj, error: projErr } = await supabase
          .from('projects').select('title, description, accent_color, project_type').eq('id', projectId).single();
        if (projErr || !proj) { setFatal('Project not found.'); setLoading(false); return; }
        if (!alive) return;
        setProject(proj);

        const { data: existing } = await supabase
          .from('portfolio_projects')
          .select('id, share_token')
          .eq('source_project_id', projectId)
          .eq('user_id', user.id)
          .limit(1);

        let pid: string; let token: string;
        if (existing && existing.length > 0) {
          pid = existing[0].id; token = existing[0].share_token ?? '';
        } else {
          const created = await createPortfolioProject({
            user_id: user.id,
            title: proj.title,
            category: proj.project_type,
            source_project_id: projectId,
          });
          pid = created.id; token = created.share_token ?? '';
        }
        if (!alive) return;
        setPortfolioId(pid); setShareToken(token);

        const existingBlocks = await getPortfolioBlocks(pid);
        if (!alive) return;

        if (existingBlocks.length === 0) {

          const cover = await addPortfolioBlock({
            portfolio_project_id: pid,
            block_type: 'cover',
            position: 0,
            title: proj.title,
            body: proj.description || null,
          });
          setBlocks([cover]);
        } else {
          setBlocks(existingBlocks);
        }

        const [c, s, b, cr, scr] = await Promise.all([
          supabase.from('concept_assets').select('id, title, image_url').eq('project_id', projectId).order('created_at'),
          supabase.from('scenes').select('id, scene_number, title, location, time_of_day').eq('project_id', projectId).order('scene_number'),
          supabase.from('budget_items').select('category, amount').eq('project_id', projectId).order('created_at'),
          getProjectCrew(projectId),
          supabase.from('scripts').select('content').eq('project_id', projectId).order('updated_at', { ascending: false }).limit(1),
        ]);
        if (!alive) return;
        setConcepts((c.data as any) || []);
        setScenes((s.data as any) || []);
        setBudget(((b.data as any) || []).map((x: any) => ({ category: x.category, amount: Number(x.amount || 0) })));
        setCrew((cr || []).map((m: any) => ({ user_id: m.user_id, username: m.username, role: m.role, avatar_url: m.avatar_url })));
        const content = (scr.data as any)?.[0]?.content;
        if (content && content.trim()) {
          try {
            const parsed = parseScript(content);
            const lines = parsed.lines || [];
            setScriptScenes((parsed.scenes || []).map((sc: any) => ({
              heading: sc.heading,
              excerpt: lines.slice(sc.startIndex, sc.endIndex + 1).map((l: any) => l.text).join('\n').trim().slice(0, 1200),
            })));
          } catch {  }
        }
      } catch (e: any) {
        if (alive) setFatal(e.message || 'Failed to load the pitch board.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [projectId]);

  // ── block ops ────────────────────────────────────────────────────────────────
  const addBlock = useCallback(async (payload: LibPayload) => {
    if (!portfolioId) return;
    try {
      const created = await addPortfolioBlock({
        ...payload,
        portfolio_project_id: portfolioId,
        position: blocks.length,
      });
      setBlocks(prev => [...prev, created]);
    } catch (e: any) {
      toast(e.message || 'Could not add that block', 'error');
    }
  }, [portfolioId, blocks.length, toast]);

  const removeBlock = useCallback(async (id: string) => {
    if (!await confirm('Remove this block from the board?')) return;
    const prev = blocks;
    setBlocks(p => p.filter(b => b.id !== id));
    try {
      await deletePortfolioBlock(id);
    } catch (e: any) {
      toast(e.message || 'Could not remove block', 'error');
      setBlocks(prev);
    }
  }, [blocks, confirm, toast]);

  const saveBlockText = useCallback(async (id: string, patch: { title?: string; body?: string }) => {
    setBlocks(p => p.map(b => b.id === id ? { ...b, ...patch } : b));
    try {
      await updatePortfolioBlock(id, patch);
    } catch (e: any) {
      toast(e.message || 'Could not save edit', 'error');
    }
  }, [toast]);

  const commitReorder = useCallback(async (from: number, to: number) => {
    if (from === to) return;
    const next = [...blocks];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setBlocks(next);
    try {
      await reorderPortfolioBlocks(next.map(b => b.id));
    } catch (e: any) {
      toast(e.message || 'Could not save new order', 'error');
    }
  }, [blocks, toast]);

  // ── library → payload builders ───────────────────────────────────────────────
  const addConcept = (c: { id: string; title: string | null; image_url: string }) =>
    ({ block_type: 'concept' as const, title: c.title || 'Concept', image_url: c.image_url, source_ref_id: c.id });
  const addScene = (s: typeof scenes[number]) =>
    ({ block_type: 'scene' as const, title: `${s.scene_number ? s.scene_number + '. ' : ''}${s.title || s.location || 'Scene'}`, meta: { location: s.location, time_of_day: s.time_of_day, scene_number: s.scene_number }, source_ref_id: s.id });
  const addBudgetBlock = () => {
    const total = budget.reduce((sum, l) => sum + l.amount, 0);
    return { block_type: 'budget' as const, title: 'Budget', meta: { total, lines: budget } };
  };
  const addCrew = (m: typeof crew[number]) =>
    ({ block_type: 'crew' as const, title: m.username || 'Crew', body: m.role, image_url: m.avatar_url || null, source_ref_id: m.user_id });
  const addScriptScene = (s: { heading: string; excerpt: string }) =>
    ({ block_type: 'script' as const, title: s.heading, body: s.excerpt });

  // ── drag handlers ────────────────────────────────────────────────────────────
  const onLibDragStart = (payload: LibPayload) => { libDragRef.current = payload; };
  const onLibDragEnd = () => { libDragRef.current = null; setCanvasHot(false); };

  const onCanvasDrop = () => {
    const p = libDragRef.current;
    setCanvasHot(false);
    if (p) { addBlock(p); libDragRef.current = null; }
  };

  if (loading) {
    return <Shell><Centered>ASSEMBLING BOARD…</Centered></Shell>;
  }
  if (fatal) {
    return <Shell><Centered>{fatal}</Centered></Shell>;
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)' }}>
      <header style={{
        position: 'sticky', top: 0, zIndex: 50, height: 60,
        background: 'rgba(8,8,8,0.95)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px',
      }}>
        <Link href={`/projects/${projectId}`} style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--fg)', textDecoration: 'none' }}>
          <ArrowLeft size={18} />
          <span style={{ fontFamily: 'var(--display)', fontSize: '1.05rem', letterSpacing: 3 }}>PITCH BOARD</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--fg-dim)', letterSpacing: 1 }}>· {project?.title}</span>
        </Link>
        {shareToken && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/p/${shareToken}`); toast('Share link copied', 'success'); }}
              style={btnStyle(accent, false)}
            >
              <Copy size={12} /> Copy link
            </button>
            <Link href={`/p/${shareToken}`} target="_blank" style={{ ...btnStyle(accent, true), textDecoration: 'none' }}>
              <ExternalLink size={12} /> Preview
            </Link>
          </div>
        )}
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 340px) 1fr', gap: 0, alignItems: 'stretch', minHeight: 'calc(100vh - 60px)' }}>
        <aside style={{ borderRight: '1px solid rgba(255,255,255,0.05)', padding: 16, overflowY: 'auto' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 3, color: 'var(--fg-dim)', marginBottom: 12 }}>ASSET LIBRARY</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 16 }}>
            {TAB_META.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '6px 9px', borderRadius: 7, cursor: 'pointer',
                fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: 1, whiteSpace: 'nowrap',
                background: tab === t.id ? accent : 'rgba(255,255,255,0.04)',
                color: tab === t.id ? '#fff' : 'var(--fg-muted)',
                border: `1px solid ${tab === t.id ? accent : 'rgba(255,255,255,0.06)'}`,
              }}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>

          {tab === 'concept' && (
            <LibList empty={concepts.length === 0 ? 'No concept art in Studio yet' : undefined}>
              {concepts.map(c => (
                <Chip key={c.id} accent={accent} onAdd={() => addBlock(addConcept(c))} onDragStart={() => onLibDragStart(addConcept(c))} onDragEnd={onLibDragEnd}>
                  {c.image_url && <Image src={c.image_url} alt="" width={26} height={26} style={{ borderRadius: 5, objectFit: 'cover', flexShrink: 0 }} />}
                  <span style={chipLabel}>{c.title || 'Untitled concept'}</span>
                </Chip>
              ))}
            </LibList>
          )}

          {tab === 'scene' && (
            <LibList empty={scenes.length === 0 ? 'No scenes scheduled in Studio yet' : undefined}>
              {scenes.map(s => (
                <Chip key={s.id} accent={accent} onAdd={() => addBlock(addScene(s))} onDragStart={() => onLibDragStart(addScene(s))} onDragEnd={onLibDragEnd}>
                  <Film size={13} style={{ flexShrink: 0, opacity: 0.6 }} />
                  <span style={chipLabel}>{s.scene_number ? `${s.scene_number}. ` : ''}{s.title || s.location || 'Scene'}{s.time_of_day ? ` — ${s.time_of_day}` : ''}</span>
                </Chip>
              ))}
            </LibList>
          )}

          {tab === 'budget' && (
            <LibList empty={budget.length === 0 ? 'No budget line items yet' : undefined}>
              {budget.length > 0 && (
                <Chip accent={accent} onAdd={() => addBlock(addBudgetBlock())} onDragStart={() => onLibDragStart(addBudgetBlock())} onDragEnd={onLibDragEnd}>
                  <DollarSign size={13} style={{ flexShrink: 0, opacity: 0.6 }} />
                  <span style={chipLabel}>Budget summary — ${budget.reduce((s, l) => s + l.amount, 0).toLocaleString()} · {budget.length} line{budget.length === 1 ? '' : 's'}</span>
                </Chip>
              )}
            </LibList>
          )}

          {tab === 'crew' && (
            <LibList empty={crew.length === 0 ? 'No crew on this project yet' : undefined}>
              {crew.map(m => (
                <Chip key={m.user_id} accent={accent} onAdd={() => addBlock(addCrew(m))} onDragStart={() => onLibDragStart(addCrew(m))} onDragEnd={onLibDragEnd}>
                  <Users size={13} style={{ flexShrink: 0, opacity: 0.6 }} />
                  <span style={chipLabel}>{m.username || 'Crew'} · {m.role}</span>
                </Chip>
              ))}
            </LibList>
          )}

          {tab === 'script' && (
            <LibList empty={scriptScenes.length === 0 ? 'No script content to excerpt yet' : undefined}>
              {scriptScenes.map((s, i) => (
                <Chip key={i} accent={accent} onAdd={() => addBlock(addScriptScene(s))} onDragStart={() => onLibDragStart(addScriptScene(s))} onDragEnd={onLibDragEnd}>
                  <FileText size={13} style={{ flexShrink: 0, opacity: 0.6 }} />
                  <span style={chipLabel}>{s.heading}</span>
                </Chip>
              ))}
            </LibList>
          )}

          {tab === 'custom' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 2, color: 'var(--fg-dim)', marginBottom: 6 }}>TEXT BLOCK</div>
                <input value={customTitle} onChange={e => setCustomTitle(e.target.value)} placeholder="Heading (optional)" style={inputStyle} />
                <textarea value={customBody} onChange={e => setCustomBody(e.target.value)} placeholder="Write anything — a logline, a director's note, a pitch…" style={{ ...inputStyle, minHeight: 70, marginTop: 6, resize: 'vertical' }} />
                <button
                  disabled={!customTitle.trim() && !customBody.trim()}
                  onClick={() => { addBlock({ block_type: 'text', title: customTitle || null, body: customBody || null }); setCustomTitle(''); setCustomBody(''); }}
                  style={{ ...addAllStyle(accent), marginTop: 8, opacity: (!customTitle.trim() && !customBody.trim()) ? 0.4 : 1 }}
                >
                  <Plus size={12} /> Add text block
                </button>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 2, color: 'var(--fg-dim)', marginBottom: 6 }}>MEDIA (YOUTUBE / IMAGE URL)</div>
                <input value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} placeholder="https://youtube.com/… or image URL" style={inputStyle} />
                <button
                  disabled={!mediaUrl.trim()}
                  onClick={() => {
                    const url = mediaUrl.trim();
                    const isYt = /youtube\.com|youtu\.be/.test(url);
                    addBlock({ block_type: 'media', image_url: null, meta: { media_type: isYt ? 'youtube' : 'image', url } });
                    setMediaUrl('');
                  }}
                  style={{ ...addAllStyle(accent), marginTop: 8, opacity: mediaUrl.trim() ? 1 : 0.4 }}
                >
                  <Plus size={12} /> Add media block
                </button>
              </div>
            </div>
          )}
        </aside>

        <main
          onDragOver={e => { if (libDragRef.current) { e.preventDefault(); setCanvasHot(true); } }}
          onDragLeave={() => setCanvasHot(false)}
          onDrop={e => { e.preventDefault(); onCanvasDrop(); }}
          style={{
            padding: 24, overflowY: 'auto',
            background: canvasHot ? `${accent}0d` : 'transparent',
            transition: 'background 0.2s',
          }}
        >
          <div style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 3, color: 'var(--fg-dim)', marginBottom: 16 }}>
            THE DECK · {blocks.length} BLOCK{blocks.length === 1 ? '' : 'S'} · drag to reorder, drag from the library to add
          </div>

          {blocks.length === 0 ? (
            <div style={{ border: `1px dashed ${accent}55`, borderRadius: 14, padding: '48px 24px', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-dim)' }}>
              Drag assets from the library, or click one, to start building your pitch.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 720 }}>
              {blocks.map((b, i) => (
                <BlockCard
                  key={b.id}
                  block={b}
                  accent={accent}
                  isDragging={blockDragIdx === i}
                  isDropTarget={dropIdx === i && blockDragIdx !== null && blockDragIdx !== i}
                  onDragStart={() => setBlockDragIdx(i)}
                  onDragOver={() => { if (blockDragIdx !== null && dropIdx !== i) setDropIdx(i); }}
                  onDragEnd={() => { setBlockDragIdx(null); setDropIdx(null); }}
                  onDrop={() => { if (blockDragIdx !== null && blockDragIdx !== i) commitReorder(blockDragIdx, i); setBlockDragIdx(null); setDropIdx(null); }}
                  onRemove={() => removeBlock(b.id)}
                  onSaveText={(patch) => saveBlockText(b.id, patch)}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ── Board block card ───────────────────────────────────────────────────────────
function BlockCard({ block, accent, isDragging, isDropTarget, onDragStart, onDragOver, onDragEnd, onDrop, onRemove, onSaveText }: {
  block: PortfolioBlock;
  accent: string;
  isDragging: boolean;
  isDropTarget: boolean;
  onDragStart: () => void;
  onDragOver: () => void;
  onDragEnd: () => void;
  onDrop: () => void;
  onRemove: () => void;
  onSaveText: (patch: { title?: string; body?: string }) => void;
}) {
  const editable = block.block_type === 'cover' || block.block_type === 'text';
  const [editing, setEditing] = useState(false);
  const [t, setT] = useState(block.title || '');
  const [bd, setBd] = useState(block.body || '');

  return (
    <div
      draggable
      onDragStart={e => { onDragStart(); if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'; }}
      onDragOver={e => { e.preventDefault(); onDragOver(); }}
      onDragEnd={onDragEnd}
      onDrop={e => { e.preventDefault(); onDrop(); }}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: 12,
        background: 'rgba(12,12,12,0.85)',
        border: `1px solid ${isDropTarget ? accent : 'rgba(255,255,255,0.07)'}`,
        borderLeft: `3px solid ${accent}`,
        opacity: isDragging ? 0.4 : 1,
        transition: 'border-color 0.15s, opacity 0.15s',
      }}
    >
      <div style={{ cursor: 'grab', color: 'var(--fg-dim)', paddingTop: 2, flexShrink: 0 }} title="Drag to reorder"><GripVertical size={15} /></div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <span style={{ color: accent, display: 'flex' }}>{BLOCK_ICON[block.block_type]}</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 7.5, letterSpacing: 2, color: 'var(--fg-dim)', textTransform: 'uppercase' }}>{block.block_type}</span>
        </div>

        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <input value={t} onChange={e => setT(e.target.value)} placeholder="Heading" style={inputStyle} />
            <textarea value={bd} onChange={e => setBd(e.target.value)} placeholder="Body" style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => { onSaveText({ title: t, body: bd }); setEditing(false); }} style={addAllStyle(accent)}>Save</button>
              <button onClick={() => { setT(block.title || ''); setBd(block.body || ''); setEditing(false); }} style={{ ...btnStyle(accent, false), padding: '6px 10px' }}>Cancel</button>
            </div>
          </div>
        ) : (
          <BlockPreview block={block} />
        )}
      </div>

      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        {editable && !editing && (
          <button onClick={() => setEditing(true)} aria-label="edit" style={iconBtn}>✎</button>
        )}
        <button onClick={onRemove} aria-label="remove" style={iconBtn}><Trash2 size={13} /></button>
      </div>
    </div>
  );
}

function BlockPreview({ block }: { block: PortfolioBlock }) {
  switch (block.block_type) {
    case 'concept':
    case 'media':
      return (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {block.image_url && <Image src={block.image_url} alt="" width={56} height={40} style={{ borderRadius: 6, objectFit: 'cover' }} />}
          <div style={{ minWidth: 0 }}>
            {block.title && <div style={previewTitle}>{block.title}</div>}
            {block.meta?.url && <div style={{ ...previewBody, wordBreak: 'break-all' }}>{block.meta.url}</div>}
          </div>
        </div>
      );
    case 'budget': {
      const total = block.meta?.total ?? 0;
      const lines = block.meta?.lines || [];
      return (
        <div>
          <div style={previewTitle}>Budget — ${Number(total).toLocaleString()}</div>
          <div style={previewBody}>{lines.length} line item{lines.length === 1 ? '' : 's'}</div>
        </div>
      );
    }
    case 'crew':
      return (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {block.image_url && <Image src={block.image_url} alt="" width={32} height={32} style={{ borderRadius: '50%', objectFit: 'cover' }} />}
          <div>
            <div style={previewTitle}>{block.title}</div>
            {block.body && <div style={previewBody}>{block.body}</div>}
          </div>
        </div>
      );
    case 'script':
      return (
        <div>
          <div style={previewTitle}>{block.title}</div>
          {block.body && <div style={{ ...previewBody, whiteSpace: 'pre-wrap', maxHeight: 66, overflow: 'hidden' }}>{block.body}</div>}
        </div>
      );
    case 'scene':
      return (
        <div>
          <div style={previewTitle}>{block.title}</div>
          {(block.meta?.location || block.meta?.time_of_day) && (
            <div style={previewBody}>{[block.meta?.location, block.meta?.time_of_day].filter(Boolean).join(' · ')}</div>
          )}
        </div>
      );
    default:
      return (
        <div>
          {block.title && <div style={previewTitle}>{block.title}</div>}
          {block.body && <div style={previewBody}>{block.body}</div>}
          {!block.title && !block.body && <div style={{ ...previewBody, opacity: 0.5 }}>Empty — click ✎ to edit</div>}
        </div>
      );
  }
}

// ── small pieces / styles ─────────────────────────────────────────────────────
function Shell({ children }: { children: React.ReactNode }) {
  return <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)' }}>{children}</div>;
}
function Centered({ children }: { children: React.ReactNode }) {
  return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 3, color: 'var(--fg-dim)' }}>{children}</div>;
}
function LibList({ children, empty }: { children?: React.ReactNode; empty?: string }) {
  if (empty) return <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--fg-dim)', opacity: 0.6, padding: '8px 0' }}>{empty}</div>;
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</div>;
}
function Chip({ children, accent, onAdd, onDragStart, onDragEnd }: { children: React.ReactNode; accent: string; onAdd: () => void; onDragStart: () => void; onDragEnd: () => void }) {
  return (
    <div
      draggable
      onDragStart={e => { onDragStart(); if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy'; }}
      onDragEnd={onDragEnd}
      onClick={onAdd}
      title="Drag onto the board, or click to add"
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '7px 9px', borderRadius: 8, cursor: 'grab',
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
        transition: 'border-color 0.15s, background 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = `${accent}66`; e.currentTarget.style.background = `${accent}0f`; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
    >
      {children}
      <Plus size={13} style={{ marginLeft: 'auto', flexShrink: 0, color: accent }} />
    </div>
  );
}

const chipLabel: React.CSSProperties = { fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--fg-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 };
const previewTitle: React.CSSProperties = { fontFamily: 'var(--sans, var(--serif))', fontSize: 12.5, color: 'var(--fg)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const previewBody: React.CSSProperties = { fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--fg-muted)', marginTop: 3 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '7px 9px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 11, boxSizing: 'border-box', outline: 'none', borderRadius: 6 };
const iconBtn: React.CSSProperties = { background: 'none', border: 'none', color: 'var(--fg-dim)', cursor: 'pointer', fontSize: 13, lineHeight: 1, display: 'flex', alignItems: 'center', padding: 3, opacity: 0.6 };

function btnStyle(accent: string, filled: boolean): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, cursor: 'pointer',
    fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: 1,
    background: filled ? accent : 'rgba(255,255,255,0.05)',
    color: filled ? '#fff' : 'var(--fg)',
    border: `1px solid ${filled ? accent : 'rgba(255,255,255,0.1)'}`,
  };
}
function addAllStyle(accent: string): React.CSSProperties {
  return { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '8px 10px', borderRadius: 7, cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: 1, background: `${accent}22`, color: accent, border: `1px solid ${accent}55` };
}
