'use client';

import React, { useState } from 'react';
import { ArrowLeft, Music } from 'lucide-react';
import NextImage from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase/client';
import { notify } from '@/lib/supabase/notifications';
import { useEscapeKey } from '@/lib/useEscapeKey';
import { useEffect } from 'react';
import { addStudioAsset, uploadStudioFile } from '@/lib/supabase/studio';
import { List as Download } from 'lucide-react';
import { awaitOSUser } from '@/lib/os';
import { Asset, TYPE_ICONS, TYPE_COLORS } from './constants';

export function AssetCard({ asset, index, onClick }: { asset: Asset; index: number; onClick?: (asset: Asset) => void }) {
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

export function AssetReviewModal({ asset, isOpen, onClose }: { asset: Asset | null; isOpen: boolean; onClose: () => void }) {
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
    const user = await awaitOSUser();
    if (!user) return;
    const { data } = await supabase.from('asset_comments').insert({ asset_id: asset.id, user_id: user.id, content: t, timecode: 'Global' }).select('id,content,timecode,created_at').single();
    if (data) setComments(p => [...p, { ...data, profiles: { username: 'You' } }]);

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

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, background: '#000', position: 'relative' }}>
             {asset.type === 'video' && asset.url ? (
               <video src={asset.url} controls style={{ width: '100%', maxWidth: 1000, maxHeight: '100%', borderRadius: 8, background: '#000' }} />
             ) : asset.type === 'audio' && asset.url ? (
               <div style={{ width: '100%', maxWidth: 600, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                 <Music size={48} color="#555" />
                 <audio src={asset.url} controls style={{ width: '100%' }} />
               </div>
             ) : asset.url ? (
                <NextImage src={asset.url} alt={asset.name} width={800} height={600} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8 }} />
             ) : (
               <div style={{ color: '#666', fontFamily: 'var(--mono)', fontSize: 10 }}>No preview available</div>
             )}
          </div>

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
                      {comment.timecode && <span style={{ fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--accent)', background: 'rgba(215, 52, 11,0.1)', padding: '2px 6px', borderRadius: 4 }}>{comment.timecode}</span>}
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

export function IntakeModal({ isOpen, onClose, boardId, userId, onSuccess }: { isOpen: boolean; onClose: () => void; boardId: string; userId: string; onSuccess: () => void }) {
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
        const uid = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).slice(2);
        const fileName = `${Date.now()}-${uid}.${fileExt}`;
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
              File storage isn&apos;t connected yet — link to a file already hosted elsewhere (Drive, YouTube, etc.) to track it here.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Input
                label="Title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Asset Title"
              />

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

              <Input
                label="External URL"
                value={url}
                onChange={e => {
                  setUrl(e.target.value);
                  if (e.target.value) setFile(null);
                }}
                placeholder="https://..."
              />

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

              <Button
                onClick={handleSubmit}
                disabled={loading || (!url && !file)}
                isLoading={loading}
                fullWidth
                style={{ marginTop: 12 }}
              >
                Complete Intake
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
