'use client';

import React, { useState } from 'react';
import { ArrowLeft, FolderOpen, Image, Video, FileText, Music, Upload, Plus } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import GrainOverlay from '@/components/GrainOverlay';
import NotificationBell from '@/components/NotificationBell';
import MobileNavMenu from '@/components/MobileNavMenu';
import AnimatedSection from '@/components/AnimatedSection';
import SectionLabel from '@/components/SectionLabel';
import { supabase } from '@/lib/supabase/client';
import { getUserProjects, createProject } from '@/lib/supabase/projects';
import { getAllStudioAssets, getOrCreateBoardForProject, addStudioAsset, deleteStudioAsset, getAssetComments, addAssetComment, getAssetCommentCounts } from '@/lib/supabase/studio';
import { uploadAssetFile, detectAssetType, formatFileSize } from '@/lib/supabase/storage';
import { logActivity } from '@/lib/supabase/activity';
import { searchReferences, type ReferenceResult } from '@/lib/references/search';
import { Search, X as XIcon, Plus as PlusIcon } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { useProject, type ScriptSummary, type BudgetItem, type Campaign } from '@/lib/context/ProjectContext';
import { linkAssetToScene } from '@/lib/supabase/sceneLinks';
import { getPhaseTemplate, phaseIndex as getPhaseIndex, CURATED_PROJECT_TYPES } from '@/lib/projectTypes';
import { LayoutGrid, ClipboardList, BookOpen, Layers, Archive, CheckCircle2, Maximize2, Filter, Grid, List as ListIcon, Info, DollarSign, Calendar, MessageSquare, Clock, MapPin, Download, Megaphone, Share2, Eye, TrendingUp, Users, Trash2 } from 'lucide-react';
import { createBeat, deleteBeat } from '@/lib/supabase/beats';
import { getScript } from '@/lib/supabase/scripts';
import { parseScript } from '@/lib/scriptos/parser';
import { getShootDays, addShootDay, getSceneSchedule, ensureSceneSchedule, updateSceneSchedule, subscribeToSchedule, type ShootDay, type SceneSchedule } from '@/lib/supabase/schedule';
import { createBudgetItem, deleteBudgetItem, createJobFromBudgetItem } from '@/lib/supabase/budget';
import { createCampaign, deleteCampaign } from '@/lib/supabase/campaigns';
import { getPortfolioProjectBySource, publishProjectToPortfolio } from '@/lib/supabase/portfolio';
import { usePillStage, usePillEmit, usePillZone } from '@/lib/context/PillContext';
import { jsPDF } from 'jspdf';

interface Asset {
  id: string;
  name: string;
  type: 'image' | 'video' | 'document' | 'audio';
  category: string;
  size: string;
  dateAdded: string;
  url: string;
  commentCount: number;
}

const CAMPAIGN_PLATFORMS = ['Instagram', 'X / Twitter', 'YouTube', 'TikTok', 'Facebook', 'Other'];
const CAMPAIGN_STATUSES = ['Drafting', 'In Review', 'Scheduled', 'Live', 'Completed'];
const PLATFORM_COLORS: Record<string, string> = {
  'Instagram': '#E1306C', 'X / Twitter': '#fff', 'YouTube': '#FF0000',
  'TikTok': '#00f2ea', 'Facebook': '#1877F2', 'Other': '#888',
};

function humanizeActivity(action: string, metadata: Record<string, any> | null): string {
  const verb = action.replace(/_/g, ' ');
  const detail = metadata?.title || metadata?.phase;
  return detail ? `${verb} — ${detail}` : verb;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const STAGES = [
  { id: 'dev', name: 'Development', color: '#ffaa00', icon: BookOpen },
  { id: 'pre', name: 'Pre-Production', color: '#336467', icon: ClipboardList },
  { id: 'prod', name: 'Production', color: '#d7340b', icon: Video },
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
  image: '#336467',
  video: '#d7340b',
  document: '#ffaa00',
  audio: '#00cc66',
};

function AssetCard({ asset, index, onClick }: { asset: Asset; index: number; onClick?: (asset: Asset) => void }) {
  const zone = useMemo(() => ({
    module: 'studio', accent: TYPE_COLORS[asset.type], title: asset.name,
    fields: [
      { label: 'Type', value: asset.category },
      { label: 'Size', value: asset.size },
    ],
    actions: [{ id: 'review', label: '→ Review', onClick: () => onClick && onClick(asset) }],
  }), [asset.type, asset.name, asset.category, asset.size, onClick, asset]);
  const zoneHandlers = usePillZone(zone, 1);

  return (
    <motion.div
      {...zoneHandlers}
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
        {asset.commentCount > 0 && (
           <span style={{ fontSize: 9, background: 'rgba(224,221,174,0.1)', padding: '2px 6px', borderRadius: 4, color: '#ccc' }}>
             {asset.commentCount} {asset.commentCount === 1 ? 'Note' : 'Notes'}
           </span>
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

interface AssetComment {
  id: string;
  content: string;
  timecode: string | null;
  created_at: string;
  profiles?: { username?: string; avatar_url?: string };
}

function formatTimecode(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Frame.io style Asset Review Modal — real video playback, real persisted comments
function AssetReviewModal({ asset, isOpen, onClose, userId, onCommentPosted }: {
  asset: Asset | null;
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  onCommentPosted: (assetId: string) => void;
}) {
  const [comments, setComments] = useState<AssetComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    if (!asset || !isOpen) return;
    setLoadingComments(true);
    getAssetComments(asset.id)
      .then(data => setComments(data || []))
      .catch(() => setComments([]))
      .finally(() => setLoadingComments(false));
  }, [asset?.id, isOpen]);

  if (!asset || !isOpen) return null;

  const handleSend = async () => {
    if (!userId || !draft.trim()) return;
    setPosting(true);
    try {
      const timecode = asset.type === 'video' ? formatTimecode(currentTime) : null;
      const created = await addAssetComment(asset.id, userId, draft.trim(), timecode || undefined);
      setComments(prev => [...prev, created]);
      setDraft('');
      onCommentPosted(asset.id);
    } catch { /* leave draft intact on failure */ }
    setPosting(false);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, zIndex: 2000, background: '#050505', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(224,221,174,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#050a14' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
             <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}><ArrowLeft size={16} /></button>
             <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: '#fff' }}>{asset.name}</div>
           </div>
           <div style={{ display: 'flex', gap: 12 }}>
             <a href={asset.url} download className="link-btn" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}><Download size={12} /> Download</a>
             <button
               className="link-btn"
               style={{ background: 'var(--accent)', color: 'var(--bg)' }}
               onClick={() => { navigator.clipboard.writeText(asset.url); }}
             >
               Copy Link
             </button>
           </div>
        </div>

        {/* Content Area */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Main Viewer */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, background: '#000', position: 'relative' }}>
             {asset.type === 'video' ? (
               <video
                 ref={videoRef}
                 src={asset.url}
                 controls
                 onTimeUpdate={e => setCurrentTime(e.currentTarget.currentTime)}
                 style={{ width: '100%', maxWidth: 1000, maxHeight: '100%', borderRadius: 8, background: '#111' }}
               />
             ) : asset.type === 'image' ? (
               <img src={asset.url} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8 }} />
             ) : asset.type === 'audio' ? (
               <div style={{ width: '100%', maxWidth: 600, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
                 <Music size={48} color="#555" />
                 <audio src={asset.url} controls style={{ width: '100%' }} />
               </div>
             ) : (
               <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                 <FileText size={48} color="#555" />
                 <a href={asset.url} target="_blank" rel="noreferrer" className="link-btn" style={{ textDecoration: 'none' }}>Open Document</a>
               </div>
             )}
          </div>

          {/* Comments Sidebar (Frame.io style) */}
          <div style={{ width: 340, background: '#050a14', borderLeft: '1px solid rgba(224,221,174,0.05)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(224,221,174,0.05)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Review & Feedback</div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
              {loadingComments && <div style={{ fontSize: 11, color: '#666' }}>Loading feedback…</div>}
              {!loadingComments && comments.length === 0 && (
                <div style={{ fontSize: 11, color: '#666' }}>No feedback yet — be the first to leave a note.</div>
              )}
              {comments.map((comment) => (
                <div key={comment.id} style={{ display: 'flex', gap: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(224,221,174,0.1)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
                    {(comment.profiles?.username || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#fff' }}>{comment.profiles?.username || 'Unknown'}</span>
                      {comment.timecode && (
                        <span style={{ fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--accent)', background: 'rgba(215,52,11,0.1)', padding: '2px 6px', borderRadius: 4 }}>{comment.timecode}</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--fg-muted)', lineHeight: 1.4 }}>{comment.content}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ padding: 20, borderTop: '1px solid rgba(224,221,174,0.05)' }}>
               <textarea
                 value={draft}
                 onChange={e => setDraft(e.target.value)}
                 placeholder={asset.type === 'video' ? `Leave a comment at ${formatTimecode(currentTime)}...` : 'Leave a comment...'}
                 style={{ width: '100%', background: 'rgba(224,221,174,0.03)', border: '1px solid rgba(224,221,174,0.1)', borderRadius: 6, padding: 12, color: '#fff', fontSize: 12, resize: 'none', height: 80, marginBottom: 12 }}
               />
               <button
                 onClick={handleSend}
                 disabled={posting || !draft.trim()}
                 style={{ width: '100%', padding: 10, background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, cursor: posting || !draft.trim() ? 'default' : 'pointer', opacity: posting || !draft.trim() ? 0.5 : 1 }}
               >
                 {posting ? 'Sending…' : 'Send Feedback'}
               </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function IntakeModal({ isOpen, onClose, userId, boardId, projectId, onUploaded }: {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  boardId: string | null;
  projectId: string | null;
  onUploaded: (asset: Asset) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState('Asset');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => { setFile(null); setCategory('Asset'); setError(null); };

  const handleSubmit = async () => {
    if (!file || !userId || !boardId) return;
    setUploading(true);
    setError(null);
    try {
      const { url } = await uploadAssetFile(userId, file);
      const assetType = detectAssetType(file);
      const dbAsset = await addStudioAsset({
        board_id: boardId,
        user_id: userId,
        title: file.name,
        asset_url: url,
        asset_type: assetType,
        category,
        file_size: file.size,
      });
      if (projectId) await logActivity(userId, 'uploaded_asset', 'studio_asset', dbAsset.id, { project_id: projectId, title: file.name });
      onUploaded({
        id: dbAsset.id,
        name: file.name,
        type: assetType,
        category,
        size: formatFileSize(file.size),
        dateAdded: new Date(dbAsset.created_at).toISOString().split('T')[0],
        url,
        commentCount: 0,
      });
      reset();
      onClose();
    } catch {
      setError('Upload failed — please try again.');
    } finally {
      setUploading(false);
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
            style={{ width: 500, maxWidth: 'calc(100vw - 40px)', background: '#111', border: '1px solid rgba(224,221,174,0.1)', borderRadius: 16, padding: 32 }}
          >
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Digital Intake</h2>
            <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 24 }}>Upload raw footage, references, or documents to the project vault.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: 'none' }}
                onChange={e => setFile(e.target.files?.[0] || null)}
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => {
                  e.preventDefault();
                  setDragOver(false);
                  const dropped = e.dataTransfer.files?.[0];
                  if (dropped) setFile(dropped);
                }}
                style={{
                  padding: 40, border: `2px dashed ${dragOver ? 'var(--accent)' : 'rgba(224,221,174,0.1)'}`,
                  borderRadius: 12, textAlign: 'center', cursor: 'pointer',
                  background: dragOver ? 'rgba(215,52,11,0.04)' : 'transparent', transition: 'all 0.2s',
                }}
              >
                <Upload size={32} color="var(--accent)" style={{ marginBottom: 12 }} />
                <div style={{ fontSize: 13, fontWeight: 600 }}>{file ? file.name : 'Drop a file here or click to browse'}</div>
                <div style={{ fontSize: 10, color: 'var(--fg-subtle)', marginTop: 4 }}>{file ? formatFileSize(file.size) : 'Any file type'}</div>
              </div>

              <div>
                <label style={{ fontSize: 9, textTransform: 'uppercase', color: '#666', marginBottom: 6, display: 'block' }}>Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  style={{ width: '100%', background: '#050a14', border: '1px solid #333', color: '#fff', padding: 10, borderRadius: 6, fontSize: 12 }}
                >
                  <option>Raw Footage</option>
                  <option>Reference</option>
                  <option>Production Doc</option>
                  <option>Asset</option>
                </select>
              </div>

              {error && <div style={{ fontSize: 11, color: '#ff5555' }}>{error}</div>}
              {!boardId && <div style={{ fontSize: 11, color: '#ffaa00' }}>No active project board yet — open a project first.</div>}

              <button
                onClick={handleSubmit}
                disabled={!file || !boardId || uploading}
                style={{
                  marginTop: 12, padding: 14, background: 'var(--accent)', color: 'var(--bg)', border: 'none', borderRadius: 8,
                  fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 2,
                  cursor: !file || !boardId || uploading ? 'default' : 'pointer',
                  opacity: !file || !boardId || uploading ? 0.5 : 1,
                }}
              >
                {uploading ? 'Uploading…' : 'Start Intake Process'}
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
          color: 'rgba(224,221,174,0.025)',
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
              background: isActive ? stage.color : 'rgba(224,221,174,0.05)', 
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

function ConceptCard({ image, index, onDelete, onLinkToScene, scripts }: {
  image: { id: string; url: string; title: string; sceneLinks?: { id: string; scriptId: string; sceneNumber: string }[] };
  index: number;
  onDelete?: (id: string) => void;
  onLinkToScene?: (assetId: string) => void;
  scripts?: ScriptSummary[];
}) {
  const linkLabels = (image.sceneLinks || []).map(l => {
    const script = scripts?.find(s => s.id === l.scriptId);
    return `${script ? script.title : 'Script'} · Scene ${l.sceneNumber}`;
  });
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      style={{
        marginBottom: 16,
        breakInside: 'avoid',
        position: 'relative',
        borderRadius: 8,
        overflow: 'hidden',
        border: '1px solid rgba(224,221,174,0.05)',
        background: '#050a14'
      }}
    >
      <img src={image.url} alt={image.title} style={{ width: '100%', height: 'auto', display: 'block', opacity: 0.8 }} />
      {linkLabels.length > 0 && (
        <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {linkLabels.map((label, i) => (
            <span key={i} style={{ fontSize: 9, fontFamily: 'var(--mono)', color: '#fff', background: 'rgba(215,52,11,0.85)', borderRadius: 4, padding: '3px 6px', letterSpacing: 0.5 }}>
              {label}
            </span>
          ))}
        </div>
      )}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(transparent 60%, rgba(0,0,0,0.8))',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        opacity: 0,
        transition: 'opacity 0.3s'
      }} onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0'}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 6 }}>
          <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: '#fff', letterSpacing: 1 }}>{image.title}</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {onLinkToScene && (
              <button
                onClick={(e) => { e.stopPropagation(); onLinkToScene(image.id); }}
                style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(224,221,174,0.15)', color: '#fff', borderRadius: 6, fontSize: 9, padding: '4px 8px', cursor: 'pointer' }}
              >
                Link to Scene
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(image.id); }}
                style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(224,221,174,0.15)', color: '#fff', borderRadius: 6, fontSize: 9, padding: '4px 8px', cursor: 'pointer' }}
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function BeatCard({ beat, index, onDelete }: { beat: any; index: number; onDelete?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      style={{
        padding: 20,
        background: 'rgba(224,221,174,0.03)',
        border: `1px solid ${beat.color || 'rgba(224,221,174,0.06)'}`,
        borderTop: `4px solid ${beat.color || 'var(--accent)'}`,
        borderRadius: 8,
        minHeight: 140,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}
    >
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: beat.color }}>{beat.title}</div>
          {onDelete && <button onClick={onDelete} style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', padding: 0 }}><Trash2 size={12} /></button>}
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.5, color: '#ccc' }}>{beat.content}</div>
      </div>
      <div style={{ fontSize: 9, color: 'var(--fg-subtle)', marginTop: 12, fontFamily: 'var(--mono)' }}>{beat.scene_number ? `Scene: ${beat.scene_number}` : 'Unanchored'}</div>
    </motion.div>
  );
}

function CrewMemberCard({ member, index, castAs }: { member: any; index: number; castAs?: string[] }) {
  const zone = useMemo(() => ({
    module: 'studio', accent: '#ffaa00', title: member.name,
    fields: [
      { label: 'Role', value: member.role || 'Crew' },
      { label: 'Status', value: member.status || 'Pending', color: member.status === 'confirmed' ? '#00cc66' : undefined },
    ],
  }), [member.name, member.role, member.status]);
  const zoneHandlers = usePillZone(zone, 1);

  return (
    <motion.div
      {...zoneHandlers}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: 16,
        background: 'rgba(224,221,174,0.02)',
        border: '1px solid rgba(224,221,174,0.05)',
        borderRadius: 12
      }}
    >
      <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(45deg, var(--accent), #ffaa00)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#000' }}>
        {member.avatar ? <img src={member.avatar} style={{ width: '100%', height: '100%', borderRadius: '50%' }} /> : member.name.charAt(0)}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{member.name}</div>
        <div style={{ fontSize: 10, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: 1 }}>{member.role}</div>
        {castAs && castAs.length > 0 && (
          <div style={{ fontSize: 10, color: 'var(--accent)', marginTop: 2 }}>as {castAs.join(', ')}</div>
        )}
      </div>
      <div style={{ fontSize: 9, padding: '4px 8px', background: member.status === 'confirmed' ? 'rgba(0,255,100,0.1)' : 'rgba(224,221,174,0.05)', color: member.status === 'confirmed' ? '#00cc66' : '#666', borderRadius: 4, textTransform: 'uppercase' }}>
        {member.status || 'pending'}
      </div>
    </motion.div>
  );
}

// Pinterest/ShotDeck-style reference search → pin straight to the project moodboard.
function ReferenceSearchModal({
  isOpen, onClose, projectTitle, addedUrls, onAdd,
}: {
  isOpen: boolean;
  onClose: () => void;
  projectTitle?: string;
  addedUrls: Set<string>;
  onAdd: (ref: ReferenceResult) => Promise<void>;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ReferenceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [pending, setPending] = useState<Set<string>>(new Set());

  const runSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await searchReferences(query, 1);
      setResults(res.results);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (ref: ReferenceResult) => {
    setPending(prev => new Set(prev).add(ref.id));
    try { await onAdd(ref); } finally {
      setPending(prev => { const n = new Set(prev); n.delete(ref.id); return n; });
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, zIndex: 1500, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          style={{ width: '100%', maxWidth: 900, maxHeight: '85vh', background: '#0c0c0c', border: '1px solid rgba(224,221,174,0.1)', borderRadius: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
          <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(224,221,174,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Reference Search</div>
              <div style={{ fontSize: 10, color: 'var(--fg-subtle)', marginTop: 2 }}>
                Search visual references{projectTitle ? ` for ${projectTitle}` : ''} and pin them to your moodboard.
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}><XIcon size={18} /></button>
          </div>

          <form onSubmit={runSearch} style={{ padding: '16px 24px', display: 'flex', gap: 10, borderBottom: '1px solid rgba(224,221,174,0.04)' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(224,221,174,0.04)', border: '1px solid rgba(224,221,174,0.08)', borderRadius: 8, padding: '0 12px' }}>
              <Search size={15} color="#888" />
              <input
                autoFocus value={query} onChange={e => setQuery(e.target.value)}
                placeholder="e.g. neon noir, blade runner, golden hour rooftop…"
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 13, padding: '12px 0' }}
              />
            </div>
            <button type="submit" disabled={loading || !query.trim()}
              style={{ padding: '0 20px', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, cursor: loading ? 'default' : 'pointer', opacity: loading || !query.trim() ? 0.5 : 1 }}>
              {loading ? 'Searching…' : 'Search'}
            </button>
          </form>

          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            {!searched ? (
              <div style={{ textAlign: 'center', color: 'var(--fg-subtle)', fontSize: 12, padding: 60 }}>
                Search a mood, film, location, or look to find references.
              </div>
            ) : loading ? (
              <div style={{ textAlign: 'center', color: 'var(--fg-subtle)', fontSize: 12, padding: 60 }}>Searching…</div>
            ) : results.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--fg-subtle)', fontSize: 12, padding: 60 }}>No references found. Try a different term.</div>
            ) : (
              <div style={{ columnCount: 3, columnGap: 12 }}>
                {results.map(ref => {
                  const added = addedUrls.has(ref.url);
                  const isPending = pending.has(ref.id);
                  return (
                    <div key={ref.id} style={{ marginBottom: 12, breakInside: 'avoid', position: 'relative', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(224,221,174,0.06)', background: '#050a14' }}>
                      <img src={ref.thumbnail} alt={ref.title} loading="lazy" style={{ width: '100%', display: 'block' }} />
                      <div
                        style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 55%, rgba(0,0,0,0.85))', opacity: 0, transition: 'opacity 0.2s', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 12, gap: 8 }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                      >
                        <div style={{ fontSize: 9, color: '#ccc', fontFamily: 'var(--mono)' }}>{ref.creator ? `${ref.creator} · ` : ''}{ref.source}</div>
                        <button
                          disabled={added || isPending}
                          onClick={() => handleAdd(ref)}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', background: added ? 'rgba(0,204,102,0.2)' : 'var(--accent)', color: added ? '#00cc66' : '#000', border: 'none', borderRadius: 6, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, cursor: added || isPending ? 'default' : 'pointer' }}
                        >
                          {added ? 'Added ✓' : isPending ? 'Adding…' : <><PlusIcon size={12} /> Add to Board</>}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Fullscreen pitch presentation — cycles the same three slides shown inline,
// with keyboard (arrow/escape) and click navigation so a filmmaker can actually
// present this to investors instead of just eyeballing a static grid.
function PitchPresentationModal({ isOpen, onClose, project, conceptImages, characterNames }: {
  isOpen: boolean;
  onClose: () => void;
  project: any;
  conceptImages: { id: string; url: string; title: string }[];
  characterNames: string[];
}) {
  const [slide, setSlide] = useState(0);
  const slideCount = 3;

  useEffect(() => {
    if (!isOpen) return;
    setSlide(0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight' || e.key === ' ') setSlide(s => Math.min(s + 1, slideCount - 1));
      else if (e.key === 'ArrowLeft') setSlide(s => Math.max(s - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, zIndex: 3000, background: '#000', display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: '#666', letterSpacing: 2, textTransform: 'uppercase' }}>
            Slide {slide + 1} / {slideCount}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}><XIcon size={20} /></button>
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', padding: 40 }}>
          {slide === 1 && conceptImages[0] && (
            <img src={conceptImages[0].url} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.35 }} />
          )}
          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 800 }}>
            <SectionLabel text={`Slide 0${slide + 1}`} />
            {slide === 0 && (
              <>
                <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(2.5rem, 6vw, 5rem)', letterSpacing: 4, margin: '24px 0' }}>{project.title}</h1>
                <div style={{ fontSize: 13, fontFamily: 'var(--mono)', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 2 }}>Logline & Title</div>
                {project.description && <p style={{ fontFamily: 'var(--serif)', fontSize: '1.1rem', color: '#aaa', marginTop: 24 }}>{project.description}</p>}
              </>
            )}
            {slide === 1 && (
              <>
                <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(2.5rem, 6vw, 5rem)', letterSpacing: 4, margin: '24px 0' }}>THE VISUAL WORLD</h1>
                <div style={{ fontSize: 13, fontFamily: 'var(--mono)', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 2 }}>
                  {conceptImages.length > 0 ? 'Cinematography & Mood' : 'No Concept Board references yet'}
                </div>
              </>
            )}
            {slide === 2 && (
              <>
                <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(2.5rem, 6vw, 5rem)', letterSpacing: 4, margin: '24px 0' }}>THE CHARACTERS</h1>
                <div style={{ fontSize: 13, fontFamily: 'var(--mono)', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 2 }}>
                  {characterNames.length > 0 ? characterNames.join(' · ') : 'No Character Bible entries yet'}
                </div>
              </>
            )}
          </div>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 24 }}>
          <button onClick={() => setSlide(s => Math.max(s - 1, 0))} disabled={slide === 0} className="link-btn" style={{ opacity: slide === 0 ? 0.3 : 1 }}>← Prev</button>
          <div style={{ display: 'flex', gap: 8 }}>
            {Array.from({ length: slideCount }).map((_, i) => (
              <button key={i} onClick={() => setSlide(i)} style={{ width: 8, height: 8, borderRadius: '50%', border: 'none', cursor: 'pointer', background: i === slide ? 'var(--accent)' : 'rgba(224,221,174,0.2)' }} />
            ))}
          </div>
          <button onClick={() => setSlide(s => Math.min(s + 1, slideCount - 1))} disabled={slide === slideCount - 1} className="link-btn" style={{ opacity: slide === slideCount - 1 ? 0.3 : 1 }}>Next →</button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function BudgetLineItem({ item, hiring, onHire, onDelete }: {
  item: BudgetItem;
  hiring: boolean;
  onHire: () => void;
  onDelete: () => void;
}) {
  const zone = useMemo(() => ({
    module: 'studio', accent: '#f59e0b', title: item.category,
    fields: [
      { label: 'Amount', value: `$${Number(item.amount).toLocaleString()}` },
      { label: 'Status', value: item.job_id ? 'Job Posted' : 'Open', color: item.job_id ? '#00cc66' : undefined },
    ],
    actions: item.job_id ? [] : [{ id: 'hire', label: hiring ? 'Posting…' : 'Hire for this', onClick: onHire }],
  }), [item.category, item.amount, item.job_id, hiring, onHire]);
  const zoneHandlers = usePillZone(zone, 2);

  return (
    <div {...zoneHandlers} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px dashed rgba(224,221,174,0.05)' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 700 }}>{item.category}</div>
        {item.description && <div style={{ fontSize: 10, color: 'var(--fg-subtle)' }}>{item.description}</div>}
      </div>
      <div style={{ fontSize: 13, fontFamily: 'var(--mono)', color: '#fff' }}>${Number(item.amount).toLocaleString()}</div>
      {item.job_id ? (
        <Link href={`/jobs/${item.job_id}`} target="_blank" style={{ fontSize: 9, padding: '4px 10px', borderRadius: 4, background: 'rgba(0,204,102,0.1)', color: '#00cc66', textDecoration: 'none', whiteSpace: 'nowrap' }}>Job Posted</Link>
      ) : (
        <button
          className="link-btn"
          disabled={hiring}
          onClick={onHire}
          style={{ fontSize: 9, padding: '4px 10px', whiteSpace: 'nowrap' }}
        >
          {hiring ? 'Posting…' : 'Hire for this'}
        </button>
      )}
      <button onClick={onDelete} style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', padding: 4 }}><Trash2 size={13} /></button>
    </div>
  );
}

export default function StudioPage() {
  const { activeProject, setActiveProject, projects, refreshProject, updateProject, addProject } = useProject();
  const emitPill = usePillEmit();
  const [activeTab, setActiveTab] = useState<'overview' | 'concept' | 'production' | 'assets' | 'marketing' | 'pitch'>('overview');
  const [showNewProject, setShowNewProject] = useState(false);
  const [npTitle, setNpTitle] = useState('');
  const [npType, setNpType] = useState('Feature');
  const [npCreating, setNpCreating] = useState(false);
  const [npTitleError, setNpTitleError] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [user, setUser] = useState<any>(null);
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const [assetsList, setAssetsList] = useState<Asset[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [showIntake, setShowIntake] = useState(false);
  const [selectedConcept, setSelectedConcept] = useState<any>(null);
  const [reviewAsset, setReviewAsset] = useState<Asset | null>(null);
  const [conceptLoading, setConceptLoading] = useState(false);
  const [showRefSearch, setShowRefSearch] = useState(false);
  const [showBeatModal, setShowBeatModal] = useState(false);
  const [beatTitle, setBeatTitle] = useState('');
  const [beatContent, setBeatContent] = useState('');
  const [beatScene, setBeatScene] = useState('');
  const [scriptScenes, setScriptScenes] = useState<string[]>([]);
  const [savingBeat, setSavingBeat] = useState(false);
  const [shootDays, setShootDays] = useState<ShootDay[]>([]);
  const [sceneSchedule, setSceneSchedule] = useState<SceneSchedule[]>([]);
  const [sceneCast, setSceneCast] = useState<Record<string, string[]>>({});
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetCategory, setBudgetCategory] = useState('');
  const [budgetDescription, setBudgetDescription] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [savingBudgetItem, setSavingBudgetItem] = useState(false);
  const [hiringForItem, setHiringForItem] = useState<string | null>(null);
  const [portfolioEntry, setPortfolioEntry] = useState<any>(null);
  const [publishingPortfolio, setPublishingPortfolio] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [campaignTitle, setCampaignTitle] = useState('');
  const [campaignPlatform, setCampaignPlatform] = useState('Instagram');
  const [campaignStatus, setCampaignStatus] = useState('Drafting');
  const [campaignReach, setCampaignReach] = useState('');
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [showPresentation, setShowPresentation] = useState(false);

  const tabs = [
    { id: 'overview', name: 'Overview', icon: LayoutGrid },
    { id: 'concept', name: 'Concept', icon: Image },
    { id: 'production', name: 'Production', icon: Video },
    { id: 'assets', name: 'Library', icon: Archive },
    { id: 'marketing', name: 'Promos', icon: Megaphone },
    { id: 'pitch', name: 'Pitch', icon: Maximize2 },
  ];

  const types = ['all', 'image', 'video', 'document', 'audio'];

  // Create a project without leaving the Studio — the entry point a filmmaker
  // hits on their very first visit (previously there was none here).
  const handleCreateProject = async () => {
    if (!user) { window.alert('Sign in to create a project.'); return; }
    const title = npTitle.trim();
    if (!title) { setNpTitleError(true); return; }
    if (npCreating) return;
    setNpTitleError(false);
    setNpCreating(true);
    try {
      const created = await createProject(user.id, title, '', npType);
      addProject(created as any);
      setActiveProject(created as any);
      setShowNewProject(false);
      setNpTitle('');
      setActiveTab('overview');
    } catch {
      window.alert('Could not create the project. Please try again.');
    } finally {
      setNpCreating(false);
    }
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUser(user);

      getAllStudioAssets(user.id).then(async data => {
        const rows = data || [];
        const counts = await getAssetCommentCounts(rows.map((a: any) => a.id)).catch(() => ({}));
        setAssetsList(rows.map((a: any) => ({
          id: a.id,
          name: a.title || 'Untitled',
          type: (a.asset_type as any) || 'document',
          category: a.category || 'Studio',
          size: formatFileSize(a.file_size),
          dateAdded: new Date(a.created_at).toISOString().split('T')[0],
          url: a.asset_url,
          commentCount: counts[a.id] || 0,
        })));
        setAssetsLoading(false);
      }).catch(() => setAssetsLoading(false));
    });
  }, []);

  // The project aggregate (activeProject.boardId / .references) is the single
  // source of truth, shared with every other module via ProjectContext. This
  // effect only ensures a board exists the first time a project is opened —
  // it never holds its own copy of the moodboard data.
  useEffect(() => {
    if (!user || !activeProject || activeProject.boardId) return;
    setConceptLoading(true);
    getOrCreateBoardForProject(user.id, activeProject.id)
      .then(() => refreshProject(activeProject.id))
      .finally(() => setConceptLoading(false));
  }, [user, activeProject?.id, activeProject?.boardId]);

  const boardId = activeProject?.boardId ?? null;
  const conceptImages = useMemo(
    () => (activeProject?.references || []).map(r => ({ id: r.id, url: r.url, title: r.title, sceneLinks: r.sceneLinks })),
    [activeProject?.references]
  );

  const isProjectCompleted = useMemo(() => {
    if (!activeProject) return false;
    const phases = getPhaseTemplate(activeProject.project_type);
    return getPhaseIndex(activeProject.project_type, activeProject.status) === phases.length - 1;
  }, [activeProject?.project_type, activeProject?.status]);

  useEffect(() => {
    if (!user || !activeProject?.id || !isProjectCompleted) { setPortfolioEntry(null); return; }
    getPortfolioProjectBySource(user.id, activeProject.id).then(setPortfolioEntry).catch(() => setPortfolioEntry(null));
  }, [user, activeProject?.id, isProjectCompleted]);

  const handlePublishToPortfolio = async () => {
    if (!user || !activeProject) return;
    setPublishingPortfolio(true);
    try {
      const mediaItems = (activeProject.references || []).map(r => ({
        title: r.title,
        url: r.url,
        media_type: 'image' as const,
      }));
      const entry = await publishProjectToPortfolio(user.id, {
        id: activeProject.id,
        title: activeProject.title,
        description: activeProject.description,
        project_type: activeProject.project_type,
      }, mediaItems);
      setPortfolioEntry(entry);
      emitPill('Published to Portfolio', 'success');
    } finally {
      setPublishingPortfolio(false);
    }
  };

  const characterNames = useMemo(
    () => (activeProject?.characters || []).map(c => c.name),
    [activeProject?.characters]
  );

  const handleLinkToScene = async (assetId: string) => {
    if (!user || !activeProject) return;
    const scripts = activeProject.scripts || [];
    if (scripts.length === 0) {
      window.alert('This project has no scripts yet — create one before linking references to scenes.');
      return;
    }
    let scriptId = scripts[0].id;
    if (scripts.length > 1) {
      const choice = window.prompt(
        `Which script?\n${scripts.map((s, i) => `${i + 1}. ${s.title}`).join('\n')}`,
        '1'
      );
      const idx = Number(choice) - 1;
      if (!choice || idx < 0 || idx >= scripts.length) return;
      scriptId = scripts[idx].id;
    }
    const sceneNumber = window.prompt('Scene number (e.g. 4, 4A):');
    if (!sceneNumber) return;
    try {
      await linkAssetToScene(scriptId, sceneNumber.trim(), assetId, user.id, activeProject.id);
      await refreshProject(activeProject.id);
    } catch { window.alert('Could not link reference to that scene.'); }
  };

  const handleAddConceptRef = async () => {
    if (!user || !boardId || !activeProject) return;
    const url = window.prompt('Image URL for this reference:');
    if (!url) return;
    const title = window.prompt('Label (optional):') || 'Reference';
    try {
      const asset = await addStudioAsset({ board_id: boardId, user_id: user.id, title, asset_url: url, asset_type: 'image' });
      await logActivity(user.id, 'added_reference', 'studio_asset', asset.id, { project_id: activeProject.id, title });
      await refreshProject(activeProject.id);
    } catch { /* ignore — board state unchanged on failure */ }
  };

  const handleDeleteConceptRef = async (id: string) => {
    if (!activeProject) return;
    try { await deleteStudioAsset(id); } finally { await refreshProject(activeProject.id); }
  };

  const handleSaveBudget = async () => {
    if (!activeProject) return;
    const parsed = budgetInput.trim() ? parseFloat(budgetInput) : null;
    const value = parsed != null && Number.isFinite(parsed) ? Math.max(0, parsed) : null;
    await updateProject(activeProject.id, { budget: value });
    await refreshProject(activeProject.id);
    setEditingBudget(false);
  };

  // The project is the living aggregate center: advancing its phase here is the
  // single act that ripples everywhere (completion %, milestones, and the
  // "Publish to Portfolio" gate). Without this the phase track was display-only
  // and a project could never reach "Completed" — leaving portfolio publishing
  // permanently unreachable.
  const handleSetPhase = async (phaseId: string) => {
    if (!activeProject || phaseId === activeProject.status) return;
    const phases = getPhaseTemplate(activeProject.project_type);
    const label = phases.find(p => p.id === phaseId)?.label || phaseId;
    await updateProject(activeProject.id, { status: phaseId });
    if (user) await logActivity(user.id, 'advanced_phase', 'project', activeProject.id, { project_id: activeProject.id, phase: label });
    await refreshProject(activeProject.id);
    emitPill(`Advanced to ${label}`, 'accent');
  };

  // Studio's contextual strip: the project command center. Phase position,
  // completion %, and live budget total are read straight off the aggregate;
  // "Advance" and "Publish" are the same real handlers the page uses — so the
  // Pill drives the project forward exactly as the in-page controls do.
  const studioPill = useMemo(() => {
    if (!activeProject) return null;
    const phases = getPhaseTemplate(activeProject.project_type);
    const idx = getPhaseIndex(activeProject.project_type, activeProject.status);
    const current = phases[idx];
    const next = phases[idx + 1];
    const completion = phases.length > 1 ? Math.round((idx / (phases.length - 1)) * 100) : 0;
    const budgetTotal = (activeProject.budget_items || []).reduce((sum, it) => sum + Number(it.amount || 0), 0);

    const actions = [] as { id: string; label: string; onClick: () => void }[];
    if (next) actions.push({ id: 'advance', label: `→ ${next.label}`, onClick: () => handleSetPhase(next.id) });
    if (isProjectCompleted && !portfolioEntry) actions.push({ id: 'publish', label: 'Publish', onClick: handlePublishToPortfolio });

    return {
      module: 'studio',
      title: activeProject.title,
      fields: [
        { label: 'Phase', value: current?.label || '—', color: '#6366f1' },
        { label: 'Progress', value: `${completion}%`, color: completion === 100 ? '#10b981' : '#6366f1' },
        ...(budgetTotal > 0 ? [{ label: 'Budget', value: `$${budgetTotal.toLocaleString()}`, color: '#f59e0b' }] : []),
      ],
      actions,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProject?.id, activeProject?.title, activeProject?.project_type, activeProject?.status, activeProject?.budget_items, isProjectCompleted, portfolioEntry]);

  usePillStage(studioPill, [studioPill]);

  const handleOpenBudgetModal = () => {
    setBudgetCategory('');
    setBudgetDescription('');
    setBudgetAmount('');
    setShowBudgetModal(true);
  };

  // Deeper than the page: hovering the budget card sharpens the Pill onto the
  // money — live total + line-item count, with the same "Add Line Item" the
  // card's own button fires.
  const budgetZone = useMemo(() => {
    if (!activeProject) return null;
    const items = activeProject.budget_items || [];
    const itemsTotal = items.reduce((sum, it) => sum + Number(it.amount || 0), 0);
    const total = activeProject.budget != null ? Number(activeProject.budget) : itemsTotal;
    return {
      module: 'studio',
      accent: '#f59e0b',
      title: 'Production Budget',
      fields: [
        { label: 'Total', value: total > 0 ? `$${total.toLocaleString()}` : '—', color: '#f59e0b' },
        { label: 'Items', value: `${items.length}` },
      ],
      actions: [
        { id: 'add-line', label: '+ Add Line Item', onClick: handleOpenBudgetModal },
      ],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProject?.id, activeProject?.budget, activeProject?.budget_items]);
  const budgetZoneHandlers = usePillZone(budgetZone, 1);

  const handleCreateBudgetItem = async () => {
    if (!activeProject || !budgetCategory.trim() || !budgetAmount.trim()) return;
    setSavingBudgetItem(true);
    try {
      await createBudgetItem(activeProject.id, {
        category: budgetCategory.trim(),
        description: budgetDescription.trim(),
        amount: Math.max(0, parseFloat(budgetAmount) || 0),
      });
      await refreshProject(activeProject.id);
      setShowBudgetModal(false);
    } finally {
      setSavingBudgetItem(false);
    }
  };

  const handleDeleteBudgetItem = async (id: string) => {
    if (!activeProject) return;
    await deleteBudgetItem(id);
    await refreshProject(activeProject.id);
  };

  const handleHireForBudgetItem = async (item: BudgetItem) => {
    if (!activeProject) return;
    setHiringForItem(item.id);
    try {
      const jobId = await createJobFromBudgetItem(item as any, activeProject.id);
      await refreshProject(activeProject.id);
      window.open(`/jobs/${jobId}`, '_blank');
    } finally {
      setHiringForItem(null);
    }
  };

  const handleOpenCampaignModal = () => {
    setCampaignTitle('');
    setCampaignPlatform('Instagram');
    setCampaignStatus('Drafting');
    setCampaignReach('');
    setShowCampaignModal(true);
  };

  const handleCreateCampaign = async () => {
    if (!activeProject || !campaignTitle.trim()) return;
    setSavingCampaign(true);
    try {
      await createCampaign(activeProject.id, {
        title: campaignTitle.trim(),
        platform: campaignPlatform,
        status: campaignStatus,
        target_reach: campaignReach.trim(),
      });
      await refreshProject(activeProject.id);
      setShowCampaignModal(false);
    } finally {
      setSavingCampaign(false);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!activeProject) return;
    await deleteCampaign(id);
    await refreshProject(activeProject.id);
  };

  const handleOpenBeatModal = async () => {
    setBeatTitle('');
    setBeatContent('');
    setBeatScene('');
    setScriptScenes([]);
    setShowBeatModal(true);
    const scriptId = activeProject?.scripts?.[0]?.id;
    if (!scriptId) return;
    try {
      const script = await getScript(scriptId);
      const { lines } = parseScript(script.content || '', script.format || 'screenplay');
      setScriptScenes(lines.filter(l => l.type === 'slug').map(l => l.text.trim()));
    } catch { /* no script content to pull scenes from — picker stays empty */ }
  };

  const handleCreateBeat = async () => {
    if (!activeProject || !beatTitle.trim()) return;
    setSavingBeat(true);
    try {
      await createBeat(activeProject.id, {
        title: beatTitle.trim(),
        content: beatContent.trim(),
        scriptId: activeProject.scripts?.[0]?.id ?? null,
        sceneNumber: beatScene || null,
      });
      await refreshProject(activeProject.id);
      setShowBeatModal(false);
    } finally {
      setSavingBeat(false);
    }
  };

  const handleDeleteBeat = async (id: string) => {
    if (!activeProject) return;
    await deleteBeat(id);
    await refreshProject(activeProject.id);
  };

  // Shooting Schedule — scenes come from the project's linked script (parsed
  // live, same as the editor), so the schedule never drifts from the actual
  // screenplay structure.
  useEffect(() => {
    if (!activeProject) { setShootDays([]); setSceneSchedule([]); setSceneCast({}); return; }
    let active = true;
    const projectId = activeProject.id;
    const scriptId = activeProject.scripts?.[0]?.id;

    const load = async () => {
      try {
        if (scriptId) {
          const script = await getScript(scriptId);
          const { lines } = parseScript(script.content || '', script.format || 'screenplay');
          const slugs = lines.filter(l => l.type === 'slug');
          const scenes = slugs.map((s, i) => {
            const sceneNumber = (s as any).meta?.sceneNumber || String(i + 1);
            const startIdx = lines.findIndex(l => l.id === s.id);
            const endIdx = i + 1 < slugs.length ? lines.findIndex(l => l.id === slugs[i + 1].id) : lines.length;
            const cast = [...new Set(lines.slice(startIdx, endIdx).filter(l => l.type === 'character').map(l => l.text.trim()))];
            return { sceneNumber, heading: s.text.trim(), cast };
          });
          if (!active) return;
          setSceneCast(Object.fromEntries(scenes.map(s => [s.sceneNumber, s.cast])));
          const schedule = await ensureSceneSchedule(projectId, scriptId, scenes.map(s => ({ sceneNumber: s.sceneNumber, heading: s.heading })));
          if (active) setSceneSchedule(schedule);
        } else {
          const schedule = await getSceneSchedule(projectId);
          if (active) { setSceneSchedule(schedule); setSceneCast({}); }
        }
        const days = await getShootDays(projectId);
        if (active) setShootDays(days);
      } catch { /* schedule stays empty on failure */ }
    };

    load();
    const channel = subscribeToSchedule(projectId, load);
    return () => { active = false; supabase.removeChannel(channel); };
  }, [activeProject?.id, activeProject?.scripts]);

  const handleAddShootDay = async () => {
    if (!activeProject) return;
    await addShootDay(activeProject.id);
    setShootDays(await getShootDays(activeProject.id));
  };

  const handleAssignDay = async (sceneId: string, shootDayId: string) => {
    const updated = await updateSceneSchedule(sceneId, { shoot_day_id: shootDayId || null });
    setSceneSchedule(prev => prev.map(s => s.id === sceneId ? updated : s));
  };

  // Industry-standard call sheet: one shoot day, its scenes/locations/cast, and
  // the full crew roster with contact/status, generated straight from the
  // shooting schedule and Cast & Crew Hub data already on this page.
  const handleGenerateCallSheet = (day: ShootDay) => {
    if (!activeProject) return;
    const daysScenes = sceneSchedule
      .filter(s => s.shoot_day_id === day.id)
      .sort((a, b) => a.order_index - b.order_index);
    const totalHours = daysScenes.reduce((sum, s) => sum + (s.estimated_hours || 0), 0);
    const castOnDay = [...new Set(daysScenes.flatMap(s => sceneCast[s.scene_number] || []))];

    const doc = new jsPDF({ unit: 'in', format: 'letter' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(`CALL SHEET — DAY ${day.day_number}`, 0.75, 0.8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(activeProject.title || 'Untitled Project', 0.75, 1.05);
    doc.text(day.shoot_date ? new Date(day.shoot_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Date TBD', 0.75, 1.25);

    let y = 1.65;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('SCENES', 0.75, y);
    y += 0.25;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    if (daysScenes.length === 0) {
      doc.text('No scenes scheduled for this day.', 0.75, y);
      y += 0.2;
    } else {
      for (const s of daysScenes) {
        doc.text(`SC ${s.scene_number}  ${s.scene_heading}`, 0.75, y);
        y += 0.18;
        doc.setTextColor(90);
        doc.text(`Location: ${s.location || 'TBD'}   Est. ${s.estimated_hours || 0} hrs   Cast: ${(sceneCast[s.scene_number] || []).join(', ') || '—'}`, 0.95, y);
        doc.setTextColor(0);
        y += 0.26;
      }
      y += 0.05;
      doc.setFont('helvetica', 'bold');
      doc.text(`Total estimated: ${totalHours} hrs`, 0.75, y);
      y += 0.3;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('CAST CALLED TODAY', 0.75, y);
    y += 0.25;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    if (castOnDay.length === 0) {
      doc.text('No cast assigned to today\'s scenes.', 0.75, y);
      y += 0.2;
    } else {
      for (const name of castOnDay) {
        doc.text(`${name}`, 0.75, y);
        y += 0.18;
      }
      y += 0.1;
    }
    y += 0.15;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('CREW', 0.75, y);
    y += 0.25;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const crew = activeProject.crew || [];
    if (crew.length === 0) {
      doc.text('No crew assigned yet.', 0.75, y);
    } else {
      for (const member of crew) {
        if (y > 10) { doc.addPage(); y = 0.8; }
        doc.text(`${member.name}  —  ${member.role || 'Crew'}  [${member.status || 'pending'}]`, 0.75, y);
        y += 0.2;
      }
    }

    doc.save(`CallSheet_Day${day.day_number}_${(activeProject.title || 'project').replace(/[^a-z0-9]/gi, '_')}.pdf`);
  };

  const handleSceneFieldBlur = async (sceneId: string, field: 'location' | 'estimated_hours', value: string) => {
    const patch = field === 'estimated_hours' ? { estimated_hours: Math.max(0, parseFloat(value) || 0) } : { location: value };
    const updated = await updateSceneSchedule(sceneId, patch);
    setSceneSchedule(prev => prev.map(s => s.id === sceneId ? updated : s));
  };

  const addReferenceToBoard = async (ref: ReferenceResult) => {
    if (!user || !boardId || !activeProject) return;
    if (conceptImages.some(c => c.url === ref.url)) return;
    try {
      const asset = await addStudioAsset({ board_id: boardId, user_id: user.id, title: ref.title, asset_url: ref.url, asset_type: 'image' });
      await logActivity(user.id, 'added_reference', 'studio_asset', asset.id, { project_id: activeProject.id, title: ref.title });
      await refreshProject(activeProject.id);
    } catch { /* keep board state unchanged on failure */ }
  };

  const addedUrls = useMemo(() => new Set(conceptImages.map(c => c.url)), [conceptImages]);

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
        background: 'rgba(7,11,19,0.92)',
        backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(224,221,174,0.04)',
        boxShadow: '0 1px 0 rgba(99,102,241,0.08) inset',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div style={{ fontFamily: 'var(--display)', fontSize: '0.9rem', letterSpacing: 6, color: 'var(--fg)', opacity: 0.7, transition: 'opacity 0.2s' }}
              onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => (e.currentTarget.style.opacity = '0.7')}
            >MC</div>
          </Link>
          <div style={{ width: 1, height: 16, background: 'rgba(224,221,174,0.08)' }} />
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 3, color: '#6366f1', textTransform: 'uppercase' }}>Studio</div>

          {/* Project Selector */}
          <div className="mobile-nav-hide" style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(224,221,174,0.03)', padding: '4px 12px', borderRadius: 20, border: '1px solid rgba(224,221,174,0.06)' }}>
            <span style={{ fontSize: 8, fontFamily: 'var(--mono)', color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Project:</span>
            <select 
              value={activeProject?.id || ''} 
              onChange={(e) => {
                const p = projects.find(p => p.id === e.target.value);
                if (p) setActiveProject(p);
              }}
              style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 11, fontWeight: 600, outline: 'none', cursor: 'pointer' }}
            >
              {projects.length === 0 && <option value="" style={{ background: '#111' }}>No projects yet</option>}
              {projects.map(p => <option key={p.id} value={p.id} style={{ background: '#111' }}>{p.title}</option>)}
            </select>
            <button
              onClick={() => setShowNewProject(true)}
              title="New project"
              style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(99,102,241,0.16)', border: '1px solid rgba(99,102,241,0.3)', color: '#c7c9ff', borderRadius: 14, padding: '3px 9px', fontSize: 9, fontFamily: 'var(--mono)', letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer' }}
            >
              <PlusIcon size={10} /> New
            </button>
          </div>
        </div>

        <div className="mobile-nav-hide" style={{ display: 'flex', gap: 10 }}>
          <button className="link-btn" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setShowIntake(true)}>
            <Upload size={11} /> Intake
          </button>
          <NotificationBell />
        </div>
        <MobileNavMenu />
      </nav>

      <IntakeModal
        isOpen={showIntake}
        onClose={() => setShowIntake(false)}
        userId={user?.id || null}
        boardId={boardId}
        projectId={activeProject?.id || null}
        onUploaded={asset => setAssetsList(prev => [asset, ...prev])}
      />
      <AssetReviewModal
        asset={reviewAsset}
        isOpen={!!reviewAsset}
        onClose={() => setReviewAsset(null)}
        userId={user?.id || null}
        onCommentPosted={assetId => setAssetsList(prev => prev.map(a => a.id === assetId ? { ...a, commentCount: a.commentCount + 1 } : a))}
      />
      <ReferenceSearchModal
        isOpen={showRefSearch}
        onClose={() => setShowRefSearch(false)}
        projectTitle={activeProject?.title}
        addedUrls={addedUrls}
        onAdd={addReferenceToBoard}
      />
      {activeProject && (
        <PitchPresentationModal
          isOpen={showPresentation}
          onClose={() => setShowPresentation(false)}
          project={activeProject}
          conceptImages={conceptImages}
          characterNames={characterNames}
        />
      )}

      {/* New Project modal */}
      <AnimatePresence>
        {showNewProject && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowNewProject(false)}>
            <motion.div initial={{ scale: 0.94, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.94, opacity: 0, y: 12 }} onClick={e => e.stopPropagation()} style={{ background: 'rgba(10,15,24,0.97)', backdropFilter: 'blur(32px)', border: '1px solid rgba(224,221,174,0.09)', borderRadius: 20, padding: 32, width: 460, maxWidth: 'calc(100vw - 40px)', boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><LayoutGrid size={18} /> New Project</h2>
                <button onClick={() => setShowNewProject(false)} style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer' }}><XIcon size={18} /></button>
              </div>
              <label style={{ display: 'block', fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Title</label>
              <input
                autoFocus value={npTitle} onChange={e => { setNpTitle(e.target.value); if (npTitleError) setNpTitleError(false); }}
                onKeyDown={e => { if (e.key === 'Enter') handleCreateProject(); }}
                placeholder="e.g. Femme Fatale"
                style={{ width: '100%', background: 'rgba(224,221,174,0.05)', border: `1px solid ${npTitleError ? '#ef4444' : 'rgba(224,221,174,0.1)'}`, borderRadius: 8, padding: '11px 14px', color: '#fff', fontSize: 14, outline: 'none', marginBottom: npTitleError ? 6 : 18 }}
              />
              {npTitleError && (
                <div style={{ color: '#ef4444', fontSize: 11, marginBottom: 12 }}>Please enter a title.</div>
              )}
              <label style={{ display: 'block', fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Type</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 26 }}>
                {CURATED_PROJECT_TYPES.map(t => (
                  <button key={t} onClick={() => setNpType(t)}
                    style={{ padding: '7px 14px', borderRadius: 9999, fontSize: 11, cursor: 'pointer',
                      background: npType === t ? 'rgba(99,102,241,0.2)' : 'rgba(224,221,174,0.04)',
                      border: `1px solid ${npType === t ? 'rgba(99,102,241,0.5)' : 'rgba(224,221,174,0.08)'}`,
                      color: npType === t ? '#fff' : 'var(--fg-dim)' }}>
                    {t}
                  </button>
                ))}
              </div>
              <button onClick={handleCreateProject} disabled={!npTitle.trim() || npCreating}
                style={{ width: '100%', background: npTitle.trim() ? 'var(--accent)' : 'rgba(224,221,174,0.08)', color: npTitle.trim() ? '#040710' : 'var(--fg-dim)', border: 'none', borderRadius: 10, padding: '13px', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700, cursor: npTitle.trim() ? 'pointer' : 'default' }}>
                {npCreating ? 'Creating…' : 'Create Project'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBeatModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowBeatModal(false)}>
            <motion.div initial={{ scale: 0.94, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.94, opacity: 0, y: 12 }} onClick={e => e.stopPropagation()} style={{ background: 'rgba(10,15,24,0.97)', backdropFilter: 'blur(32px)', border: '1px solid rgba(224,221,174,0.09)', borderRadius: 20, padding: 32, width: 480, maxWidth: 'calc(100vw - 40px)', boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><BookOpen size={20} /> New Beat</h2>
                <button onClick={() => setShowBeatModal(false)} style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer' }}><XIcon size={18} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Title</label>
                  <input value={beatTitle} onChange={e => setBeatTitle(e.target.value)} placeholder="The Inciting Incident" style={{ width: '100%', background: 'rgba(224,221,174,0.05)', border: '1px solid rgba(224,221,174,0.1)', borderRadius: 6, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Content</label>
                  <textarea value={beatContent} onChange={e => setBeatContent(e.target.value)} style={{ width: '100%', minHeight: 80, background: 'rgba(224,221,174,0.05)', border: '1px solid rgba(224,221,174,0.1)', borderRadius: 6, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Anchor to Scene {scriptScenes.length === 0 && '(no linked script scenes found)'}</label>
                  <select value={beatScene} onChange={e => setBeatScene(e.target.value)} disabled={scriptScenes.length === 0} style={{ width: '100%', background: 'rgba(224,221,174,0.05)', border: '1px solid rgba(224,221,174,0.1)', borderRadius: 6, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none' }}>
                    <option value="" style={{ background: '#111' }}>None</option>
                    {scriptScenes.map((s, i) => <option key={i} value={s} style={{ background: '#111' }}>{s}</option>)}
                  </select>
                </div>
                <button onClick={handleCreateBeat} disabled={!beatTitle.trim() || savingBeat} className="link-btn" style={{ background: 'var(--accent)', color: 'var(--bg)', marginTop: 8, opacity: !beatTitle.trim() || savingBeat ? 0.5 : 1 }}>
                  {savingBeat ? 'Saving…' : 'Add Beat'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBudgetModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowBudgetModal(false)}>
            <motion.div initial={{ scale: 0.94, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.94, opacity: 0, y: 12 }} onClick={e => e.stopPropagation()} style={{ background: 'rgba(10,15,24,0.97)', backdropFilter: 'blur(32px)', border: '1px solid rgba(224,221,174,0.09)', borderRadius: 20, padding: 32, width: 460, maxWidth: 'calc(100vw - 40px)', boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><DollarSign size={20} /> New Budget Line Item</h2>
                <button onClick={() => setShowBudgetModal(false)} style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer' }}><XIcon size={18} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Category</label>
                  <input value={budgetCategory} onChange={e => setBudgetCategory(e.target.value)} placeholder="e.g. Sound Designer" style={{ width: '100%', background: 'rgba(224,221,174,0.05)', border: '1px solid rgba(224,221,174,0.1)', borderRadius: 6, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Description</label>
                  <textarea value={budgetDescription} onChange={e => setBudgetDescription(e.target.value)} style={{ width: '100%', minHeight: 60, background: 'rgba(224,221,174,0.05)', border: '1px solid rgba(224,221,174,0.1)', borderRadius: 6, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Amount (USD)</label>
                  <input type="number" min="0" value={budgetAmount} onChange={e => setBudgetAmount(e.target.value)} placeholder="0" style={{ width: '100%', background: 'rgba(224,221,174,0.05)', border: '1px solid rgba(224,221,174,0.1)', borderRadius: 6, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none' }} />
                </div>
                <button onClick={handleCreateBudgetItem} disabled={!budgetCategory.trim() || !budgetAmount.trim() || savingBudgetItem} className="link-btn" style={{ background: 'var(--accent)', color: 'var(--bg)', marginTop: 8, opacity: !budgetCategory.trim() || !budgetAmount.trim() || savingBudgetItem ? 0.5 : 1 }}>
                  {savingBudgetItem ? 'Saving…' : 'Add Line Item'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCampaignModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowCampaignModal(false)}>
            <motion.div initial={{ scale: 0.94, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.94, opacity: 0, y: 12 }} onClick={e => e.stopPropagation()} style={{ background: 'rgba(10,15,24,0.97)', backdropFilter: 'blur(32px)', border: '1px solid rgba(224,221,174,0.09)', borderRadius: 20, padding: 32, width: 460, maxWidth: 'calc(100vw - 40px)', boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Megaphone size={20} /> New Campaign</h2>
                <button onClick={() => setShowCampaignModal(false)} style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer' }}><XIcon size={18} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Title</label>
                  <input autoFocus value={campaignTitle} onChange={e => setCampaignTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleCreateCampaign(); }} placeholder="e.g. Official Trailer Premiere" style={{ width: '100%', background: 'rgba(224,221,174,0.05)', border: '1px solid rgba(224,221,174,0.1)', borderRadius: 6, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Platform</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {CAMPAIGN_PLATFORMS.map(p => (
                      <button key={p} onClick={() => setCampaignPlatform(p)} style={{ background: campaignPlatform === p ? 'rgba(99,102,241,0.2)' : 'rgba(224,221,174,0.04)', border: campaignPlatform === p ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(224,221,174,0.08)', color: campaignPlatform === p ? '#fff' : '#999', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>{p}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Status</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {CAMPAIGN_STATUSES.map(s => (
                      <button key={s} onClick={() => setCampaignStatus(s)} style={{ background: campaignStatus === s ? 'rgba(99,102,241,0.2)' : 'rgba(224,221,174,0.04)', border: campaignStatus === s ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(224,221,174,0.08)', color: campaignStatus === s ? '#fff' : '#999', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>{s}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Target Reach (optional)</label>
                  <input value={campaignReach} onChange={e => setCampaignReach(e.target.value)} placeholder="e.g. 25k impressions" style={{ width: '100%', background: 'rgba(224,221,174,0.05)', border: '1px solid rgba(224,221,174,0.1)', borderRadius: 6, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none' }} />
                </div>
                <button onClick={handleCreateCampaign} disabled={!campaignTitle.trim() || savingCampaign} className="link-btn" style={{ background: 'var(--accent)', color: 'var(--bg)', marginTop: 8, opacity: !campaignTitle.trim() || savingCampaign ? 0.5 : 1 }}>
                  {savingCampaign ? 'Saving…' : 'Create Campaign'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TABS BAR */}
      <div style={{
        position: 'fixed', top: 62, left: 0, width: '100%',
        height: 52, background: 'rgba(7,11,19,0.88)',
        backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(224,221,174,0.04)',
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        zIndex: 90,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 2,
          background: 'rgba(224,221,174,0.03)',
          border: '1px solid rgba(224,221,174,0.06)',
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

        {/* First-click empty state — no project open yet. */}
        {!activeProject && (
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            style={{ maxWidth: 560, margin: '40px auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}
          >
            <div style={{ width: 64, height: 64, borderRadius: 18, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LayoutGrid size={26} color="#6366f1" />
            </div>
            <h1 style={{ fontFamily: 'var(--display)', fontSize: '2.4rem', letterSpacing: 3, margin: 0 }}>
              {projects.length > 0 ? 'Open a project' : 'Start your first project'}
            </h1>
            <p style={{ fontFamily: 'var(--serif)', fontSize: '1.05rem', color: 'var(--fg-muted)', lineHeight: 1.6, maxWidth: 440 }}>
              {projects.length > 0
                ? 'Choose a project from the selector above, or create a new one. The Studio is your production command center — concept boards, schedule, budget, and the pitch all live here.'
                : 'A project is the living center of your film — script, concept art, crew, schedule and budget all ripple from it. Name it and the Studio comes alive.'}
            </p>
            {projects.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 480 }}>
                {projects.map(p => (
                  <button key={p.id} onClick={() => setActiveProject(p)}
                    style={{ background: 'rgba(224,221,174,0.04)', border: '1px solid rgba(224,221,174,0.08)', color: '#fff', borderRadius: 9999, padding: '8px 16px', fontSize: 12, cursor: 'pointer' }}>
                    {p.title}
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setShowNewProject(true)}
              style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8, background: 'var(--accent)', color: '#040710', border: 'none', borderRadius: 9999, padding: '12px 24px', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700, cursor: 'pointer' }}>
              <PlusIcon size={14} /> New Project
            </button>
          </motion.div>
        )}

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

                {isProjectCompleted && (
                  <div style={{ marginTop: 24, padding: 20, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 600 }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>Project Complete</div>
                      <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 2 }}>
                        {portfolioEntry ? 'Published to your portfolio.' : 'Publish this project to your public portfolio with its real title, description and references.'}
                      </div>
                    </div>
                    {portfolioEntry ? (
                      <Link href="/portfolio" className="link-btn" style={{ background: 'rgba(0,204,102,0.1)', color: '#00cc66', whiteSpace: 'nowrap' }}>View in Portfolio</Link>
                    ) : (
                      <button onClick={handlePublishToPortfolio} disabled={publishingPortfolio} className="link-btn" style={{ background: 'var(--accent)', color: 'var(--bg)', whiteSpace: 'nowrap', opacity: publishingPortfolio ? 0.6 : 1 }}>
                        {publishingPortfolio ? 'Publishing…' : 'Publish to Portfolio'}
                      </button>
                    )}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginTop: 60 }}>
                  <div>
                    <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--fg-subtle)', textTransform: 'uppercase', marginBottom: 12 }}>Production Stats</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(224,221,174,0.05)', paddingBottom: 8 }}>
                        <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>Status</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#ffaa00' }}>{activeProject.status}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(224,221,174,0.05)', paddingBottom: 8 }}>
                        <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>Completion</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>
                          {Math.round((getPhaseIndex(activeProject.project_type, activeProject.status) / (getPhaseTemplate(activeProject.project_type).length - 1)) * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--fg-subtle)', textTransform: 'uppercase', marginBottom: 12 }}>Active Leads</div>
                    {(activeProject.crew || []).length === 0 ? (
                      <div style={{ fontSize: 11, color: 'var(--fg-subtle)', fontStyle: 'italic' }}>No crew assigned yet.</div>
                    ) : (
                      <div style={{ display: 'flex', gap: 8 }}>
                        {(activeProject.crew || []).slice(0, 3).map(c => (
                          <div key={c.id} title={`${c.name} — ${c.role}`} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(224,221,174,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
                            {c.name.slice(0, 2).toUpperCase()}
                          </div>
                        ))}
                        {(activeProject.crew || []).length > 3 && (
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(224,221,174,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
                            +{(activeProject.crew || []).length - 3}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Production Budget */}
                <div {...budgetZoneHandlers} style={{ marginTop: 60, padding: 32, background: 'linear-gradient(to right, rgba(224,221,174,0.02), transparent)', border: '1px solid rgba(224,221,174,0.05)', borderRadius: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
                      <DollarSign size={16} color="var(--accent)" /> Production Budget
                    </div>
                    <span style={{ fontSize: 10, fontFamily: 'var(--mono)', background: 'rgba(224,221,174,0.1)', padding: '4px 10px', borderRadius: 20 }}>USD</span>
                  </div>
                  {editingBudget ? (
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <input
                        type="number"
                        min="0"
                        value={budgetInput}
                        onChange={e => setBudgetInput(e.target.value)}
                        autoFocus
                        placeholder="0"
                        style={{ fontSize: '1.6rem', fontFamily: 'var(--display)', background: 'transparent', border: '1px solid #333', borderRadius: 8, padding: '8px 12px', color: '#fff', width: 220 }}
                      />
                      <button onClick={handleSaveBudget} className="link-btn" style={{ background: 'var(--accent)', color: 'var(--bg)' }}>Save</button>
                      <button onClick={() => setEditingBudget(false)} className="link-btn">Cancel</button>
                    </div>
                  ) : (
                    <div
                      onClick={() => { setBudgetInput(activeProject.budget != null ? String(activeProject.budget) : ''); setEditingBudget(true); }}
                      style={{ cursor: 'pointer' }}
                    >
                      <div style={{ fontSize: 10, color: 'var(--fg-subtle)', textTransform: 'uppercase', marginBottom: 4 }}>Total Estimated Budget</div>
                      <div style={{ fontSize: '2.5rem', fontFamily: 'var(--display)', color: activeProject.budget != null ? '#fff' : '#555', letterSpacing: 2 }}>
                        {activeProject.budget != null ? `$${Number(activeProject.budget).toLocaleString()}` : 'Click to set budget'}
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: 28, paddingTop: 24, borderTop: '1px solid rgba(224,221,174,0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <div style={{ fontSize: 10, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: 1 }}>Line Items</div>
                      <button className="link-btn" onClick={handleOpenBudgetModal} style={{ fontSize: 9, padding: '4px 10px' }}>+ Add Line Item</button>
                    </div>
                    {(activeProject.budget_items || []).length === 0 ? (
                      <div style={{ fontSize: 11, color: 'var(--fg-subtle)', fontStyle: 'italic' }}>No budget line items yet.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {(activeProject.budget_items || []).map(item => (
                          <BudgetLineItem
                            key={item.id}
                            item={item}
                            hiring={hiringForItem === item.id}
                            onHire={() => handleHireForBudgetItem(item)}
                            onDelete={() => handleDeleteBudgetItem(item.id)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Project Milestone Timeline — click any phase to advance the
                    project there. This is the one control that drives the whole
                    aggregate forward (completion %, portfolio-publish gate). */}
                <div style={{ marginTop: 40 }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <SectionLabel text="Project Milestones" />
                     {(() => {
                       const phases = getPhaseTemplate(activeProject.project_type);
                       const idx = getPhaseIndex(activeProject.project_type, activeProject.status);
                       const next = phases[idx + 1];
                       return next ? (
                         <button onClick={() => handleSetPhase(next.id)} className="link-btn" style={{ fontSize: 9, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                           <CheckCircle2 size={12} /> Advance to {next.label}
                         </button>
                       ) : null;
                     })()}
                   </div>
                   <div style={{ position: 'relative', paddingLeft: 24, borderLeft: '1px solid rgba(224,221,174,0.05)', display: 'flex', flexDirection: 'column', gap: 24, marginTop: 12 }}>
                      {getPhaseTemplate(activeProject.project_type).map((phase, i) => {
                        const currentIdx = getPhaseIndex(activeProject.project_type, activeProject.status);
                        const completed = currentIdx >= i;
                        const isCurrent = currentIdx === i;
                        return (
                          <button key={phase.id} onClick={() => handleSetPhase(phase.id)} title={`Set phase to ${phase.label}`} style={{ position: 'relative', background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer', padding: 0 }}>
                             <div style={{ position: 'absolute', left: -28, top: 4, width: 8, height: 8, borderRadius: '50%', background: completed ? 'var(--accent)' : '#222', border: completed ? 'none' : '1px solid #444', boxShadow: isCurrent ? '0 0 0 3px rgba(215,52,11,0.2)' : 'none' }} />
                             <div style={{ fontSize: 12, fontWeight: 700, color: completed ? '#fff' : '#666', display: 'flex', alignItems: 'center', gap: 8 }}>
                               {phase.label}
                               {isCurrent && <span style={{ fontSize: 8, fontFamily: 'var(--mono)', color: 'var(--accent)', border: '1px solid rgba(215,52,11,0.3)', borderRadius: 4, padding: '1px 5px', textTransform: 'uppercase', letterSpacing: 1 }}>Current</span>}
                             </div>
                          </button>
                        );
                      })}
                   </div>
                </div>
              </motion.div>
            </div>

            <div style={{ background: 'rgba(224,221,174,0.02)', border: '1px solid rgba(224,221,174,0.06)', borderRadius: 12, padding: 32 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <ClipboardList size={16} /> Recent Activity
              </div>
              {(activeProject.activity || []).length === 0 ? (
                <div style={{ fontSize: 11, color: 'var(--fg-subtle)', fontStyle: 'italic' }}>No activity yet.</div>
              ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {(activeProject.activity || []).slice(0, 6).map((act) => (
                  <div key={act.id} style={{ display: 'flex', gap: 12 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(224,221,174,0.1)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700 }}>
                      {(act.profiles?.username || '?').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#eee' }}>
                        <span style={{ fontWeight: 700 }}>{act.profiles?.username || 'Someone'}</span> {humanizeActivity(act.action, act.metadata)}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--fg-subtle)' }}>{timeAgo(act.created_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'concept' && activeProject && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
              <div>
                <SectionLabel text="Visual Research" />
                <h2 style={{ fontFamily: 'var(--display)', fontSize: '2.5rem', letterSpacing: 2 }}>Concept Board</h2>
                {!user && (
                  <p style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 8 }}>Sign in to save references to this project's moodboard.</p>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="link-btn"
                  onClick={() => setShowRefSearch(true)}
                  disabled={!user || !boardId}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Search size={12} /> Search References
                </button>
                <button className="link-btn" onClick={handleAddConceptRef} disabled={!user}>+ Add URL</button>
              </div>
            </div>
            {conceptLoading ? (
              <div style={{ color: 'var(--fg-subtle)', fontSize: 12 }}>Loading moodboard…</div>
            ) : conceptImages.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center', border: '1px dashed rgba(224,221,174,0.1)', borderRadius: 12, color: 'var(--fg-subtle)', fontSize: 12 }}>
                No references yet. {user ? 'Click "+ New Ref" to pin your first image.' : 'Sign in to start building this project\'s moodboard.'}
              </div>
            ) : (
              <div style={{ columnCount: 3, columnGap: 16 }}>
                {conceptImages.map((img, i) => <ConceptCard key={img.id} image={img} index={i} onDelete={handleDeleteConceptRef} onLinkToScene={handleLinkToScene} scripts={activeProject?.scripts} />)}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'production' && activeProject && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
              <div>
                <SectionLabel text="Pre-Production" />
                <h2 style={{ fontFamily: 'var(--display)', fontSize: '2.5rem', letterSpacing: 2 }}>Production Suite</h2>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {activeProject && <button className="link-btn" onClick={handleOpenBeatModal}>+ New Beat</button>}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 40 }}>
               {/* Beat Board */}
               <div>
                 <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--fg-muted)' }}>
                   <BookOpen size={16} /> Beat Board / Outline
                 </div>
                 {(activeProject?.beats || []).length === 0 ? (
                   <div style={{ fontSize: 11, color: 'var(--fg-subtle)', fontStyle: 'italic' }}>No beats yet — outline the story with "+ New Beat".</div>
                 ) : (
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                     {(activeProject?.beats || []).map((beat, i) => (
                       <BeatCard key={beat.id} beat={beat} index={i} onDelete={() => handleDeleteBeat(beat.id)} />
                     ))}
                   </div>
                 )}
               </div>

               {/* Staffing & Casting */}
               <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
                 <div>
                   <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--fg-muted)' }}>
                     <Users size={16} /> Cast & Crew Hub
                   </div>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                     {(activeProject?.crew || []).length === 0 && (
                       <div style={{ fontSize: 11, color: 'var(--fg-subtle)', fontStyle: 'italic' }}>No crew assigned yet.</div>
                     )}
                     {(activeProject?.crew || []).map((member, i) => (
                       <CrewMemberCard
                         key={member.id}
                         member={member}
                         index={i}
                         castAs={(activeProject?.characters || []).filter(c => c.played_by_crew_id === member.id).map(c => c.name)}
                       />
                     ))}
                     {activeProject && (
                       <Link href={`/projects/${activeProject.id}`} style={{ padding: 12, border: '1px dashed rgba(224,221,174,0.1)', background: 'transparent', color: '#666', borderRadius: 8, fontSize: 11, cursor: 'pointer', textAlign: 'center', textDecoration: 'none' }}>
                         + Recruit Crew / Invite Talent
                       </Link>
                     )}
                   </div>
                 </div>

                 {/* Shooting Schedule — scenes parsed live from the linked script */}
                 <div style={{ background: 'rgba(224,221,174,0.02)', border: '1px solid rgba(224,221,174,0.06)', borderRadius: 12, padding: 24, overflowX: 'auto' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                     <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Shooting Schedule</div>
                     {activeProject && <button className="link-btn" onClick={handleAddShootDay} style={{ fontSize: 9, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={12}/> + Add Shoot Day</button>}
                   </div>

                   {sceneSchedule.length === 0 ? (
                     <div style={{ fontSize: 11, color: 'var(--fg-subtle)', fontStyle: 'italic' }}>
                       {activeProject?.scripts?.length ? 'No scenes detected in the linked script yet.' : 'Link a script to this project to build the shooting schedule from its scenes.'}
                     </div>
                   ) : (
                     <>
                       <div style={{ display: 'flex', borderBottom: '1px solid rgba(224,221,174,0.1)', paddingBottom: 8, marginBottom: 12, fontSize: 10, fontFamily: 'var(--mono)', color: '#888' }}>
                         <div style={{ width: 50 }}>Scene</div>
                         <div style={{ flex: 1, minWidth: 160 }}>Heading / Location</div>
                         <div style={{ width: 110 }}>Cast</div>
                         <div style={{ width: 70 }}>Est. Hrs</div>
                         <div style={{ width: 130 }}>Shoot Day</div>
                       </div>
                       <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                         {sceneSchedule.map(s => (
                           <div key={s.id} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: '1px dashed rgba(224,221,174,0.05)' }}>
                             <div style={{ width: 50, fontSize: 11, fontWeight: 700 }}>{s.scene_number}</div>
                             <div style={{ flex: 1, minWidth: 160 }}>
                               <div style={{ fontSize: 11, fontWeight: 600 }}>{s.scene_heading}</div>
                               <input
                                 defaultValue={s.location}
                                 placeholder="Location…"
                                 onBlur={e => handleSceneFieldBlur(s.id, 'location', e.target.value)}
                                 style={{ width: '90%', marginTop: 4, background: 'transparent', border: 'none', borderBottom: '1px dashed rgba(224,221,174,0.1)', color: '#aaa', fontSize: 9, fontFamily: 'var(--mono)', outline: 'none', padding: '2px 0' }}
                               />
                             </div>
                             <div style={{ width: 110, fontSize: 10, color: '#aaa', fontFamily: 'var(--mono)' }}>{(sceneCast[s.scene_number] || []).join(', ') || '—'}</div>
                             <input
                               type="number"
                               min="0"
                               defaultValue={s.estimated_hours || ''}
                               placeholder="0"
                               onBlur={e => handleSceneFieldBlur(s.id, 'estimated_hours', e.target.value)}
                               style={{ width: 70, background: 'rgba(224,221,174,0.03)', border: '1px solid rgba(224,221,174,0.06)', borderRadius: 4, color: '#ccc', fontSize: 10, fontFamily: 'var(--mono)', outline: 'none', padding: '4px 6px' }}
                             />
                             <select
                               value={s.shoot_day_id || ''}
                               onChange={e => handleAssignDay(s.id, e.target.value)}
                               style={{ width: 130, background: 'rgba(224,221,174,0.03)', border: '1px solid rgba(224,221,174,0.06)', borderRadius: 4, color: '#ccc', fontSize: 10, outline: 'none', padding: '4px 6px' }}
                             >
                               <option value="" style={{ background: '#111' }}>Unscheduled</option>
                               {shootDays.map(d => <option key={d.id} value={d.id} style={{ background: '#111' }}>Day {d.day_number}</option>)}
                             </select>
                           </div>
                         ))}
                       </div>
                     </>
                   )}

                   {shootDays.length > 0 && (
                     <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(224,221,174,0.06)' }}>
                       <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--fg-muted)', marginBottom: 10 }}>Call Sheets</div>
                       <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                         {shootDays.map(day => {
                           const count = sceneSchedule.filter(s => s.shoot_day_id === day.id).length;
                           return (
                             <div key={day.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                               <span>Day {day.day_number} — {count} scene{count !== 1 ? 's' : ''}{day.shoot_date ? ` · ${new Date(day.shoot_date).toLocaleDateString()}` : ''}</span>
                               <button className="link-btn" onClick={() => handleGenerateCallSheet(day)} style={{ fontSize: 9, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                                 <FileText size={11} /> Generate Call Sheet
                               </button>
                             </div>
                           );
                         })}
                       </div>
                     </div>
                   )}
                 </div>
               </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'assets' && activeProject && (
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
                    background: filter === t ? 'var(--accent)' : 'rgba(224,221,174,0.03)',
                    border: `1px solid ${filter === t ? 'var(--accent)' : 'rgba(224,221,174,0.06)'}`,
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

            {assetsLoading ? (
              <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--fg-subtle)', fontSize: 12, fontFamily: 'var(--mono)' }}>Loading library…</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '60px 0', textAlign: 'center', border: '1px dashed rgba(224,221,174,0.08)', borderRadius: 12 }}>
                <Archive size={28} color="#444" style={{ marginBottom: 12 }} />
                <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 4 }}>No assets in your library yet.</div>
                <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>Use Intake above to upload raw footage, references, or documents.</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
                {filtered.map((asset, i) => <AssetCard key={asset.id} asset={asset} index={i} onClick={setReviewAsset} />)}
              </div>
            )}
          </AnimatedSection>
        )}

        {activeTab === 'pitch' && activeProject && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
              <div>
                <SectionLabel text="Investor Relations" />
                <h2 style={{ fontFamily: 'var(--display)', fontSize: '2.5rem', letterSpacing: 2 }}>Pitch Deck Mode</h2>
              </div>
              <button className="link-btn" style={{ background: 'var(--accent)', color: 'var(--bg)' }} onClick={() => setShowPresentation(true)}>Enter Presentation View</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
              <div style={{ background: '#050a14', border: '1px solid rgba(224,221,174,0.05)', borderRadius: 12, padding: 32, aspectRatio: '4/3', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
                <SectionLabel text="Slide 01" />
                <h3 style={{ fontFamily: 'var(--display)', fontSize: '2rem', letterSpacing: 4, margin: '20px 0' }}>{activeProject.title}</h3>
                <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--accent)', textTransform: 'uppercase' }}>Logline & Title</div>
              </div>
              <div style={{ background: '#050a14', border: '1px solid rgba(224,221,174,0.05)', borderRadius: 12, padding: 32, aspectRatio: '4/3', overflow: 'hidden', position: 'relative' }}>
                {conceptImages[0] && (
                  <img src={conceptImages[0].url} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.3 }} />
                )}
                <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
                  <SectionLabel text="Slide 02" />
                  <h3 style={{ fontFamily: 'var(--display)', fontSize: '2rem', letterSpacing: 4, margin: '20px 0' }}>THE VISUAL WORLD</h3>
                  <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--accent)', textTransform: 'uppercase' }}>
                    {conceptImages.length > 0 ? 'Cinematography & Mood' : 'No Concept Board references yet'}
                  </div>
                </div>
              </div>
              <div style={{ background: '#050a14', border: '1px solid rgba(224,221,174,0.05)', borderRadius: 12, padding: 32, aspectRatio: '4/3', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
                <SectionLabel text="Slide 03" />
                <h3 style={{ fontFamily: 'var(--display)', fontSize: '2rem', letterSpacing: 4, margin: '20px 0' }}>THE CHARACTERS</h3>
                <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--accent)', textTransform: 'uppercase' }}>
                  {characterNames.length > 0 ? characterNames.slice(0, 4).join(' · ') : 'No Character Bible entries yet'}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 40, padding: 24, background: 'rgba(215,52,11,0.05)', border: '1px solid rgba(215,52,11,0.1)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 16 }}>
              <Info size={20} color="var(--accent)" />
              <div style={{ fontSize: 12, color: '#ccc' }}>
                <span style={{ fontWeight: 700, color: 'var(--accent)' }}>Pro Tip:</span> This deck pulls its visuals from your Concept Board and its cast list from your ScriptOS Character Bible. Update either to see changes here.
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'marketing' && activeProject && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
              <div>
                <SectionLabel text="Delivery & Promotion" />
                <h2 style={{ fontFamily: 'var(--display)', fontSize: '2.5rem', letterSpacing: 2 }}>Marketing Hub</h2>
              </div>
              <button className="link-btn" onClick={handleOpenCampaignModal}>+ New Campaign</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 720 }}>
               {(activeProject.campaigns || []).map((campaign) => {
                 const color = PLATFORM_COLORS[campaign.platform] || '#888';
                 return (
                    <div key={campaign.id} style={{ padding: 24, background: 'rgba(224,221,174,0.02)', border: '1px solid rgba(224,221,174,0.05)', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                             <span style={{ fontSize: 9, fontFamily: 'var(--mono)', padding: '2px 6px', background: `${color}22`, color, borderRadius: 4, textTransform: 'uppercase' }}>{campaign.platform}</span>
                             <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{campaign.status}</span>
                          </div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{campaign.title}</div>
                       </div>
                       <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                          {campaign.target_reach && (
                            <div style={{ textAlign: 'right' }}>
                               <div style={{ fontSize: 10, color: 'var(--fg-subtle)', marginBottom: 4 }}>Target Reach</div>
                               <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4 }}><TrendingUp size={12}/> {campaign.target_reach}</div>
                            </div>
                          )}
                          <button onClick={() => handleDeleteCampaign(campaign.id)} style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', padding: 4 }}><Trash2 size={13} /></button>
                       </div>
                    </div>
                 );
               })}

               {(activeProject.campaigns || []).length === 0 && (
                 <div style={{ padding: 32, border: '1px dashed rgba(224,221,174,0.1)', borderRadius: 12, textAlign: 'center', color: '#666', fontSize: 12 }}>
                    <Megaphone size={24} style={{ marginBottom: 12, opacity: 0.5, margin: '0 auto' }} />
                    No campaigns yet. Click "+ New Campaign" to plan your first promotion.
                 </div>
               )}
            </div>
          </motion.div>
        )}
      </section>
    </main>
  );
}
