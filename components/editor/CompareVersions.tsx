'use client';

// Compare two versions of the script — any locked revision against another, or against the draft in hand — scene by
// scene (wishlist 4.12). The logic is `lib/scriptos/compare.ts`; this is the reading of it: the numbers, a filter, the
// scenes side by side (stacked, A over B, on a phone), unchanged scenes and lines folded away, next / previous change,
// and the change report through the print kit. Read-only: it changes nothing, so a person who can only read the script
// can open it; the versions are the ones the editor already loaded for this script.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeftRight, ArrowRight, ChevronDown, ChevronRight, X } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { PrintButton } from '@/components/ui/PrintButton';
import { useMediaQuery } from '@/lib/hooks/useMediaQuery';
import {
  changeRefs, collapseRows, compareScripts, effectiveKind, groupScenes,
  type ChangeFilter, type CompareRow, type Comparison, type SceneDiff, type SceneStatus, type WordPart,
} from '@/lib/scriptos/compare';
import { compareDoc } from '@/lib/studio/compare-print';
import type { Revision } from '@/lib/scriptos/revisions';

const DRAFT = 'draft';

const FILTERS: { id: ChangeFilter; label: string }[] = [
  { id: 'all', label: 'All' }, { id: 'dialogue', label: 'Dialogue' }, { id: 'action', label: 'Action' }, { id: 'heading', label: 'Scene headings' },
];

// A mark as well as a colour: nothing here is told apart by colour alone.
const STATUS: Record<SceneStatus, { mark: string; label: string; tone: string }> = {
  added: { mark: '+', label: 'Added', tone: 'var(--ok)' },
  removed: { mark: '−', label: 'Cut', tone: 'var(--danger)' },
  changed: { mark: '~', label: 'Changed', tone: 'var(--warn)' },
  moved: { mark: '↕', label: 'Moved', tone: 'var(--info)' },
  same: { mark: '=', label: 'Same', tone: 'var(--fg-dim)' },
};

const tint = (tone: string, pct: number) => `color-mix(in srgb, ${tone} ${pct}%, transparent)`;
const when = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const SR_ONLY: React.CSSProperties = { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 };
const BTN: React.CSSProperties = { fontSize: 12, background: 'color-mix(in srgb, var(--fg) 6%, transparent)', border: '1px solid rgba(var(--ink-rgb), 0.14)', borderRadius: 8, padding: '6px 12px', color: 'var(--fg-strong)', cursor: 'pointer', minHeight: 32 };

/** The words of a changed line: what came out struck through, what went in underlined (a mark, not only a colour). */
function Words({ parts, side }: { parts: WordPart[] | undefined; side: 'left' | 'right' }) {
  if (!parts) return null;
  return (
    <>
      {parts.map((p, i) => (p.changed
        ? <span key={i} style={side === 'left'
            ? { textDecoration: 'line-through', background: tint('var(--danger)', 22), borderRadius: 4 }
            : { textDecoration: 'underline', textUnderlineOffset: 2, background: tint('var(--ok)', 22), borderRadius: 4 }}>{p.text}</span>
        : <span key={i}>{p.text}</span>))}
    </>
  );
}

function Cell({ row, side, kind, label }: { row: CompareRow; side: 'left' | 'right'; kind: CompareRow['kind']; label?: string }) {
  const text = side === 'left' ? row.left : row.right;
  const gone = kind === 'removed' && side === 'left';
  const came = kind === 'added' && side === 'right';
  const edited = kind === 'changed';
  const tone = gone || (edited && side === 'left') ? 'var(--danger)' : came || (edited && side === 'right') ? 'var(--ok)' : null;
  const mark = tone ? (side === 'left' ? '−' : '+') : row.renamed ? '↔' : '';
  const empty = !text && !tone;
  const parts = side === 'left' ? row.leftParts : row.rightParts;
  return (
    <div
      aria-hidden={empty ? true : undefined}
      style={{
        display: 'flex', gap: 6, padding: '1px 8px', minHeight: '1.6em',
        background: tone ? tint(tone, 9) : empty ? tint('var(--fg)', 3) : 'transparent',
        borderLeft: `3px solid ${tone ? tone : 'transparent'}`,
        color: tone || kind === 'same' ? 'var(--fg)' : 'var(--fg-muted)',
      }}
    >
      <span aria-hidden style={{ width: 12, flexShrink: 0, fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--fg-strong)' }}>{mark}</span>
      {label && <span style={SR_ONLY}>{label}{kind === 'same' ? '' : kind === 'added' ? ' (added)' : kind === 'removed' ? ' (cut)' : ' (changed)'}: </span>}
      <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', flex: 1, minWidth: 0, ...(gone ? { textDecoration: 'line-through' } : {}), ...(row.type === 'character' ? { paddingLeft: '12ch' } : row.type === 'dialogue' ? { paddingLeft: '6ch' } : row.type === 'parenthetical' ? { paddingLeft: '9ch' } : {}) }}>
        {edited && parts ? <Words parts={parts} side={side} /> : (text || ' ')}
      </span>
    </div>
  );
}

function Row({ row, id, filter, stacked, current }: { row: CompareRow; id: string | null; filter: ChangeFilter; stacked: boolean; current: boolean }) {
  const kind = effectiveKind(row, filter);
  const shown: CompareRow['kind'] = row.renamed ? 'same' : kind;
  const ring: React.CSSProperties = current ? { outline: '2px solid var(--accent)', outlineOffset: 1, borderRadius: 4 } : {};
  if (stacked) {
    if (shown === 'same' && !row.renamed) return <div id={id ?? undefined} style={{ ...ring }}><Cell row={row} side="right" kind="same" /></div>;
    return (
      <div id={id ?? undefined} tabIndex={id ? -1 : undefined} style={{ display: 'flex', flexDirection: 'column', gap: 1, margin: '2px 0', ...ring }}>
        {row.left && <Cell row={row} side="left" kind={shown} label="Version A" />}
        {row.right && <Cell row={row} side="right" kind={shown} label="Version B" />}
      </div>
    );
  }
  return (
    <div id={id ?? undefined} tabIndex={id ? -1 : undefined} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, ...ring }}>
      <Cell row={row} side="left" kind={shown} label="Version A" />
      <Cell row={row} side="right" kind={shown} label="Version B" />
    </div>
  );
}

function SceneBlock({ scene, filter, stacked, open, onToggle, expandedGaps, onGap, currentId }: {
  scene: SceneDiff; filter: ChangeFilter; stacked: boolean; open: boolean; onToggle: () => void;
  expandedGaps: Set<string>; onGap: (key: string) => void; currentId: string | null;
}) {
  const tone = STATUS[scene.status];
  const name = scene.heading || 'Before the first scene';
  const items = useMemo(() => collapseRows(scene.rows, filter), [scene.rows, filter]);
  const refs = useMemo(() => {
    // The first row of each run of changed lines carries the id next/previous looks for.
    const firsts = new Set<number>();
    let inRun = false;
    scene.rows.forEach((r, i) => { const k = effectiveKind(r, filter); if (k === 'same') inRun = false; else { if (!inRun) firsts.add(i); inRun = true; } });
    return firsts;
  }, [scene.rows, filter]);
  const sceneId = `cmp-${scene.id}`;
  const wholeScene = scene.status === 'added' || scene.status === 'removed' || scene.status === 'moved';
  return (
    <section aria-label={`${tone.label}: ${name}`} style={{ borderBottom: '1px solid rgba(var(--ink-rgb), 0.07)', padding: '4px 0 8px' }}>
      <button
        id={sceneId} onClick={onToggle} aria-expanded={open}
        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: '8px 4px', cursor: 'pointer', color: 'var(--fg)', ...(currentId === sceneId ? { outline: '2px solid var(--accent)', outlineOffset: -2, borderRadius: 8 } : {}) }}
      >
        {open ? <ChevronDown size={14} aria-hidden /> : <ChevronRight size={14} aria-hidden />}
        <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--fg-strong)', background: tint(tone.tone, 18), border: `1px solid ${tint(tone.tone, 55)}`, borderRadius: 9999, padding: '1px 8px', whiteSpace: 'nowrap' }}>
          <span aria-hidden>{tone.mark} </span>{tone.label}{scene.moved && scene.status === 'changed' ? ' · moved' : ''}
        </span>
        <span style={{ fontSize: 13, fontFamily: 'var(--script)', color: 'var(--fg-strong)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
        {(scene.status === 'moved' || scene.moved) && scene.from !== null && <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>{scene.from} → {scene.to}</span>}
        {scene.counts.added > 0 && <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--fg)' }}>+{scene.counts.added}</span>}
        {scene.counts.removed > 0 && <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--fg)' }}>−{scene.counts.removed}</span>}
        {scene.counts.changed > 0 && <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--fg)' }}>~{scene.counts.changed}</span>}
      </button>
      {open && scene.status === 'moved' && (
        <p style={{ margin: '2px 8px 4px 26px', fontSize: 12, color: 'var(--fg-muted)' }}>
          Scene {scene.from} became scene {scene.to}. Not a word changed.
        </p>
      )}
      {open && scene.status !== 'moved' && (
        <div style={{ fontFamily: 'var(--script)', fontSize: 12, lineHeight: 1.55, margin: '2px 0 0 4px' }}>
          {items.map((it) => {
            if (it.type === 'row') {
              const id = refs.has(it.index) && !wholeScene ? `cmp-${scene.id}-${it.index}` : null;
              return <Row key={it.index} row={scene.rows[it.index]} id={id} filter={filter} stacked={stacked} current={id !== null && id === currentId} />;
            }
            const key = `${scene.id}:${it.from}`;
            if (expandedGaps.has(key)) {
              return scene.rows.slice(it.from, it.from + it.count).map((r, k) => <Row key={`${key}-${k}`} row={r} id={null} filter={filter} stacked={stacked} current={false} />);
            }
            return (
              <button key={key} onClick={() => onGap(key)} style={{ display: 'block', width: '100%', margin: '2px 0', padding: '3px 8px', fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--fg-muted)', background: tint('var(--fg)', 4), border: '1px dashed rgba(var(--ink-rgb), 0.18)', borderRadius: 8, cursor: 'pointer', textAlign: 'center' }}>
                {it.count} unchanged line{it.count === 1 ? '' : 's'} — show
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Stat({ label, value, mark }: { label: string; value: React.ReactNode; mark?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
      <dt style={{ fontSize: 11, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: 'var(--caps-track)', color: 'var(--fg-muted)' }}>{label}</dt>
      <dd style={{ margin: 0, fontSize: 15, fontFamily: 'var(--mono)', color: 'var(--fg-strong)' }}>{mark ? <span aria-hidden>{mark} </span> : null}{value}</dd>
    </div>
  );
}

function Stats({ c }: { c: Comparison }) {
  const { scenes, lines, words, pages } = c.stats;
  return (
    <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(var(--ink-rgb), 0.06)', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(92px, 1fr))', gap: '8px 14px' }}>
        <Stat label="Scenes added" value={scenes.added} mark="+" />
        <Stat label="Scenes cut" value={scenes.removed} mark="−" />
        <Stat label="Scenes changed" value={scenes.changed} mark="~" />
        <Stat label="Scenes moved" value={scenes.moved} mark="↕" />
        <Stat label="Dialogue changed" value={lines.dialogue} />
        <Stat label="Action changed" value={lines.action} />
        <Stat label="Headings changed" value={lines.heading} />
        <Stat label="Words" value={`+${words.added} −${words.removed}`} />
        <Stat label="Pages changed" value={`${pages.changed} of ${pages.after}`} />
      </dl>
      {c.renames.length > 0 && (
        <p style={{ margin: 0, fontSize: 12, color: 'var(--fg)' }}>
          <span style={{ fontFamily: 'var(--mono)', color: 'var(--fg-muted)', textTransform: 'uppercase', fontSize: 11, letterSpacing: 'var(--caps-track)' }}>Renamed </span>
          {c.renames.map((r, i) => (
            <span key={r.from} style={{ fontFamily: 'var(--script)' }}>{i ? ', ' : ''}{r.from} <span aria-label="became">→</span> {r.to} <span style={{ color: 'var(--fg-muted)' }}>({r.cues} cue{r.cues === 1 ? '' : 's'}, {r.scenes} scene{r.scenes === 1 ? '' : 's'})</span></span>
          ))}
        </p>
      )}
    </div>
  );
}

export function CompareVersions({
  isOpen, onClose, revisions, draft, loading = false, projectTitle = 'Project', scriptTitle = 'Script', accent = null, logo = null,
}: {
  isOpen: boolean;
  onClose: () => void;
  revisions: Revision[];
  draft: string;
  /** True while the locked revisions are still being read. */
  loading?: boolean;
  projectTitle?: string;
  scriptTitle?: string;
  accent?: string | null;
  logo?: string | null;
}) {
  const { toast } = useToast();
  const stacked = useMediaQuery('(max-width: 759px)');
  const versions = useMemo(() => (
    [...revisions].sort((a, b) => b.date.localeCompare(a.date)).map((r) => ({ id: r.id, label: r.label, date: r.date }))
  ), [revisions]);

  const [fromId, setFromId] = useState<string>(() => versions[0]?.id ?? DRAFT);
  const [toId, setToId] = useState<string>(DRAFT);
  const [filter, setFilter] = useState<ChangeFilter>('all');
  const [cursor, setCursor] = useState(-1);
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const [gaps, setGaps] = useState<Set<string>>(new Set());
  const [unchangedOpen, setUnchangedOpen] = useState<Set<string>>(new Set());
  const [announce, setAnnounce] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Revisions load after the editor does: pick the newest once they arrive, unless the person already chose.
  const chosen = useRef(false);
  useEffect(() => { if (!chosen.current && versions[0]) setFromId(versions[0].id); }, [versions]);

  const nameOf = useCallback((id: string) => (id === DRAFT ? 'Current draft' : versions.find((v) => v.id === id)?.label ?? 'That revision'), [versions]);
  const textOf = (id: string) => (id === DRAFT ? draft : revisions.find((r) => r.id === id)?.snapshot ?? '');
  const fromText = textOf(fromId);
  const toText = textOf(toId);

  const [comparison, failed] = useMemo((): [Comparison | null, boolean] => {
    try { return [compareScripts(fromText, toText), false]; } catch { return [null, true]; }
  }, [fromText, toText]);
  useEffect(() => { if (failed) toast('Could not compare these two versions.', 'error'); }, [failed, toast]);

  const refs = useMemo(() => (comparison ? changeRefs(comparison, filter) : []), [comparison, filter]);
  const items = useMemo(() => (comparison ? groupScenes(comparison, filter) : []), [comparison, filter]);
  const resetView = () => { setCursor(-1); setAnnounce(''); setGaps(new Set()); setClosed(new Set()); };

  const go = useCallback((delta: 1 | -1) => {
    if (!refs.length) return;
    const next = cursor < 0 ? (delta === 1 ? 0 : refs.length - 1) : (cursor + delta + refs.length) % refs.length;
    const ref = refs[next];
    setClosed((c) => { if (!c.has(ref.sceneId)) return c; const n = new Set(c); n.delete(ref.sceneId); return n; });
    setCursor(next);
    setAnnounce(`Change ${next + 1} of ${refs.length}: ${ref.label}`);
  }, [cursor, refs]);

  // Once the change is on screen: bring it to the middle and put focus on it.
  const currentId = cursor >= 0 && refs[cursor] ? refs[cursor].id : null;
  useEffect(() => {
    if (!currentId) return;
    const frame = requestAnimationFrame(() => {
      const el = document.getElementById(currentId);
      if (!el) return;
      el.scrollIntoView?.({ block: 'center', behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      el.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [currentId]);

  const wasOpen = useRef(false);
  useEffect(() => {
    if (isOpen && !wasOpen.current) { wasOpen.current = true; dialogRef.current?.focus(); }
    if (!isOpen) wasOpen.current = false;
  }, [isOpen]);

  if (!isOpen) return null;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); onClose(); return; }
    const t = e.target as HTMLElement;
    if (e.metaKey || e.ctrlKey || e.altKey || /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
    if (e.key === 'n' || e.key === 'N') { e.preventDefault(); go(1); }
    else if (e.key === 'p' || e.key === 'P') { e.preventDefault(); go(-1); }
  };

  const select = (value: string, onChange: (v: string) => void, label: string) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--fg-muted)' }}>
      {label}
      <select
        value={value}
        onChange={(e) => { chosen.current = true; onChange(e.target.value); resetView(); }}
        style={{ background: 'color-mix(in srgb, var(--fg) 6%, transparent)', border: '1px solid rgba(var(--ink-rgb), 0.14)', borderRadius: 8, padding: '6px 8px', color: 'var(--fg-strong)', fontSize: 12, fontFamily: 'var(--mono)', maxWidth: stacked ? 'none' : 230, minHeight: 32 }}
      >
        <option value={DRAFT}>Current draft</option>
        {versions.map((v) => <option key={v.id} value={v.id}>{v.label}{v.date ? ` · ${when(v.date)}` : ''}</option>)}
      </select>
    </label>
  );

  const nothingToCompare = !loading && revisions.length === 0;
  const message = (text: string, role?: 'status') => <div role={role} style={{ padding: 28, textAlign: 'center', fontSize: 13, color: 'var(--fg-muted)' }}>{text}</div>;

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 100000, background: 'color-mix(in srgb, var(--bg) 72%, transparent)', display: 'flex', alignItems: stacked ? 'flex-end' : 'center', justifyContent: 'center', padding: stacked ? 0 : 24 }}
    >
      <motion.div
        ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Compare script versions" onKeyDown={onKeyDown}
        initial={{ opacity: 0, y: stacked ? 40 : 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'var(--bg-2)', border: '1px solid rgba(var(--ink-rgb), 0.1)', borderRadius: stacked ? '14px 14px 0 0' : 14, width: '100%', maxWidth: 1180, height: stacked ? '94dvh' : 'min(90vh, 900px)', display: 'flex', flexDirection: 'column', outline: 'none', boxShadow: '0 40px 100px color-mix(in srgb, var(--bg) 90%, transparent)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px', borderBottom: '1px solid rgba(var(--ink-rgb), 0.08)', flexShrink: 0 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontFamily: 'var(--display)', letterSpacing: '-0.02em', color: 'var(--fg)' }}>Compare versions</h3>
          <button aria-label="Close" onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer', padding: 6 }}><X size={18} aria-hidden /></button>
        </div>

        {loading ? message('Reading the versions…', 'status')
          : nothingToCompare ? message('Only one version so far — lock a revision or save a draft to compare.')
          : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid rgba(var(--ink-rgb), 0.06)', flexWrap: 'wrap', flexShrink: 0 }}>
                {select(fromId, setFromId, 'Version A')}
                <button aria-label="Swap A and B" title="Swap A and B" onClick={() => { chosen.current = true; setFromId(toId); setToId(fromId); resetView(); }} style={{ ...BTN, padding: '6px 8px' }}><ArrowLeftRight size={14} aria-hidden /></button>
                <ArrowRight size={14} aria-hidden style={{ color: 'var(--fg-dim)', display: stacked ? 'none' : undefined }} />
                {select(toId, setToId, 'Version B')}
              </div>

              {comparison && <Stats c={comparison} />}

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderBottom: '1px solid rgba(var(--ink-rgb), 0.06)', flexWrap: 'wrap', flexShrink: 0 }}>
                <div role="group" aria-label="Show" style={{ display: 'flex', background: 'color-mix(in srgb, var(--fg) 6%, transparent)', borderRadius: 8, padding: 2, flexWrap: 'wrap' }}>
                  {FILTERS.map((f) => (
                    <button key={f.id} onClick={() => { setFilter(f.id); resetView(); }} aria-pressed={filter === f.id}
                      style={{ fontSize: 12, background: filter === f.id ? 'rgba(var(--ink-rgb), 0.14)' : 'transparent', border: 'none', borderRadius: 8, padding: '5px 10px', color: filter === f.id ? 'var(--fg-strong)' : 'var(--fg-muted)', cursor: 'pointer', fontWeight: filter === f.id ? 600 : 400, minHeight: 28 }}>
                      {f.label}
                    </button>
                  ))}
                </div>
                <span style={{ flex: 1 }} />
                <button onClick={() => go(-1)} disabled={!refs.length} aria-keyshortcuts="P" style={{ ...BTN, opacity: refs.length ? 1 : 0.5 }}><span aria-hidden>↑ </span>Previous change</button>
                <button onClick={() => go(1)} disabled={!refs.length} aria-keyshortcuts="N" style={{ ...BTN, opacity: refs.length ? 1 : 0.5 }}>Next change<span aria-hidden> ↓</span></button>
                <span style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--fg-muted)', minWidth: 90 }}>
                  {refs.length ? (cursor >= 0 ? `${cursor + 1} of ${refs.length}` : `${refs.length} change${refs.length === 1 ? '' : 's'}`) : 'No changes'}
                </span>
                {!stacked && <span style={{ fontSize: 11, color: 'var(--fg-dim)' }}><kbd>N</kbd> next · <kbd>P</kbd> previous</span>}
                {comparison && (
                  <PrintButton label="the change report" build={() => compareDoc({
                    project: projectTitle, script: scriptTitle, accent, logo, fromLabel: nameOf(fromId), toLabel: nameOf(toId), comparison, filter,
                    generated: new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }),
                  })} />
                )}
              </div>
              <div role="status" aria-live="polite" style={SR_ONLY}>{announce}</div>

              {!stacked && comparison && !comparison.identical && (
                <div aria-hidden style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, padding: '6px 20px 0', fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--fg-muted)', flexShrink: 0 }}>
                  <span>A · {nameOf(fromId)}</span><span>B · {nameOf(toId)}</span>
                </div>
              )}

              <div ref={bodyRef} style={{ flex: 1, overflowY: 'auto', padding: '6px 12px 20px' }}>
                {!comparison ? message('These two versions could not be compared.')
                  : comparison.identical ? message(`No changes between ${nameOf(fromId)} and ${nameOf(toId)}.`)
                  : items.length === 0 || (refs.length === 0 && filter === 'all') ? message(comparison.renames.length ? 'Nothing else differs: the only change is the renamed character.' : 'No scenes differ.')
                  : refs.length === 0 ? message('Nothing differs under this filter.')
                  : items.map((it, i) => {
                    if (it.type === 'unchanged') {
                      const key = it.scenes[0].id;
                      const open = unchangedOpen.has(key);
                      return (
                        <div key={`u-${key}`} style={{ padding: '4px 0' }}>
                          <button aria-expanded={open} onClick={() => setUnchangedOpen((s) => { const n = new Set(s); if (n.has(key)) n.delete(key); else n.add(key); return n; })}
                            style={{ display: 'block', width: '100%', padding: '6px 8px', fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--fg-muted)', background: tint('var(--fg)', 4), border: '1px dashed rgba(var(--ink-rgb), 0.18)', borderRadius: 8, cursor: 'pointer', textAlign: 'center' }}>
                            {it.scenes.length} {filter === 'all' ? 'unchanged scene' : 'scene'}{it.scenes.length === 1 ? '' : 's'}{filter === 'all' ? '' : ' with nothing to show'} — {open ? 'hide' : 'show'}
                          </button>
                          {open && (
                            <ul style={{ margin: '6px 0 2px', padding: '0 0 0 18px', fontFamily: 'var(--script)', fontSize: 12, color: 'var(--fg-muted)' }}>
                              {it.scenes.map((s) => <li key={s.id}>{s.heading || 'Before the first scene'}</li>)}
                            </ul>
                          )}
                        </div>
                      );
                    }
                    const s = it.scene;
                    return (
                      <SceneBlock
                        key={`${s.id}-${i}`} scene={s} filter={filter} stacked={stacked} open={!closed.has(s.id)} currentId={currentId}
                        onToggle={() => setClosed((c) => { const n = new Set(c); if (n.has(s.id)) n.delete(s.id); else n.add(s.id); return n; })}
                        expandedGaps={gaps} onGap={(k) => setGaps((g) => new Set(g).add(k))}
                      />
                    );
                  })}
              </div>
            </>
          )}
      </motion.div>
    </div>
  );
}
