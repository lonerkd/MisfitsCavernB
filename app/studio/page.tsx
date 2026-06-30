'use client';

import React, { useState } from 'react';
import { ArrowLeft, FolderOpen, Image, Video, FileText, Music, Upload, Plus } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import GrainOverlay from '@/components/GrainOverlay';
import AnimatedSection from '@/components/AnimatedSection';
import SectionLabel from '@/components/SectionLabel';
import { supabase } from '@/lib/supabase/client';
import { getUserProjects } from '@/lib/supabase/projects';
import { getAllStudioAssets } from '@/lib/supabase/studio';
import { parseScript } from '@/lib/scriptos/parser';
import { useEffect, useMemo } from 'react';
import { useProject } from '@/lib/context/ProjectContext';
import { LayoutGrid, ClipboardList, BookOpen, Layers, Archive, CheckCircle2, Maximize2, Filter, Grid, List as ListIcon, Info, DollarSign, Calendar, MessageSquare, Clock, MapPin, Download, Megaphone, Share2, Eye, TrendingUp, Users } from 'lucide-react';

interface Asset {
  id: string;
  name: string;
  type: 'image' | 'video' | 'document' | 'audio' | 'color';
  category: string;
  size: string;
  dateAdded: string;
  url?: string;
}

const CONCEPT_IMAGES = [
  { id: 'c1', url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80', title: 'Neon Noir Aesthetic', aspect: 'tall' },
  { id: 'c2', url: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80', title: 'Cinematic Framing', aspect: 'wide' },
  { id: 'c3', url: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&q=80', title: 'Low Key Lighting', aspect: 'square' },
  { id: 'c4', url: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&q=80', title: 'Urban Gritty Texture', aspect: 'tall' },
  { id: 'c5', url: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&q=80', title: 'Vintage Lens Flare', aspect: 'wide' },
  { id: 'c6', url: 'https://images.unsplash.com/photo-1505685296765-3a2736de412f?auto=format&fit=crop&q=80', title: 'Dramatic Shadows', aspect: 'square' },
];

const STAGES = [
  { id: 'dev', name: 'Development', color: '#ffaa00', icon: BookOpen },
  { id: 'pre', name: 'Pre-Production', color: '#0099ff', icon: ClipboardList },
  { id: 'prod', name: 'Production', color: '#ff3c00', icon: Video },
  { id: 'post', name: 'Post-Production', color: '#a855f7', icon: Layers },
  { id: 'del', name: 'Delivery', color: '#00cc66', icon: CheckCircle2 },
];

const TYPE_ICONS: Record<string, React.ReactNode> = {
  image: <Image size={15} />,
  video: <Video size={15} />,
  document: <FileText size={15} />,
  audio: <Music size={15} />,
};

const TYPE_COLORS: Record<string, string> = {
  image: '#0099ff',
  video: '#ff3c00',
  document: '#ffaa00',
  audio: '#00cc66',
};

function AssetCard({ asset, index, onClick }: { asset: Asset; index: number; onClick?: (asset: Asset) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.06, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4, borderColor: `${TYPE_COLORS[asset.type]}44` } as any}
      onClick={() => onClick && onClick(asset)}
      style={{
        padding: '22px 20px',
        background: 'var(--bg-2)',
        border: '1px solid var(--border)',
        cursor: 'pointer',
        transition: 'border-color 0.4s, box-shadow 0.4s',
        borderRadius: 'var(--radius-sm)',
        position: 'relative',
        overflow: 'hidden'
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 12px 40px rgba(0,0,0,0.7), 0 0 30px ${TYPE_COLORS[asset.type]}0a`)}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: TYPE_COLORS[asset.type] }}>{TYPE_ICONS[asset.type]}</span>
          <span style={{ fontSize: 8, letterSpacing: 3, textTransform: 'uppercase', color: TYPE_COLORS[asset.type], fontFamily: 'var(--mono)', opacity: 0.85 }}>
            {asset.category}
          </span>
        </div>
        {asset.type === 'video' && (
           <span style={{ fontSize: 9, background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: 4, color: '#ccc' }}>3 Notes</span>
        )}
      </div>

      <div style={{ fontFamily: 'var(--mono)', fontSize: 12, lineHeight: 1.4, marginBottom: 10, color: 'var(--fg)' }}>
        {asset.name}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--fg-subtle)' }}>
        <span>{asset.size}</span>
        <span>{new Date(asset.dateAdded).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
      </div>
    </motion.div>
  );
}

// Frame.io style Asset Review Modal
function AssetReviewModal({ asset, isOpen, onClose }: { asset: Asset | null; isOpen: boolean; onClose: () => void }) {
  if (!asset || !isOpen) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, zIndex: 2000, background: '#050505', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0a0a0a' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
             <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}><ArrowLeft size={16} /></button>
             <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: '#fff' }}>{asset.name} <span style={{ color: '#666', marginLeft: 8 }}>V2</span></div>
             <div style={{ fontSize: 9, padding: '2px 8px', background: 'rgba(0,204,102,0.1)', color: '#00cc66', borderRadius: 4, textTransform: 'uppercase' }}>Approved</div>
           </div>
           <div style={{ display: 'flex', gap: 12 }}>
             <button className="link-btn"><Download size={12} /> Download</button>
             <button className="link-btn" style={{ background: 'var(--accent)', color: 'var(--bg)' }}>Share Link</button>
           </div>
        </div>

        {/* Content Area */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Main Viewer */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, background: '#000', position: 'relative' }}>
             {asset.type === 'video' ? (
               <div style={{ width: '100%', maxWidth: 1000, aspectRatio: '16/9', background: '#111', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                 <Video size={48} color="#333" style={{ marginBottom: 16 }} />
                 <div style={{ color: '#666', fontFamily: 'var(--mono)', fontSize: 10 }}>VIDEO PLAYER MOCKUP</div>
               </div>
             ) : asset.url ? (
               // eslint-disable-next-line @next/next/no-img-element
               <img src={asset.url} alt={asset.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8 }} />
             ) : (
               <div style={{ width: '100%', maxWidth: 1000, aspectRatio: '16/9', background: '#111', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontFamily: 'var(--mono)', fontSize: 10 }}>
                 NO PREVIEW
               </div>
             )}
          </div>

          {/* Comments Sidebar (Frame.io style) */}
          <div style={{ width: 340, background: '#0a0a0a', borderLeft: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Review & Feedback</div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
              {[
                { time: '00:12:04', user: 'Director', text: 'Color grade looks a bit too magenta here. Let\'s pull it back toward teal.' },
                { time: '00:15:22', user: 'Client', text: 'Can we cut this shot earlier? The pacing drags.' },
                { time: 'Global', user: 'Sound Mixer', text: 'Stems are uploaded, ready for final layback.' }
              ].map((comment, i) => (
                <div key={i} style={{ display: 'flex', gap: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{comment.user.charAt(0)}</div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#fff' }}>{comment.user}</span>
                      <span style={{ fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--accent)', background: 'rgba(255,60,0,0.1)', padding: '2px 6px', borderRadius: 4 }}>{comment.time}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--fg-muted)', lineHeight: 1.4 }}>{comment.text}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ padding: 20, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
               <textarea placeholder="Leave a comment at current timecode..." style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: 12, color: '#fff', fontSize: 12, resize: 'none', height: 80, marginBottom: 12 }} />
               <button style={{ width: '100%', padding: 10, background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, cursor: 'pointer' }}>Send Feedback</button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Get the user's studio board (creating a default one if none exists yet).
async function getOrCreateBoard(userId: string, projectId?: string): Promise<string | null> {
  const { data: existing } = await supabase
    .from('studio_boards').select('id').eq('user_id', userId).limit(1).maybeSingle();
  if (existing?.id) return existing.id;
  const { data: created, error } = await supabase
    .from('studio_boards')
    .insert({ user_id: userId, name: projectId || 'Studio', description: 'Concept board' })
    .select('id').single();
  if (error) return null;
  return created.id;
}

function IntakeModal({ isOpen, onClose, userId, projectId, onCreated }: {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  projectId?: string;
  onCreated: (asset: { id: string; title: string; asset_type: string; asset_url: string; created_at: string }) => void;
}) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [type, setType] = useState('image');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => { setTitle(''); setUrl(''); setType('image'); setError(null); };
  const close = () => { reset(); onClose(); };

  const submit = async () => {
    setError(null);
    if (!userId) { setError('You must be signed in.'); return; }
    if (!url.trim()) { setError('Paste an asset URL.'); return; }
    setSaving(true);
    try {
      const boardId = await getOrCreateBoard(userId, projectId);
      if (!boardId) throw new Error('Could not create a board.');
      const { data, error: insErr } = await supabase
        .from('studio_assets')
        .insert({ board_id: boardId, user_id: userId, title: title || 'Untitled', asset_url: url.trim(), asset_type: type })
        .select('id,title,asset_type,asset_url,created_at')
        .single();
      if (insErr) throw insErr;
      onCreated(data as any);
      close();
    } catch (e: any) {
      setError(e.message || 'Failed to add asset.');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = { width: '100%', background: '#0a0a0a', border: '1px solid #333', color: '#fff', padding: 10, borderRadius: 6, fontSize: 12, outline: 'none' };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={close}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            style={{ width: 500, background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 32 }}
          >
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Digital Intake</h2>
            <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 24 }}>Add a reference, frame, or asset to the studio board by URL.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 9, textTransform: 'uppercase', color: '#666', marginBottom: 6, display: 'block' }}>Title</label>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Opening shot reference" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 9, textTransform: 'uppercase', color: '#666', marginBottom: 6, display: 'block' }}>Asset URL</label>
                <input value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} placeholder="https://…" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 9, textTransform: 'uppercase', color: '#666', marginBottom: 6, display: 'block' }}>Type</label>
                <select value={type} onChange={e => setType(e.target.value)} style={inputStyle}>
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                  <option value="document">Document</option>
                  <option value="audio">Audio</option>
                  <option value="color">Color</option>
                </select>
              </div>

              {error && <div style={{ color: '#ff5555', fontSize: 11, fontFamily: 'var(--mono)' }}>⚠ {error}</div>}

              <button onClick={submit} disabled={saving} style={{ marginTop: 8, padding: 14, background: 'var(--accent)', color: 'var(--bg)', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Adding…' : 'Add to Studio'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ProjectCard({ project, index }: { project: any; index: number }) {
  return (
    <AnimatedSection delay={index * 0.1}>
      <motion.div
        whileHover={{ borderColor: `${project.statusColor}33` } as any}
        style={{
          padding: 32,
          background: 'var(--bg-2)',
          border: '1px solid var(--border)',
          transition: 'border-color 0.4s, box-shadow 0.4s',
          borderRadius: 'var(--radius-sm)',
          position: 'relative',
          overflow: 'hidden',
        }}
        onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 20px 60px rgba(0,0,0,0.8)`)}
        onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
      >
        {/* Ghost title */}
        <div style={{
          position: 'absolute',
          top: -10,
          right: -8,
          fontFamily: 'var(--display)',
          fontSize: 'clamp(3rem, 8vw, 6rem)',
          lineHeight: 1,
          color: 'rgba(255,255,255,0.025)',
          letterSpacing: -2,
          userSelect: 'none',
          pointerEvents: 'none',
        }}>
          {project.title.split(' ')[0].toUpperCase()}
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <span style={{ fontSize: 8, letterSpacing: 3, textTransform: 'uppercase', color: project.statusColor, fontFamily: 'var(--mono)' }}>
                {project.type}
              </span>
              <h3 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', letterSpacing: 2, marginTop: 6 }}>
                {project.title}
              </h3>
            </div>
            <span style={{
              fontSize: 8,
              letterSpacing: 2,
              padding: '5px 12px',
              border: `1px solid ${project.statusColor}55`,
              color: project.statusColor,
              textTransform: 'uppercase',
              fontFamily: 'var(--mono)',
              borderRadius: 'var(--radius-sm)',
              flexShrink: 0,
            }}>
              {project.status}
            </span>
          </div>

          <p style={{ fontFamily: 'var(--serif)', fontSize: '0.92rem', color: 'var(--fg-muted)', marginBottom: 20 }}>
            {project.description}
          </p>

          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--fg-subtle)', marginBottom: 6 }}>
              <span>Completion</span>
              <span style={{ color: project.statusColor }}>{project.completion}%</span>
            </div>
            <div style={{ height: 2, background: '#1a1a1a', overflow: 'hidden', borderRadius: 1 }}>
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${project.completion}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
                style={{ height: '100%', background: project.statusColor, borderRadius: 1 }}
              />
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatedSection>
  );
}

function StageIndicator({ currentStage }: { currentStage: string }) {
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 40 }}>
      {STAGES.map((stage, i) => {
        const isActive = stage.name.toLowerCase() === currentStage.toLowerCase() || stage.id === currentStage;
        const Icon = stage.icon;
        return (
          <div key={stage.id} style={{ flex: 1, position: 'relative' }}>
            <div style={{ 
              height: 4, 
              background: isActive ? stage.color : 'rgba(255,255,255,0.05)', 
              borderRadius: 2,
              marginBottom: 12,
              transition: 'all 0.5s'
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: isActive ? 1 : 0.2, transition: 'opacity 0.5s' }}>
              <Icon size={14} color={stage.color} />
              <span style={{ fontSize: 9, fontFamily: 'var(--mono)', letterSpacing: 2, textTransform: 'uppercase', color: stage.color }}>{stage.name}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function StudioPage() {
  const { activeProject, setActiveProject, projects } = useProject();
  const [activeTab, setActiveTab] = useState<'overview' | 'concept' | 'production' | 'assets' | 'marketing' | 'pitch'>('overview');
  const [filter, setFilter] = useState<string>('all');
  const [user, setUser] = useState<any>(null);
  const [assetsList, setAssetsList] = useState<Asset[]>([]);
  const [showIntake, setShowIntake] = useState(false);
  const [selectedConcept, setSelectedConcept] = useState<any>(null);
  const [reviewAsset, setReviewAsset] = useState<Asset | null>(null);

  const tabs = [
    { id: 'overview', name: 'Overview', icon: LayoutGrid },
    { id: 'concept', name: 'Concept', icon: Image },
    { id: 'production', name: 'Production', icon: Video },
    { id: 'assets', name: 'Library', icon: Archive },
    { id: 'marketing', name: 'Promos', icon: Megaphone },
    { id: 'pitch', name: 'Pitch', icon: Maximize2 },
  ];

  const types = ['all', 'image', 'video', 'document', 'audio'];

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUser(user);
      
      getAllStudioAssets(user.id).then(data => {
        setAssetsList((data || []).map(a => ({
          id: a.id,
          name: a.title || 'Untitled',
          type: (a.asset_type as any) || 'document',
          category: 'Studio',
          size: '—',
          dateAdded: new Date(a.created_at).toISOString().split('T')[0],
          url: (a as any).asset_url,
        })));
      }).catch(console.error);
    });
  }, []);

  const filtered = filter === 'all' ? assetsList : assetsList.filter(a => a.type === filter);

  return (
    <main style={{ background: 'var(--bg)', color: 'var(--fg)', minHeight: '100vh' }}>
      <GrainOverlay />

      {/* Nav */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, width: '100%',
        padding: '0 28px', height: 62,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        zIndex: 100,
        background: 'rgba(6,6,6,0.92)',
        backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        boxShadow: '0 1px 0 rgba(99,102,241,0.08) inset',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div style={{ fontFamily: 'var(--display)', fontSize: '0.9rem', letterSpacing: 6, color: 'var(--fg)', opacity: 0.7, transition: 'opacity 0.2s' }}
              onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => (e.currentTarget.style.opacity = '0.7')}
            >MC</div>
          </Link>
          <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 3, color: '#6366f1', textTransform: 'uppercase' }}>Studio</div>

          {/* Project Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.03)', padding: '4px 12px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: 8, fontFamily: 'var(--mono)', color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Project:</span>
            <select 
              value={activeProject?.id || ''} 
              onChange={(e) => {
                const p = projects.find(p => p.id === e.target.value);
                if (p) setActiveProject(p);
              }}
              style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 11, fontWeight: 600, outline: 'none', cursor: 'pointer' }}
            >
              {projects.map(p => <option key={p.id} value={p.id} style={{ background: '#111' }}>{p.title}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="link-btn" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setShowIntake(true)}>
            <Upload size={11} /> Intake
          </button>
        </div>
      </nav>

      <IntakeModal
        isOpen={showIntake}
        onClose={() => setShowIntake(false)}
        userId={user?.id ?? null}
        projectId={activeProject?.id}
        onCreated={(a) => setAssetsList(prev => [{
          id: a.id,
          name: a.title || 'Untitled',
          type: (a.asset_type as any) || 'image',
          category: 'Studio',
          size: '—',
          dateAdded: new Date(a.created_at).toISOString().split('T')[0],
          url: (a as any).asset_url,
        }, ...prev])}
      />
      <AssetReviewModal asset={reviewAsset} isOpen={!!reviewAsset} onClose={() => setReviewAsset(null)} />

      {/* TABS BAR */}
      <div style={{
        position: 'fixed', top: 62, left: 0, width: '100%',
        height: 52, background: 'rgba(6,6,6,0.88)',
        backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.04)',
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        zIndex: 90,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 2,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 9999, padding: '4px 6px',
        }}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  position: 'relative',
                  height: 32, padding: '0 16px',
                  background: 'transparent', border: 'none', borderRadius: 9999,
                  display: 'flex', alignItems: 'center', gap: 6,
                  color: isActive ? 'var(--fg)' : 'var(--fg-dim)',
                  cursor: 'pointer', transition: 'color 0.25s',
                  fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: 2,
                  textTransform: 'uppercase',
                }}
                whileHover={{ color: 'var(--fg-muted)' } as any}
              >
                {isActive && (
                  <motion.div
                    layoutId="studio-tab-pill"
                    style={{
                      position: 'absolute', inset: 0, borderRadius: 9999,
                      background: 'rgba(99,102,241,0.14)',
                      border: '1px solid rgba(99,102,241,0.2)',
                      zIndex: -1,
                    }}
                    transition={{ type: 'spring', stiffness: 500, damping: 36 }}
                  />
                )}
                <Icon size={11} color={isActive ? '#6366f1' : undefined} />
                {tab.name}
              </motion.button>
            );
          })}
        </div>
      </div>

      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '160px 20px 80px' }}>
        
        {activeTab === 'overview' && activeProject && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 60 }}>
            <div>
              <StageIndicator currentStage={activeProject.status} />
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <SectionLabel text="Project Summary" />
                <h1 style={{ fontFamily: 'var(--display)', fontSize: '4rem', letterSpacing: 4, lineHeight: 1.1, marginBottom: 24 }}>{activeProject.title}</h1>
                <p style={{ fontFamily: 'var(--serif)', fontSize: '1.2rem', color: 'var(--fg-muted)', lineHeight: 1.6, maxWidth: 600 }}>
                  {activeProject.description || "No project description provided. Update your script metadata to populate this field."}
                </p>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginTop: 60 }}>
                  <div>
                    <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--fg-subtle)', textTransform: 'uppercase', marginBottom: 12 }}>Production Stats</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 8 }}>
                        <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>Status</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#ffaa00' }}>{activeProject.status}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 8 }}>
                        <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>Completion</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>85%</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--fg-subtle)', textTransform: 'uppercase', marginBottom: 12 }}>Active Leads</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#ff3c00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>JD</div>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#0099ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>SK</div>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>+4</div>
                    </div>
                  </div>
                </div>

                {/* Real Production Budget Module */}
                <div style={{ marginTop: 60, padding: 32, background: 'linear-gradient(to right, rgba(255,255,255,0.02), transparent)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
                      <DollarSign size={16} color="var(--accent)" /> Production Budget
                    </div>
                    <span style={{ fontSize: 10, fontFamily: 'var(--mono)', background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: 20 }}>USD</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--fg-subtle)', textTransform: 'uppercase', marginBottom: 4 }}>Total Estimated Budget</div>
                      <div style={{ fontSize: '2.5rem', fontFamily: 'var(--display)', color: '#fff', letterSpacing: 2 }}>$1.25M</div>
                      <div style={{ width: '100%', height: 4, background: '#333', borderRadius: 2, marginTop: 12, overflow: 'hidden', display: 'flex' }}>
                         <div style={{ width: '30%', background: '#ffaa00' }} title="Above the Line" />
                         <div style={{ width: '50%', background: '#0099ff' }} title="Below the Line" />
                         <div style={{ width: '20%', background: '#00cc66' }} title="Post Production" />
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'var(--mono)' }}>
                         <span style={{ color: '#ffaa00' }}>Above the Line</span>
                         <span>$375,000</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'var(--mono)' }}>
                         <span style={{ color: '#0099ff' }}>Below the Line</span>
                         <span>$625,000</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'var(--mono)' }}>
                         <span style={{ color: '#00cc66' }}>Post-Production</span>
                         <span>$250,000</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Project Milestone Timeline */}
                <div style={{ marginTop: 40 }}>
                   <SectionLabel text="Project Milestones" />
                   <div style={{ position: 'relative', paddingLeft: 24, borderLeft: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: 24 }}>
                      {[
                        { label: 'Script Finalized', date: 'April 10', completed: true },
                        { label: 'Casting Call', date: 'April 20', completed: true },
                        { label: 'Principle Photography', date: 'May 15', completed: false },
                        { label: 'VFX & Post', date: 'June 30', completed: false },
                        { label: 'World Premiere', date: 'August 12', completed: false },
                      ].map((m, i) => (
                        <div key={i} style={{ position: 'relative' }}>
                           <div style={{ position: 'absolute', left: -28, top: 4, width: 8, height: 8, borderRadius: '50%', background: m.completed ? 'var(--accent)' : '#222', border: m.completed ? 'none' : '1px solid #444' }} />
                           <div style={{ fontSize: 12, fontWeight: 700, color: m.completed ? '#fff' : '#666' }}>{m.label}</div>
                           <div style={{ fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--fg-subtle)' }}>{m.date}</div>
                        </div>
                      ))}
                   </div>
                </div>
              </motion.div>
            </div>
            
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 32 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <ClipboardList size={16} /> Recent Activity
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {[
                  { user: 'JD', action: 'uploaded 12 raw files', time: '2h ago' },
                  { user: 'SK', action: 'updated Scene 14 in ScriptOS', time: '5h ago' },
                  { user: 'JD', action: 'tagged moodboard references', time: '1d ago' },
                ].map((act, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700 }}>{act.user}</div>
                    <div>
                      <div style={{ fontSize: 11, color: '#eee' }}><span style={{ fontWeight: 700 }}>{act.user}</span> {act.action}</div>
                      <div style={{ fontSize: 9, color: 'var(--fg-subtle)' }}>{act.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'concept' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
              <div>
                <SectionLabel text="Visual Research" />
                <h2 style={{ fontFamily: 'var(--display)', fontSize: '2.5rem', letterSpacing: 2 }}>Concept Board</h2>
              </div>
              <button className="link-btn" onClick={() => setShowIntake(true)}>+ New Ref</button>
            </div>
            {(() => {
              const refs = assetsList.filter(a => a.type === 'image' || a.type === 'color');
              if (refs.length === 0) {
                return (
                  <div style={{ padding: '64px 0', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 12 }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-dim)', letterSpacing: 2, marginBottom: 14 }}>NO VISUAL REFERENCES YET</div>
                    <button className="link-btn" onClick={() => setShowIntake(true)}>+ Add your first reference</button>
                  </div>
                );
              }
              return (
                <div style={{ columnCount: 3, columnGap: 16 }}>
                  {refs.map((ref) => (
                    <div key={ref.id} style={{ breakInside: 'avoid', marginBottom: 16, borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', background: '#0d0d0d' }}>
                      {ref.type === 'color' ? (
                        <div style={{ height: 140, background: ref.url || '#222' }} />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={ref.url} alt={ref.name} style={{ width: '100%', display: 'block' }} loading="lazy" />
                      )}
                      <div style={{ padding: '10px 12px', fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--fg-muted)', letterSpacing: 1 }}>{ref.name}</div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </motion.div>
        )}

        {activeTab === 'production' && (
          activeProject ? (
            <ProductionSuite projectId={activeProject.id} userId={user?.id ?? null} />
          ) : (
            <div style={{ padding: '64px 0', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-dim)', letterSpacing: 2 }}>
              SELECT A PROJECT TO PLAN PRODUCTION
            </div>
          )
        )}

        {activeTab === 'assets' && (
          <AnimatedSection>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
              <div>
                <SectionLabel text="Asset Library" />
                <h2 style={{ fontFamily: 'var(--display)', fontSize: '2.5rem', letterSpacing: 2 }}>Digital Assets</h2>
              </div>
            </div>

            {/* Filter tabs */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 28, flexWrap: 'wrap' }}>
              {types.map(t => (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  style={{
                    padding: '7px 16px',
                    background: filter === t ? 'var(--accent)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${filter === t ? 'var(--accent)' : 'rgba(255,255,255,0.06)'}`,
                    color: filter === t ? 'var(--bg)' : 'var(--fg-muted)',
                    fontFamily: 'var(--mono)',
                    fontSize: 9,
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                    borderRadius: 'var(--radius-full)',
                    transition: 'all 0.3s',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
              {filtered.map((asset, i) => <AssetCard key={asset.id} asset={asset} index={i} onClick={setReviewAsset} />)}
            </div>
          </AnimatedSection>
        )}

        {activeTab === 'pitch' && activeProject && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
              <div>
                <SectionLabel text="Investor Relations" />
                <h2 style={{ fontFamily: 'var(--display)', fontSize: '2.5rem', letterSpacing: 2 }}>Pitch Deck Mode</h2>
              </div>
              <button className="link-btn" style={{ background: 'var(--accent)', color: 'var(--bg)' }}>Enter Presentation View</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
              <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: 32, aspectRatio: '4/3', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
                <SectionLabel text="Slide 01" />
                <h3 style={{ fontFamily: 'var(--display)', fontSize: '2rem', letterSpacing: 4, margin: '20px 0' }}>{activeProject.title}</h3>
                <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--accent)', textTransform: 'uppercase' }}>Logline & Title</div>
              </div>
              <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: 32, aspectRatio: '4/3', overflow: 'hidden', position: 'relative' }}>
                <img src={CONCEPT_IMAGES[0].url} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.3 }} />
                <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
                  <SectionLabel text="Slide 02" />
                  <h3 style={{ fontFamily: 'var(--display)', fontSize: '2rem', letterSpacing: 4, margin: '20px 0' }}>THE VISUAL WORLD</h3>
                  <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--accent)', textTransform: 'uppercase' }}>Cinematography & Mood</div>
                </div>
              </div>
              <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: 32, aspectRatio: '4/3', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
                <SectionLabel text="Slide 03" />
                <h3 style={{ fontFamily: 'var(--display)', fontSize: '2rem', letterSpacing: 4, margin: '20px 0' }}>THE CHARACTERS</h3>
                <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--accent)', textTransform: 'uppercase' }}>Casting & Archetypes</div>
              </div>
            </div>
            
            <div style={{ marginTop: 40, padding: 24, background: 'rgba(255,60,0,0.05)', border: '1px solid rgba(255,60,0,0.1)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 16 }}>
              <Info size={20} color="var(--accent)" />
              <div style={{ fontSize: 12, color: '#ccc' }}>
                <span style={{ fontWeight: 700, color: 'var(--accent)' }}>Pro Tip:</span> This deck is automatically generated using your Concept Board and ScriptOS Character Bible. Update them to see changes here.
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'marketing' && (
          activeProject ? (
            <CampaignPlanner projectId={activeProject.id} />
          ) : (
            <div style={{ padding: '64px 0', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-dim)', letterSpacing: 2 }}>
              SELECT A PROJECT TO PLAN MARKETING
            </div>
          )
        )}
      </section>
    </main>
  );
}

// ─── Production Suite (script-driven breakdown · stripboard · call sheets) ────

interface PSceneElements { props: string[]; wardrobe: string[]; vehicles: string[]; sfx: string[]; vfx: string[] }
interface PScene { key: string; num: number; intExt: string; heading: string; location: string; time: string; characters: string[]; eighths: number; elements: PSceneElements }
const EMPTY_ELEMENTS: PSceneElements = { props: [], wardrobe: [], vehicles: [], sfx: [], vfx: [] };
interface SchedRow { id: string; scene_number: string; shoot_day_id: string | null }
interface PShootDay { id: string; day_number: number; shoot_date: string | null }
interface PCrew { id: string; role: string; profiles?: { username: string } | null }

const INTEXT_COLOR: Record<string, string> = { INT: '#0099ff', EXT: '#f59e0b', 'INT/EXT': '#a855f7' };

function intExtOf(heading: string): string {
  const m = heading.trim().match(/^(INT\.?\/EXT\.?|INT\.?|EXT\.?)/i);
  if (!m) return '';
  const v = m[1].toUpperCase().replace(/\./g, '');
  return v === 'INT/EXT' ? 'INT/EXT' : v;
}

function ProductionSuite({ projectId, userId }: { projectId: string; userId: string | null }) {
  const [scriptId, setScriptId] = useState<string | null>(null);
  const [scriptTitle, setScriptTitle] = useState<string | null>(null);
  const [scenes, setScenes] = useState<PScene[]>([]);
  const [castList, setCastList] = useState<string[]>([]);
  const [sched, setSched] = useState<Record<string, SchedRow>>({});
  const [days, setDays] = useState<PShootDay[]>([]);
  const [crew, setCrew] = useState<PCrew[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [openSheet, setOpenSheet] = useState<string | null>(null);
  const [expandedScene, setExpandedScene] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSchedule = React.useCallback(async () => {
    const { data } = await supabase.from('scene_schedule').select('id,scene_number,shoot_day_id').eq('project_id', projectId);
    const map: Record<string, SchedRow> = {};
    (data || []).forEach((r: any) => { map[r.scene_number] = r; });
    setSched(map);
  }, [projectId]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const { data: scripts } = await supabase.from('scripts').select('id,title,content,updated_at').eq('project_id', projectId).order('updated_at', { ascending: false });
      const chosen = (scripts || []).find((s: any) => s.content && s.content.trim().length > 0) || (scripts || [])[0];
      if (chosen) {
        setScriptId(chosen.id); setScriptTitle(chosen.title);
        if (chosen.content) {
          const parsed = parseScript(chosen.content);
          setScenes(parsed.scenes.filter((s: any) => !s.omitted).map((s: any, i: number) => ({
            key: String(i + 1), num: i + 1, intExt: intExtOf(s.heading),
            heading: s.heading, location: s.location || '—', time: s.timeOfDay || '', characters: s.characters || [],
            eighths: s.eighths || 1, elements: s.elements || EMPTY_ELEMENTS,
          })));
          setCastList((parsed.characters || []).map((c: any) => c.name).filter(Boolean));
        } else { setScenes([]); setCastList([]); }
      } else { setScriptId(null); setScriptTitle(null); setScenes([]); setCastList([]); }

      const [sd, cr] = await Promise.all([
        supabase.from('shoot_days').select('id,day_number,shoot_date').eq('project_id', projectId).order('day_number'),
        supabase.from('project_crew').select('id,role,profiles!project_crew_user_id_fkey(username)').eq('project_id', projectId),
      ]);
      setDays((sd.data as PShootDay[]) || []);
      setCrew((cr.data as unknown as PCrew[]) || []);
      await loadSchedule();
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }, [projectId, loadSchedule]);

  useEffect(() => { load(); }, [load]);

  const addDay = async () => {
    const { data, error } = await supabase.from('shoot_days').insert({ project_id: projectId, day_number: days.length + 1, shoot_date: null }).select('id,day_number,shoot_date').single();
    if (error) return setErr(error.message);
    setDays(p => [...p, data as PShootDay]);
  };
  const setDayDate = async (id: string, date: string) => {
    setDays(p => p.map(d => d.id === id ? { ...d, shoot_date: date || null } : d));
    await supabase.from('shoot_days').update({ shoot_date: date || null }).eq('id', id);
  };
  const delDay = async (id: string) => {
    setDays(p => p.filter(d => d.id !== id));
    setSched(p => { const n = { ...p }; Object.keys(n).forEach(k => { if (n[k].shoot_day_id === id) delete n[k]; }); return n; });
    await supabase.from('shoot_days').delete().eq('id', id);
  };

  const assign = async (sc: PScene, dayId: string) => {
    const existing = sched[sc.key];
    if (!dayId) {
      if (existing) { setSched(p => { const n = { ...p }; delete n[sc.key]; return n; }); await supabase.from('scene_schedule').delete().eq('id', existing.id); }
      return;
    }
    if (existing) {
      setSched(p => ({ ...p, [sc.key]: { ...existing, shoot_day_id: dayId } }));
      await supabase.from('scene_schedule').update({ shoot_day_id: dayId }).eq('id', existing.id);
    } else {
      const { data, error } = await supabase.from('scene_schedule').insert({ project_id: projectId, script_id: scriptId, scene_number: sc.key, scene_heading: sc.heading, location: sc.location, shoot_day_id: dayId, order_index: sc.num }).select('id,scene_number,shoot_day_id').single();
      if (error) return setErr(error.message);
      setSched(p => ({ ...p, [sc.key]: data as SchedRow }));
    }
  };

  const [crewName, setCrewName] = useState(''); const [crewRole, setCrewRole] = useState('');
  const addCrew = async () => {
    if (!crewName.trim()) return;
    const { data: prof, error: pErr } = await supabase.from('profiles').select('id').eq('username', crewName.trim()).single();
    if (pErr || !prof) { setErr(`No user "${crewName}"`); return; }
    const { error } = await supabase.from('project_crew').insert({ project_id: projectId, user_id: prof.id, role: crewRole || 'team member' });
    if (error) return setErr(error.message);
    setCrewName(''); setCrewRole(''); setErr(null); load();
  };
  const delCrew = async (id: string) => { setCrew(p => p.filter(x => x.id !== id)); await supabase.from('project_crew').delete().eq('id', id); };

  const scenesForDay = (dayId: string) => scenes.filter(s => sched[s.key]?.shoot_day_id === dayId);
  const scheduledCount = scenes.filter(s => sched[s.key]?.shoot_day_id).length;
  const totalPages = (scenes.reduce((t, s) => t + s.eighths, 0) / 8);
  const input: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '7px 9px', color: '#fff', fontFamily: 'var(--mono)', fontSize: 11, outline: 'none' };
  const stat = (label: string, value: React.ReactNode) => (
    <div><div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{value}</div><div style={{ fontFamily: 'var(--mono)', fontSize: 7.5, letterSpacing: 2, color: 'var(--fg-dim)', textTransform: 'uppercase', marginTop: 4 }}>{label}</div></div>
  );

  if (loading) return <div style={{ padding: '64px 0', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-dim)', letterSpacing: 2 }}>LOADING BREAKDOWN…</div>;

  if (!scriptId || scenes.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div style={{ marginBottom: 24 }}><SectionLabel text="Pre-Production" /><h2 style={{ fontFamily: 'var(--display)', fontSize: '2.5rem', letterSpacing: 2 }}>Production Suite</h2></div>
        <div style={{ padding: '64px 0', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 12 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-dim)', letterSpacing: 2, marginBottom: 14 }}>
            {scriptId ? 'THIS SCRIPT HAS NO SCENES YET' : 'NO SCREENPLAY FOR THIS PROJECT'}
          </div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--fg-dim)', opacity: 0.7, marginBottom: 18 }}>
            The shooting breakdown is generated from your screenplay. Write scenes (INT./EXT. headings) in ScriptOS and they appear here automatically.
          </div>
          <Link href="/editor" className="link-btn">Open ScriptOS →</Link>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div><SectionLabel text="Pre-Production" /><h2 style={{ fontFamily: 'var(--display)', fontSize: '2.5rem', letterSpacing: 2 }}>Production Suite</h2>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--fg-dim)', letterSpacing: 1, marginTop: 4 }}>Broken down from “{scriptTitle}”</div>
        </div>
        <div style={{ display: 'flex', gap: 28 }}>{stat('Scenes', scenes.length)}{stat('Pages', totalPages.toFixed(1))}{stat('Scheduled', `${scheduledCount}/${scenes.length}`)}{stat('Cast', castList.length)}{stat('Days', days.length)}</div>
      </div>
      {err && <div style={{ color: '#ff5555', fontFamily: 'var(--mono)', fontSize: 11, marginBottom: 16 }}>⚠ {err}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 32 }}>
        {/* Scene breakdown from the screenplay */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--fg-muted)' }}><BookOpen size={16} /> Scene Breakdown <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--fg-dim)', fontWeight: 400 }}>· auto from script</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {scenes.map(sc => {
              const dayId = sched[sc.key]?.shoot_day_id || '';
              const c = INTEXT_COLOR[sc.intExt] || '#6b7280';
              const el = sc.elements;
              const elCount = el.props.length + el.wardrobe.length + el.vehicles.length + el.sfx.length + el.vfx.length;
              const expanded = expandedScene === sc.key;
              return (
                <div key={sc.key} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderLeft: `3px solid ${dayId ? c : 'transparent'}`, borderRadius: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px' }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--fg-dim)', width: 18, flexShrink: 0 }}>{sc.num}</span>
                    {sc.intExt && <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: c, background: `${c}1e`, padding: '2px 5px', borderRadius: 3, flexShrink: 0 }}>{sc.intExt}</span>}
                    <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setExpandedScene(expanded ? null : sc.key)}>
                      <div style={{ fontSize: 11.5, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sc.location}{sc.time ? <span style={{ color: 'var(--fg-dim)' }}> · {sc.time}</span> : null}</div>
                      {sc.characters.length > 0 && <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--fg-dim)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sc.characters.join(' · ')}{elCount > 0 ? <span style={{ color: '#6366f1' }}> · {elCount} elements</span> : null}</div>}
                    </div>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 8.5, color: 'var(--fg-dim)', flexShrink: 0 }} title="page eighths">{sc.eighths}/8</span>
                    <select value={dayId} onChange={e => assign(sc, e.target.value)} style={{ ...input, fontSize: 9, padding: '4px 6px', flexShrink: 0 }}>
                      <option value="">Unscheduled</option>
                      {days.map(d => <option key={d.id} value={d.id}>Day {d.day_number}</option>)}
                    </select>
                  </div>
                  {expanded && elCount > 0 && (
                    <div style={{ padding: '0 12px 10px 48px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {([['Props', el.props, '#f59e0b'], ['Wardrobe', el.wardrobe, '#ec4899'], ['Vehicles', el.vehicles, '#0099ff'], ['SFX', el.sfx, '#10b981'], ['VFX', el.vfx, '#a855f7']] as [string, string[], string][]).map(([label, items, col]) => items.length > 0 && (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 7.5, color: col, letterSpacing: 1, textTransform: 'uppercase' }}>{label}</span>
                          {items.map(it => <span key={it} style={{ fontFamily: 'var(--mono)', fontSize: 8.5, color: '#ddd', background: `${col}1a`, border: `1px solid ${col}33`, padding: '1px 6px', borderRadius: 99 }}>{it.toLowerCase()}</span>)}
                        </div>
                      ))}
                    </div>
                  )}
                  {expanded && elCount === 0 && <div style={{ padding: '0 12px 10px 48px', fontFamily: 'var(--mono)', fontSize: 8.5, color: 'var(--fg-dim)', opacity: 0.6 }}>No tagged elements in this scene.</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Stripboard + cast + crew */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--fg-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Calendar size={16} /> Shooting Schedule</span>
              <button onClick={addDay} style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', color: '#f59e0b', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 10 }}>+ Day</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {days.map(d => {
                const dayScenes = scenesForDay(d.id);
                const locations = Array.from(new Set(dayScenes.map(s => s.location)));
                const cast = Array.from(new Set(dayScenes.flatMap(s => s.characters)));
                const open = openSheet === d.id;
                return (
                  <div key={d.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 8 }}>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, color: '#f59e0b' }}>DAY {d.day_number}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input type="date" value={d.shoot_date || ''} onChange={e => setDayDate(d.id, e.target.value)} style={{ ...input, fontSize: 9, padding: '4px 6px' }} />
                        <button onClick={() => delDay(d.id)} aria-label="delete day" style={{ background: 'none', border: 'none', color: 'var(--fg-dim)', cursor: 'pointer', fontSize: 14, opacity: 0.5 }}>×</button>
                      </div>
                    </div>
                    {dayScenes.length === 0 ? (
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--fg-dim)', opacity: 0.5 }}>Assign scenes from the breakdown →</div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
                          {dayScenes.map(s => {
                            const c = INTEXT_COLOR[s.intExt] || '#6b7280';
                            return (<div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                              <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: c }}>{s.intExt || '—'}</span>
                              <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.location}</span>
                              {s.time && <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--fg-dim)' }}>{s.time}</span>}
                            </div>);
                          })}
                        </div>
                        <div style={{ display: 'flex', gap: 14, fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--fg-dim)', marginBottom: 8 }}>
                          <span>{dayScenes.length} sc</span><span>{locations.length} loc</span><span>{cast.length} cast</span>
                          <span style={{ color: '#f59e0b' }}>{(dayScenes.reduce((t, s) => t + s.eighths, 0) / 8).toFixed(1)} pg</span>
                        </div>
                        <button onClick={() => setOpenSheet(open ? null : d.id)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--fg-muted)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 9, fontFamily: 'var(--mono)', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 6 }}><FileText size={11} /> {open ? 'HIDE' : 'CALL SHEET'}</button>
                        {open && (
                          <div style={{ marginTop: 10, padding: 12, background: 'rgba(0,0,0,0.3)', borderRadius: 8, fontFamily: 'var(--mono)', fontSize: 10, lineHeight: 1.7 }}>
                            <div style={{ color: '#f59e0b', fontWeight: 700, marginBottom: 6 }}>CALL SHEET — DAY {d.day_number}{d.shoot_date ? ` · ${new Date(d.shoot_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}` : ''}</div>
                            <div style={{ color: 'var(--fg-dim)' }}>SCENES</div>
                            {dayScenes.map(s => <div key={s.key} style={{ color: '#ddd' }}>· {s.intExt} {s.location}{s.time ? ` — ${s.time}` : ''}</div>)}
                            <div style={{ color: 'var(--fg-dim)', marginTop: 6 }}>LOCATIONS</div><div style={{ color: '#ddd' }}>{locations.join(', ') || '—'}</div>
                            <div style={{ color: 'var(--fg-dim)', marginTop: 6 }}>CAST</div><div style={{ color: '#ddd' }}>{cast.join(', ') || '—'}</div>
                            <div style={{ color: 'var(--fg-dim)', marginTop: 6 }}>CREW</div><div style={{ color: '#ddd' }}>{crew.map(c => `${c.profiles?.username || '—'} (${c.role})`).join(', ') || '—'}</div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
              {days.length === 0 && <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--fg-dim)', opacity: 0.6 }}>Add a shoot day, then assign scenes to it.</div>}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--fg-muted)' }}><Users size={16} /> Cast <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--fg-dim)', fontWeight: 400 }}>· from script</span></div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {castList.map(name => <span key={name} style={{ fontFamily: 'var(--mono)', fontSize: 9.5, padding: '4px 9px', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc', borderRadius: 99 }}>{name}</span>)}
              {castList.length === 0 && <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--fg-dim)', opacity: 0.6 }}>No characters detected in the script.</span>}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--fg-muted)' }}><Users size={16} /> Crew</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {crew.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 11px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8 }}>
                  <span style={{ flex: 1, fontSize: 11 }}>{c.profiles?.username || 'Unknown'}</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--fg-dim)' }}>{c.role}</span>
                  <button onClick={() => delCrew(c.id)} aria-label="delete" style={{ background: 'none', border: 'none', color: 'var(--fg-dim)', cursor: 'pointer', fontSize: 13, opacity: 0.5 }}>×</button>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 6 }}>
                <input value={crewName} onChange={e => setCrewName(e.target.value)} placeholder="Username" style={{ ...input, flex: 1 }} />
                <input value={crewRole} onChange={e => setCrewRole(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCrew()} placeholder="Role" style={{ ...input, flex: 1 }} />
                <button onClick={addCrew} style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)', color: '#818cf8', borderRadius: 6, padding: '0 14px', cursor: 'pointer', fontSize: 16 }}>+</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}


// ─── Campaign Planner (live: marketing_campaigns) ─────────────────────────────

const PLATFORMS: Record<string, string> = {
  Instagram: '#E1306C', 'X / Twitter': '#1d9bf0', YouTube: '#FF0000',
  TikTok: '#69C9D0', Festival: '#a855f7', Press: '#f59e0b', Other: '#6b7280',
};
const CAMPAIGN_STATUSES = ['Drafting', 'Scheduled', 'Live', 'Done'];

interface Campaign { id: string; title: string; platform: string; status: string; reach_estimate: string | null; accent_color: string | null }

function CampaignPlanner({ projectId }: { projectId: string }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [platform, setPlatform] = useState('Instagram');
  const [status, setStatus] = useState('Drafting');
  const [reach, setReach] = useState('');

  const load = React.useCallback(async () => {
    const { data, error } = await supabase.from('marketing_campaigns')
      .select('id,title,platform,status,reach_estimate,accent_color').eq('project_id', projectId).order('created_at', { ascending: false });
    if (error) setErr(error.message); else setCampaigns((data as Campaign[]) || []);
  }, [projectId]);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!title.trim()) return;
    const { data, error } = await supabase.from('marketing_campaigns')
      .insert({ project_id: projectId, title, platform, status, reach_estimate: reach || null, accent_color: PLATFORMS[platform] || '#6b7280' })
      .select('id,title,platform,status,reach_estimate,accent_color').single();
    if (error) return setErr(error.message);
    setCampaigns(p => [data as Campaign, ...p]); setTitle(''); setReach('');
  };
  const cycleStatus = async (c: Campaign) => {
    const next = CAMPAIGN_STATUSES[(CAMPAIGN_STATUSES.indexOf(c.status) + 1) % CAMPAIGN_STATUSES.length];
    setCampaigns(p => p.map(x => x.id === c.id ? { ...x, status: next } : x));
    await supabase.from('marketing_campaigns').update({ status: next }).eq('id', c.id);
  };
  const del = async (id: string) => { setCampaigns(p => p.filter(x => x.id !== id)); await supabase.from('marketing_campaigns').delete().eq('id', id); };

  const byStatus = CAMPAIGN_STATUSES.map(s => ({ s, n: campaigns.filter(c => c.status === s).length }));
  const input: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '8px 10px', color: '#fff', fontFamily: 'var(--mono)', fontSize: 11, outline: 'none' };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div style={{ marginBottom: 32 }}>
        <SectionLabel text="Delivery & Promotion" />
        <h2 style={{ fontFamily: 'var(--display)', fontSize: '2.5rem', letterSpacing: 2 }}>Marketing Hub</h2>
      </div>
      {err && <div style={{ color: '#ff5555', fontFamily: 'var(--mono)', fontSize: 11, marginBottom: 16 }}>⚠ {err}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 40 }}>
        {/* Campaigns */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {campaigns.map(c => {
            const color = c.accent_color || PLATFORMS[c.platform] || '#6b7280';
            return (
              <div key={c.id} style={{ padding: 20, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 9, fontFamily: 'var(--mono)', padding: '2px 6px', background: `${color}22`, color, borderRadius: 4, textTransform: 'uppercase' }}>{c.platform}</span>
                    <button onClick={() => cycleStatus(c)} style={{ fontSize: 10, color: 'var(--fg-subtle)', background: 'none', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 4, padding: '1px 8px', cursor: 'pointer' }}>{c.status}</button>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{c.title}</div>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 14 }}>
                  {c.reach_estimate && <div><div style={{ fontSize: 9, color: 'var(--fg-subtle)', marginBottom: 4 }}>Reach</div><div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4 }}><TrendingUp size={12} /> {c.reach_estimate}</div></div>}
                  <button onClick={() => del(c.id)} aria-label="delete" style={{ background: 'none', border: 'none', color: 'var(--fg-dim)', cursor: 'pointer', fontSize: 16, opacity: 0.5 }}>×</button>
                </div>
              </div>
            );
          })}
          {campaigns.length === 0 && (
            <div style={{ padding: 32, border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 12, textAlign: 'center', color: '#666', fontSize: 12 }}>
              <Megaphone size={24} style={{ marginBottom: 12, opacity: 0.5, margin: '0 auto' }} />
              No campaigns yet — plan your promotion below.
            </div>
          )}

          {/* New campaign form */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12 }}>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Campaign title" style={{ ...input, flex: '1 1 100%' }} />
            <select value={platform} onChange={e => setPlatform(e.target.value)} style={{ ...input, flex: 1 }}>{Object.keys(PLATFORMS).map(p => <option key={p} value={p}>{p}</option>)}</select>
            <select value={status} onChange={e => setStatus(e.target.value)} style={{ ...input, flex: 1 }}>{CAMPAIGN_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select>
            <input value={reach} onChange={e => setReach(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} placeholder="Reach est." style={{ ...input, width: 110 }} />
            <button onClick={add} style={{ background: 'var(--accent)', color: 'var(--bg)', border: 'none', borderRadius: 6, padding: '0 16px', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>Add</button>
          </div>
        </div>

        {/* Real status breakdown */}
        <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 24, alignSelf: 'flex-start' }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}><Eye size={16} /> Campaign Pipeline</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {byStatus.map(({ s, n }) => {
              const pct = campaigns.length ? Math.round((n / campaigns.length) * 100) : 0;
              return (
                <div key={s}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 8 }}><span>{s}</span><span>{n}</span></div>
                  <div style={{ height: 4, background: '#222', borderRadius: 2 }}><div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)', borderRadius: 2, transition: 'width 0.4s' }} /></div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 28, paddingTop: 18, borderTop: '1px solid rgba(255,255,255,0.06)', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--fg-dim)' }}>
            {campaigns.length} total campaign{campaigns.length === 1 ? '' : 's'} across {new Set(campaigns.map(c => c.platform)).size} platform{new Set(campaigns.map(c => c.platform)).size === 1 ? '' : 's'}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
