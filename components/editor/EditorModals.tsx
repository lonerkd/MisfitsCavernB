'use client';

/* =========================================================================
   SCRIPTOS — STANDALONE EDITOR MODALS
   Title Page, Character Bible, Shortcuts, Go-to-Scene and Revision Diff
   used to live inline in app/editor/page.tsx (which was 2400+ lines).
   Pulled out here so the page component only owns state/orchestration.
   ========================================================================= */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, X, SplitSquareHorizontal } from 'lucide-react';
import type { ScriptFormat } from '@/lib/scriptos/parser';
import type { TitlePage } from '@/lib/scriptos/titlepage';
import type { CharacterStats } from '@/lib/scriptos/characters';
import type { DBCharacterProfile } from '@/lib/supabase/characters';
import type { Revision } from '@/lib/scriptos/revisions';

const modalOverlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
const modalCard: React.CSSProperties = {
  background: 'rgba(10,15,24,0.97)', backdropFilter: 'blur(32px)',
  border: '1px solid rgba(224,221,174,0.09)', borderRadius: 20, padding: 32,
  maxWidth: 'calc(100vw - 40px)', maxHeight: '85vh', overflowY: 'auto',
  boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
};
const modalHeader: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24,
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6,
};
const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(224,221,174,0.05)', border: '1px solid rgba(224,221,174,0.1)',
  borderRadius: 6, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none', fontFamily: 'Courier Prime, monospace',
};

// ── Title Page ──────────────────────────────────────────────────────────
export function TitlePageModal({
  show, onClose, format, onFormatChange, titlePage, onTitlePageChange,
}: {
  show: boolean;
  onClose: () => void;
  format: ScriptFormat;
  onFormatChange: (f: ScriptFormat) => void;
  titlePage: TitlePage;
  onTitlePageChange: (field: keyof TitlePage, value: string) => void;
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={modalOverlay} onClick={onClose}>
          <motion.div initial={{ scale: 0.94, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.94, opacity: 0, y: 12 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} onClick={e => e.stopPropagation()} style={{ ...modalCard, width: 480 }}>
            <div style={modalHeader}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>Title Page</h2>
              <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Document Format</label>
              <select value={format} onChange={e => onFormatChange(e.target.value as ScriptFormat)} style={inputStyle}>
                <option value="screenplay">Screenplay</option>
                <option value="teleplay">Teleplay</option>
                <option value="stage-play">Stage Play</option>
                <option value="treatment">Treatment</option>
                <option value="podcast">Podcast Script</option>
                <option value="doc-outline">Documentary Outline</option>
              </select>
            </div>
            {(['title', 'credit', 'author', 'source', 'draftDate', 'contact', 'copyright', 'notes'] as const).map(field => (
              <div key={field} style={{ marginBottom: 16 }}>
                <label style={labelStyle}>{field.replace(/([A-Z])/g, ' $1').trim()}</label>
                <input value={titlePage[field]} onChange={e => onTitlePageChange(field, e.target.value)} style={inputStyle} />
              </div>
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Character Bible ─────────────────────────────────────────────────────
export function CharacterBibleModal({
  show, onClose, chars, charProfiles, selectedCharProfile, onSelectCharProfile,
  charStats, cardColors, crew, onPlayedByChange, onFieldChange,
}: {
  show: boolean;
  onClose: () => void;
  chars: string[];
  charProfiles: DBCharacterProfile[];
  selectedCharProfile: string | null;
  onSelectCharProfile: (name: string) => void;
  charStats: CharacterStats[];
  cardColors: string[];
  crew?: { id: string; name: string; role: string }[];
  onPlayedByChange: (profileId: string, crewId: string | null) => void;
  onFieldChange: (profileId: string, field: 'description' | 'backstory' | 'motivation' | 'arc' | 'notes', value: string) => void;
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={modalOverlay} onClick={onClose}>
          <motion.div initial={{ scale: 0.94, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.94, opacity: 0, y: 12 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} onClick={e => e.stopPropagation()} style={{ ...modalCard, width: 680 }}>
            <div style={modalHeader}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Users size={20} /> Character Bible</h2>
              <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            {chars.length === 0 ? (
              <div style={{ color: 'var(--fg-muted)', fontStyle: 'italic', textAlign: 'center', padding: 40 }}>No characters detected yet. Start writing dialogue!</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {chars.map((name, i) => {
                  const profile = charProfiles.find(p => p.name.toUpperCase() === name.toUpperCase());
                  const isSelected = selectedCharProfile === name;
                  const stat = charStats.find(cs => cs.name === name);
                  return (
                    <div key={name} style={{ background: 'rgba(224,221,174,0.02)', border: `1px solid ${isSelected ? 'rgba(224,221,174,0.2)' : 'rgba(224,221,174,0.06)'}`, borderRadius: 8, overflow: 'hidden' }}>
                      <button onClick={() => onSelectCharProfile(name)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: cardColors[i % cardColors.length] }} />
                          <span style={{ fontSize: 13, fontWeight: 700 }}>{name}</span>
                        </div>
                        <span style={{ fontSize: 10, color: 'var(--fg-muted)' }}>{stat ? `${stat.dialogueLines} line${stat.dialogueLines === 1 ? '' : 's'} · ${stat.scenesIn.length} scene${stat.scenesIn.length === 1 ? '' : 's'}` : ''}</span>
                      </button>
                      {isSelected && (
                        <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {(crew?.length ?? 0) > 0 && (
                            <div>
                              <label style={labelStyle}>Played By</label>
                              <select value={profile?.played_by_crew_id || ''} onChange={e => { if (profile) onPlayedByChange(profile.id, e.target.value || null); }} style={{ width: '100%', background: 'rgba(224,221,174,0.03)', border: '1px solid rgba(224,221,174,0.08)', borderRadius: 6, padding: '6px 10px', color: '#ccc', fontSize: 12, outline: 'none' }}>
                                <option value="" style={{ background: '#111' }}>Unassigned</option>
                                {crew!.map(c => (
                                  <option key={c.id} value={c.id} style={{ background: '#111' }}>{c.name} ({c.role})</option>
                                ))}
                              </select>
                            </div>
                          )}
                          {(['description', 'backstory', 'motivation', 'arc', 'notes'] as const).map(field => (
                            <div key={field}>
                              <label style={labelStyle}>{field}</label>
                              <textarea value={profile?.[field] || ''} onChange={e => { if (profile) onFieldChange(profile.id, field, e.target.value); }} style={{ width: '100%', background: 'rgba(224,221,174,0.03)', border: '1px solid rgba(224,221,174,0.08)', borderRadius: 6, padding: '6px 10px', color: '#ccc', fontSize: 12, outline: 'none', resize: 'vertical', minHeight: 40, fontFamily: 'inherit' }} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Keyboard Shortcuts ──────────────────────────────────────────────────
export function ShortcutsModal({ show, onClose }: { show: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={modalOverlay} onClick={onClose}>
          <motion.div initial={{ scale: 0.94, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.94, opacity: 0, y: 12 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} onClick={e => e.stopPropagation()} style={{ ...modalCard, width: 420 }}>
            <div style={modalHeader}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>Keyboard Shortcuts</h2>
              <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                ['Ctrl + S', 'Save script'],
                ['Ctrl + F', 'Find & Replace'],
                ['Ctrl + E', 'Toggle Focus Mode'],
                ['Ctrl + G', 'Go to Scene'],
                ['Ctrl + /', 'Show Shortcuts'],
                ['Tab', 'Smart element insert'],
                ['Escape', 'Close panels / Exit focus'],
              ].map(([key, desc]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(224,221,174,0.05)' }}>
                  <span style={{ fontSize: 12, color: '#ccc' }}>{desc}</span>
                  <kbd style={{ fontSize: 11, fontFamily: 'var(--mono)', background: 'rgba(224,221,174,0.08)', padding: '2px 8px', borderRadius: 4, color: '#fff', fontWeight: 600 }}>{key}</kbd>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Go to Scene ──────────────────────────────────────────────────────────
export function GoToSceneModal({
  show, onClose, sceneCount, value, onChange, onJump,
}: {
  show: boolean;
  onClose: () => void;
  sceneCount: number;
  value: string;
  onChange: (v: string) => void;
  onJump: (sceneNum: number) => void;
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity: 0, y: -12, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -12, scale: 0.96 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }} style={{ position: 'fixed', top: 72, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: 'rgba(10,15,24,0.96)', backdropFilter: 'blur(24px)', border: '1px solid rgba(224,221,174,0.09)', borderRadius: 16, padding: '16px 20px', width: 320, boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 8 }}>Go to Scene</div>
          <input autoFocus type="number" min={1} max={sceneCount} value={value} onChange={e => onChange(e.target.value)} onKeyDown={e => {
            if (e.key === 'Enter') {
              const num = parseInt(value);
              if (num >= 1 && num <= sceneCount) onJump(num);
            }
            if (e.key === 'Escape') onClose();
          }} placeholder={`1 - ${sceneCount}`} style={{ width: '100%', background: 'rgba(224,221,174,0.05)', border: '1px solid rgba(224,221,174,0.1)', borderRadius: 6, padding: '8px 12px', color: '#fff', fontSize: 14, outline: 'none', fontFamily: 'var(--mono)' }} />
          <div style={{ fontSize: 10, color: 'var(--fg-muted)', marginTop: 6 }}>{sceneCount} scene{sceneCount === 1 ? '' : 's'} · Press Enter to jump</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Revision Diff ─────────────────────────────────────────────────────────
export function RevisionDiffModal({
  show, onClose, revision, marks, currentContent, onRestore,
}: {
  show: boolean;
  onClose: () => void;
  revision: Revision | null;
  marks: { lineIndex: number; type: 'added' | 'modified' | 'deleted' }[];
  currentContent: string;
  onRestore: (snapshot: string, label: string) => void;
}) {
  return (
    <AnimatePresence>
      {show && revision && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={modalOverlay} onClick={onClose}>
          <motion.div initial={{ scale: 0.94, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.94, opacity: 0, y: 12 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} onClick={e => e.stopPropagation()} style={{ ...modalCard, width: 720 }}>
            <div style={{ ...modalHeader, marginBottom: 8 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <SplitSquareHorizontal size={18} /> {revision.label} → Current
              </h2>
              <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', gap: 14, marginBottom: 18, fontSize: 10, fontFamily: 'var(--mono)' }}>
              <span style={{ color: '#51cf66' }}>+ {marks.filter(m => m.type === 'added').length} added</span>
              <span style={{ color: '#ffd43b' }}>~ {marks.filter(m => m.type === 'modified').length} modified</span>
              <span style={{ color: '#ff6b6b' }}>− {marks.filter(m => m.type === 'deleted').length} removed</span>
            </div>
            {(() => {
              const oldLines = revision.snapshot.split('\n');
              const newLines = currentContent.split('\n');
              const markByIndex = new Map(marks.map(m => [m.lineIndex, m.type]));
              const maxLen = Math.max(oldLines.length, newLines.length);
              const rows = Array.from({ length: maxLen }, (_, i) => ({ i, mark: markByIndex.get(i), text: newLines[i] ?? oldLines[i] ?? '' }));
              const changed = rows.filter(r => r.mark);
              if (changed.length === 0) {
                return <div style={{ color: 'var(--fg-muted)', fontStyle: 'italic', textAlign: 'center', padding: 30 }}>No differences — current draft matches this revision.</div>;
              }
              return (
                <div style={{ fontFamily: 'Courier Prime, monospace', fontSize: 12 }}>
                  {changed.map(({ i, mark, text }) => (
                    <div key={i} style={{
                      display: 'flex', gap: 10, padding: '4px 8px', borderRadius: 4, marginBottom: 2,
                      background: mark === 'added' ? 'rgba(81,207,102,0.08)' : mark === 'deleted' ? 'rgba(255,107,107,0.08)' : 'rgba(255,212,59,0.08)',
                      borderLeft: `2px solid ${mark === 'added' ? '#51cf66' : mark === 'deleted' ? '#ff6b6b' : '#ffd43b'}`,
                    }}>
                      <span style={{ color: 'var(--fg-dim)', flexShrink: 0, width: 36, textAlign: 'right' }}>{i + 1}</span>
                      <span style={{ color: mark === 'deleted' ? '#ff9b9b' : '#ddd', whiteSpace: 'pre-wrap', textDecoration: mark === 'deleted' ? 'line-through' : 'none' }}>{text || ' '}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(224,221,174,0.06)' }}>
              <button onClick={() => onRestore(revision.snapshot, revision.label)} style={{ fontSize: 11, background: 'rgba(224,221,174,0.06)', border: '1px solid rgba(224,221,174,0.1)', borderRadius: 6, padding: '7px 14px', color: '#fff', cursor: 'pointer' }}>Restore This Revision</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
