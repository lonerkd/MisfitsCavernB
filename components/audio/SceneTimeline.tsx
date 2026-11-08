'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play, Search, Trash } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useSpotify } from '@/lib/os/SpotifyContext';
import { pushUndo, undoOrigin, UndoRefused } from '@/lib/os/undo';
import { TrackTagger } from '@/components/audio/TrackTagger';
import { buildTimeline, formatMinutes, sceneSummary, type LengthSource, type TimelineBar } from '@/lib/audio/timeline';
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
const PX_PER_MIN = 16;
const LANE_H = 36;
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
  const [scriptId, setScriptId] = useState<string | null>(null);
  const [data, setData] = useState<Loaded | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [tagging, setTagging] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const dragging = useRef<{ trackId: string; from: string } | null>(null);
  const [over, setOver] = useState<string | null>(null);
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
  const px = PX_PER_MIN * zoom;
  const width = timeline ? Math.max(timeline.totalMinutes * px, 320) : 320;
  const scene = timeline?.scenes.find((s) => s.id === selected) ?? null;

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
          <h2 className="mc-title text-2xl">{projectTitle} · scenes</h2>
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
          <div className="overflow-x-auto pb-2" role="group" aria-label="Scenes timeline">
            <div style={{ width, minWidth: '100%', position: 'relative' }}>
              {/* The scenes: a block each, width by length, colour by mood. */}
              <div style={{ position: 'relative', height: 44 }}>
                {timeline.scenes.map((s) => (
                  <button key={s.id} type="button" aria-label={sceneSummary(s, tracksIn(s.id).length)} aria-pressed={selected === s.id}
                    title={`${s.number}. ${s.heading}`} onClick={() => setSelected(selected === s.id ? null : s.id)}
                    style={{ position: 'absolute', left: s.start * px, width: Math.max(s.minutes * px - 2, 6), top: 0, height: 44, background: s.color, opacity: selected && selected !== s.id ? 0.55 : 1, outline: selected === s.id ? '2px solid var(--fg-strong)' : 'none', borderRadius: 4, borderStyle: s.source === 'floor' ? 'dotted' : 'solid', borderWidth: 1, borderColor: 'var(--border)' }}
                    className="mc-text text-xs text-[var(--on-accent)] overflow-hidden text-left px-1">{s.number}</button>
                ))}
              </div>
              {/* The lanes: one per role. */}
              {timeline.lanes.map((lane) => (
                <div key={lane.role} style={{ position: 'relative', height: LANE_H, marginTop: 6 }} data-lane={lane.role}>
                  <span className="mc-text text-xs text-[var(--fg-dim)]" style={{ position: 'absolute', left: 0, top: -2, zIndex: 2 }}>{lane.label}</span>
                  {canTag && timeline.scenes.map((s) => (
                    <div key={s.id} onDragOver={(e) => { if (dragging.current) { e.preventDefault(); setOver(`${lane.role}:${s.id}`); } }} onDragLeave={() => setOver(null)}
                      onDrop={(e) => { e.preventDefault(); setOver(null); const d = dragging.current; dragging.current = null; if (d) void moveTo(d.trackId, d.from, s.id); }}
                      style={{ position: 'absolute', left: s.start * px, width: Math.max(s.minutes * px - 2, 6), top: 0, height: LANE_H, background: over === `${lane.role}:${s.id}` ? 'rgba(var(--ink-rgb),0.12)' : 'transparent' }} />
                  ))}
                  {lane.bars.map((b) => {
                    const s = timeline.scenes.find((x) => x.id === b.sceneId)!;
                    return (
                      <button key={b.trackId} type="button" draggable={canTag} aria-label={`${b.title}, in scene ${s.number}`} title={`${b.title} (scene ${s.number})`}
                        onDragStart={() => { dragging.current = { trackId: b.trackId, from: b.sceneId }; }} onDragEnd={() => { dragging.current = null; setOver(null); }}
                        onClick={() => play(b)}
                        style={{ position: 'absolute', left: s.start * px + 1, width: Math.max(s.minutes * px - 4, 6), top: 12, height: LANE_H - 14, background: swatch(b.swatch), borderRadius: 4, cursor: canTag ? 'grab' : 'pointer' }}
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

          {scene && (
            <section className="p-5 rounded-2xl border border-[rgba(var(--ink-rgb),0.08)] bg-[var(--sunken)] space-y-4" aria-label={`Scene ${scene.number}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="mc-title text-lg">{scene.number}. {scene.heading}</h3>
                  <p className="mc-text text-xs text-[var(--fg-dim)]">{scene.mood} · {formatMinutes(scene.minutes)} · {SOURCE_NOTE[scene.source]}</p>
                </div>
                <Button variant="outline" className="gap-2" onClick={() => onFind(moodQuery(scene.mood), scene.id)}><Search size={14} /> Find music for this scene</Button>
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
          )}
        </>
      )}
    </div>
  );
}
