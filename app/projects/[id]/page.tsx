'use client';

import React, { Suspense, useState, useEffect, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Plus, Trash2, Edit2, Check, X, ChevronRight,
  FileText, Image, Music, Video, Users, Clock, Calendar, Award,
  Download, Share2, Lock, Unlock, Loader, AlertCircle,
} from 'lucide-react';
import { useProject } from '@/lib/context/ProjectContext';
import { useToast } from '@/components/Toast';
import GrainOverlay from '@/components/GrainOverlay';
import { supabase } from '@/lib/supabase/client';
import { getAllScripts, deleteScript as deleteScriptRow, type StoredScript } from '@/lib/scriptos/storage';
import type { Project, CrewMember, TimelineItem, Beat } from '@/lib/context/ProjectContext';

// ─── Demo data banner — used by tabs that aren't backed by real storage yet ──

function DemoBanner({ text }: { text: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 14px', borderRadius: 8, marginBottom: 20,
      background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
    }}>
      <AlertCircle size={12} color="#f59e0b" />
      <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: '#f59e0b', letterSpacing: 0.5 }}>{text}</span>
    </div>
  );
}

// ─── Tabs ───────────────────────────────────────────────────────────────────

type TabId = 'screenplay' | 'assets' | 'crew' | 'schedule' | 'showcase' | 'launch';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'screenplay', label: 'Screenplay', icon: <FileText size={14} /> },
  { id: 'assets',     label: 'Assets',     icon: <Image size={14} /> },
  { id: 'crew',       label: 'Crew',       icon: <Users size={14} /> },
  { id: 'schedule',   label: 'Schedule',   icon: <Calendar size={14} /> },
  { id: 'showcase',   label: 'Showcase',   icon: <Award size={14} /> },
  { id: 'launch',     label: 'Launch',     icon: <Share2 size={14} /> },
];

// ─── Screenplay Tab ───────────────────────────────────────────────────────────

function ScreenplayTab({ project }: { project: Project }) {
  const { toast } = useToast();
  const [scripts, setScripts] = useState<StoredScript[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const accent = project.accent_color || '#ff3c00';

  const loadScripts = async () => {
    setLoading(true);
    const all = await getAllScripts();
    setScripts(all.filter(s => s.project_id === project.id));
    setLoading(false);
  };

  useEffect(() => { loadScripts(); }, [project.id]);

  const handleAddScript = async () => {
    setCreating(true);
    window.location.href = `/editor?new=1&projectId=${project.id}&title=${encodeURIComponent(project.title)}`;
  };

  const handleDelete = async (script: StoredScript) => {
    if (!confirm(`Delete "${script.title}"? This can't be undone.`)) return;
    const ok = await deleteScriptRow(script.id);
    if (ok) {
      setScripts(s => s.filter(x => x.id !== script.id));
      toast(`Deleted ${script.title}`, 'success');
    } else {
      toast('Failed to delete script', 'error');
    }
  };

  const wordCount = (content: string) => content.trim().split(/\s+/).filter(Boolean).length;
  const pageEstimate = (content: string) => Math.max(1, Math.round(wordCount(content) / 220));

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'var(--display)', fontSize: '1.5rem', letterSpacing: 2 }}>Screenplay</h2>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          disabled={creating}
          onClick={handleAddScript}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 16px', borderRadius: 8, border: 'none', background: `${accent}20`,
            color: accent, fontFamily: 'var(--mono)', fontSize: 9,
            letterSpacing: 2, textTransform: 'uppercase', cursor: creating ? 'wait' : 'pointer',
            opacity: creating ? 0.6 : 1,
          }}
        >
          {creating ? <Loader size={14} className="spin" /> : <Plus size={14} />} {creating ? 'Creating…' : 'New Script'}
        </motion.button>
      </div>

      {loading ? (
        <div style={{ padding: '40px 0', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--fg-dim)' }}>
          Loading scripts…
        </div>
      ) : scripts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            border: '2px dashed rgba(255,255,255,0.1)', borderRadius: 16,
            padding: '48px 24px', textAlign: 'center', background: 'rgba(255,255,255,0.01)',
          }}
        >
          <FileText size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <p style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--fg-dim)', letterSpacing: 1.5, textTransform: 'uppercase' }}>
            No scripts yet
          </p>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--fg-dim)', marginTop: 8, opacity: 0.6 }}>
            Create one to start writing in ScriptOS
          </p>
        </motion.div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {scripts.map(s => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
                padding: '16px',
                background: 'rgba(255,255,255,0.02)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h3 style={{ fontFamily: 'var(--display)', fontSize: '0.95rem', marginBottom: 6 }}>{s.title}</h3>
                <div style={{ display: 'flex', gap: 16, fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--fg-dim)' }}>
                  <span>~{pageEstimate(s.content || '')} pages</span>
                  <span>{wordCount(s.content || '')} words</span>
                  <span>Updated {new Date(s.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Link href={`/editor?scriptId=${s.id}`} style={{ textDecoration: 'none' }}>
                  <motion.button
                    whileHover={{ scale: 1.06, x: 2 }}
                    style={{
                      padding: '8px 14px', borderRadius: 8, border: 'none',
                      background: `${accent}28`,
                      color: accent,
                      fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 2,
                      textTransform: 'uppercase', cursor: 'pointer',
                    }}
                  >
                    Open
                  </motion.button>
                </Link>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  onClick={() => handleDelete(s)}
                  style={{ background: 'none', border: 'none', color: 'var(--fg-dim)', cursor: 'pointer', padding: 8 }}
                >
                  <Trash2 size={14} />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Assets Tab ────────────────────────────────────────────────────────────────

function AssetsTab({ project }: { project: Project }) {
  const { toast } = useToast();
  const [assets, setAssets] = useState<any[]>([
    { id: '1', name: 'Draft 9.fdx', type: 'document', size: '1.2 MB' },
    { id: '2', name: 'Final Cut v3.mov', type: 'video', size: '2.4 GB' },
    { id: '3', name: 'Score_Final.wav', type: 'audio', size: '456 MB' },
    { id: '4', name: 'Poster_Concept.png', type: 'image', size: '12 MB' },
    { id: '5', name: 'Grade_LUT.cube', type: 'document', size: '456 KB' },
  ]);

  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video size={14} />;
      case 'audio': return <Music size={14} />;
      case 'image': return <Image size={14} />;
      default: return <FileText size={14} />;
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: '1.5rem', letterSpacing: 2, marginBottom: 8 }}>Assets Library</h2>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--fg-dim)' }}>{assets.length} files • Total: ~4.8 GB</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => toast('File upload feature coming soon', 'info')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 16px', borderRadius: 8, border: 'none', background: `${project.accent_color || '#ff3c00'}20`,
            color: project.accent_color || '#ff3c00', fontFamily: 'var(--mono)', fontSize: 9,
            letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer',
          }}
        >
          <Plus size={14} /> Upload
        </motion.button>
      </div>

      <DemoBanner text="Demo data — file storage isn't connected yet" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        {assets.map((asset, i) => (
          <motion.div
            key={asset.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            style={{
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              padding: '14px',
              background: 'rgba(255,255,255,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ color: project.accent_color || '#ff3c00' }}>
                {getAssetIcon(asset.type)}
              </div>
              <motion.button
                whileHover={{ scale: 1.15 }}
                onClick={() => {
                  setAssets(a => a.filter(x => x.id !== asset.id));
                  toast(`Deleted ${asset.name}`, 'success');
                }}
                style={{
                  background: 'none', border: 'none', color: 'var(--fg-dim)',
                  cursor: 'pointer', padding: 0,
                }}
              >
                <Trash2 size={12} />
              </motion.button>
            </div>
            <h3 style={{ fontFamily: 'var(--display)', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {asset.name}
            </h3>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 7.5, color: 'var(--fg-dim)' }}>
              {asset.size}
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              style={{
                marginTop: 'auto',
                padding: '6px 10px', borderRadius: 6, border: 'none',
                background: `${project.accent_color || '#ff3c00'}15`,
                color: project.accent_color || '#ff3c00',
                fontFamily: 'var(--mono)', fontSize: 7.5, letterSpacing: 1.5,
                textTransform: 'uppercase', cursor: 'pointer',
              }}
            >
              <Download size={10} style={{ marginRight: 4 }} />
              Download
            </motion.button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Crew Tab ──────────────────────────────────────────────────────────────────

function CrewTab({ project }: { project: Project }) {
  const { toast } = useToast();
  const { addCrewMember, removeCrewMember } = useProject();
  const crew = project.crew || [];
  const [newMember, setNewMember] = useState({ username: '', role: '' });
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const accent = project.accent_color || '#ff3c00';

  const handleAddMember = async () => {
    if (!newMember.username.trim() || !newMember.role.trim()) {
      toast('Enter a username and role', 'error');
      return;
    }
    setSubmitting(true);
    const { error } = await addCrewMember(project.id, newMember.username.trim(), newMember.role.trim());
    setSubmitting(false);
    if (error) {
      toast(error, 'error');
    } else {
      toast(`Added ${newMember.username}`, 'success');
      setNewMember({ username: '', role: '' });
    }
  };

  const handleRemove = async (member: CrewMember) => {
    setRemovingId(member.id);
    await removeCrewMember(project.id, member.id);
    setRemovingId(null);
    toast(`Removed ${member.name}`, 'success');
  };

  return (
    <div style={{ padding: '24px' }}>
      <h2 style={{ fontFamily: 'var(--display)', fontSize: '1.5rem', letterSpacing: 2, marginBottom: 24 }}>Team</h2>

      {/* Add new member form */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          border: '1px dashed rgba(255,255,255,0.1)',
          borderRadius: 12,
          padding: '16px',
          marginBottom: 24,
          background: 'rgba(255,255,255,0.01)',
        }}
      >
        <p style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--fg-dim)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>Add Team Member</p>
        <p style={{ fontFamily: 'var(--mono)', fontSize: 7.5, color: 'var(--fg-dim)', opacity: 0.6, marginBottom: 12 }}>
          They must already have a Misfits Cavern account.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12 }}>
          <input
            type="text"
            placeholder="Username"
            value={newMember.username}
            onChange={e => setNewMember({ ...newMember, username: e.target.value })}
            onKeyDown={e => e.key === 'Enter' && handleAddMember()}
            style={{
              padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.02)', color: 'var(--fg)',
              fontFamily: 'var(--mono)', fontSize: 9,
            }}
          />
          <input
            type="text"
            placeholder="Role"
            value={newMember.role}
            onChange={e => setNewMember({ ...newMember, role: e.target.value })}
            onKeyDown={e => e.key === 'Enter' && handleAddMember()}
            style={{
              padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.02)', color: 'var(--fg)',
              fontFamily: 'var(--mono)', fontSize: 9,
            }}
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={submitting}
            onClick={handleAddMember}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 8, border: 'none',
              background: `${accent}25`,
              color: accent,
              fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 2,
              textTransform: 'uppercase', cursor: submitting ? 'wait' : 'pointer',
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? <Loader size={12} /> : <Plus size={12} />} Add
          </motion.button>
        </div>
      </motion.div>

      {/* Crew list */}
      {crew.length === 0 ? (
        <div style={{
          border: '2px dashed rgba(255,255,255,0.1)', borderRadius: 16,
          padding: '40px 24px', textAlign: 'center', background: 'rgba(255,255,255,0.01)',
        }}>
          <Users size={28} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
          <p style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--fg-dim)', letterSpacing: 1.5, textTransform: 'uppercase' }}>
            No crew members yet
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {crew.map((member, i) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              style={{
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
                padding: '14px',
                background: 'rgba(255,255,255,0.02)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                opacity: removingId === member.id ? 0.5 : 1,
              }}
            >
              <Link
                href={member.user_id ? `/crew/${member.user_id}` : '#'}
                style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: 10, cursor: member.user_id ? 'pointer' : 'default' }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: `hsl(${(i * 97) % 360}, 40%, 30%)`,
                  border: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--fg)',
                  overflow: 'hidden',
                }}>
                  {member.avatar ? <img src={member.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : member.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 style={{ fontFamily: 'var(--display)', fontSize: '0.95rem', marginBottom: 4 }}>{member.name}</h3>
                  <p style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--fg-dim)', textTransform: 'uppercase', letterSpacing: 1 }}>{member.role}</p>
                </div>
              </Link>
              <motion.button
                whileHover={{ scale: 1.1 }}
                disabled={removingId === member.id}
                onClick={() => handleRemove(member)}
                style={{
                  background: 'none', border: 'none', color: 'var(--fg-dim)',
                  cursor: 'pointer', padding: 4,
                }}
              >
                <Trash2 size={14} />
              </motion.button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Schedule Tab ───────────────────────────────────────────────────────────────

function ScheduleTab({ project }: { project: Project }) {
  const { toast } = useToast();
  const { addTimelineItem, updateTimelineItem, removeTimelineItem } = useProject();
  const milestones = project.timeline_items || [];
  const accent = project.accent_color || '#ff3c00';
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ phase: 'pre-production', title: '', start_date: '', end_date: '' });

  const handleAdd = async () => {
    if (!newItem.title.trim() || !newItem.start_date || !newItem.end_date) {
      toast('Title, start date, and end date are required', 'error');
      return;
    }
    setSubmitting(true);
    await addTimelineItem({
      project_id: project.id,
      phase: newItem.phase,
      title: newItem.title.trim(),
      start_date: newItem.start_date,
      end_date: newItem.end_date,
      completion: 0,
    });
    setSubmitting(false);
    setNewItem({ phase: 'pre-production', title: '', start_date: '', end_date: '' });
    setShowForm(false);
    toast('Milestone added', 'success');
  };

  const handleRemove = async (m: TimelineItem) => {
    setRemovingId(m.id);
    await removeTimelineItem(m.id, project.id);
    setRemovingId(null);
    toast(`Removed ${m.title}`, 'success');
  };

  const handleCompletionChange = (m: TimelineItem, completion: number) => {
    updateTimelineItem(m.id, project.id, { completion });
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'var(--display)', fontSize: '1.5rem', letterSpacing: 2 }}>Production Schedule</h2>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowForm(s => !s)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 16px', borderRadius: 8, border: 'none', background: `${accent}20`,
            color: accent, fontFamily: 'var(--mono)', fontSize: 9,
            letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer',
          }}
        >
          {showForm ? <X size={14} /> : <Plus size={14} />} {showForm ? 'Cancel' : 'Add Milestone'}
        </motion.button>
      </div>

      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            border: '1px dashed rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: '16px',
            marginBottom: 24,
            background: 'rgba(255,255,255,0.01)',
            display: 'grid',
            gap: 12,
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <input
              type="text"
              placeholder="Milestone title"
              value={newItem.title}
              onChange={e => setNewItem({ ...newItem, title: e.target.value })}
              style={{
                padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.02)', color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 9,
              }}
            />
            <select
              value={newItem.phase}
              onChange={e => setNewItem({ ...newItem, phase: e.target.value })}
              style={{
                padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.02)', color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 9,
              }}
            >
              <option value="development">development</option>
              <option value="pre-production">pre-production</option>
              <option value="production">production</option>
              <option value="post-production">post-production</option>
              <option value="delivery">delivery</option>
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12 }}>
            <input
              type="date"
              value={newItem.start_date}
              onChange={e => setNewItem({ ...newItem, start_date: e.target.value })}
              style={{
                padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.02)', color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 9,
              }}
            />
            <input
              type="date"
              value={newItem.end_date}
              onChange={e => setNewItem({ ...newItem, end_date: e.target.value })}
              style={{
                padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.02)', color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 9,
              }}
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={submitting}
              onClick={handleAdd}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 8, border: 'none',
                background: `${accent}25`, color: accent,
                fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 2,
                textTransform: 'uppercase', cursor: submitting ? 'wait' : 'pointer',
                opacity: submitting ? 0.6 : 1,
              }}
            >
              {submitting ? <Loader size={12} /> : <Check size={12} />} Save
            </motion.button>
          </div>
        </motion.div>
      )}

      {milestones.length === 0 ? (
        <div style={{
          border: '2px dashed rgba(255,255,255,0.1)', borderRadius: 16,
          padding: '40px 24px', textAlign: 'center', background: 'rgba(255,255,255,0.01)',
        }}>
          <Calendar size={28} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
          <p style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--fg-dim)', letterSpacing: 1.5, textTransform: 'uppercase' }}>
            No milestones yet
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {milestones.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              style={{
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
                padding: '16px',
                background: 'rgba(255,255,255,0.02)',
                opacity: removingId === m.id ? 0.5 : 1,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <h3 style={{ fontFamily: 'var(--display)', fontSize: '1rem', marginBottom: 4 }}>{m.title}</h3>
                  <p style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--fg-dim)', textTransform: 'uppercase', letterSpacing: 1 }}>{m.phase}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: accent, fontWeight: 700 }}>
                    {m.completion}%
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    disabled={removingId === m.id}
                    onClick={() => handleRemove(m)}
                    style={{ background: 'none', border: 'none', color: 'var(--fg-dim)', cursor: 'pointer', padding: 4 }}
                  >
                    <Trash2 size={14} />
                  </motion.button>
                </div>
              </div>

              {/* Progress bar — drag to set completion */}
              <div
                onClick={e => {
                  const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                  const pct = Math.round(((e.clientX - rect.left) / rect.width) * 100);
                  handleCompletionChange(m, Math.max(0, Math.min(100, pct)));
                }}
                style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden', marginBottom: 12, cursor: 'pointer' }}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${m.completion}%` }}
                  transition={{ duration: 0.8, delay: i * 0.05 + 0.2 }}
                  style={{ height: '100%', background: accent, borderRadius: 4 }}
                />
              </div>

              {/* Dates */}
              <div style={{ display: 'flex', gap: 16, fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--fg-dim)' }}>
                <span>Start: {new Date(m.start_date).toLocaleDateString()}</span>
                <span>End: {new Date(m.end_date).toLocaleDateString()}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Showcase Tab ───────────────────────────────────────────────────────────────

interface PortfolioEntry {
  id: string;
  title: string;
  category: string | null;
  year: number | null;
  share_token: string;
}

function ShowcaseTab({ project }: { project: Project }) {
  const { toast } = useToast();
  const accent = project.accent_color || '#ff3c00';
  const [entries, setEntries] = useState<PortfolioEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('portfolio_projects')
      .select('id, title, category, year, share_token')
      .eq('source_project_id', project.id)
      .order('updated_at', { ascending: false });
    setEntries(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [project.id]);

  const handleAddWork = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setLinking(true);
    const { data, error } = await supabase
      .from('portfolio_projects')
      .insert({ user_id: user.id, title: project.title, source_project_id: project.id, category: project.type || null })
      .select('id, title, category, year, share_token')
      .single();
    setLinking(false);
    if (error || !data) {
      toast('Failed to add to portfolio', 'error');
      return;
    }
    setEntries(e => [data, ...e]);
    toast('Added to your portfolio — add media in Portfolio', 'success');
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'var(--display)', fontSize: '1.5rem', letterSpacing: 2 }}>Showcase</h2>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          disabled={linking}
          onClick={handleAddWork}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 16px', borderRadius: 8, border: 'none', background: `${accent}20`,
            color: accent, fontFamily: 'var(--mono)', fontSize: 9,
            letterSpacing: 2, textTransform: 'uppercase', cursor: linking ? 'wait' : 'pointer',
            opacity: linking ? 0.6 : 1,
          }}
        >
          {linking ? <Loader size={14} /> : <Plus size={14} />} Add to Portfolio
        </motion.button>
      </div>

      {loading ? (
        <div style={{ padding: '40px 0', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--fg-dim)' }}>
          Loading…
        </div>
      ) : entries.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            border: '2px dashed rgba(255,255,255,0.1)',
            borderRadius: 16,
            padding: '48px 24px',
            textAlign: 'center',
            background: 'rgba(255,255,255,0.01)',
          }}
        >
          <Award size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <p style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--fg-dim)', letterSpacing: 1.5, textTransform: 'uppercase' }}>
            Not in your portfolio yet
          </p>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--fg-dim)', marginTop: 8, opacity: 0.6 }}>
            Add this project, then attach stills, teasers, and clips from the Portfolio page
          </p>
        </motion.div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {entries.map(e => (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '16px',
                background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}
            >
              <div>
                <h3 style={{ fontFamily: 'var(--display)', fontSize: '0.95rem', marginBottom: 6 }}>{e.title}</h3>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--fg-dim)' }}>
                  {e.category || 'Uncategorized'}{e.year ? ` · ${e.year}` : ''}
                </div>
              </div>
              <Link href="/portfolio" style={{ textDecoration: 'none' }}>
                <motion.button
                  whileHover={{ scale: 1.06, x: 2 }}
                  style={{
                    padding: '8px 14px', borderRadius: 8, border: 'none', background: `${accent}28`,
                    color: accent, fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 2,
                    textTransform: 'uppercase', cursor: 'pointer',
                  }}
                >
                  Manage
                </motion.button>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Launch Tab ──────────────────────────────────────────────────────────────────

function LaunchTab({ project }: { project: Project }) {
  const { toast } = useToast();
  const [festivals, setFestivals] = useState([
    { id: '1', name: 'Sundance', status: 'submitted', deadline: '2026-08-15' },
    { id: '2', name: 'TIFF', status: 'draft', deadline: '2026-09-01' },
    { id: '3', name: 'Berlin', status: 'pending', deadline: '2026-10-15' },
  ]);

  return (
    <div style={{ padding: '24px' }}>
      <h2 style={{ fontFamily: 'var(--display)', fontSize: '1.5rem', letterSpacing: 2, marginBottom: 24 }}>Launch Strategy</h2>

      <DemoBanner text="Demo data — festival/press tracking isn't connected yet" />

      {/* Festival submissions */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'var(--display)', fontSize: '1.1rem' }}>Festival Submissions</h3>
          <motion.button
            whileHover={{ scale: 1.05 }}
            onClick={() => toast('Festival manager coming soon', 'info')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 8, border: 'none',
              background: `${project.accent_color || '#ff3c00'}20`,
              color: project.accent_color || '#ff3c00',
              fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 1.5,
              textTransform: 'uppercase', cursor: 'pointer',
            }}
          >
            <Plus size={12} /> Add
          </motion.button>
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          {festivals.map(f => (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10,
                padding: '12px 14px',
                background: 'rgba(255,255,255,0.02)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h4 style={{ fontFamily: 'var(--display)', fontSize: '0.9rem', marginBottom: 2 }}>{f.name}</h4>
                <p style={{ fontFamily: 'var(--mono)', fontSize: 7.5, color: 'var(--fg-dim)' }}>Deadline: {new Date(f.deadline).toLocaleDateString()}</p>
              </div>
              <span
                style={{
                  fontFamily: 'var(--mono)', fontSize: 7.5, letterSpacing: 1, textTransform: 'uppercase',
                  padding: '4px 10px', borderRadius: 6,
                  background: f.status === 'submitted' ? 'rgba(16,185,129,0.2)' : f.status === 'draft' ? 'rgba(245,158,11,0.2)' : 'rgba(107,114,128,0.2)',
                  color: f.status === 'submitted' ? '#10b981' : f.status === 'draft' ? '#f59e0b' : '#6b7280',
                }}
              >
                {f.status}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Other launch components */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        {[
          { title: 'Press Kit', status: 'draft', icon: <FileText size={20} /> },
          { title: 'Trailer Cut', status: 'in-progress', icon: <Video size={20} /> },
          { title: 'Streaming Pitch', status: 'in-progress', icon: <Share2 size={20} /> },
        ].map(item => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              padding: '16px',
              background: 'rgba(255,255,255,0.02)',
              textAlign: 'center',
            }}
          >
            <div style={{ color: project.accent_color || '#ff3c00', marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
              {item.icon}
            </div>
            <h4 style={{ fontFamily: 'var(--display)', fontSize: '0.9rem', marginBottom: 8 }}>{item.title}</h4>
            <span
              style={{
                fontFamily: 'var(--mono)', fontSize: 7, letterSpacing: 1, textTransform: 'uppercase',
                padding: '4px 8px', borderRadius: 4,
                background: item.status === 'draft' ? 'rgba(245,158,11,0.2)' : 'rgba(99,102,241,0.2)',
                color: item.status === 'draft' ? '#f59e0b' : '#6366f1',
              }}
            >
              {item.status}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

function ProjectDetailPageInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeProject, projects, setActiveProject } = useProject();
  const initialTab = (TABS.find(t => t.id === searchParams.get('tab'))?.id) || 'screenplay';
  const [currentTab, setCurrentTab] = useState<TabId>(initialTab);

  const selectTab = (id: TabId) => {
    setCurrentTab(id);
    router.replace(`/projects/${params.id}?tab=${id}`, { scroll: false });
  };

  const project = projects.find(p => p.id === params.id) || activeProject;

  useEffect(() => {
    if (project && setActiveProject) {
      setActiveProject(project);
    }
  }, [project, setActiveProject]);

  if (!project) {
    return (
      <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--mono)', color: 'var(--fg-dim)' }}>Project not found</p>
          <Link href="/projects" style={{ color: '#ff3c00', textDecoration: 'none', marginTop: 16, display: 'inline-block' }}>
            Back to Projects
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', overflow: 'hidden' }}>
      <GrainOverlay />

      {/* Ambient project glow */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: '50vh', pointerEvents: 'none', zIndex: 0,
        background: `radial-gradient(ellipse at 50% -20%, ${project.accent_color}0a 0%, transparent 65%)`,
      }} />

      {/* ── Header ── */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'sticky', top: 0, zIndex: 100,
          background: 'rgba(6,6,6,0.95)', backdropFilter: 'blur(24px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          padding: '16px 28px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
          <Link href="/projects" style={{ color: 'var(--fg-dim)', display: 'flex', cursor: 'pointer' }}>
            <ArrowLeft size={16} />
          </Link>
          <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.07)' }} />
          <div>
            <h1 style={{ fontFamily: 'var(--display)', fontSize: '1.6rem', letterSpacing: 1.5 }}>{project.title}</h1>
            <p style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--fg-dim)', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 2 }}>
              {project.type || 'Project'}
            </p>
          </div>
        </div>

        {/* Tab navigation — segmented pill control */}
        <div style={{
          display: 'inline-flex', gap: 2, padding: 4, borderRadius: 14,
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
          overflowX: 'auto', maxWidth: '100%',
        }}>
          {TABS.map(tab => (
            <motion.button
              key={tab.id}
              onClick={() => selectTab(tab.id)}
              whileTap={{ scale: 0.96 }}
              style={{
                position: 'relative',
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '8px 16px', borderRadius: 10, border: 'none',
                background: currentTab === tab.id ? project.accent_color : 'transparent',
                color: currentTab === tab.id ? '#06060a' : 'var(--fg-dim)',
                fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase',
                fontWeight: currentTab === tab.id ? 700 : 400,
                cursor: 'pointer', transition: 'color 0.2s', whiteSpace: 'nowrap',
              }}
            >
              {tab.icon}
              {tab.label}
            </motion.button>
          ))}
        </div>
      </motion.header>

      {/* ── Content ── */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <AnimatePresence mode="wait">
          {currentTab === 'screenplay' && (
            <motion.div key="screenplay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ScreenplayTab project={project} />
            </motion.div>
          )}
          {currentTab === 'assets' && (
            <motion.div key="assets" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <AssetsTab project={project} />
            </motion.div>
          )}
          {currentTab === 'crew' && (
            <motion.div key="crew" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <CrewTab project={project} />
            </motion.div>
          )}
          {currentTab === 'schedule' && (
            <motion.div key="schedule" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ScheduleTab project={project} />
            </motion.div>
          )}
          {currentTab === 'showcase' && (
            <motion.div key="showcase" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ShowcaseTab project={project} />
            </motion.div>
          )}
          {currentTab === 'launch' && (
            <motion.div key="launch" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <LaunchTab project={project} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

export default function ProjectDetailPage() {
  return (
    <Suspense fallback={null}>
      <ProjectDetailPageInner />
    </Suspense>
  );
}
