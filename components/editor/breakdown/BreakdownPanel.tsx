'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, X } from 'lucide-react';
import { costByCategory, groupForScene } from '@/lib/breakdown';
import { announceProgressChange } from '@/lib/supabase/progress';
import { CategoryChips, catStyle } from '@/components/breakdown/CategoryChips';
import { ElementCard, STATUS_LABEL, money } from '@/components/breakdown/ElementCard';
import b from '@/components/breakdown/breakdown.module.css';
import type { EditorBreakdown } from './useEditorBreakdown';

/**
 * The current scene's breakdown, beside the script: what's tagged (grouped by
 * category), what the script suggests, a quick way to tag anything, and the
 * element itself — status, cost, who's on it, every scene it's in.
 */
export function BreakdownPanel({ bd, projectId, sceneIdx, heading, speakingCast, crew, openElementId, setOpenElementId, onJumpToScene }: {
  bd: EditorBreakdown;
  projectId: string | null;
  sceneIdx: number;
  heading: string | null;
  speakingCast: string[];
  crew: Array<{ user_id: string; username: string }>;
  openElementId: string | null;
  setOpenElementId: (id: string | null) => void;
  onJumpToScene: (idx: number) => void;
}) {
  const { state } = bd;
  const [draft, setDraft] = useState('');
  const [draftCategory, setDraftCategory] = useState<string | null>(null);
  const categories = state.categories.rows;

  if (!projectId) {
    return (
      <div className={b.panel}>
        <div className={b.eyebrow}>Breakdown</div>
        <p className={b.hint}>The breakdown belongs to a project and its crew. Open this script from a project to tag props, wardrobe, effects and everything else the shoot needs — right in the script.</p>
        <Link href="/projects" className={b.link}>Your projects →</Link>
      </div>
    );
  }

  const range = sceneIdx >= 0 ? bd.ranges[sceneIdx] : null;
  const groups = range?.sceneId ? groupForScene(range.sceneId, state.tags.rows, state.elements.rows, categories) : [];
  const suggestions = sceneIdx >= 0 ? bd.view.suggestions.get(sceneIdx) ?? [] : [];
  const open = openElementId ? state.elementById.get(openElementId) ?? null : null;

  const quickTag = async () => {
    const cat = draftCategory ?? categories.find((c) => c.key === 'props')?.id ?? categories[0]?.id;
    if (!draft.trim() || !cat || sceneIdx < 0) return;
    await bd.tagText(sceneIdx, draft, cat);
    setDraft('');
  };

  return (
    <div className={b.panel}>
      <div className={b.head}>
        <div style={{ minWidth: 0 }}>
          <div className={b.eyebrow}>{sceneIdx >= 0 ? `Scene ${sceneIdx + 1} breakdown` : 'Breakdown'}</div>
          {heading && <div className={b.heading}>{heading}</div>}
        </div>
        <button type="button" role="switch" aria-checked={bd.mode} className={`${b.switch} ${bd.mode ? b.switchOn : ''}`} onClick={() => bd.setMode(!bd.mode)} title="Highlight the breakdown in the script and tag by selecting text (Ctrl+Shift+B)">
          <span className={b.track} aria-hidden /> Tag mode
        </button>
      </div>

      {!bd.mode && (
        <p className={b.hint}>Turn on tag mode to see the breakdown in the script: tagged things in their category colour, suggestions underlined. Select any words to tag them.</p>
      )}

      {sceneIdx < 0 ? (
        <p className={b.hint}>Put the cursor in a scene to break it down.</p>
      ) : !range?.sceneId ? (
        <p className={b.hint}>Saving this scene… it can be tagged in a moment.</p>
      ) : (
        <>
          {speakingCast.length > 0 && (
            <div className={b.section}>
              <h3 className={b.sectionTitle}>Speaking cast <span className={b.count}>from the dialogue</span></h3>
              <div className={b.chips}>
                {speakingCast.map((c) => <span key={c} className={b.chip} style={{ ...catStyle(categories.find((x) => x.key === 'cast')?.color ?? '#e5484d'), cursor: 'default' }}>{c}</span>)}
              </div>
            </div>
          )}

          <div className={b.section}>
            <h3 className={b.sectionTitle}>Tagged here <span className={b.count}>{groups.reduce((n, g) => n + g.elements.length, 0)}</span></h3>
            {groups.length === 0 && <p className={b.hint}>Nothing yet. Accept a suggestion, select words in the script, or add one below.</p>}
            {groups.map((g) => (
              <div key={g.category.id} className={b.group} style={catStyle(g.category.color)}>
                <div className={b.groupLabel}><span className={b.dot} aria-hidden />{g.category.label}</div>
                <div className={b.chips}>
                  {g.elements.map((e) => (
                    <button key={e.id} type="button" className={`${b.chip} ${openElementId === e.id ? b.chipOn : ''}`} aria-expanded={openElementId === e.id} onClick={() => setOpenElementId(openElementId === e.id ? null : e.id)}>
                      <span className={`${b.status} ${b[`status_${e.status}`]}`} aria-hidden />
                      {e.name}
                      <span className="sr-only">, {STATUS_LABEL[e.status]}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {open && <EditorElementCard key={open.id} element={open} bd={bd} sceneIdx={sceneIdx} crew={crew} onClose={() => setOpenElementId(null)} onJumpToScene={onJumpToScene} />}

          {suggestions.length > 0 && (
            <div className={b.section}>
              <h3 className={b.sectionTitle}>
                Suggested <span className={b.count}>{suggestions.length}</span>
              </h3>
              {suggestions.map((s) => {
                const cat = state.categoryById.get(s.categoryId);
                return (
                  <div key={s.name} className={b.suggestion}>
                    <div style={{ minWidth: 0 }}>
                      <div className={b.sName}>{s.name}</div>
                      <div className={b.sWhy}>
                        <span className={b.dot} style={catStyle(cat?.color ?? '#888888')} aria-hidden />
                        {cat?.label} · {s.reason === 'mentioned' ? 'in the project, not tagged here' : s.reason === 'remembered' ? 'you’ve tagged it before' : 'capitalised in the action'}
                      </div>
                    </div>
                    <div className={b.sActions}>
                      <button type="button" className={`${b.iconBtn} ${b.iconYes}`} aria-label={`Tag ${s.name} as ${cat?.label}`} onClick={() => bd.accept(sceneIdx, s)}><Check size={13} /></button>
                      <button type="button" className={b.iconBtn} aria-label={`Not an element: ${s.name}`} onClick={() => bd.dismiss(s.name)}><X size={13} /></button>
                    </div>
                  </div>
                );
              })}
              {suggestions.length > 1 && (
                <button type="button" className={b.btn} style={{ alignSelf: 'flex-start' }} onClick={async () => { for (const s of suggestions) await bd.accept(sceneIdx, s); }}>
                  <Check size={12} aria-hidden /> Tag all {suggestions.length}
                </button>
              )}
            </div>
          )}

          <div className={b.section}>
            <h3 className={b.sectionTitle}>Tag something</h3>
            <label htmlFor="bd-quick" className="sr-only">Element name</label>
            <input
              id="bd-quick" className={b.input} value={draft} maxLength={120}
              placeholder="e.g. blood-stained letter"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void quickTag(); } }}
            />
            <CategoryChips categories={categories} selected={draftCategory ?? categories.find((c) => c.key === 'props')?.id ?? null} label="Category" onPick={(c) => setDraftCategory(c.id)} />
            <button type="button" className={b.btn} style={{ alignSelf: 'flex-start' }} disabled={!draft.trim()} onClick={() => void quickTag()}>Tag in this scene</button>
          </div>
        </>
      )}

      <ProjectTotals bd={bd} projectId={projectId} />
    </div>
  );
}

function ProjectTotals({ bd, projectId }: { bd: EditorBreakdown; projectId: string }) {
  const { state } = bd;
  const els = state.elements.rows;
  const costs = costByCategory(state.categories.rows, els);
  const total = costs.reduce((n, c) => n + c.amount, 0);
  const unpriced = costs.reduce((n, c) => n + c.unpriced, 0);
  return (
    <div className={b.section}>
      <h3 className={b.sectionTitle}>Whole project</h3>
      <div className={b.totals}>
        <div className={b.total}><div className={b.totalValue}>{els.length}</div><div className={b.totalLabel}>Elements</div></div>
        <div className={b.total}><div className={b.totalValue}>{els.filter((e) => e.status === 'ready').length}</div><div className={b.totalLabel}>Ready</div></div>
        <div className={b.total}><div className={b.totalValue}>{money(total)}</div><div className={b.totalLabel}>Est. cost</div></div>
      </div>
      {unpriced > 0 && <p className={b.hint}>{unpriced} element{unpriced === 1 ? ' has' : 's have'} no cost yet — give it one, or set a unit cost for its category in the Studio.</p>}
      <Link href={`/studio?tab=production&view=schedule`} className={b.link} onClick={() => announceProgressChange(projectId)}>Full breakdown & schedule in the Studio →</Link>
    </div>
  );
}

/** The shared element card, with this script's scene numbers. */
function EditorElementCard({ element, bd, sceneIdx, crew, onClose, onJumpToScene }: {
  element: Parameters<typeof ElementCard>[0]['element'];
  bd: EditorBreakdown;
  sceneIdx: number;
  crew: Array<{ user_id: string; username: string }>;
  onClose: () => void;
  onJumpToScene: (idx: number) => void;
}) {
  const scenes = useMemo(() => {
    const ids = new Set(bd.state.tags.rows.filter((t) => t.element_id === element.id).map((t) => t.scene_id));
    return bd.ranges.map((r, i) => (r.sceneId && ids.has(r.sceneId) ? i : -1)).filter((i) => i >= 0);
  }, [bd.state.tags.rows, element.id, bd.ranges]);
  return (
    <ElementCard
      element={element}
      state={bd.state}
      crew={crew}
      scenes={scenes.map((i) => ({ key: String(i), label: String(i + 1), current: i === sceneIdx }))}
      scenesLabel={`In ${scenes.length} scene${scenes.length === 1 ? '' : 's'} of this script`}
      onJumpToScene={(key) => onJumpToScene(Number(key))}
      onUntagHere={scenes.includes(sceneIdx) ? () => void bd.untag(sceneIdx, element.id) : undefined}
      onClose={onClose}
    />
  );
}
