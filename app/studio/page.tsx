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
import { useEffect, useMemo } from 'react';
import { useProject } from '@/lib/context/ProjectContext';
import { saveScript } from '@/lib/scriptos/storage';
import { getActivities, subscribeToActivities, type Activity } from '@/lib/supabase/activity';
import { getProjectBoards, createStudioBoard, getStudioAssets, deleteStudioAsset, addStudioAsset, getProjectBeats, createProjectBeat, deleteProjectBeat, getMarketingCampaigns, createMarketingCampaign, deleteMarketingCampaign, uploadStudioFile } from '@/lib/supabase/studio';
import { searchProfiles, inviteToCrew, getProjectCrew } from '@/lib/supabase/profiles';
import { ProtectedPage } from '@/lib/permissions/access-control';
import { LayoutGrid, ClipboardList, BookOpen, Layers, Archive, CheckCircle2, Maximize2, Filter, Grid, List as ListIcon, Info, DollarSign, Calendar, MessageSquare, Clock, MapPin, Download, Megaphone, Share2, Eye, TrendingUp, Users, Trash2, Search } from 'lucide-react';

interface Asset {
  id: string;
  name: string;
  type: 'image' | 'video' | 'document' | 'audio';
  category: string;
  size: string;
  dateAdded: string;
}

const ASSETS: Asset[] = [
  { id: '1', name: 'Femme Fatale — Draft 9', type: 'document', category: 'Screenplays', size: '248 KB', dateAdded: '2026-04-15' },
  { id: '2', name: '10 Million — Final Cut', type: 'video', category: 'Music Videos', size: '4.2 GB', dateAdded: '2026-04-20' },
  { id: '3', name: 'The Briefcase — Poster Concept', type: 'image', category: 'Marketing', size: '3.8 MB', dateAdded: '2026-04-10' },
  { id: '4', name: 'Production Score — V1', type: 'audio', category: 'Audio', size: '68 MB', dateAdded: '2026-03-28' },
  { id: '5', name: 'Grand PSA — Grade LUT', type: 'document', category: 'Color', size: '12 KB', dateAdded: '2026-03-15' },
  { id: '6', name: 'Altitude — Raw Footage B-Roll', type: 'video', category: 'Documentaries', size: '11.3 GB', dateAdded: '2026-02-20' },
];

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
             ) : (
               <img src={CONCEPT_IMAGES[1].url} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8 }} />
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

function IntakeModal({ isOpen, onClose, boardId, userId, onSuccess }: { isOpen: boolean; onClose: () => void; boardId: string; userId: string; onSuccess: () => void }) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState('Reference');
  const [type, setType] = useState('image');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if ((!url && !file) || !boardId || !userId) return;
    setLoading(true);
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
      alert('Upload failed. Check console for details.');
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
            <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 24 }}>Upload raw footage, references, or documents to the project vault.</p>
            
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

function ConceptCard({ asset, index, onDelete }: { asset: any; index: number; onDelete?: (id: string) => void }) {
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
      <img src={asset.url} alt={asset.name} style={{ width: '100%', height: 'auto', display: 'block', opacity: isHovered ? 1 : 0.8, transition: 'opacity 0.3s' }} />
      
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
            {onDelete && (
              <button 
                onClick={() => onDelete(asset.id)}
                style={{ background: 'rgba(255,0,0,0.2)', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ff4444' }}
              >
                <Trash2 size={14} />
              </button>
            )}
            <div style={{ width: '100%' }}>
              <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: '#fff', letterSpacing: 1, display: 'block' }}>{asset.name}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function BeatCard({ beat, index, onDelete, onPush }: { beat: any; index: number; onDelete?: (id: string) => void; onPush?: (beat: any) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
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
        position: 'relative'
      }}
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
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, color: beat.color }}>{beat.title}</div>
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
      transition={{ delay: index * 0.05 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: 16,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 12
      }}
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
  const { activeProject, setActiveProject, projects } = useProject();
  const [activeTab, setActiveTab] = useState<'overview' | 'concept' | 'production' | 'assets' | 'marketing' | 'pitch'>('overview');
  const [filter, setFilter] = useState<string>('all');
  const [user, setUser] = useState<any>(null);
  const [assetsList, setAssetsList] = useState<Asset[]>(ASSETS);
  const [showIntake, setShowIntake] = useState(false);
  const [selectedConcept, setSelectedConcept] = useState<any>(null);
  const [reviewAsset, setReviewAsset] = useState<Asset | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [boards, setBoards] = useState<any[]>([]);
  const [activeBoard, setActiveBoard] = useState<any>(null);
  const [loadingBoards, setLoadingBoards] = useState(false);
  const [beats, setBeats] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [crewList, setCrewList] = useState<any[]>([]);
  const [showRecruit, setShowRecruit] = useState(false);

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
          const projectCampaigns = await getMarketingCampaigns(activeProject.id);
          setCampaigns(projectCampaigns);
        } catch (err) {
          console.error('Error loading campaigns:', err);
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
    <ProtectedPage requiredPermission="access_studio">
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
                      <div style={{ fontSize: '2.5rem', fontFamily: 'var(--display)', color: '#fff', letterSpacing: 2 }}>${((activeProject as any).budget || 0).toLocaleString()}</div>
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
                      {(activeProject.timeline_items && activeProject.timeline_items.length > 0 ? activeProject.timeline_items : [
                        { title: 'Project Initialization', start_date: (activeProject as any).created_at || (activeProject as any).createdAt || new Date().toISOString(), completion: 100 },
                      ]).map((m: any, i) => (
                        <div key={i} style={{ position: 'relative' }}>
                           <div style={{ position: 'absolute', left: -28, top: 4, width: 8, height: 8, borderRadius: '50%', background: m.completion === 100 ? 'var(--accent)' : '#222', border: m.completion === 100 ? 'none' : '1px solid #444' }} />
                           <div style={{ fontSize: 12, fontWeight: 700, color: m.completion === 100 ? '#fff' : '#666' }}>{m.title}</div>
                           <div style={{ fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--fg-subtle)' }}>{new Date(m.start_date).toLocaleDateString()}</div>
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
              <button className="link-btn" onClick={() => setShowIntake(true)}>+ New Ref</button>
            </div>
            <div style={{ columnCount: 3, columnGap: 16 }}>
              {assetsList.filter(a => a.type === 'image').length > 0 ? (
                assetsList.filter(a => a.type === 'image').map((asset, i) => (
                  <ConceptCard key={asset.id} asset={asset} index={i} onDelete={handleDeleteAsset} />
                ))
              ) : (
                <div style={{ gridColumn: 'span 3', padding: 100, textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px dashed rgba(255,255,255,0.1)' }}>
                  <Image size={40} color="#333" style={{ marginBottom: 16 }} />
                  <div style={{ color: '#666', fontSize: 14 }}>No concept references yet. Start by adding an image to the project vault.</div>
                </div>
              )}
            </div>
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
                <button className="link-btn">Export Schedule</button>
                <button className="link-btn" onClick={handleAddBeat}>+ New Beat</button>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 40 }}>
               {/* Beat Board */}
               <div>
                 <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--fg-muted)' }}>
                   <BookOpen size={16} /> Beat Board / Outline
                 </div>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                   {beats.length > 0 ? (
                     beats.map((beat, i) => (
                       <BeatCard key={beat.id} beat={beat} index={i} onDelete={handleDeleteBeat} onPush={handlePushToScript} />
                     ))
                   ) : (
                     <div style={{ gridColumn: 'span 2', padding: 40, border: '1px dashed rgba(255,255,255,0.05)', borderRadius: 8, textAlign: 'center', color: '#444', fontSize: 11 }}>
                       No beats created for this project. Start outlining to see them here.
                     </div>
                   )}
                 </div>
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
                        <div style={{ padding: 20, textAlign: 'center', color: '#444', fontSize: 11 }}>No crew members recruited yet.</div>
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
                     <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Shooting Schedule (Gantt)</div>
                     <button className="link-btn" style={{ fontSize: 9, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={12}/> View Call Sheets</button>
                   </div>
                   
                   {/* Gantt Header */}
                   <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 8, marginBottom: 12, fontSize: 10, fontFamily: 'var(--mono)', color: '#888' }}>
                     <div style={{ width: 60 }}>Scene</div>
                     <div style={{ flex: 1, minWidth: 200 }}>Location</div>
                     <div style={{ width: 100 }}>Cast</div>
                     <div style={{ width: 60 }}>Est. Time</div>
                     <div style={{ width: 140, display: 'flex', justifyContent: 'space-between' }}>
                       <span>Day 1</span><span>Day 2</span><span>Day 3</span>
                     </div>
                   </div>

                   <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {beats.length > 0 ? (
                        beats.map((beat, i) => {
                          const colors = ['#003366', '#ffcc00', '#ff6600', '#a855f7', '#00cc66'];
                          const color = beat.color || colors[i % colors.length];
                          const day = Math.floor(i / 2) + 1;
                          const span = 0.5 + (Math.random() * 1.5);
                          return (
                            <div key={beat.id} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: '1px dashed rgba(255,255,255,0.05)' }}>
                              <div style={{ width: 60, fontSize: 11, fontWeight: 700 }}>{i + 1}</div>
                              <div style={{ flex: 1, minWidth: 200 }}>
                                <div style={{ fontSize: 11, fontWeight: 600 }}>{beat.title}</div>
                                <div style={{ fontSize: 9, color: color, fontFamily: 'var(--mono)' }}>{i % 2 === 0 ? 'DAY' : 'NIGHT'}</div>
                              </div>
                              <div style={{ width: 100, fontSize: 10, color: '#aaa', fontFamily: 'var(--mono)' }}>1, {2 + (i % 3)}</div>
                              <div style={{ width: 60, fontSize: 10, color: '#aaa', fontFamily: 'var(--mono)' }}>{Math.floor(span * 2)}h</div>
                              
                              {/* Gantt Bar */}
                              <div style={{ width: 140, position: 'relative', height: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 4, overflow: 'hidden' }}>
                                 <div style={{ 
                                   position: 'absolute', 
                                   left: `${((day - 1) * 33) + ((i % 2) * 15)}%`, 
                                   width: `${span * 20}%`, 
                                   height: '100%', 
                                   background: color, 
                                   opacity: 0.8,
                                   borderRadius: 4
                                 }} />
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div style={{ padding: 40, textAlign: 'center', color: '#444', fontSize: 11 }}>
                           No story beats yet to generate schedule.
                        </div>
                      )}
                    </div>
                 </div>
               </div>
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
                {assetsList.find(a => a.type === 'image') && (
                  <img src={(assetsList.find(a => a.type === 'image') as any)?.url} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.3 }} />
                )}
                <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
                  <SectionLabel text="Slide 02" />
                  <h3 style={{ fontFamily: 'var(--display)', fontSize: '2rem', letterSpacing: 4, margin: '20px 0' }}>THE VISUAL WORLD</h3>
                  <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--accent)', textTransform: 'uppercase' }}>Cinematography & Mood</div>
                </div>
              </div>
              <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: 32, aspectRatio: '4/3', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
                <SectionLabel text="Slide 03" />
                <h3 style={{ fontFamily: 'var(--display)', fontSize: '1.5rem', letterSpacing: 2, margin: '20px 0' }}>{beats[0]?.title || 'STORY BEATS'}</h3>
                <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--accent)', textTransform: 'uppercase' }}>Narrative Engine</div>
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
              <div>
                <SectionLabel text="Delivery & Promotion" />
                <h2 style={{ fontFamily: 'var(--display)', fontSize: '2.5rem', letterSpacing: 2 }}>Marketing Hub</h2>
              </div>
              <button className="link-btn" onClick={async () => {
                const title = prompt('Campaign Title:');
                if (!title) return;
                const platform = prompt('Platform (e.g. Instagram):');
                await createMarketingCampaign({ project_id: activeProject.id, title, platform });
                const updated = await getMarketingCampaigns(activeProject.id);
                setCampaigns(updated);
              }}>+ New Campaign</button>
            </div>

            <div style={{ gridTemplateColumns: '2fr 1fr', display: 'grid', gap: 40 }}>
               {/* Campaign Planner */}
               <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {campaigns.length > 0 ? campaigns.map((campaign, i) => (
                    <div key={campaign.id} style={{ padding: 24, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                             <span style={{ fontSize: 9, fontFamily: 'var(--mono)', padding: '2px 6px', background: `${campaign.accent_color}22`, color: campaign.accent_color, borderRadius: 4, textTransform: 'uppercase' }}>{campaign.platform}</span>
                             <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{campaign.status}</span>
                          </div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{campaign.title}</div>
                       </div>
                       <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 20 }}>
                          <div>
                            <div style={{ fontSize: 10, color: 'var(--fg-subtle)', marginBottom: 4 }}>Reach Potential</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4 }}><TrendingUp size={12}/> {campaign.reach_estimate || 'Pending'}</div>
                          </div>
                          <button 
                            onClick={async () => {
                              if (!confirm('Delete campaign?')) return;
                              await deleteMarketingCampaign(campaign.id);
                              const updated = await getMarketingCampaigns(activeProject.id);
                              setCampaigns(updated);
                            }}
                            style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                    </div>
                  )) : (
                    <div style={{ padding: 60, border: '1px dashed rgba(255,255,255,0.05)', borderRadius: 12, textAlign: 'center', color: '#444' }}>
                      <Megaphone size={32} style={{ marginBottom: 16, opacity: 0.3, margin: '0 auto' }} />
                      No marketing campaigns tracked yet.
                    </div>
                  )}
                  
                  <div style={{ padding: 32, border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 12, textAlign: 'center', color: '#666', fontSize: 12 }}>
                     <Megaphone size={24} style={{ marginBottom: 12, opacity: 0.5, margin: '0 auto' }} />
                     Plan your global promotion strategy here.
                  </div>
               </div>

               {/* Analytics Preview */}
               <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 24 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}><Eye size={16} /> Awareness Metrics</div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                     <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 8 }}><span>Interest Score</span><span>78%</span></div>
                        <div style={{ height: 4, background: '#222', borderRadius: 2 }}><div style={{ width: '78%', height: '100%', background: 'var(--accent)', borderRadius: 2 }} /></div>
                     </div>
                     <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 8 }}><span>Audience Retention</span><span>64%</span></div>
                        <div style={{ height: 4, background: '#222', borderRadius: 2 }}><div style={{ width: '64%', height: '100%', background: '#0099ff', borderRadius: 2 }} /></div>
                     </div>
                  </div>

                  <div style={{ marginTop: 32, padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}>
                     <div style={{ fontSize: 10, color: 'var(--fg-subtle)', marginBottom: 8 }}>Top Performing Asset</div>
                     <div style={{ fontSize: 12, fontWeight: 600 }}>Neon Noir Poster Concept</div>
                     <div style={{ fontSize: 10, color: '#00cc66', marginTop: 4 }}>+12% Engagement</div>
                  </div>

                  <button style={{ width: '100%', marginTop: 24, padding: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#fff', borderRadius: 8, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, cursor: 'pointer' }}>View Detailed Analytics</button>
               </div>
            </div>
          </motion.div>
        )}
      </section>
      </main>
    </ProtectedPage>
  );
}
