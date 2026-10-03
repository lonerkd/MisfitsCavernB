'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Crosshair } from 'lucide-react';
import { cutMap, findLine, sceneSeconds } from '@/lib/studio/cutlines';
import { POST_DEPT_COLOR, type PostDepartment, type PostNote, type SceneRow } from '@/lib/studio';
import { formatTimecode } from '@/lib/studio/timecode';
import type { ScriptLineLite } from '../StudioContext';
import type { CutPlayerHandle } from './CutPlayer';
import c from './cutscript.module.css';

export interface LinePick { sceneId: string; offset: number; text: string }

const SILENT = new Set(['section', 'synopsis', 'note', 'title', 'pagebreak', 'boneyard', 'empty']);

/**
 * The script beside the cut: the scene on screen (predicted from the scenes'
 * lengths and pinned by the notes already made — lib/studio/cutlines), its
 * lines as a script page. Click a line to pin the next note to it; a line's
 * notes play the cut from their moment.
 */
export function CutScript({ scenes, sceneLines, notes, player, live, picked, onPick, onShown }: {
  scenes: SceneRow[];
  sceneLines: Map<string, ScriptLineLite[]>;
  /** This cut's notes. */
  notes: PostNote[];
  player: React.RefObject<CutPlayerHandle | null>;
  live: boolean;
  picked: LinePick | null;
  onPick: (pick: LinePick) => void;
  /** The scene shown (the note composer ties new notes to it). */
  onShown: (sceneId: string | null) => void;
}) {
  // Where the playhead is, polled while the cut plays.
  const [playhead, setT] = useState<number | null>(null);
  const t = live ? playhead : null;
  useEffect(() => {
    if (!live) return;
    const tick = () => setT(player.current?.time() ?? null);
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 500);
    return () => { window.clearTimeout(first); window.clearInterval(id); };
  }, [live, player]);

  const seconds = useMemo(() => scenes.map(sceneSeconds), [scenes]);
  const indexOf = useMemo(() => new Map(scenes.map((sc, i) => [sc.id, i])), [scenes]);
  const map = useMemo(() => cutMap(
    seconds,
    notes.flatMap((n) => (n.scene_id && indexOf.has(n.scene_id) ? [{ at: Number(n.at_seconds), scene: indexOf.get(n.scene_id)! }] : [])),
  ), [seconds, notes, indexOf]);

  const [follow, setFollow] = useState(true);
  const [manual, setManual] = useState(0);
  const following = follow && live && t != null;
  const shown = scenes.length ? Math.min(scenes.length - 1, Math.max(0, following ? map.sceneAt(t!) : manual)) : -1;
  const scene = shown >= 0 ? scenes[shown] : null;
  useEffect(() => { onShown(scene?.id ?? null); }, [scene?.id, onShown]);
  const go = (i: number) => { setFollow(false); setManual(Math.min(scenes.length - 1, Math.max(0, i))); };

  const lines = scene ? sceneLines.get(scene.id) ?? null : null;
  // This scene's notes by the line they're on now.
  const byLine = useMemo(() => {
    const m = new Map<number, PostNote[]>();
    if (!scene || !lines) return m;
    const texts = lines.map((l) => l.text);
    for (const n of notes) {
      if (n.scene_id !== scene.id || n.line_offset == null || !n.line_text) continue;
      const at = findLine(texts, { offset: n.line_offset, text: n.line_text });
      if (at) m.set(at.offset, [...(m.get(at.offset) ?? []), n]);
    }
    return m;
  }, [scene, lines, notes]);

  const list = useRef<HTMLOListElement>(null);
  useEffect(() => { list.current?.scrollTo?.({ top: 0 }); }, [scene?.id]);

  const end = map.starts.length ? map.starts[map.starts.length - 1] + seconds[seconds.length - 1] : 0;
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of notes) if (n.scene_id && !n.resolved_at) m.set(n.scene_id, (m.get(n.scene_id) ?? 0) + 1);
    return m;
  }, [notes]);

  if (!scenes.length) {
    return <section className={c.panel} aria-label="Script"><p className={c.hint}>Open a script with scenes (Studio › Scenes) to see its lines beside the cut and pin notes to them.</p></section>;
  }

  return (
    <section className={c.panel} aria-label="Script beside the cut">
      <div className={c.head}>
        <button type="button" className={c.nav} onClick={() => go(shown - 1)} disabled={shown <= 0} aria-label="Previous scene"><ChevronLeft size={14} /></button>
        <h3 className={c.title} aria-live="polite">
          <span className={c.num}>Sc {scene!.scene_number}</span> {scene!.heading ?? scene!.title}
        </h3>
        <button type="button" className={c.nav} onClick={() => go(shown + 1)} disabled={shown >= scenes.length - 1} aria-label="Next scene"><ChevronRight size={14} /></button>
        <button type="button" className={c.follow} aria-pressed={following} onClick={() => setFollow(true)} disabled={!live}
          title={live ? 'Show the scene the cut is on (predicted from scene lengths and your notes)' : 'This player can’t report its position'}>
          <Crosshair size={11} aria-hidden /> {following ? 'Following' : 'Follow'}
        </button>
      </div>

      <div className={c.strip} role="group" aria-label="Scenes along the cut">
        {scenes.map((sc, i) => {
          const n = counts.get(sc.id) ?? 0;
          const len = (map.starts[i + 1] ?? end) - map.starts[i];
          return (
            <button key={sc.id} type="button" className={c.pip} aria-current={i === shown ? 'true' : undefined} onClick={() => go(i)}
              style={{ flexGrow: Math.max(0.5, len) }}
              aria-label={`Scene ${sc.scene_number}: ${sc.heading ?? sc.title}${n ? `, ${n} open note${n === 1 ? '' : 's'}` : ''}`}
              title={`${sc.scene_number}. ${sc.heading ?? sc.title} · ≈${formatTimecode(map.starts[i])}`}>
              {n > 0 && <span className={c.pipCount} aria-hidden>{n}</span>}
            </button>
          );
        })}
        {live && t != null && end > 0 && <span className={c.playhead} style={{ left: `${Math.min(100, (t / end) * 100)}%` }} aria-hidden />}
      </div>

      {!lines ? (
        <p className={c.hint}>This scene’s lines aren’t loaded — open its script in Studio › Scenes.</p>
      ) : (
        <>
          <ol ref={list} className={c.page} aria-label={`Lines of scene ${scene!.scene_number}`}>
            {lines.map((l, i) => {
              if (SILENT.has(l.type) || !l.text.trim()) return null;
              const on = byLine.get(i) ?? [];
              const isPicked = picked?.sceneId === scene!.id && picked.offset === i;
              return (
                <li key={i} className={c.line}>
                  <button type="button" className={`${c.text} ${c[l.type] ?? ''}`} aria-pressed={isPicked}
                    onClick={() => onPick({ sceneId: scene!.id, offset: i, text: l.text.trim() })}>
                    {l.text.trim()}
                  </button>
                  {on.length > 0 && (
                    <button type="button" className={c.marks} onClick={() => player.current?.seek(Number(on[0].at_seconds))}
                      aria-label={`${on.length} note${on.length === 1 ? '' : 's'} on this line — play from ${formatTimecode(Number(on[0].at_seconds))}`}
                      title={on.map((n) => `${formatTimecode(Number(n.at_seconds))} · ${n.body}`).join('\n')}>
                      {on.slice(0, 4).map((n) => (
                        <span key={n.id} className={c.mark} style={{ background: POST_DEPT_COLOR[n.department as PostDepartment] ?? '#9ca3af', opacity: n.resolved_at ? 0.35 : 1 }} />
                      ))}
                      <span>{formatTimecode(Number(on[0].at_seconds))}</span>
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
          <p className={c.hint}>Click a line to pin your next note to it.</p>
        </>
      )}
    </section>
  );
}
