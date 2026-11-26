import React, { useState, type Dispatch, type SetStateAction } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, X } from 'lucide-react';
import { Textarea } from '@/components/ui/Textarea';
import { CARD_COLORS } from '@/lib/scriptos/sceneVisuals';
import { mergeProfiles, saveCharacterProfiles, type CharacterProfile } from '@/lib/scriptos/bible';
import type { CharacterStats } from '@/lib/scriptos/characters';
import type { ScriptLine, Scene as ParsedScene } from '@/lib/scriptos/types';
import type { StoredScript } from '@/lib/scriptos/storage';
import { RelationshipMap } from '@/components/characters/RelationshipMap';
import type { Relationship } from '@/lib/characters/depth';
import { NotCharacterButton, RejectedNames } from '@/components/editor/ReadingCorrections';
import type { useScriptCasting } from '@/components/editor/useScriptCasting';
import type { useReadingCorrections } from '@/lib/studio';

// The character warnings (and their parser) load the first time the bible opens.
const CharacterWarnings = dynamic(() => import('@/components/editor/CharacterWarnings').then((m) => m.CharacterWarnings), { ssr: false });

// The Character Bible modal (restructure phase 7 — moved out of the editor
// page unchanged). Always mounted, like the page's block was, so the
// selection and the relationship map survive closing and reopening it.
export function CharacterBibleModal({ open, onClose, chars, charProfiles, setCharProfiles, charStats, castings, projectCrew, nameToId, onCastCharacter, currentScript, corrections, onRefreshWriterMemory, lines, scenes, onJumpToLine }: {
  open: boolean;
  onClose: () => void;
  chars: string[];
  charProfiles: CharacterProfile[];
  setCharProfiles: Dispatch<SetStateAction<CharacterProfile[]>>;
  charStats: CharacterStats[];
  castings: ReturnType<typeof useScriptCasting>['castings'];
  projectCrew: ReturnType<typeof useScriptCasting>['projectCrew'];
  nameToId: Map<string, string>;
  onCastCharacter: (characterId: string, characterName: string, crewUserId: string) => void;
  currentScript: StoredScript | null;
  corrections: ReturnType<typeof useReadingCorrections>;
  onRefreshWriterMemory: () => void;
  lines: ScriptLine[];
  scenes: ParsedScene[];
  onJumpToLine: (line: number) => void;
}) {
  const [selectedCharProfile, setSelectedCharProfile] = useState<string | null>(null);
  const [relationships, setRelationships] = useState<Relationship[]>([]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'var(--scrim-flat-strong)', zIndex: 'var(--z-modal)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
          <motion.div initial={{ scale: 0.94, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.94, opacity: 0, y: 12 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', backdropFilter: 'blur(32px)', border: '1px solid rgba(var(--ink-rgb), 0.09)', borderRadius: 20, padding: 32, width: 680, maxWidth: '100%', maxHeight: '100%', overflowY: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg-strong)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Users size={20} /> Character Bible</h2>
              <button aria-label="Close" onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--fg-dim)', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            {chars.length === 0 ? (
              <div style={{ color: 'var(--fg-muted)', fontStyle: 'italic', textAlign: 'center', padding: 40 }}>No characters detected yet. Start writing dialogue!</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {chars.map((name, i) => {
                  const profile = charProfiles.find(p => p.name.toUpperCase() === name.toUpperCase());
                  const isSelected = selectedCharProfile === name;
                  const stat = charStats.find(cs => cs.name === name);
                  const cast = castings[name.toUpperCase()];
                  return (
                    <div key={name} style={{ background: 'rgba(var(--ink-rgb), 0.02)', border: `1px solid ${isSelected ? 'rgba(var(--ink-rgb), 0.2)' : 'rgba(var(--ink-rgb), 0.06)'}`, borderRadius: 8, overflow: 'hidden' }}>
                      <button onClick={() => setSelectedCharProfile(isSelected ? null : name)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--fg-strong)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: CARD_COLORS[i % CARD_COLORS.length] }} />
                          <span style={{ fontSize: 13, fontWeight: 700 }}>{name}</span>
                          {cast?.username && (
                            <span style={{ fontSize: 'max(9px, var(--mc-min-font, 0px))', color: 'var(--ok)', background: 'color-mix(in srgb, var(--ok) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--ok) 30%, transparent)', borderRadius: 4, padding: '1px 6px' }}>
                              Playing: {cast.username}
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{stat ? `${stat.dialogueLines} lines · ${stat.scenesIn.length} scenes` : ''}</span>
                      </button>
                      {isSelected && (
                        <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div>
                            <label style={{ display: 'block', fontSize: 11, color: 'var(--fg-muted)', textTransform: 'var(--caps)', letterSpacing: 'var(--caps-track)', marginBottom: 4 }}>Cast as</label>
                            <select
                              aria-label="Cast as"
                              value={cast?.crew_user_id || ''}
                              onChange={e => onCastCharacter(nameToId.get(name.toUpperCase()) ?? name, name, e.target.value)}
                              disabled={projectCrew.length === 0}
                              style={{ width: '100%', background: 'rgba(var(--ink-rgb), 0.03)', border: '1px solid rgba(var(--ink-rgb), 0.08)', borderRadius: 8, padding: '6px 10px', color: 'var(--fg-muted)', fontSize: 12, outline: 'none' }}
                            >
                              <option value="">— Not cast —</option>
                              {projectCrew.map(m => (
                                <option key={m.user_id} value={m.user_id}>{m.username || m.user_id}</option>
                              ))}
                            </select>
                            {projectCrew.length === 0 && (
                              <div style={{ fontSize: 11, color: 'var(--fg-dim)', marginTop: 4, fontStyle: 'italic' }}>No crew on this project yet — hire from the Jobs board or add crew in Studio.</div>
                            )}
                          </div>
                          {(['description', 'backstory', 'motivation', 'arc', 'notes'] as const).map(field => (
                            <Textarea
                              key={field}
                              label={field}
                              value={profile?.[field] || ''}
                              rows={2}
                              onChange={e => {
                                const updated = mergeProfiles(chars, charProfiles);
                                const idx = updated.findIndex(p => p.name.toUpperCase() === name.toUpperCase());
                                if (idx >= 0) updated[idx] = { ...updated[idx], [field]: e.target.value };
                                setCharProfiles(updated);
                                if (currentScript) saveCharacterProfiles(currentScript.id, updated);
                              }}
                            />
                          ))}
                          {currentScript?.project_id && <NotCharacterButton projectId={currentScript.project_id} name={name} onSaved={corrections.upsertLocal} />}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <CharacterWarnings
              lines={lines} scenes={scenes} rejectedNames={corrections.rows.filter((r) => r.kind === 'not_character').map((r) => r.name)}
              storageKey={currentScript?.id ?? ''} onJump={(line) => { onClose(); onJumpToLine(line); }}
            />
            <div style={{ marginTop: 16 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg-strong)', margin: '0 0 8px' }}>Relationships</h3>
              <RelationshipMap relationships={relationships} onChange={setRelationships} />
            </div>
            {currentScript?.project_id && <RejectedNames rows={corrections.rows.filter((r) => r.kind === 'not_character')} onRemoved={(id) => { corrections.removeLocal(id); onRefreshWriterMemory(); }} />}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
