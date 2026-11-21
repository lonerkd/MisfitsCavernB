'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as KeyEvent, type MouseEvent as ClickEvent } from 'react';
import Link from 'next/link';
import { PenLine, Play, Search, Trash } from 'lucide-react';
import { editorSceneHref } from '@/lib/audio/links';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useSpotify } from '@/lib/os/SpotifyContext';
import { usePhoneLayout } from '@/lib/os/usePhone';
import { BottomSheet } from '@/components/phone/BottomSheet';
import { pushUndo, undoOrigin, UndoRefused } from '@/lib/os/undo';
import { TrackTagger } from '@/components/audio/TrackTagger';
import {
  axisWidth, buildTimeline, centredScrollLeft, formatMinutes, minimapSegments, sceneSummary, stripToScrollLeft, timelineScale, viewWindow,
  type LengthSource, type TimelineBar,
} from '@/lib/audio/timeline';
import { parseScript } from '@/lib/scriptos/parser';
import { moodQuery, sceneMood } from '@/lib/spotify/moods';
import {
  audioRefUrl, deleteAudioRef, listAudioRefs, listProjectScripts, loadScriptForTimeline, moveAudioRefScene, tagAudioRef,
  type AudioReference, type AudioRole,
} from '@/lib/supabase/audio';

const SOURCE_NOTE: Record<LengthSource, string> = {
  read: 'Length from the table read.',
  pages: 'Length estimated from page length (a page a minute).',
  lines: 'Length estimated from the number of lines.',
  floor: 'Length not known yet: drawn at the smallest size.',
};
const LANE_H = 36;
const LANE_H_PHONE = 56; // a bar is a thumb target on a phone: 44 pt tall
// Tracks that share a song share a colour; the hue is spread so neighbours differ.
const swatch = (n: number) => `hsl(${(n * 67) % 360} 50% 52%)`;

type Loaded = { key: string; scenes: Awaited<ReturnType<typeof loadScriptForTimeline>>['scenes']; content: string | null; refs: AudioReference[]; scripts: { id: string; title: string | null }[]; scriptId: string | null };

/**
 * The Sound page's Scenes room: the film's scenes left to right (width by length, colour by mood), a lane per role with each
 * track's bar over its scene, and the scenes with no music drawn as gaps. Click a scene for its detail; drag a bar to move its
 * tag (owners and writers, with undo). Plan: .cavern-intelligence/plans/2026-11-08-scenes-timeline.md
 */
export function SceneTimeline({ projectId, projectTitle, canTag, onFind }: { projectId: string; projectTitle: string; canTag: boolean; onFind: (query: string, sceneId: string) => void }) {
  const { toast } = useToast();
  const { playUri } = useSpotify();
  const phone = usePhoneLayout();
  const [scriptId, setScriptId] = useState<string | null>(null);
  const [data, setData] = useState<Loaded | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [tagging, setTagging] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const dragging = useRef<{ trackId: string; from: string } | null>(null);
  const [over, setOver] = useState<string | null>(null);
  // The scene that holds the Tab stop (roving focus): arrow keys move it between the scene blocks.
  const [rovingId, setRovingId] = useState<string | null>(null);
  // The scrolled box's position and width, for the minimap's highlight window.
  const [view, setView] = useState({ left: 0, viewport: 0 });
  const box = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const sceneEls = useRef(new Map<string, HTMLButtonElement>());
  const hintId = useId();
  const key = `${projectId}:${scriptId ?? ''}`;

  const load = useCallback(async () => {
    try {
      const scripts = await listProjectScripts(projectId);
      const id = scriptId && scripts.some((s) => s.id === scriptId) ? scriptId : scripts[0]?.id ?? null;
      const [refs, script] = await Promise.all([listAudioRefs(projectId), id ? loadScriptForTimeline(id) : Promise.resolve({ content: null, scenes: [] })]);
      setData({ key: `${projectId}:${scriptId ?? ''}`, scenes: script.scenes, content: script.content, refs, scripts, scriptId: id });
    } catch {
      toast('Could not load the scenes timeline.', 'error');
      setData({ key: `${projectId}:${scriptId ?? ''}`, scenes: [], content: null, refs: [], scripts: [], scriptId: null });
    }
  }, [projectId, scriptId, toast]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- loads the project's scenes and tracks when the room opens
  useEffect(() => { void load(); }, [load]);

  const ready = data && data.key === key ? data : null;
  const timeline = useMemo(() => {
    if (!ready) return null;
    const moods = new Map<number, { mood: string; color: string }>();
    const lineCounts = new Map<number, number>();
    if (ready.content) {
      const parsed = parseScript(ready.content);
      parsed.scenes.forEach((sc, i) => {
        const body = parsed.lines.slice(sc.startIndex + 1, sc.endIndex + 1).map((l) => l.text).join('\n');
        const m = sceneMood(body, sc.timeOfDay);
        moods.set(i + 1, { mood: m.mood, color: m.color });
        lineCounts.set(i + 1, sc.endIndex - sc.startIndex);
      });
    }
    return buildTimeline({
      scenes: ready.scenes, moods, lineCounts,
      tracks: ready.refs.filter((r) => r.reference_type === 'spotify' || r.reference_type === 'custom_upload')
        .map((r) => ({ id: r.id, title: r.title, uri: r.uri, for_scene: r.for_scene ?? null, role: r.role ?? null, tags: r.tags ?? [] })),
    });
  }, [ready]);

  const sceneChoices = useMemo(() => timeline?.scenes.map((s) => ({ id: s.id, label: `${s.number} · ${s.heading}` })) ?? [], [timeline]);
  const refOf = (id: string) => ready?.refs.find((r) => r.id === id);
  const tracksIn = (sceneId: string) => timeline?.lanes.flatMap((l) => l.bars.filter((b) => b.sceneId === sceneId)) ?? [];
  const laneH = phone.phone ? LANE_H_PHONE : LANE_H;
  // On a phone every scene block is a 44 pt thumb target (the buttons carry that minimum width), so the scale is widened until the
  // shortest scene is that wide, or blocks pile onto each other and a tap lands on the wrong scene. The strip scrolls sideways.
  const shortest = timeline && timeline.scenes.length ? Math.max(0.25, Math.min(...timeline.scenes.map((s) => s.minutes))) : 1;
  const px = timelineScale(zoom, phone.phone, shortest);
  const width = timeline ? axisWidth(timeline.totalMinutes, px) : 320;
  const scene = timeline?.scenes.find((s) => s.id === selected) ?? null;
  const hasScenes = (timeline?.scenes.length ?? 0) > 0;
  const win = viewWindow(view.left, view.viewport, width);
  // The Tab stop: the focused scene, else the selected one, else the first.
  const tabStop = timeline?.scenes.find((s) => s.id === rovingId)?.id ?? scene?.id ?? timeline?.scenes[0]?.id;

  const measure = useCallback(() => {
    const b = box.current;
    if (b) setView({ left: b.scrollLeft, viewport: b.clientWidth });
  }, []);
  // Keep the highlight window right when the box is resized (the browser reports it; jsdom has no ResizeObserver).
  useEffect(() => {
    const b = box.current;
    if (!b || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(b);
    return () => ro.disconnect();
  }, [hasScenes, measure]);

  const scrollBoxTo = (left: number) => {
    const b = box.current;
    if (!b) return;
    if (typeof b.scrollTo === 'function') b.scrollTo({ left, behavior: 'smooth' });
    else b.scrollLeft = left;
  };
  // A press on the strip centres that point of the timeline; a keyboard press on a scene's block centres that scene.
  const jumpAlongScript = (e: ClickEvent<HTMLDivElement>) => {
    const b = box.current;
    const st = strip.current;
    if (!b || !st || !timeline) return;
    const viewport = b.clientWidth;
    const id = (e.target as HTMLElement).closest<HTMLElement>('[data-scene-id]')?.dataset.sceneId;
    const hit = id ? timeline.scenes.find((x) => x.id === id) : undefined;
    if (hit && e.detail === 0) {
      scrollBoxTo(centredScrollLeft((hit.start + hit.minutes / 2) * px, viewport, width));
      return;
    }
    const rect = st.getBoundingClientRect();
    scrollBoxTo(stripToScrollLeft(e.clientX - rect.left, rect.width, viewport, width));
  };
  const focusScene = (id: string) => sceneEls.current.get(id)?.focus();
  // Arrow keys, Home and End move between scene blocks; T finds music for the focused scene (the same flow as the detail's button).
  const onSceneKey = (e: KeyEvent<HTMLButtonElement>, i: number) => {
    const list = timeline?.scenes ?? [];
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const last = list.length - 1;
    let to: number;
    if (e.key === 'ArrowRight') to = Math.min(i + 1, last);
    else if (e.key === 'ArrowLeft') to = Math.max(i - 1, 0);
    else if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = last;
    else if (e.key === 't' || e.key === 'T') { e.preventDefault(); onFind(moodQuery(list[i].mood), list[i].id); return; }
    else return;
    e.preventDefault();
    focusScene(list[to].id);
  };

  const play = (b: TimelineBar) => {
    const ref = refOf(b.trackId);
    if (ref?.reference_type === 'custom_upload') new Audio(audioRefUrl(b.uri)).play().catch(() => toast('This file would not play.', 'error'));
    else void playUri(b.uri);
  };
  const remove = async (b: TimelineBar) => {
    try { await deleteAudioRef(b.trackId); } catch (e) { toast('Could not remove it: ' + (e instanceof Error ? e.message : 'unknown error'), 'error'); return; }
    toast('Removed', 'success');
    void load();
  };
  const retag = async (b: TimelineBar, t: { sceneId: string | null; role: AudioRole | null; tags: string[] }) => {
    try { await tagAudioRef(b.trackId, t); toast('Tags saved', 'success'); void load(); } catch (e) { toast(e instanceof Error ? e.message : 'Could not save the tags', 'error'); throw e; }
  };
  const moveTo = async (trackId: string, from: string, to: string) => {
    if (from === to) return;
    const origin = undoOrigin();
    try {
      if (!(await moveAudioRefScene(trackId, from, to))) { toast('That track was changed (or you cannot edit it), so nothing moved.', 'error'); void load(); return; }
    } catch (e) { toast('Could not move it: ' + (e instanceof Error ? e.message : 'unknown error'), 'error'); return; }
    const label = refOf(trackId)?.title ?? 'track';
    const toScene = timeline?.scenes.find((s) => s.id === to);
    toast(`Moved ${label} to scene ${toScene?.number ?? ''}`, 'success');
    pushUndo(`Moved ${label} to scene ${toScene?.number ?? ''}`, async () => {
      if (!(await moveAudioRefScene(trackId, to, from))) throw new UndoRefused('That track has been changed since, so nothing was put back.');
      await load();
    }, origin);
    void load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[rgba(var(--ink-rgb),0.1)]">
        <div>
          <h2 className={`mc-title ${phone.phone ? "text-xl" : "text-2xl"}`}>{projectTitle} · scenes</h2>
          <p className="mc-text text-sm text-[var(--fg-dim)]">
            {timeline ? `${timeline.scenes.length} scene${timeline.scenes.length === 1 ? '' : 's'}, ${formatMinutes(timeline.totalMinutes)} · ${timeline.gaps.length} with no music` : 'Loading…'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {ready && ready.scripts.length > 1 && (
            <select aria-label="Script" value={ready.scriptId ?? ''} onChange={(e) => { setScriptId(e.target.value); setSelected(null); }}
              className="mc-text text-xs rounded-full border border-[rgba(var(--ink-rgb),0.14)] bg-[var(--bg)] text-[var(--fg)] px-3 min-h-[44px]">
              {ready.scripts.map((s) => <option key={s.id} value={s.id}>{s.title || 'Untitled script'}</option>)}
            </select>
          )}
          <label className="mc-text text-xs text-[var(--fg-dim)] flex items-center gap-2">Zoom
            <input type="range" min={0.5} max={4} step={0.25} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} aria-label="Zoom the timeline" />
          </label>
        </div>
      </div>

      {!ready || !timeline ? (
        <div className="animate-pulse h-24 w-full rounded-xl bg-[var(--sunken)]" />
      ) : timeline.scenes.length === 0 ? (
        <p className="mc-text text-[var(--fg-dim)]">This script has no scenes yet. Write a scene heading (INT. / EXT.) in the editor and it appears here.</p>
      ) : (
        <>
          {/* The whole script in one strip: a block a scene in its mood colour, paler when it has no music. The highlight is the part in view. */}
          <div ref={strip} role="group" aria-label="Whole script" onClick={jumpAlongScript}
            className="relative mb-2 cursor-pointer rounded-[4px] bg-[rgba(var(--ink-rgb),0.04)]" style={{ height: 14 }}>
            {minimapSegments(timeline.scenes, px, width).map((m) => (
              <button key={m.id} type="button" data-scene-id={m.id} aria-label={`Scene ${m.number}`} title={`${m.number}. ${m.heading}`}
                style={{ position: 'absolute', top: 0, bottom: 0, left: `${m.leftPct}%`, width: `${m.widthPct}%`, minWidth: 2, boxSizing: 'border-box', padding: 0, borderRadius: 4,
                  background: m.color, border: `1px solid ${m.color}`,
                  opacity: (selected && selected !== m.id ? 0.55 : 1) * (m.silent ? 0.45 : 1) }} />
            ))}
            <div aria-hidden style={{ position: 'absolute', top: 0, bottom: 0, left: `${win.leftPct}%`, width: `${win.widthPct}%`, minWidth: 2, boxSizing: 'border-box', borderRadius: 4,
              border: '1px solid var(--fg-strong)', background: 'rgba(var(--ink-rgb),0.08)', pointerEvents: 'none' }} />
          </div>
          <p id={hintId} className="sr-only">Use the arrow keys to move between scenes. Press T to find music for the focused scene.</p>
          <div ref={box} onScroll={measure} className="overflow-x-auto pb-2" role="group" aria-label="Scenes timeline" aria-describedby={hintId}>
            <div style={{ width, minWidth: '100%', position: 'relative' }}>
              {/* The scenes: a block each, width by length, colour by mood. */}
              <div style={{ position: 'relative', height: 44 }}>
                {timeline.scenes.map((s, i) => (
                  <button key={s.id} ref={(el) => { if (el) sceneEls.current.set(s.id, el); else sceneEls.current.delete(s.id); }}
                    type="button" aria-label={sceneSummary(s, tracksIn(s.id).length)} aria-pressed={selected === s.id}
                    tabIndex={s.id === tabStop ? 0 : -1} onFocus={() => setRovingId(s.id)} onKeyDown={(e) => onSceneKey(e, i)}
                    title={`${s.number}. ${s.heading}`} onClick={() => setSelected(selected === s.id ? null : s.id)}
                    style={{ position: 'absolute', left: s.start * px, width: Math.max(s.minutes * px - 2, 6), top: 0, height: 44, background: s.color, opacity: selected && selected !== s.id ? 0.55 : 1, outline: selected === s.id ? '2px solid var(--fg-strong)' : 'none', borderRadius: 4, borderStyle: s.source === 'floor' ? 'dotted' : 'solid', borderWidth: 1, borderColor: 'var(--border)' }}
                    className="mc-text text-xs text-[var(--on-accent)] overflow-hidden text-left px-1">{s.number}</button>
                ))}
              </div>
              {/* The lanes: one per role. */}
              {timeline.lanes.map((lane) => (
                <div key={lane.role} style={{ position: 'relative', height: laneH, marginTop: 6 }} data-lane={lane.role}>
                  <span className="mc-text text-xs text-[var(--fg-dim)]" style={{ position: 'absolute', left: 0, top: -2, zIndex: 2 }}>{lane.label}</span>
                  {canTag && timeline.scenes.map((s) => (
                    <div key={s.id} onDragOver={(e) => { if (dragging.current) { e.preventDefault(); setOver(`${lane.role}:${s.id}`); } }} onDragLeave={() => setOver(null)}
                      onDrop={(e) => { e.preventDefault(); setOver(null); const d = dragging.current; dragging.current = null; if (d) void moveTo(d.trackId, d.from, s.id); }}
                      style={{ position: 'absolute', left: s.start * px, width: Math.max(s.minutes * px - 2, 6), top: 0, height: laneH, background: over === `${lane.role}:${s.id}` ? 'rgba(var(--ink-rgb),0.12)' : 'transparent' }} />
                  ))}
                  {lane.bars.map((b) => {
                    const s = timeline.scenes.find((x) => x.id === b.sceneId)!;
                    return (
                      <button key={b.trackId} type="button" draggable={canTag} aria-label={`${b.title}, in scene ${s.number}`} title={`${b.title} (scene ${s.number})`}
                        onDragStart={() => { dragging.current = { trackId: b.trackId, from: b.sceneId }; }} onDragEnd={() => { dragging.current = null; setOver(null); }}
                        onClick={() => play(b)}
                        style={{ position: 'absolute', left: s.start * px + 1, width: Math.max(s.minutes * px - 4, 6), top: phone.phone ? 6 : 12, height: phone.phone ? 44 : LANE_H - 14, background: swatch(b.swatch), borderRadius: 4, cursor: canTag ? 'grab' : 'pointer' }}
                        className="mc-text text-xs text-[var(--on-accent)] overflow-hidden whitespace-nowrap text-left px-1">{b.title}</button>
                    );
                  })}
                </div>
              ))}
              {/* The gaps: scenes with no music. */}
              <div style={{ position: 'relative', height: 14, marginTop: 6 }} aria-hidden>
                {timeline.gaps.map((g) => (
                  <div key={g.id} style={{ position: 'absolute', left: g.start * px, width: Math.max(g.minutes * px - 2, 6), top: 0, height: 10, background: 'repeating-linear-gradient(45deg, var(--border) 0 3px, transparent 3px 6px)', borderRadius: 4 }} />
                ))}
              </div>
            </div>
          </div>
          <p className="mc-text text-xs text-[var(--fg-dim)]">
            Width is how long a scene runs; colour is its mood; hatched marks are scenes with no music.
            {canTag ? ' Drag a bar onto another scene to move its tag.' : ''}
            {timeline.elsewhere > 0 ? ` ${timeline.elsewhere} track${timeline.elsewhere === 1 ? ' is' : 's are'} tagged to scenes in another script.` : ''}
          </p>

          {scene && (phone.phone
            ? <BottomSheet open onClose={() => setSelected(null)} title={`Scene ${scene.number}`} keyboard={phone.keyboard} full>{detail(scene)}</BottomSheet>
            : detail(scene))}
        </>
      )}
    </div>
  );

  function detail(scene: NonNullable<typeof timeline>['scenes'][number]) {
    return (
            <section className={`${phone.phone ? '' : 'p-5 rounded-2xl border border-[rgba(var(--ink-rgb),0.08)] bg-[var(--sunken)]'} space-y-4`} aria-label={`Scene ${scene.number}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="mc-title text-lg">{scene.number}. {scene.heading}</h3>
                  <p className="mc-text text-xs text-[var(--fg-dim)]">{scene.mood} · {formatMinutes(scene.minutes)} · {SOURCE_NOTE[scene.source]}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {editorSceneHref(ready?.scriptId, scene.id) && (
                    <Link href={editorSceneHref(ready?.scriptId, scene.id)!} className="mc-text text-xs inline-flex items-center gap-2 rounded-full border border-[rgba(var(--ink-rgb),0.14)] px-4 min-h-[44px] text-[var(--fg)] hover:text-[var(--fg-strong)]">
                      <PenLine size={14} aria-hidden /> Open in the script
                    </Link>
                  )}
                  <Button variant="outline" className="gap-2" onClick={() => onFind(moodQuery(scene.mood), scene.id)}><Search size={14} /> Find music for this scene</Button>
                </div>
              </div>
              {tracksIn(scene.id).length === 0 ? (
                <p className="mc-text text-sm text-[var(--fg-dim)]">No music in this scene yet.</p>
              ) : (
                <ul className="space-y-2">
                  {tracksIn(scene.id).map((b) => {
                    const ref = refOf(b.trackId);
                    return (
                      <li key={b.trackId} className="rounded-xl border border-[rgba(var(--ink-rgb),0.06)] p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <button type="button" aria-label={`Play ${b.title}`} onClick={() => play(b)} className="w-11 h-11 shrink-0 rounded-full bg-[rgba(var(--ink-rgb),0.05)] flex items-center justify-center"><Play size={16} /></button>
                            <div className="min-w-0"><h4 className="mc-title text-sm truncate">{b.title}</h4>
                              <p className="mc-text text-xs text-[var(--fg-dim)] truncate">{[ref?.role, ...b.tags].filter(Boolean).join(' · ')}</p></div>
                          </div>
                          {canTag && (
                            <div className="flex gap-1 shrink-0">
                              <Button variant="outline" onClick={() => setTagging(tagging === b.trackId ? null : b.trackId)}>Tag</Button>
                              <button type="button" aria-label={`Remove ${b.title}`} onClick={() => void remove(b)} className="w-11 h-11 rounded flex items-center justify-center text-[var(--fg-dim)] hover:text-[var(--fg-strong)]"><Trash size={16} /></button>
                            </div>
                          )}
                        </div>
                        {canTag && tagging === b.trackId && <TrackTagger track={{ role: ref?.role, for_scene: ref?.for_scene, tags: ref?.tags }} scenes={sceneChoices} onSave={(t) => retag(b, t)} onClose={() => setTagging(null)} />}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
    );
  }
}
