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
import { notify } from '@/lib/supabase/notifications';
import { useToast } from '@/components/Toast';
import { useEscapeKey } from '@/lib/useEscapeKey';
import { useEffect, useMemo } from 'react';
import { useProject } from '@/lib/context/ProjectContext';
import { saveScript } from '@/lib/scriptos/storage';
import { parseScript } from '@/lib/scriptos/parser';
import { getActivities, subscribeToActivities, type Activity } from '@/lib/supabase/activity';
import { getAllStudioAssets, getStudioBoards, getProjectBoards, createStudioBoard, getStudioAssets, deleteStudioAsset, addStudioAsset, getProjectBeats, createProjectBeat, deleteProjectBeat, uploadStudioFile } from '@/lib/supabase/studio';
import { searchProfiles, inviteToCrew, getProjectCrew } from '@/lib/supabase/profiles';
import { LayoutGrid, ClipboardList, BookOpen, Layers, Archive, CheckCircle2, Maximize2, Filter, Grid, List as ListIcon, Info, DollarSign, Calendar, MessageSquare, Clock, MapPin, Download, Megaphone, Share2, Eye, TrendingUp, Users, Trash2, Search, AlertCircle, ChevronLeft, ChevronRight, X } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import { useRequireAuth } from '@/lib/useRequireAuth';

interface Asset {
  id: string;
  name: string;
  type: 'image' | 'video' | 'document' | 'audio';
  category: string;
  size: string;
  dateAdded: string;
  url?: string;
}


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
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [copied, setCopied] = useState(false);
  useEscapeKey(onClose, isOpen);
  useEffect(() => {
    if (!asset?.id || !isOpen) { setComments([]); return; }
    supabase.from('asset_comments').select('id,content,timecode,created_at,profiles(username)').eq('asset_id', asset.id).order('created_at').then(({ data }) => setComments(data || []));
  }, [asset?.id, isOpen]);
  const sendComment = async () => {
    const t = commentText.trim();
    if (!t || !asset?.id) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('asset_comments').insert({ asset_id: asset.id, user_id: user.id, content: t, timecode: 'Global' }).select('id,content,timecode,created_at').single();
    if (data) setComments(p => [...p, { ...data, profiles: { username: 'You' } }]);
    // Notify the asset owner of the new review comment.
    const ownerId = (asset as any).created_by;
    if (ownerId) {
      notify(ownerId, {
        type: 'comment',
        title: `New comment · ${(asset as any).title || 'asset'}`,
        body: t.length > 80 ? t.slice(0, 80) + '…' : t,
        link: '/studio',
      }, user.id);
    }
    setCommentText('');
  };
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
             <button className="link-btn" onClick={() => { if (asset.url) window.open(asset.url, '_blank'); }} disabled={!asset.url}><Download size={12} /> Download</button>
             <button className="link-btn" style={{ background: copied ? '#10b981' : 'var(--accent)', color: 'var(--bg)' }} disabled={!asset.url} onClick={() => { if (asset.url) { navigator.clipboard?.writeText(asset.url); setCopied(true); setTimeout(() => setCopied(false), 1800); } }}>{copied ? '✓ Copied' : 'Share Link'}</button>
           </div>
        </div>

        {/* Content Area */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Main Viewer */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, background: '#000', position: 'relative' }}>
             {asset.type === 'video' && asset.url ? (
               <video src={asset.url} controls style={{ width: '100%', maxWidth: 1000, maxHeight: '100%', borderRadius: 8, background: '#000' }} />
             ) : asset.type === 'audio' && asset.url ? (
               <div style={{ width: '100%', maxWidth: 600, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                 <Music size={48} color="#555" />
                 <audio src={asset.url} controls style={{ width: '100%' }} />
               </div>
             ) : asset.url ? (
               <img src={asset.url} alt={asset.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8 }} />
             ) : (
               <div style={{ color: '#666', fontFamily: 'var(--mono)', fontSize: 10 }}>No preview available</div>
             )}
          </div>

          {/* Comments Sidebar (Frame.io style) */}
          <div style={{ width: 340, background: '#0a0a0a', borderLeft: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Review & Feedback</div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
              {comments.length === 0 && <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--fg-dim)' }}>No feedback yet — leave the first note.</div>}
              {comments.map((comment) => {
                const u = comment.profiles?.username || 'User';
                return (
                <div key={comment.id} style={{ display: 'flex', gap: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{u.charAt(0).toUpperCase()}</div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#fff' }}>{u}</span>
                      {comment.timecode && <span style={{ fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--accent)', background: 'rgba(255,60,0,0.1)', padding: '2px 6px', borderRadius: 4 }}>{comment.timecode}</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--fg-muted)', lineHeight: 1.4 }}>{comment.content}</div>
                  </div>
                </div>
                );
              })}
            </div>

            <div style={{ padding: 20, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
               <textarea value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Leave a comment…" style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: 12, color: '#fff', fontSize: 12, resize: 'none', height: 80, marginBottom: 12 }} />
               <button onClick={sendComment} disabled={!commentText.trim()} style={{ width: '100%', padding: 10, background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, cursor: commentText.trim() ? 'pointer' : 'default', opacity: commentText.trim() ? 1 : 0.6 }}>Send Feedback</button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function IntakeModal({ isOpen, onClose, boardId, userId, onSuccess }: { isOpen: boolean; onClose: () => void; boardId: string; userId: string; onSuccess: () => void }) {
  useEscapeKey(onClose, isOpen);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState('Reference');
  const [type, setType] = useState('image');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if ((!url && !file) || !boardId || !userId) {
      setError('Add a file or a link before submitting');
      return;
    }
    setLoading(true);
    setError('');
    try {
      let finalUrl = url;

      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${userId}/${fileName}`;
        finalUrl = await uploadStudioFile(filePath, file);
      }

      await addStudioAsset({
        board_id: boardId,
        user_id: userId,
        title: title || (file ? file.name : 'Untitled Asset'),
        asset_url: finalUrl,
        asset_type: type,
        category: category
      });
      onSuccess();
      onClose();
      // Reset form
      setTitle('');
      setUrl('');
      setFile(null);
    } catch (err) {
      console.error('Error adding asset:', err);
      setError('Upload failed — try again');
    } finally {
      setLoading(false);
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
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            style={{ width: 500, background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 32 }}
          >
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Digital Intake</h2>
            <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 24 }}>
              File storage isn't connected yet — link to a file already hosted elsewhere (Drive, YouTube, etc.) to track it here.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 9, textTransform: 'uppercase', color: '#666', marginBottom: 6, display: 'block' }}>Title</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Asset Title"
                  style={{ width: '100%', background: '#0a0a0a', border: '1px solid #333', color: '#fff', padding: 10, borderRadius: 6, fontSize: 12 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 9, textTransform: 'uppercase', color: '#666', marginBottom: 6, display: 'block' }}>Upload File</label>
                <div
                  onClick={() => document.getElementById('studio-file-input')?.click()}
                  style={{
                    width: '100%',
                    background: '#0a0a0a',
                    border: '1px dashed #333',
                    color: '#fff',
                    padding: 20,
                    borderRadius: 6,
                    fontSize: 12,
                    textAlign: 'center',
                    cursor: 'pointer'
                  }}
                >
                  {file ? file.name : 'Click to select or drop file'}
                  <input
                    id="studio-file-input"
                    type="file"
                    onChange={e => {
                      if (e.target.files?.[0]) {
                        setFile(e.target.files[0]);
                        // Auto-detect type
                        const f = e.target.files[0];
                        if (f.type.includes('image')) setType('image');
                        else if (f.type.includes('video')) setType('video');
                        else if (f.type.includes('audio')) setType('audio');
                        else setType('document');
                      }
                    }}
                    style={{ display: 'none' }}
                  />
                </div>
              </div>

              <div style={{ textAlign: 'center', fontSize: 10, color: '#444' }}>— OR —</div>

              <div>
                <label style={{ fontSize: 9, textTransform: 'uppercase', color: '#666', marginBottom: 6, display: 'block' }}>External URL</label>
                <input
                  value={url}
                  onChange={e => {
                    setUrl(e.target.value);
                    if (e.target.value) setFile(null);
                  }}
                  placeholder="https://..."
                  style={{ width: '100%', background: '#0a0a0a', border: '1px solid #333', color: '#fff', padding: 10, borderRadius: 6, fontSize: 12 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 9, textTransform: 'uppercase', color: '#666', marginBottom: 6, display: 'block' }}>Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    style={{ width: '100%', background: '#0a0a0a', border: '1px solid #333', color: '#fff', padding: 10, borderRadius: 6, fontSize: 12 }}
                  >
                    <option>Raw Footage</option>
                    <option>Reference</option>
                    <option>Production Doc</option>
                    <option>Asset</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 9, textTransform: 'uppercase', color: '#666', marginBottom: 6, display: 'block' }}>Type</label>
                   <select
                    value={type}
                    onChange={e => setType(e.target.value)}
                    style={{ width: '100%', background: '#0a0a0a', border: '1px solid #333', color: '#fff', padding: 10, borderRadius: 6, fontSize: 12 }}
                   >
                    <option value="video">Video</option>
                    <option value="image">Image</option>
                    <option value="document">PDF / Doc</option>
                    <option value="audio">Audio</option>
                  </select>
                </div>
              </div>

              {error && <div style={{ fontSize: 11, color: '#ef4444' }}>{error}</div>}

              <button
                onClick={handleSubmit}
                disabled={loading || (!url && !file)}
                style={{ marginTop: 12, padding: 14, background: loading ? '#333' : 'var(--accent)', color: 'var(--bg)', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, cursor: loading ? 'not-allowed' : 'pointer' }}
              >
                {loading ? 'Processing...' : 'Complete Intake'}
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

// Pinterest-style full-screen pin viewer with keyboard navigation.
function ConceptLightbox({ images, index, onIndex, onClose, onSetBoard, boards = [] }: { images: any[]; index: number; onIndex: (i: number) => void; onClose: () => void; onSetBoard?: (id: string, board: string | null) => void; boards?: string[] }) {
  const img = images[index];
  const [boardInput, setBoardInput] = useState('');
  useEffect(() => { setBoardInput(img?.board || ''); }, [img?.id, img?.board]);
  const go = (d: number) => onIndex((index + d + images.length) % images.length);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }); // eslint-disable-line react-hooks/exhaustive-deps
  if (!img) return null;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 40, height: 40, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
      {images.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); go(-1); }} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 44, height: 44, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={22} /></button>
          <button onClick={(e) => { e.stopPropagation(); go(1); }} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 44, height: 44, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronRight size={22} /></button>
        </>
      )}
      <motion.div key={img.id} initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '88vh', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <img src={img.image_url} alt={img.title || ''} style={{ maxWidth: '90vw', maxHeight: '78vh', objectFit: 'contain', borderRadius: 10, boxShadow: '0 30px 90px rgba(0,0,0,0.7)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontFamily: 'var(--mono)', fontSize: 11, color: 'rgba(240,236,228,0.7)', flexWrap: 'wrap', justifyContent: 'center' }}>
          <span>{img.title || 'Untitled'}</span>
          <span style={{ color: 'rgba(240,236,228,0.3)' }}>·</span>
          <span style={{ color: 'rgba(240,236,228,0.4)' }}>{index + 1} / {images.length}</span>
          <a href={img.image_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: '#6366f1', textDecoration: 'none' }}>open original ↗</a>
          {onSetBoard && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={(e) => e.stopPropagation()}>
              <span style={{ color: 'rgba(240,236,228,0.3)' }}>·</span>
              <input
                list="mc-lightbox-boards"
                value={boardInput}
                placeholder="board…"
                onChange={(e) => setBoardInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') onSetBoard(img.id, boardInput.trim() || null); }}
                onBlur={() => { if ((boardInput.trim() || null) !== (img.board || null)) onSetBoard(img.id, boardInput.trim() || null); }}
                style={{ width: 130, padding: '4px 8px', background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.4)', borderRadius: 6, color: '#c084fc', fontFamily: 'var(--mono)', fontSize: 10, outline: 'none' }}
              />
              <datalist id="mc-lightbox-boards">{boards.map(b => <option key={b} value={b} />)}</datalist>
            </span>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function ConceptCard({ image, index, onRemove, sceneCount = 0, onOpen, board }: { image: { id: string; url: string; title?: string }; index: number; onRemove?: () => void; sceneCount?: number; onOpen?: () => void; board?: string | null }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        marginBottom: 16,
        breakInside: 'avoid',
        position: 'relative',
        borderRadius: 8,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.05)',
        background: '#0a0a0a'
      }}
    >
      <img src={image.url} alt={image.title} onClick={onOpen} style={{ width: '100%', height: 'auto', display: 'block', opacity: isHovered ? 1 : 0.8, transition: 'opacity 0.3s', cursor: onOpen ? 'zoom-in' : 'default' }} />

      {sceneCount > 0 && (
        <div style={{ position: 'absolute', top: 8, left: 8, fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 1, color: '#fff', background: 'rgba(99,102,241,0.85)', padding: '2px 7px', borderRadius: 99 }}>
          {sceneCount} {sceneCount === 1 ? 'scene' : 'scenes'}
        </div>
      )}
      {board && (
        <div style={{ position: 'absolute', top: 8, right: 8, fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 1, color: '#c084fc', background: 'rgba(168,85,247,0.2)', border: '1px solid rgba(168,85,247,0.4)', padding: '2px 7px', borderRadius: 99, backdropFilter: 'blur(4px)' }}>
          {board}
        </div>
      )}

      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(transparent 60%, rgba(0,0,0,0.8))',
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              alignItems: 'flex-end'
            }}
          >
            {onRemove && (
              <button
                onClick={onRemove}
                style={{ background: 'rgba(255,0,0,0.2)', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ff4444' }}
              >
                <Trash2 size={14} />
              </button>
            )}
            <div style={{ width: '100%' }}>
              <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: '#fff', letterSpacing: 1, display: 'block' }}>{image.title || 'Untitled'}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Live pitch deck: title + logline, real concept images, and the character
// bible — auto-built from the project's data, with a presentation view.
function ProjectPitchDeck({ project, concepts, beats }: { project: any; concepts: any[]; beats: any[] }) {
  const [characters, setCharacters] = useState<string[]>([]);
  const [present, setPresent] = useState(false);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: scripts } = await supabase.from('scripts').select('id,content').eq('project_id', project.id).order('updated_at', { ascending: false });
      const withContent = (scripts || []).find((s: any) => s.content && s.content.trim().length > 0) || (scripts || [])[0];
      if (!withContent) return;
      const { data: saved } = await supabase.from('script_characters').select('name,full_name').eq('script_id', withContent.id);
      let names = (saved || []).map((r: any) => r.full_name || r.name);
      if (names.length === 0 && withContent.content) {
        try { names = parseScript(withContent.content).characters.map((c: any) => c.name).filter(Boolean); } catch { /* ignore */ }
      }
      setCharacters(names.slice(0, 12));
    })();
  }, [project.id]);

  const visual = concepts[0]?.image_url;
  const esc = (s: any) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));
  const printDeck = () => {
    const w = window.open('', '_blank', 'width=900,height=1100');
    if (!w) return;
    const imgs = concepts.slice(0, 6).map((c: any) => `<img src="${esc(c.image_url)}" style="width:31%;height:120px;object-fit:cover;border-radius:6px;margin:0 1% 8px 0"/>`).join('');
    w.document.write(`<!doctype html><html><head><title>${esc(project.title)} — Pitch</title>
      <style>body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#111;margin:48px;line-height:1.5}
      .slide{page-break-inside:avoid;margin-bottom:36px}h1{font-size:34px;letter-spacing:2px;margin:0 0 8px}
      .logline{font-size:16px;color:#444;max-width:640px}h2{font-size:11px;letter-spacing:3px;color:#b45309;border-bottom:1px solid #ddd;padding-bottom:4px;margin:28px 0 12px}
      .chip{display:inline-block;font-size:12px;padding:4px 10px;background:#eef;border:1px solid #ccd;border-radius:99px;margin:0 6px 6px 0}</style></head><body>
      <div class="slide"><h1>${esc(project.title).toUpperCase()}</h1><div class="logline">${esc(project.description || '')}</div></div>
      <div class="slide"><h2>THE VISUAL WORLD</h2>${imgs || '<div style="color:#999">No concept references yet.</div>'}</div>
      <div class="slide"><h2>THE CHARACTERS</h2>${characters.length ? characters.map(c => `<span class="chip">${esc(c)}</span>`).join('') : '<div style="color:#999">No characters yet.</div>'}</div>
      <div class="slide"><h2>STORY ENGINE</h2>${beats.length ? beats.slice(0, 6).map((b: any) => `<div>• ${esc(b.title)}</div>`).join('') : '<div style="color:#999">No story beats yet.</div>'}</div>
      <script>window.onload=()=>window.print()</script></body></html>`);
    w.document.close();
  };
  const slides = [
    { label: 'Logline & Title', bg: undefined as string | undefined, render: (big: boolean) => (
      <>
        <h3 style={{ fontFamily: 'var(--display)', fontSize: big ? '5rem' : '2rem', letterSpacing: 4, margin: '16px 0' }}>{project.title}</h3>
        <p style={{ fontFamily: 'var(--serif)', fontSize: big ? '1.4rem' : '0.85rem', color: 'var(--fg-muted)', maxWidth: 640, margin: '0 auto', lineHeight: 1.6 }}>{project.description || 'Add a logline in the project summary.'}</p>
      </>
    ) },
    { label: 'The Visual World', bg: visual, render: (big: boolean) => (
      <>
        <h3 style={{ fontFamily: 'var(--display)', fontSize: big ? '4rem' : '2rem', letterSpacing: 4, margin: '16px 0' }}>THE VISUAL WORLD</h3>
        <div style={{ fontSize: big ? 14 : 10, fontFamily: 'var(--mono)', color: 'var(--accent)', textTransform: 'uppercase' }}>{concepts.length > 0 ? `${concepts.length} concept references` : 'Add references in the Concept board'}</div>
      </>
    ) },
    { label: 'The Characters', bg: undefined, render: (big: boolean) => (
      <>
        <h3 style={{ fontFamily: 'var(--display)', fontSize: big ? '4rem' : '1.6rem', letterSpacing: 4, margin: '14px 0' }}>THE CHARACTERS</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 720, margin: '0 auto' }}>
          {characters.length > 0 ? characters.map(c => <span key={c} style={{ fontFamily: 'var(--mono)', fontSize: big ? 14 : 9.5, padding: big ? '6px 14px' : '4px 9px', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc', borderRadius: 99 }}>{c}</span>) : <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--fg-dim)' }}>Develop the Character Bible to populate the cast.</span>}
        </div>
      </>
    ) },
    { label: 'Story Engine', bg: undefined, render: (big: boolean) => (
      <>
        <h3 style={{ fontFamily: 'var(--display)', fontSize: big ? '4rem' : '1.6rem', letterSpacing: 4, margin: '14px 0' }}>STORY ENGINE</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 600, margin: '0 auto' }}>
          {beats.length > 0 ? beats.slice(0, 5).map((b: any) => <div key={b.id} style={{ fontFamily: 'var(--mono)', fontSize: big ? 13 : 10, color: '#ddd' }}>{b.title}</div>) : <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--fg-dim)' }}>Add story beats in the Concept tab.</span>}
        </div>
      </>
    ) },
  ];

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
        <div>
          <SectionLabel text="Investor Relations" />
          <h2 style={{ fontFamily: 'var(--display)', fontSize: '2.5rem', letterSpacing: 2 }}>Pitch Deck</h2>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="link-btn" onClick={printDeck}>⎙ Export PDF</button>
          <button className="link-btn" style={{ background: 'var(--accent)', color: 'var(--bg)' }} onClick={() => { setIdx(0); setPresent(true); }}>Enter Presentation View</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
        {slides.map((s, i) => (
          <div key={i} style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: 32, aspectRatio: '4/3', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
            {s.bg && (<><img src={s.bg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.3 }} /><div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} /></>)}
            <div style={{ position: 'relative', zIndex: 1 }}>
              <SectionLabel text={`Slide 0${i + 1}`} />
              {s.render(false)}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 40, padding: 24, background: 'rgba(255,60,0,0.05)', border: '1px solid rgba(255,60,0,0.1)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 16 }}>
        <Info size={20} color="var(--accent)" />
        <div style={{ fontSize: 12, color: '#ccc' }}><span style={{ fontWeight: 700, color: 'var(--accent)' }}>Live deck:</span> built from your logline, Concept board, Character Bible, and story beats — update them and this updates.</div>
      </div>

      <AnimatePresence>
        {present && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, zIndex: 3000, background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <button onClick={() => setPresent(false)} aria-label="exit" style={{ position: 'fixed', top: 24, right: 28, background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 2 }}>✕ EXIT</button>
            <div style={{ width: '80vw', maxWidth: 1100, aspectRatio: '16/9', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', padding: 48 }}>
              {slides[idx].bg && (<><img src={slides[idx].bg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.35 }} /><div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} /></>)}
              <div style={{ position: 'relative', zIndex: 1 }}>{slides[idx].render(true)}</div>
            </div>
            <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0} aria-label="prev" style={{ position: 'fixed', left: 28, top: '50%', background: 'none', border: 'none', color: idx === 0 ? '#333' : '#fff', cursor: 'pointer', fontSize: 32 }}>‹</button>
            <button onClick={() => setIdx(i => Math.min(slides.length - 1, i + 1))} disabled={idx === slides.length - 1} aria-label="next" style={{ position: 'fixed', right: 28, top: '50%', background: 'none', border: 'none', color: idx === slides.length - 1 ? '#333' : '#fff', cursor: 'pointer', fontSize: 32 }}>›</button>
            <div style={{ position: 'fixed', bottom: 28, left: 0, right: 0, textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 10, color: '#666', letterSpacing: 2 }}>{idx + 1} / {slides.length}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Character bible: parsed from the screenplay, persisted to script_characters
// (Supabase) so character development is shared across the suite, not trapped
// in one browser.
function CharacterBible({ projectId, userId, concepts }: { projectId: string; userId: string | null; concepts: any[] }) {
  type Bio = { id?: string; name: string; full_name: string; age: string; arc: string; description: string; color?: string };
  type Ref = { id: string; concept_asset_id: string; image_url: string; title: string | null };
  const [bios, setBios] = useState<Bio[]>([]);
  const [scriptId, setScriptId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string | null>(null);
  const [draft, setDraft] = useState<Bio | null>(null);
  const [loading, setLoading] = useState(false);
  const [refs, setRefs] = useState<Record<string, Ref[]>>({});
  const [lookFor, setLookFor] = useState<string | null>(null);

  const loadRefs = async () => {
    const { data } = await supabase.from('character_references').select('id,character_id,concept_assets(image_url,title)').eq('project_id', projectId);
    const map: Record<string, Ref[]> = {};
    (data || []).forEach((r: any) => { (map[r.character_id] ||= []).push({ id: r.id, concept_asset_id: r.concept_asset_id, image_url: r.concept_assets?.image_url, title: r.concept_assets?.title }); });
    setRefs(map);
  };
  useEffect(() => { loadRefs(); /* eslint-disable-next-line */ }, [projectId, bios.length]);

  const ensureRow = async (b: Bio): Promise<string | null> => {
    if (b.id) return b.id;
    if (!scriptId) return null;
    const { data } = await supabase.from('script_characters').insert({ script_id: scriptId, name: b.name, color: b.color, updated_by: userId }).select('id').single();
    if (data?.id) { setBios(prev => prev.map(x => x.name === b.name ? { ...x, id: data.id } : x)); return data.id; }
    return null;
  };
  const linkLook = async (b: Bio, conceptId: string) => {
    const cid = await ensureRow(b);
    if (!cid) return;
    await supabase.from('character_references').insert({ project_id: projectId, character_id: cid, concept_asset_id: conceptId, created_by: userId });
    setLookFor(null); loadRefs();
  };
  const unlinkLook = async (refId: string) => { await supabase.from('character_references').delete().eq('id', refId); loadRefs(); };

  const palette = ['#ff3c00', '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#0099ff', '#a855f7'];

  const load = async () => {
    setLoading(true);
    try {
      const { data: scripts } = await supabase.from('scripts').select('id,content').eq('project_id', projectId).order('updated_at', { ascending: false });
      const withContent = (scripts || []).find((s: any) => s.content && s.content.trim().length > 0) || (scripts || [])[0];
      if (!withContent) { setBios([]); setScriptId(null); return; }
      setScriptId(withContent.id);
      const parsedNames: string[] = withContent.content ? parseScript(withContent.content).characters.map((c: any) => c.name).filter(Boolean) : [];
      const { data: saved } = await supabase.from('script_characters').select('*').eq('script_id', withContent.id);
      const savedByName = new Map((saved || []).map((r: any) => [r.name, r]));
      const names = Array.from(new Set([...parsedNames, ...(saved || []).map((r: any) => r.name)]));
      setBios(names.map((name, i) => {
        const r: any = savedByName.get(name);
        return { id: r?.id, name, full_name: r?.full_name || '', age: r?.age || '', arc: r?.arc || '', description: r?.description || '', color: r?.color || palette[i % palette.length] };
      }));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [projectId]);

  const startEdit = (b: Bio) => { setEditName(b.name); setDraft({ ...b }); };
  const save = async () => {
    if (!draft || !scriptId) return;
    const payload: any = { script_id: scriptId, name: draft.name, full_name: draft.full_name || null, age: draft.age || null, arc: draft.arc || null, description: draft.description || null, color: draft.color, updated_by: userId, updated_at: new Date().toISOString() };
    if (draft.id) await supabase.from('script_characters').update(payload).eq('id', draft.id);
    else await supabase.from('script_characters').insert(payload);
    setEditName(null); setDraft(null);
    load();
  };

  return (
    <div style={{ marginTop: 24, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
        <Users size={16} /> Character Bible <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--fg-dim)', fontWeight: 400 }}>· from ScriptOS · {bios.length}</span>
      </div>
      {loading && <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--fg-dim)' }}>Loading…</div>}
      {!loading && bios.length === 0 && <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--fg-dim)' }}>Write characters in ScriptOS to build the bible.</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
        {bios.map(b => {
          const editing = editName === b.name;
          return (
            <div key={b.name} style={{ background: 'rgba(0,0,0,0.25)', border: `1px solid ${b.color}33`, borderLeft: `3px solid ${b.color}`, borderRadius: 10, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--display)', fontSize: '1rem', letterSpacing: 1, color: b.color }}>{b.name}</span>
                {!editing && <button onClick={() => startEdit(b)} aria-label="edit" style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 11 }}>✎</button>}
              </div>
              {editing && draft ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                  <input value={draft.full_name} onChange={e => setDraft({ ...draft, full_name: e.target.value })} placeholder="Full name" style={inputMini} />
                  <input value={draft.age} onChange={e => setDraft({ ...draft, age: e.target.value })} placeholder="Age" style={inputMini} />
                  <input value={draft.arc} onChange={e => setDraft({ ...draft, arc: e.target.value })} placeholder="Character arc" style={inputMini} />
                  <textarea value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} placeholder="Description" rows={3} style={{ ...inputMini, resize: 'vertical' }} />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={save} style={{ flex: 1, background: 'rgba(16,185,129,0.18)', border: '1px solid rgba(16,185,129,0.4)', color: '#10b981', borderRadius: 6, padding: '5px', cursor: 'pointer', fontSize: 10 }}>Save</button>
                    <button onClick={() => { setEditName(null); setDraft(null); }} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: '#888', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 10 }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 6, fontFamily: 'var(--mono)', fontSize: 9.5, color: '#aaa', lineHeight: 1.7 }}>
                  {b.full_name && <div><span style={{ color: '#666' }}>Name:</span> {b.full_name}</div>}
                  {b.age && <div><span style={{ color: '#666' }}>Age:</span> {b.age}</div>}
                  {b.arc && <div><span style={{ color: '#666' }}>Arc:</span> {b.arc}</div>}
                  {b.description && <div style={{ marginTop: 4, color: '#ccc' }}>{b.description}</div>}
                  {!b.full_name && !b.age && !b.arc && !b.description && <div style={{ color: '#555' }}>No bio yet — click ✎ to develop.</div>}
                </div>
              )}
              {/* Casting / look references */}
              {(() => {
                const cRefs = b.id ? (refs[b.id] || []) : [];
                const linkedIds = new Set(cRefs.map(r => r.concept_asset_id));
                const avail = concepts.filter((c: any) => !linkedIds.has(c.id));
                const picking = lookFor === b.name;
                return (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {cRefs.map(r => (
                        <div key={r.id} style={{ position: 'relative', width: 38, height: 38, borderRadius: '50%', overflow: 'hidden', border: `1px solid ${b.color}55` }} title={r.title || 'look'}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={r.image_url} alt={r.title || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button onClick={() => unlinkLook(r.id)} aria-label="unlink" style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', fontSize: 8, lineHeight: 1, cursor: 'pointer', padding: '1px 3px' }}>✕</button>
                        </div>
                      ))}
                      {concepts.length > 0 && (
                        <button onClick={() => setLookFor(picking ? null : b.name)} style={{ fontFamily: 'var(--mono)', fontSize: 8, color: b.color, background: `${b.color}14`, border: `1px solid ${b.color}33`, borderRadius: 99, padding: '4px 8px', cursor: 'pointer' }}>{picking ? 'close' : '+ look'}</button>
                      )}
                    </div>
                    {picking && (
                      <div style={{ marginTop: 6, padding: 6, background: 'rgba(0,0,0,0.3)', borderRadius: 8, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {avail.length === 0 ? <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--fg-dim)' }}>All concept images linked.</span> : avail.map((c: any) => (
                          <button key={c.id} onClick={() => linkLook(b, c.id)} title={c.title || 'link'} style={{ width: 44, height: 30, borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer', padding: 0, background: 'none' }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={c.image_url} alt={c.title || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>
    </div>
  );
}
const inputMini: React.CSSProperties = { width: '100%', padding: '6px 8px', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', fontSize: 10, fontFamily: 'var(--mono)', outline: 'none' };

// Real call sheets generated by grouping the schedule's scenes by shoot day.
function CallSheets({ scenes, crew, projectTitle }: { scenes: any[]; crew: any[]; projectTitle: string }) {
  const [openDay, setOpenDay] = useState<number | null>(null);
  const days = Array.from(new Set(scenes.map(s => s.shoot_day || 1))).sort((a, b) => a - b);

  const dayData = (day: number) => {
    const dayScenes = scenes.filter(s => (s.shoot_day || 1) === day).sort((a, b) => a.scene_number - b.scene_number);
    const locations = Array.from(new Set(dayScenes.map(s => s.location).filter(Boolean)));
    const cast = Array.from(new Set(dayScenes.flatMap(s => (s.cast_list ? String(s.cast_list).split(',').map((c: string) => c.trim()) : [])).filter(Boolean)));
    const eighths = dayScenes.reduce((t, s) => { const m = String(s.est_duration || '').match(/(\d+)\/8/); return t + (m ? Number(m[1]) : 0); }, 0);
    return { dayScenes, locations, cast, pages: eighths ? (eighths / 8).toFixed(1) : null };
  };

  const esc = (s: any) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));
  const printDay = (day: number) => {
    const d = dayData(day);
    const w = window.open('', '_blank', 'width=820,height=1060');
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>${esc(projectTitle)} — Call Sheet Day ${day}</title>
      <style>body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#111;margin:40px;line-height:1.5}
      h1{font-size:20px;margin:0 0 2px;letter-spacing:2px}h2{font-size:11px;color:#b45309;letter-spacing:3px;margin:0 0 20px}
      h3{font-size:10px;letter-spacing:2px;color:#666;border-bottom:1px solid #ddd;padding-bottom:4px;margin:18px 0 8px}
      .row{display:flex;gap:24px}.col{flex:1}.sc{margin-bottom:4px;font-size:13px}.num{color:#999}</style></head><body>
      <h1>${esc(projectTitle).toUpperCase()}</h1><h2>CALL SHEET · DAY ${day}</h2>
      <div class="row"><div class="col"><h3>SCENES (${d.dayScenes.length}${d.pages ? ` · ${d.pages} pg` : ''})</h3>
      ${d.dayScenes.map((s: any) => `<div class="sc"><span class="num">${s.scene_number}.</span> ${esc(s.title)} ${s.time_of_day ? `<span class="num">(${esc(s.time_of_day)})</span>` : ''}</div>`).join('')}</div>
      <div class="col"><h3>LOCATIONS</h3>${d.locations.length ? d.locations.map((l: any) => `<div>${esc(l)}</div>`).join('') : '—'}
      <h3>CAST</h3>${d.cast.length ? esc(d.cast.join(', ')) : '—'}</div>
      <div class="col"><h3>CREW</h3>${crew.length ? crew.map((c: any) => `<div>${esc(c.name || c.profiles?.username || 'Crew')}${c.role ? ` — ${esc(c.role)}` : ''}</div>`).join('') : 'No crew assigned'}</div></div>
      <script>window.onload=()=>{window.print()}</script></body></html>`);
    w.document.close();
  };

  return (
    <div style={{ marginTop: 24, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
        <FileText size={16} /> Call Sheets <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--fg-dim)', fontWeight: 400 }}>· {days.length} shoot {days.length === 1 ? 'day' : 'days'}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        {days.map(day => {
          const d = dayData(day);
          const open = openDay === day;
          return (
            <div key={day} style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 14, gridColumn: open ? '1 / -1' : 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setOpenDay(open ? null : day)}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: '#f59e0b' }}>DAY {day}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 8.5, color: 'var(--fg-dim)' }}>{d.dayScenes.length} sc · {d.cast.length} cast{d.pages ? ` · ${d.pages} pg` : ''}</span>
              </div>
              {!open && (
                <div style={{ marginTop: 8, fontFamily: 'var(--mono)', fontSize: 8.5, color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {d.locations.slice(0, 2).join(' · ') || 'No locations set'}
                </div>
              )}
              {open && (
                <div style={{ marginTop: 12, fontFamily: 'var(--mono)', fontSize: 10, lineHeight: 1.7 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ color: '#f59e0b', fontWeight: 700, letterSpacing: 1 }}>{projectTitle.toUpperCase()} — CALL SHEET · DAY {day}</div>
                    <button onClick={() => printDay(day)} style={{ fontFamily: 'var(--mono)', fontSize: 8.5, color: '#ddd', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 5, padding: '3px 9px', cursor: 'pointer', letterSpacing: 1 }}>⎙ PRINT / PDF</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                    <div>
                      <div style={{ color: '#666', fontSize: 8, letterSpacing: 1.5, marginBottom: 4 }}>SCENES</div>
                      {d.dayScenes.map(s => (
                        <div key={s.id} style={{ color: '#ddd', marginBottom: 2 }}>
                          <span style={{ color: '#888' }}>{s.scene_number}.</span> {s.title} {s.time_of_day ? <span style={{ color: '#666' }}>({s.time_of_day})</span> : null}
                        </div>
                      ))}
                    </div>
                    <div>
                      <div style={{ color: '#666', fontSize: 8, letterSpacing: 1.5, marginBottom: 4 }}>LOCATIONS</div>
                      {d.locations.length ? d.locations.map(l => <div key={l} style={{ color: '#ddd' }}>{l}</div>) : <div style={{ color: '#555' }}>—</div>}
                      <div style={{ color: '#666', fontSize: 8, letterSpacing: 1.5, margin: '12px 0 4px' }}>CAST</div>
                      {d.cast.length ? <div style={{ color: '#ddd' }}>{d.cast.join(', ')}</div> : <div style={{ color: '#555' }}>—</div>}
                    </div>
                    <div>
                      <div style={{ color: '#666', fontSize: 8, letterSpacing: 1.5, marginBottom: 4 }}>CREW</div>
                      {crew.length ? crew.slice(0, 12).map((c, i) => <div key={i} style={{ color: '#ddd' }}>{(c.name || c.profiles?.username || 'Crew')}{c.role ? <span style={{ color: '#666' }}> — {c.role}</span> : null}</div>) : <div style={{ color: '#555' }}>No crew assigned</div>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BeatCard({ beat, index, onDelete, onPush }: { beat: any; index: number; onDelete?: (id: string) => void; onPush?: (beat: any) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ delay: index * 0.05 }}
      style={{
        padding: 20,
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${beat.color || 'rgba(255,255,255,0.06)'}`,
        borderTop: `4px solid ${beat.color || 'var(--accent)'}`,
        borderRadius: 8,
        minHeight: 140,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        transition: 'box-shadow 0.3s',
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 12px 36px rgba(0,0,0,0.6), 0 0 24px ${beat.color || 'rgba(255,60,0,0.08)'}`)}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
    >
      <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 8 }}>
        {onPush && (
          <button 
            onClick={() => onPush(beat)}
            style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer' }}
            title="Push to ScriptOS"
            onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
            onMouseLeave={e => e.currentTarget.style.color = '#444'}
          >
            <Share2 size={12} />
          </button>
        )}
        {onDelete && (
          <button 
            onClick={() => onDelete(beat.id)}
            style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer' }}
            title="Delete Beat"
            onMouseEnter={e => e.currentTarget.style.color = '#ff4444'}
            onMouseLeave={e => e.currentTarget.style.color = '#444'}
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, color: beat.color }}>{beat.title}</div>
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.5, color: '#ccc' }}>{beat.content}</div>
      </div>
      <div style={{ fontSize: 9, color: 'var(--fg-subtle)', marginTop: 12, fontFamily: 'var(--mono)' }}>SEQ: {index + 1}</div>
    </motion.div>
  );
}

function CrewMemberCard({ member, index }: { member: any; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ x: 2 }}
      transition={{ delay: index * 0.05 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: 16,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 12,
        transition: 'border-color 0.3s, box-shadow 0.3s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,60,0,0.25)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.5)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(45deg, var(--accent), #ffaa00)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#000' }}>
        {member.avatar ? <img src={member.avatar} style={{ width: '100%', height: '100%', borderRadius: '50%' }} /> : member.name.charAt(0)}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{member.name}</div>
        <div style={{ fontSize: 10, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: 1 }}>{member.role}</div>
      </div>
      <div style={{ fontSize: 9, padding: '4px 8px', background: member.status === 'confirmed' ? 'rgba(0,255,100,0.1)' : 'rgba(255,255,255,0.05)', color: member.status === 'confirmed' ? '#00cc66' : '#666', borderRadius: 4, textTransform: 'uppercase' }}>
        {member.status || 'pending'}
      </div>
    </motion.div>
  );
}
function RecruitModal({ isOpen, onClose, projectId, onSuccess }: { isOpen: boolean; onClose: () => void; projectId: string; onSuccess: () => void }) {
  useEscapeKey(onClose, isOpen);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [role, setRole] = useState('Production Assistant');

  const handleSearch = async () => {
    if (!query) return;
    setLoading(true);
    const users = await searchProfiles(query);
    setResults(users);
    setLoading(false);
  };

  const handleInvite = async () => {
    if (!selectedUser || !projectId) return;
    setLoading(true);
    try {
      await inviteToCrew(projectId, selectedUser.id, role);
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to invite.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            style={{ width: 500, background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 32 }}
          >
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Recruit Talent</h2>
            <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 24 }}>Search the Misfits database for crew members and cast.</p>
            
            {!selectedUser ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ position: 'relative' }}>
                  <input 
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    placeholder="Search by username..."
                    style={{ width: '100%', background: '#0a0a0a', border: '1px solid #333', color: '#fff', padding: '12px 40px 12px 16px', borderRadius: 8, fontSize: 13 }}
                  />
                  <Search size={16} style={{ position: 'absolute', right: 14, top: 14, color: '#666' }} />
                </div>
                
                <div style={{ minHeight: 200, maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {loading ? <div style={{ textAlign: 'center', padding: 40, color: '#444' }}>Searching...</div> : 
                   results.map(u => (
                    <div 
                      key={u.id}
                      onClick={() => setSelectedUser(u)}
                      style={{ padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    >
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                        {u.username.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ fontSize: 14 }}>{u.username}</div>
                    </div>
                  ))}
                  {results.length === 0 && !loading && query && <div style={{ textAlign: 'center', padding: 40, color: '#444' }}>No results found.</div>}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 12 }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--accent)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700 }}>
                      {selectedUser.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700 }}>{selectedUser.username}</div>
                      <div style={{ fontSize: 12, color: 'var(--accent)' }}>Active Professional</div>
                    </div>
                 </div>

                 <div>
                   <label style={{ fontSize: 9, textTransform: 'uppercase', color: '#666', marginBottom: 6, display: 'block' }}>Assigned Role</label>
                   <select 
                     value={role}
                     onChange={e => setRole(e.target.value)}
                     style={{ width: '100%', background: '#0a0a0a', border: '1px solid #333', color: '#fff', padding: 12, borderRadius: 8, fontSize: 13 }}
                   >
                     <option>Director</option>
                     <option>Director of Photography</option>
                     <option>Lead Actor</option>
                     <option>Sound Mixer</option>
                     <option>Editor</option>
                     <option>Production Assistant</option>
                   </select>
                 </div>

                 <div style={{ display: 'flex', gap: 12 }}>
                    <button onClick={() => setSelectedUser(null)} style={{ flex: 1, padding: 14, background: 'transparent', border: '1px solid #333', color: '#fff', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>Back</button>
                    <button onClick={handleInvite} disabled={loading} style={{ flex: 2, padding: 14, background: 'var(--accent)', border: 'none', color: '#000', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      {loading ? 'Sending...' : 'Send Invitation'}
                    </button>
                 </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function StudioPage() {
  useRequireAuth();
  const { toast } = useToast();
  const { activeProject, setActiveProject, projects, updateProject, refreshProject } = useProject();
  const [activeTab, setActiveTab] = useState<'overview' | 'concept' | 'production' | 'assets' | 'marketing' | 'pitch'>('overview');
  const [filter, setFilter] = useState<string>('all');
  const [user, setUser] = useState<any>(null);
  const [assetsList, setAssetsList] = useState<Asset[]>([]);
  const [showIntake, setShowIntake] = useState(false);
  const [selectedConcept, setSelectedConcept] = useState<any>(null);
  const [reviewAsset, setReviewAsset] = useState<Asset | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [boards, setBoards] = useState<any[]>([]);
  const [activeBoard, setActiveBoard] = useState<any>(null);
  const [loadingBoards, setLoadingBoards] = useState(false);
  const [beats, setBeats] = useState<any[]>([]);
  const [crewList, setCrewList] = useState<any[]>([]);
  const [showRecruit, setShowRecruit] = useState(false);

  const [showAddConcept, setShowAddConcept] = useState(false);
  const [conceptTitle, setConceptTitle] = useState('');
  const [conceptUrl, setConceptUrl] = useState('');
  const [conceptBoard, setConceptBoard] = useState('');
  const [activeConceptBoard, setActiveConceptBoard] = useState<string>('All');
  const [adding, setAdding] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const [showAddBeat, setShowAddBeat] = useState(false);
  const [beatTitle, setBeatTitle] = useState('');
  const [beatContent, setBeatContent] = useState('');

  const [showAddScene, setShowAddScene] = useState(false);
  const [sceneTitle, setSceneTitle] = useState('');
  const [sceneLocation, setSceneLocation] = useState('');
  const [sceneDay, setSceneDay] = useState('1');
  const [editSceneId, setEditSceneId] = useState<string | null>(null);
  const [editScene, setEditScene] = useState<{ title: string; location: string; time_of_day: string; shoot_day: string }>({ title: '', location: '', time_of_day: 'DAY', shoot_day: '1' });

  const startEditScene = (s: any) => {
    setEditSceneId(s.id);
    setEditScene({ title: s.title || '', location: s.location || '', time_of_day: s.time_of_day || 'DAY', shoot_day: String(s.shoot_day || 1) });
  };
  const saveScene = async () => {
    if (!editSceneId || !activeProject) return;
    const { error } = await supabase.from('scenes').update({
      title: editScene.title.trim(),
      location: editScene.location.trim() || null,
      time_of_day: editScene.time_of_day,
      shoot_day: Number(editScene.shoot_day) || 1,
    }).eq('id', editSceneId);
    if (error) { toast(error.message || 'Could not save scene', 'error'); return; }
    setEditSceneId(null);
    await refreshProject(activeProject.id);
  };

  // Export the whole shooting schedule (all scenes grouped by day) to print/PDF.
  const printSchedule = () => {
    if (!activeProject) return;
    const scenes = (activeProject.scenes || []) as any[];
    if (scenes.length === 0) { alert('No scenes to export yet.'); return; }
    const esc = (s: any) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));
    const days = Array.from(new Set(scenes.map(s => s.shoot_day || 1))).sort((a, b) => a - b);
    const w = window.open('', '_blank', 'width=860,height=1100');
    if (!w) return;
    const body = days.map(day => {
      const ds = scenes.filter(s => (s.shoot_day || 1) === day).sort((a, b) => a.scene_number - b.scene_number);
      return `<h2>DAY ${day}</h2><table><tr><th>#</th><th>Scene</th><th>Location</th><th>I/E·T</th><th>Cast</th><th>Pages</th><th>Status</th></tr>
        ${ds.map(s => `<tr><td>${s.scene_number}</td><td>${esc(s.title)}</td><td>${esc(s.location || '—')}</td><td>${esc(s.time_of_day || '')}</td><td>${esc(s.cast_list || '—')}</td><td>${esc(s.est_duration || '')}</td><td>${esc(s.status || 'planned')}</td></tr>`).join('')}</table>`;
    }).join('');
    w.document.write(`<!doctype html><html><head><title>${esc(activeProject.title)} — Shooting Schedule</title>
      <style>body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#111;margin:40px}h1{font-size:22px;letter-spacing:2px;margin:0 0 4px}
      h2{font-size:11px;letter-spacing:3px;color:#b45309;margin:24px 0 8px}table{width:100%;border-collapse:collapse;font-size:12px}
      th{text-align:left;color:#888;font-size:9px;letter-spacing:1px;border-bottom:1px solid #ccc;padding:4px}td{padding:5px 4px;border-bottom:1px solid #eee}</style></head><body>
      <h1>${esc(activeProject.title).toUpperCase()} — SHOOTING SCHEDULE</h1><div style="color:#888;font-size:11px">${scenes.length} scenes · ${days.length} days</div>
      ${body}<script>window.onload=()=>window.print()</script></body></html>`);
    w.document.close();
  };

  // Auto-schedule: real 1st-AD board logic. Groups scenes by location to
  // minimise company moves, then packs each location's scenes into shoot days
  // respecting a daily page capacity (in eighths). NIGHT scenes are clustered
  // together within a location so the unit isn't bouncing between day/night.
  const [autoScheduling, setAutoScheduling] = useState(false);
  const eighthsOf = (s: any) => { const m = String(s.est_duration || '').match(/(\d+)\s*\/\s*8/); return m ? Number(m[1]) : 8; };
  const autoSchedule = async () => {
    if (!activeProject) return;
    const scenes = ((activeProject.scenes || []) as any[]).slice();
    if (scenes.length === 0) { alert('No scenes to schedule yet — import from the screenplay first.'); return; }
    const CAP = 40; // eighths/day ≈ 5 script pages, standard indie pace
    // Group by location (unset locations bucket together at the end).
    const groups = new Map<string, any[]>();
    for (const s of scenes) {
      const key = (s.location || '').trim().toUpperCase() || '￿UNSET';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(s);
    }
    // Sort groups by size desc (anchor the biggest locations first), and
    // within a group cluster NIGHT scenes after DAY ones.
    const ordered = Array.from(groups.entries()).sort((a, b) => b[1].length - a[1].length);
    const nightRank = (s: any) => /NIGHT|DUSK|NUIT/i.test(String(s.time_of_day || '')) ? 1 : 0;
    let day = 0, used = CAP + 1; // force day 1 on first scene
    const updates: { id: string; shoot_day: number }[] = [];
    for (const [, list] of ordered) {
      list.sort((a, b) => nightRank(a) - nightRank(b) || a.scene_number - b.scene_number);
      let first = true;
      for (const s of list) {
        const e = eighthsOf(s);
        // New location always starts a fresh day (a company move = new day).
        if (first || used + e > CAP) { day += 1; used = 0; first = false; }
        used += e;
        if ((s.shoot_day || 1) !== day) updates.push({ id: s.id, shoot_day: day });
      }
    }
    if (updates.length === 0) { alert(`Schedule is already optimal — ${day} shoot day${day === 1 ? '' : 's'}, grouped by location.`); return; }
    if (!confirm(`Auto-schedule will reorganise ${scenes.length} scenes into ${day} shoot day${day === 1 ? '' : 's'}, grouped by location to minimise company moves (~5 pages/day). Reassign ${updates.length} scene${updates.length === 1 ? '' : 's'}?`)) return;
    setAutoScheduling(true);
    try {
      for (const u of updates) await supabase.from('scenes').update({ shoot_day: u.shoot_day }).eq('id', u.id);
      await refreshProject(activeProject.id);
    } finally {
      setAutoScheduling(false);
    }
  };

  // Cycle a scene's shoot status: planned → shot → wrapped → planned.
  const cycleSceneStatus = async (s: any) => {
    if (!activeProject) return;
    const order = ['planned', 'shot', 'wrapped'];
    const next = order[(order.indexOf(s.status || 'planned') + 1) % order.length];
    const { error } = await supabase.from('scenes').update({ status: next }).eq('id', s.id);
    if (error) { toast(error.message || 'Could not update status', 'error'); return; }
    await refreshProject(activeProject.id);
  };

  // Generate the production scene list directly from the screenplay. Adds a
  // scenes row for every parsed scene whose number isn't already present, so
  // ScriptOS becomes the source of the shooting schedule.
  const [importingScenes, setImportingScenes] = useState(false);
  const importScenesFromScript = async () => {
    if (!activeProject) return;
    setImportingScenes(true);
    try {
      const { data } = await supabase.from('scripts').select('content').eq('project_id', activeProject.id).order('updated_at', { ascending: false });
      const withContent = (data || []).find((s: any) => s.content && s.content.trim().length > 0);
      if (!withContent) { alert('No script content yet — write one in ScriptOS first.'); return; }
      const parsed = parseScript(withContent.content);
      const existingNums = new Set((activeProject.scenes || []).map((s: any) => s.scene_number));
      const rows = parsed.scenes
        .filter((s: any) => !s.omitted)
        .map((s: any, i: number) => ({ s, num: i + 1 }))
        .filter(({ num }: any) => !existingNums.has(num))
        .map(({ s, num }: any) => ({
          project_id: activeProject.id,
          scene_number: num,
          title: (s.heading || s.location || `Scene ${num}`).slice(0, 200),
          location: s.location || null,
          time_of_day: s.timeOfDay && s.timeOfDay !== 'UNKNOWN' ? s.timeOfDay : 'DAY',
          cast_list: (s.characters || []).join(', ') || null,
          est_duration: `${s.eighths || 1}/8 pg`,
          shoot_day: 1,
        }));
      if (rows.length === 0) { alert('Schedule is already in sync with the script.'); return; }
      const { error } = await supabase.from('scenes').insert(rows);
      if (error) { alert(error.message); return; }
      await refreshProject(activeProject.id);
    } finally {
      setImportingScenes(false);
    }
  };

  const [showAddCampaign, setShowAddCampaign] = useState(false);
  const [campaignTitle, setCampaignTitle] = useState('');
  const [campaignPlatform, setCampaignPlatform] = useState('Instagram');

  // Scene ↔ concept references (assets linked to scenes)
  type SceneRef = { id: string; concept_asset_id: string; image_url: string; title: string | null };
  const [sceneRefs, setSceneRefs] = useState<Record<string, SceneRef[]>>({});
  const [linkScene, setLinkScene] = useState<string | null>(null);

  const loadSceneRefs = async (projectId: string) => {
    const { data } = await supabase
      .from('scene_references')
      .select('id,scene_id,concept_asset_id,concept_assets(image_url,title)')
      .eq('project_id', projectId);
    const map: Record<string, SceneRef[]> = {};
    (data || []).forEach((r: any) => {
      (map[r.scene_id] ||= []).push({ id: r.id, concept_asset_id: r.concept_asset_id, image_url: r.concept_assets?.image_url, title: r.concept_assets?.title });
    });
    setSceneRefs(map);
  };
  useEffect(() => {
    if (activeProject?.id) loadSceneRefs(activeProject.id);
    else setSceneRefs({});
  }, [activeProject?.id, activeProject?.scenes]);

  const linkConceptToScene = async (sceneId: string, conceptId: string) => {
    if (!activeProject) return;
    const { error } = await supabase.from('scene_references').insert({ project_id: activeProject.id, scene_id: sceneId, concept_asset_id: conceptId, created_by: user?.id });
    if (!error) { setLinkScene(null); loadSceneRefs(activeProject.id); }
  };
  const unlinkConcept = async (refId: string) => {
    await supabase.from('scene_references').delete().eq('id', refId);
    if (activeProject) loadSceneRefs(activeProject.id);
  };

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
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUser(user);
      
      // Load Boards for Project
      if (activeProject) {
        setLoadingBoards(true);
        try {
          const projectBoards = await getProjectBoards(activeProject.id);
          setBoards(projectBoards);
          
          let currentBoard = projectBoards[0];
          if (projectBoards.length > 0) {
            setActiveBoard(currentBoard);
          } else {
            // Auto-create a default board if none exist
            currentBoard = await createStudioBoard({
              user_id: user.id,
              project_id: activeProject.id,
              name: 'Project Mood Board',
              description: `Main mood board for ${activeProject.title}`
            });
            setBoards([currentBoard]);
            setActiveBoard(currentBoard);
          }

          // Fetch assets for this board specifically
          const boardAssets = await getStudioAssets(currentBoard.id);
          setAssetsList(boardAssets.map((a: any) => ({
            id: a.id,
            name: a.title || 'Untitled',
            type: (a.asset_type as any) || 'image',
            category: a.category || 'Studio',
            url: a.asset_url,
            size: 'Unknown',
            dateAdded: new Date(a.created_at).toISOString().split('T')[0]
          })));

        } catch (err) {
          console.error('Error loading boards:', err);
        } finally {
          setLoadingBoards(false);
        }
      }

      // Load activities
      try {
        const acts = await getActivities(5);
        setActivities(acts);
      } catch (err) {
        console.error('Error loading activities:', err);
      }

      // Load Beats
      if (activeProject) {
        try {
          const projectBeats = await getProjectBeats(activeProject.id);
          setBeats(projectBeats);
        } catch (err) {
          console.error('Error loading beats:', err);
        }
        
        try {
          const crew = await getProjectCrew(activeProject.id);
          setCrewList(crew);
        } catch (err) {
          console.error('Error loading crew:', err);
        }
      }
    };
    init();

    const sub = subscribeToActivities((payload) => {
      getActivities(5).then(setActivities);
    });

    return () => {
      supabase.removeChannel(sub);
    };
  }, [activeProject?.id]);

  const filtered = filter === 'all' ? assetsList : assetsList.filter(a => a.type === filter);

  const refreshAssets = async () => {
    if (!user || !activeBoard) return;
    try {
      const data = await getStudioAssets(activeBoard.id);
      if (data) {
        setAssetsList(data.map(a => ({
          id: a.id,
          name: a.title || 'Untitled',
          type: (a.asset_type as any) || 'image',
          category: a.category || 'Studio',
          url: a.asset_url,
          size: 'Unknown',
          dateAdded: new Date(a.created_at).toISOString().split('T')[0]
        })));
      }
    } catch (err) {
      console.error('Error refreshing assets:', err);
    }
  };

  const refreshBeats = async () => {
    if (!activeProject) return;
    try {
      const projectBeats = await getProjectBeats(activeProject.id);
      setBeats(projectBeats);
    } catch (err) {
      console.error('Error refreshing beats:', err);
    }
  };

  const handleAddBeat = async () => {
    if (!activeProject) return;
    const title = prompt('Beat Title:');
    if (!title) return;
    const content = prompt('Beat Content:');
    try {
      await createProjectBeat({
        project_id: activeProject.id,
        title,
        content,
        order_index: beats.length
      });
      refreshBeats();
    } catch (err) {
      console.error('Error adding beat:', err);
    }
  };

  const handlePushToScript = async (beat: any) => {
    if (!activeProject || !user) return;
    try {
      const sceneTitle = beat.title.toUpperCase().startsWith('EXT.') || beat.title.toUpperCase().startsWith('INT.') 
        ? beat.title.toUpperCase() 
        : `INT. ${beat.title.toUpperCase()} - DAY`;
        
      const content = `${sceneTitle}\n\n${beat.content}`;
      
      const newScript = await saveScript({
        title: `${activeProject.title} - ${beat.title}`,
        content,
        project_id: activeProject.id
      });
      
      if (newScript) {
        alert('Beat pushed to ScriptOS! You can find it in your scripts list.');
      }
    } catch (err) {
      console.error('Error pushing beat to script:', err);
    }
  };

  const handleDeleteBeat = async (id: string) => {
    if (!confirm('Delete this beat?')) return;
    try {
      await deleteProjectBeat(id);
      refreshBeats();
    } catch (err) {
      console.error('Error deleting beat:', err);
    }
  };

  const handleDeleteAsset = async (id: string) => {
    if (!confirm('Delete this asset?')) return;
    try {
      await deleteStudioAsset(id);
      refreshAssets();
    } catch (err) {
      console.error('Error deleting asset:', err);
    }
  };

  const refreshCrew = async () => {
    if (!activeProject) return;
    const crew = await getProjectCrew(activeProject.id);
    setCrewList(crew);
  };

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
        boardId={activeBoard?.id}
        userId={user?.id}
        onSuccess={refreshAssets}
      />
      <RecruitModal
        isOpen={showRecruit}
        onClose={() => setShowRecruit(false)}
        projectId={activeProject?.id}
        onSuccess={refreshCrew}
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

      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '130px 20px 80px' }}>
        
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
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>{(activeProject as any).completion || 0}%</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--fg-subtle)', textTransform: 'uppercase', marginBottom: 12 }}>Crew</div>
                    {(activeProject.crew && activeProject.crew.length > 0) ? (
                      <div style={{ display: 'flex', gap: 8 }}>
                        {activeProject.crew.slice(0, 3).map((c, i) => (
                          <div key={c.id} title={`${c.name} — ${c.role}`} style={{ width: 32, height: 32, borderRadius: '50%', background: `hsl(${(i * 97) % 360}, 40%, 30%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, overflow: 'hidden' }}>
                            {c.avatar ? <img src={c.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : c.name.charAt(0).toUpperCase()}
                          </div>
                        ))}
                        {activeProject.crew.length > 3 && (
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>+{activeProject.crew.length - 3}</div>
                        )}
                      </div>
                    ) : (
                      <Link href={`/projects/${activeProject.id}?tab=crew`} style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none' }}>No crew yet — add some →</Link>
                    )}
                  </div>
                </div>

                {/* Production budget — pulled from this project's budget_items */}
                <div style={{ marginTop: 60, padding: 32, background: 'linear-gradient(to right, rgba(255,255,255,0.02), transparent)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
                      <DollarSign size={16} color="var(--accent)" /> Production Budget
                    </div>
                    <span style={{ fontSize: 10, fontFamily: 'var(--mono)', background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: 20 }}>USD</span>
                  </div>
                  {(activeProject.budget_items && activeProject.budget_items.length > 0) ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--fg-subtle)', textTransform: 'uppercase', marginBottom: 4 }}>Total Estimated Budget</div>
                        <div style={{ fontSize: '2.5rem', fontFamily: 'var(--display)', color: '#fff', letterSpacing: 2 }}>
                          ${activeProject.budget_items.reduce((s, b) => s + Number(b.amount || 0), 0).toLocaleString()}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center' }}>
                        {activeProject.budget_items.slice(0, 4).map(b => (
                          <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'var(--mono)' }}>
                            <span style={{ color: 'var(--fg-muted)' }}>{b.category}</span>
                            <span>${Number(b.amount || 0).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p style={{ fontSize: 11, color: 'var(--fg-dim)' }}>No budget line items tracked for this project yet.</p>
                  )}
                </div>

                {/* Milestones — pulled from this project's timeline_items */}
                <div style={{ marginTop: 40 }}>
                   <SectionLabel text="Project Milestones" />
                   {(activeProject.timeline_items && activeProject.timeline_items.length > 0) ? (
                     <div style={{ position: 'relative', paddingLeft: 24, borderLeft: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: 24 }}>
                        {activeProject.timeline_items.map((m) => (
                          <div key={m.id} style={{ position: 'relative' }}>
                             <div style={{ position: 'absolute', left: -28, top: 4, width: 8, height: 8, borderRadius: '50%', background: m.completion >= 100 ? 'var(--accent)' : '#222', border: m.completion >= 100 ? 'none' : '1px solid #444' }} />
                             <div style={{ fontSize: 12, fontWeight: 700, color: m.completion >= 100 ? '#fff' : '#666' }}>{m.title}</div>
                             <div style={{ fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--fg-subtle)' }}>{new Date(m.end_date).toLocaleDateString()} · {m.completion}%</div>
                          </div>
                        ))}
                     </div>
                   ) : (
                     <Link href={`/projects/${activeProject.id}?tab=schedule`} style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none' }}>No milestones yet — add some →</Link>
                   )}
                </div>
              </motion.div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 32 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <ClipboardList size={16} /> Recent Activity
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {activities.length > 0 ? activities.map((act, i) => (
                  <div key={act.id} style={{ display: 'flex', gap: 12 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700 }}>
                      {act.profiles?.username?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#eee' }}><span style={{ fontWeight: 700 }}>{act.profiles?.username || 'Someone'}</span> {act.action}</div>
                      <div style={{ fontSize: 9, color: 'var(--fg-subtle)' }}>{new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                )) : (
                  <div style={{ fontSize: 11, color: '#444', textAlign: 'center', padding: '20px 0' }}>No recent activity</div>
                )}
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
              <button className="link-btn" onClick={() => setShowAddConcept(s => !s)}>+ New Ref</button>
            </div>

            {showAddConcept && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, padding: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8 }}>
                <input placeholder="Title" value={conceptTitle} onChange={e => setConceptTitle(e.target.value)} style={{ flex: 1, padding: 10, background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', fontSize: 12 }} />
                <input placeholder="Image URL" value={conceptUrl} onChange={e => setConceptUrl(e.target.value)} style={{ flex: 2, padding: 10, background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', fontSize: 12 }} />
                <input placeholder="Board (e.g. Lighting)" value={conceptBoard} onChange={e => setConceptBoard(e.target.value)} list="mc-board-list" style={{ flex: 1, padding: 10, background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', fontSize: 12 }} />
                <button
                  className="link-btn"
                  disabled={adding || !conceptUrl.trim()}
                  onClick={async () => {
                    if (!activeProject || !conceptUrl.trim() || adding) return;
                    setAdding(true);
                    try {
                      const { data: { user } } = await supabase.auth.getUser();
                      const board = (conceptBoard.trim() || (activeConceptBoard !== 'All' ? activeConceptBoard : '')) || null;
                      const { error } = await supabase.from('concept_assets').insert({ project_id: activeProject.id, title: conceptTitle.trim() || null, image_url: conceptUrl.trim(), board, created_by: user?.id });
                      if (error) { toast(error.message || 'Could not add reference', 'error'); return; }
                      await refreshProject(activeProject.id);
                      toast('Reference added', 'success');
                      setConceptTitle(''); setConceptUrl(''); setConceptBoard(''); setShowAddConcept(false);
                    } finally { setAdding(false); }
                  }}
                >{adding ? 'Adding…' : 'Add'}</button>
              </div>
            )}

            {(() => {
              const all = (activeProject?.concept_assets || []) as any[];
              const boards = Array.from(new Set(all.map(a => (a.board || '').trim()).filter(Boolean))).sort();
              const filtered = activeConceptBoard === 'All' ? all : activeConceptBoard === 'Unsorted' ? all.filter(a => !a.board) : all.filter(a => a.board === activeConceptBoard);
              const tabs = ['All', ...boards, ...(all.some(a => !a.board) ? ['Unsorted'] : [])];
              return (
                <>
                  <datalist id="mc-board-list">{boards.map(b => <option key={b} value={b} />)}</datalist>
                  {all.length > 0 && tabs.length > 1 && (
                    <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                      {tabs.map(b => {
                        const count = b === 'All' ? all.length : b === 'Unsorted' ? all.filter(a => !a.board).length : all.filter(a => a.board === b).length;
                        const on = activeConceptBoard === b;
                        return (
                          <button key={b} onClick={() => setActiveConceptBoard(b)} style={{ padding: '6px 14px', borderRadius: 99, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: `1px solid ${on ? 'rgba(168,85,247,0.5)' : 'rgba(255,255,255,0.1)'}`, background: on ? 'rgba(168,85,247,0.14)' : 'transparent', color: on ? '#c084fc' : 'var(--fg-muted)', fontFamily: 'var(--mono)', letterSpacing: 0.5, display: 'flex', gap: 6, alignItems: 'center' }}>
                            {b} <span style={{ fontSize: 9, opacity: 0.6 }}>{count}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {filtered.length > 0 ? (
                    <div className="mc-masonry">
                      {filtered.map((img, i) => {
                        const sceneCount = Object.values(sceneRefs).reduce((n, arr) => n + (arr.some(r => r.concept_asset_id === img.id) ? 1 : 0), 0);
                        return (
                        <ConceptCard key={img.id} image={{ id: img.id, url: img.image_url, title: img.title }} index={i} sceneCount={sceneCount} board={img.board} onOpen={() => setLightboxIdx(i)} onRemove={async () => { if (!confirm('Delete this reference from the board?')) return; await supabase.from('concept_assets').delete().eq('id', img.id); await refreshProject(activeProject!.id); }} />
                        );
                      })}
                    </div>
                  ) : (
                    <EmptyState icon={<Image size={28} />} title={all.length === 0 ? 'No concept references yet' : `Nothing in "${activeConceptBoard}" yet`} subtitle="Paste an image URL above to start your visual moodboard. Group pins into boards like Lighting, Wardrobe or Locations." />
                  )}

                  {lightboxIdx !== null && filtered[lightboxIdx] && (
                    <ConceptLightbox
                      images={filtered}
                      index={lightboxIdx}
                      onIndex={setLightboxIdx}
                      onClose={() => setLightboxIdx(null)}
                      onSetBoard={async (id, board) => { const { error } = await supabase.from('concept_assets').update({ board }).eq('id', id); if (error) { toast(error.message || 'Could not move to board', 'error'); return; } await refreshProject(activeProject!.id); toast(board ? `Moved to "${board}"` : 'Removed from board', 'success'); }}
                      boards={boards}
                    />
                  )}
                </>
              );
            })()}
          </motion.div>
        )}

        {activeTab === 'production' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
              <div>
                <SectionLabel text="Pre-Production" />
                <h2 style={{ fontFamily: 'var(--display)', fontSize: '2.5rem', letterSpacing: 2 }}>Production Suite</h2>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="link-btn" onClick={printSchedule}>⎙ Export Schedule</button>
                <button className="link-btn" onClick={() => setShowAddBeat(s => !s)}>+ New Beat</button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 40 }}>
               {/* Beat Board */}
               <div>
                 <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--fg-muted)' }}>
                   <BookOpen size={16} /> Beat Board / Outline
                 </div>
                 {showAddBeat && (
                   <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16, padding: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8 }}>
                     <input placeholder="Beat title" value={beatTitle} onChange={e => setBeatTitle(e.target.value)} style={{ padding: 10, background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', fontSize: 12 }} />
                     <textarea placeholder="What happens in this beat?" value={beatContent} onChange={e => setBeatContent(e.target.value)} style={{ padding: 10, background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', fontSize: 12, minHeight: 60, resize: 'vertical' }} />
                     <button
                       className="link-btn"
                       disabled={adding || !beatTitle.trim()}
                       onClick={async () => {
                         if (!activeProject || !beatTitle.trim() || adding) return;
                         setAdding(true);
                         try {
                           const { error } = await supabase.from('project_beats').insert({ project_id: activeProject.id, title: beatTitle.trim(), content: beatContent.trim() });
                           if (error) { toast(error.message || 'Could not add beat', 'error'); return; }
                           await refreshProject(activeProject.id);
                           setBeatTitle(''); setBeatContent(''); setShowAddBeat(false);
                         } finally { setAdding(false); }
                       }}
                     >{adding ? 'Adding…' : 'Add Beat'}</button>
                   </div>
                 )}

                 {(activeProject?.beats && activeProject.beats.length > 0) ? (
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                     {activeProject.beats.map((beat, i) => (
                       <BeatCard key={beat.id} beat={beat} index={i} onDelete={async (id) => { if (!confirm('Delete this beat?')) return; await supabase.from('project_beats').delete().eq('id', id); await refreshProject(activeProject.id); }} onPush={handlePushToScript} />
                     ))}
                   </div>
                 ) : (
                   <EmptyState icon={<BookOpen size={28} />} title="No beats outlined yet" subtitle="Break the story into beats above" />
                 )}
               </div>

               {/* Staffing & Casting */}
               <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
                 <div>
                   <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--fg-muted)' }}>
                     <Users size={16} /> Cast & Crew Hub
                   </div>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {crewList.length > 0 ? crewList.map((member, i) => (
                        <CrewMemberCard key={member.id} member={{
                          name: member.profiles?.username || 'Unknown',
                          role: member.role,
                          status: member.status,
                          avatar: member.profiles?.avatar_url
                        }} index={i} />
                      )) : (
                        <EmptyState icon={<Users size={28} />} title="No crew members recruited yet" />
                      )}
                      <button
                        onClick={() => setShowRecruit(true)}
                        style={{ padding: 12, border: '1px dashed rgba(255,255,255,0.1)', background: 'transparent', color: '#666', borderRadius: 8, fontSize: 11, cursor: 'pointer' }}
                      >
                        + Recruit Crew / Invite Talent
                      </button>
                    </div>
                 </div>

                 {/* Scene Gantt Timeline (StudioBinder style) */}
                 <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 24, overflowX: 'auto' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                     {(() => {
                       const all = activeProject?.scenes || [];
                       const wrapped = all.filter((s: any) => s.status === 'wrapped').length;
                       const pct = all.length ? Math.round((wrapped / all.length) * 100) : 0;
                       return (
                         <div>
                           <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Shooting Schedule</div>
                           {all.length > 0 && (
                             <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
                               <div style={{ width: 120, height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                                 <div style={{ width: `${pct}%`, height: '100%', background: '#10b981' }} />
                               </div>
                               <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--fg-dim)' }}>{wrapped}/{all.length} wrapped</span>
                             </div>
                           )}
                         </div>
                       );
                     })()}
                     <div style={{ display: 'flex', gap: 8 }}>
                       <button className="link-btn" style={{ fontSize: 9, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,60,0,0.12)', borderColor: 'rgba(255,60,0,0.3)', color: '#ff7a4d' }} onClick={importScenesFromScript} disabled={importingScenes}><FileText size={12}/> {importingScenes ? 'Importing…' : 'Import from screenplay'}</button>
                       <button className="link-btn" style={{ fontSize: 9, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(16,185,129,0.12)', borderColor: 'rgba(16,185,129,0.3)', color: '#34d399' }} onClick={autoSchedule} disabled={autoScheduling} title="Group scenes by location and pack into shoot days (~5 pg/day)"><Calendar size={12}/> {autoScheduling ? 'Optimising…' : 'Auto-schedule'}</button>
                       <button className="link-btn" style={{ fontSize: 9, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setShowAddScene(s => !s)}><Calendar size={12}/> + Add Scene</button>
                     </div>
                   </div>

                   {showAddScene && (
                     <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                       <input placeholder="Scene title (e.g. EXT. ABANDONED PIER)" value={sceneTitle} onChange={e => setSceneTitle(e.target.value)} style={{ padding: 10, background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', fontSize: 12 }} />
                       <div style={{ display: 'flex', gap: 8 }}>
                         <input placeholder="Location" value={sceneLocation} onChange={e => setSceneLocation(e.target.value)} style={{ flex: 1, padding: 10, background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', fontSize: 12 }} />
                         <input placeholder="Shoot day #" type="number" min="1" value={sceneDay} onChange={e => setSceneDay(e.target.value)} style={{ width: 100, padding: 10, background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', fontSize: 12 }} />
                       </div>
                       <button
                         className="link-btn"
                         disabled={adding || !sceneTitle.trim()}
                         onClick={async () => {
                           if (!activeProject || !sceneTitle.trim() || adding) return;
                           setAdding(true);
                           try {
                             const nextNum = (activeProject.scenes?.length || 0) + 1;
                             const { error } = await supabase.from('scenes').insert({ project_id: activeProject.id, scene_number: nextNum, title: sceneTitle.trim(), time_of_day: 'DAY', location: sceneLocation.trim() || null, shoot_day: Number(sceneDay) || 1 });
                             if (error) { toast(error.message || 'Could not add scene', 'error'); return; }
                             await refreshProject(activeProject.id);
                             setSceneTitle(''); setSceneLocation(''); setSceneDay('1'); setShowAddScene(false);
                           } finally { setAdding(false); }
                         }}
                       >Add Scene</button>
                     </div>
                   )}

                   {(activeProject?.scenes && activeProject.scenes.length > 0) ? (
                     <>
                       <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 8, marginBottom: 12, fontSize: 10, fontFamily: 'var(--mono)', color: '#888' }}>
                         <div style={{ width: 60 }}>Scene</div>
                         <div style={{ flex: 1, minWidth: 200 }}>Location</div>
                         <div style={{ width: 80 }}>Day</div>
                         <div style={{ width: 30 }}></div>
                       </div>
                       <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                         {activeProject.scenes.map(s => {
                           const refs = sceneRefs[s.id] || [];
                           const concepts = (activeProject.concept_assets || []) as any[];
                           const linkedIds = new Set(refs.map(r => r.concept_asset_id));
                           const available = concepts.filter(c => !linkedIds.has(c.id));
                           const picking = linkScene === s.id;
                           return (
                           <div key={s.id} style={{ padding: '8px 0', borderBottom: '1px dashed rgba(255,255,255,0.05)' }}>
                             {editSceneId === s.id ? (
                               <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                 <div style={{ width: 54, fontSize: 11, fontWeight: 700 }}>{s.scene_number}</div>
                                 <input value={editScene.title} onChange={e => setEditScene(p => ({ ...p, title: e.target.value }))} placeholder="Title" style={{ flex: 2, minWidth: 0, padding: '6px 8px', background: '#0a0a0a', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 6, color: '#fff', fontSize: 11 }} />
                                 <input value={editScene.location} onChange={e => setEditScene(p => ({ ...p, location: e.target.value }))} placeholder="Location" style={{ flex: 1, minWidth: 0, padding: '6px 8px', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', fontSize: 11 }} />
                                 <select value={editScene.time_of_day} onChange={e => setEditScene(p => ({ ...p, time_of_day: e.target.value }))} style={{ padding: '6px', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', fontSize: 10 }}>
                                   {['DAY', 'NIGHT', 'DAWN', 'DUSK', 'MORNING', 'EVENING', 'CONTINUOUS'].map(t => <option key={t} value={t}>{t}</option>)}
                                 </select>
                                 <input type="number" min="1" value={editScene.shoot_day} onChange={e => setEditScene(p => ({ ...p, shoot_day: e.target.value }))} style={{ width: 56, padding: '6px', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', fontSize: 11 }} />
                                 <button onClick={saveScene} style={{ background: 'rgba(16,185,129,0.18)', border: '1px solid rgba(16,185,129,0.4)', color: '#10b981', borderRadius: 6, padding: '5px 9px', cursor: 'pointer', fontSize: 10 }}>Save</button>
                                 <button onClick={() => setEditSceneId(null)} style={{ background: 'none', border: 'none', color: '#666', fontSize: 12, cursor: 'pointer' }}>✕</button>
                               </div>
                             ) : (
                             <div style={{ display: 'flex', alignItems: 'center' }}>
                               <div style={{ width: 60, fontSize: 11, fontWeight: 700 }}>{s.scene_number}</div>
                               <div style={{ flex: 1, minWidth: 200 }}>
                                 <div style={{ fontSize: 11, fontWeight: 600 }}>{s.title}{s.time_of_day ? <span style={{ color: '#666', fontFamily: 'var(--mono)', fontSize: 9, marginLeft: 6 }}>{s.time_of_day}</span> : null}</div>
                                 {s.location && <div style={{ fontSize: 9, color: '#888', fontFamily: 'var(--mono)' }}>{s.location}</div>}
                               </div>
                               <div style={{ width: 80, fontSize: 10, color: '#aaa', fontFamily: 'var(--mono)' }}>Day {s.shoot_day}</div>
                               {(() => { const st = s.status || 'planned'; const col = st === 'wrapped' ? '#10b981' : st === 'shot' ? '#f59e0b' : '#6b7280'; return (
                                 <button onClick={() => cycleSceneStatus(s)} title="cycle shoot status" style={{ width: 64, fontFamily: 'var(--mono)', fontSize: 7.5, letterSpacing: 1, textTransform: 'uppercase', color: col, background: `${col}1e`, border: `1px solid ${col}40`, borderRadius: 99, padding: '2px 0', cursor: 'pointer', flexShrink: 0 }}>{st}</button>
                               ); })()}
                               <div style={{ width: 54, textAlign: 'right', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                 <button onClick={() => startEditScene(s)} aria-label="edit scene" style={{ background: 'none', border: 'none', color: '#888', fontSize: 11, cursor: 'pointer' }}>✎</button>
                                 <button title="Delete scene" onClick={async () => { if (!confirm(`Delete scene "${s.title || s.scene_number}"? This cannot be undone.`)) return; await supabase.from('scenes').delete().eq('id', s.id); await refreshProject(activeProject.id); }} style={{ background: 'none', border: 'none', color: '#666', fontSize: 11, cursor: 'pointer' }}>✕</button>
                               </div>
                             </div>
                             )}
                             {/* Linked concept references */}
                             <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, paddingLeft: 60, flexWrap: 'wrap' }}>
                               {refs.map(r => (
                                 <div key={r.id} style={{ position: 'relative', width: 40, height: 28, borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.12)' }} title={r.title || 'reference'}>
                                   {/* eslint-disable-next-line @next/next/no-img-element */}
                                   <img src={r.image_url} alt={r.title || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                   <button onClick={() => unlinkConcept(r.id)} aria-label="unlink" style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', fontSize: 8, lineHeight: 1, cursor: 'pointer', padding: '1px 3px' }}>✕</button>
                                 </div>
                               ))}
                               {concepts.length > 0 && (
                                 <button onClick={() => setLinkScene(picking ? null : s.id)} style={{ fontFamily: 'var(--mono)', fontSize: 8.5, color: '#6366f1', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 4, padding: '3px 7px', cursor: 'pointer' }}>
                                   {picking ? 'close' : '+ ref'}
                                 </button>
                               )}
                               {refs.length === 0 && concepts.length === 0 && (
                                 <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--fg-dim)', opacity: 0.5 }}>add concept images to link references</span>
                               )}
                             </div>
                             {/* Concept picker */}
                             {picking && (
                               <div style={{ marginTop: 8, marginLeft: 60, padding: 8, background: 'rgba(0,0,0,0.3)', borderRadius: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                 {available.length === 0 ? (
                                   <span style={{ fontFamily: 'var(--mono)', fontSize: 8.5, color: 'var(--fg-dim)' }}>All concept images already linked.</span>
                                 ) : available.map(c => (
                                   <button key={c.id} onClick={() => linkConceptToScene(s.id, c.id)} title={c.title || 'link'} style={{ width: 52, height: 36, borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer', padding: 0, background: 'none' }}>
                                     {/* eslint-disable-next-line @next/next/no-img-element */}
                                     <img src={c.image_url} alt={c.title || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                   </button>
                                 ))}
                               </div>
                             )}
                           </div>
                           );
                         })}
                       </div>
                     </>
                   ) : (
                     <EmptyState icon={<Calendar size={28} />} title="No scenes scheduled yet" />
                   )}
                 </div>
               </div>

               {activeProject?.scenes && activeProject.scenes.length > 0 && (
                 <CallSheets scenes={activeProject.scenes as any[]} crew={crewList} projectTitle={activeProject.title} />
               )}
               {activeProject && <CharacterBible projectId={activeProject.id} userId={user?.id ?? null} concepts={(activeProject.concept_assets || []) as any[]} />}
            </div>
          </motion.div>
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

            {loadingBoards ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className="skeleton" style={{ height: 180, borderRadius: 14 }} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={<Archive size={28} />}
                title={assetsList.length === 0 ? 'Vault is empty' : 'No assets match this filter'}
                subtitle={assetsList.length === 0 ? 'Use Intake above to track files hosted elsewhere' : undefined}
              />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
                {filtered.map((asset, i) => <AssetCard key={asset.id} asset={asset} index={i} onClick={setReviewAsset} />)}
              </div>
            )}
          </AnimatedSection>
        )}

        {activeTab === 'pitch' && (
          activeProject ? (
            <ProjectPitchDeck project={activeProject} concepts={(activeProject.concept_assets || []) as any[]} beats={beats} />
          ) : (
            <div style={{ padding: '64px 0', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-dim)', letterSpacing: 2 }}>SELECT A PROJECT TO BUILD A PITCH</div>
          )
        )}
        {activeTab === 'marketing' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
              <div>
                <SectionLabel text="Delivery & Promotion" />
                <h2 style={{ fontFamily: 'var(--display)', fontSize: '2.5rem', letterSpacing: 2 }}>Marketing Hub</h2>
              </div>
              <button className="link-btn" onClick={() => setShowAddCampaign(s => !s)}>+ New Campaign</button>
            </div>

            <div style={{ gridTemplateColumns: '2fr 1fr', display: 'grid', gap: 40 }}>
               {/* Campaign Planner */}
               <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {showAddCampaign && (
                    <div style={{ display: 'flex', gap: 8, padding: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12 }}>
                      <input placeholder="Campaign title" value={campaignTitle} onChange={e => setCampaignTitle(e.target.value)} style={{ flex: 1, padding: 10, background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', fontSize: 12 }} />
                      <select value={campaignPlatform} onChange={e => setCampaignPlatform(e.target.value)} style={{ padding: 10, background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', fontSize: 12 }}>
                        <option>Instagram</option>
                        <option>X / Twitter</option>
                        <option>YouTube</option>
                        <option>TikTok</option>
                      </select>
                      <button
                        className="link-btn"
                        disabled={adding || !campaignTitle.trim()}
                        onClick={async () => {
                          if (!activeProject || !campaignTitle.trim() || adding) return;
                          setAdding(true);
                          try {
                            const { data: { user } } = await supabase.auth.getUser();
                            const { error } = await supabase.from('campaigns').insert({ project_id: activeProject.id, title: campaignTitle.trim(), platform: campaignPlatform, status: 'drafting', created_by: user?.id });
                            if (error) { toast(error.message || 'Could not add campaign', 'error'); return; }
                            await refreshProject(activeProject.id);
                            setCampaignTitle(''); setShowAddCampaign(false);
                          } finally { setAdding(false); }
                        }}
                      >{adding ? 'Adding…' : 'Add'}</button>
                    </div>
                  )}

                  {(activeProject?.campaigns && activeProject.campaigns.length > 0) ? (
                    activeProject.campaigns.map((campaign) => (
                      <div
                        key={campaign.id}
                        style={{ padding: 24, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'border-color 0.3s, box-shadow 0.3s' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,60,0,0.25)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.5)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.boxShadow = 'none'; }}
                      >
                         <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                               <span style={{ fontSize: 9, fontFamily: 'var(--mono)', padding: '2px 6px', background: 'rgba(255,255,255,0.08)', color: '#fff', borderRadius: 4, textTransform: 'uppercase' }}>{campaign.platform}</span>
                               <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{campaign.status}</span>
                            </div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{campaign.title}</div>
                         </div>
                         <button title="Delete campaign" onClick={async () => { if (!confirm(`Delete campaign "${campaign.title}"?`)) return; await supabase.from('campaigns').delete().eq('id', campaign.id); await refreshProject(activeProject.id); }} style={{ background: 'none', border: 'none', color: '#666', fontSize: 12, cursor: 'pointer' }}>✕</button>
                      </div>
                    ))
                  ) : (
                    <EmptyState icon={<Megaphone size={28} />} title="No campaigns planned yet" subtitle="Use + New Campaign above" />
                  )}
               </div>

               {/* Campaign Overview — real */}
               {(() => {
                 const camps = (activeProject?.campaigns || []) as any[];
                 const byStatus: Record<string, number> = {};
                 const byPlatform: Record<string, number> = {};
                 camps.forEach(c => { byStatus[c.status || 'planned'] = (byStatus[c.status || 'planned'] || 0) + 1; byPlatform[c.platform || 'Other'] = (byPlatform[c.platform || 'Other'] || 0) + 1; });
                 return (
                   <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 24 }}>
                     <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Megaphone size={16} /> Campaign Overview</div>
                     {camps.length === 0 ? (
                       <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--fg-dim)' }}>No campaigns yet — create one to start planning your rollout.</div>
                     ) : (
                       <>
                         <div style={{ fontFamily: 'var(--display)', fontSize: '2rem', letterSpacing: 2 }}>{camps.length}<span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--fg-dim)', marginLeft: 8 }}>campaigns</span></div>
                         <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                           {Object.entries(byStatus).map(([st, n]) => (
                             <div key={st} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'var(--mono)' }}><span style={{ color: 'var(--fg-muted)', textTransform: 'capitalize' }}>{st}</span><span>{n}</span></div>
                           ))}
                         </div>
                         <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                           {Object.entries(byPlatform).map(([pl, n]) => (
                             <span key={pl} style={{ fontFamily: 'var(--mono)', fontSize: 9, color: '#a5b4fc', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 99, padding: '2px 8px' }}>{pl} · {n}</span>
                           ))}
                         </div>
                       </>
                     )}
                   </div>
                 );
               })()}
            </div>
          </motion.div>
        )}
      </section>
    </main>
  );
}
