'use client';

// The table read: the browser reads the script aloud, a voice per character,
// and each scene it reads in full (from its heading to the next, pauses
// excluded) is timed; the times calibrate the runtime (lib/scriptos/timing).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { useOnChange } from '@/lib/hooks/useOnChange';
import { formatRuntime } from '@/lib/scriptos/timing';
import { getTableReadEngine, isTableReadSupported, type TableReadEngine } from '@/lib/scriptos/tableRead';
import type { ScriptLine } from '@/lib/scriptos/types';

interface Clock { scene: number; fromHeading: boolean; since: number | null; elapsed: number; timed: number[] }
const freshClock = (): Clock => ({ scene: -1, fromHeading: false, since: null, elapsed: 0, timed: [] });

/**
 * `saveReadRef.current(sceneIdx, seconds)` stores a scene's read time; it is a
 * ref because the scene index it belongs to is built after the parse, and the
 * hook must not restart when it changes. `textareaRef` is scrolled to follow
 * the line being read.
 */
export function useTableRead({ lines, scriptId, saveReadRef, textareaRef }: {
  lines: ScriptLine[];
  scriptId: string | undefined;
  saveReadRef: React.RefObject<(sceneIdx: number, seconds: number) => void>;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const { toast } = useToast();
  const [playing, setPlaying] = useState(false);
  const [lineIdx, setLineIdx] = useState<number | null>(null);
  const engineRef = useRef<TableReadEngine | null>(null);
  const clock = useRef<Clock>(freshClock());

  const sceneOfLine = useMemo(() => {
    let n = -1;
    return lines.map((l) => (l.type === 'slug' ? ++n : n));
  }, [lines]);

  const closeReadScene = useCallback(() => {
    const c = clock.current;
    if (c.since != null) { c.elapsed += (performance.now() - c.since) / 1000; c.since = null; }
    if (c.scene >= 0 && c.fromHeading && c.elapsed >= 1) {
      saveReadRef.current?.(c.scene, c.elapsed);
      c.timed.push(c.elapsed);
    }
  }, [saveReadRef]);

  const start = useCallback((fromIndex = 0) => {
    if (!isTableReadSupported()) { toast('Table read isn’t supported in this browser', 'error'); return; }
    engineRef.current?.stop();
    clock.current = freshClock();
    const engine = getTableReadEngine(lines, {
      onLineStart: (idx) => {
        setLineIdx(idx);
        const c = clock.current;
        const scene = sceneOfLine[idx] ?? -1;
        if (scene !== c.scene) {
          closeReadScene();
          clock.current = { ...c, scene, fromHeading: lines[idx]?.type === 'slug', since: performance.now(), elapsed: 0 };
        } else if (c.since == null) {
          c.since = performance.now();
        }
      },
      onComplete: () => {
        closeReadScene();
        const timed = clock.current.timed;
        if (timed.length) toast(`Table read timed ${timed.length} scene${timed.length === 1 ? '' : 's'} — ${formatRuntime(timed.reduce((a, b) => a + b, 0))}. The runtime now uses it.`, 'success');
        clock.current = freshClock();
        setPlaying(false); setLineIdx(null);
      },
      rate: 1,
    });
    engineRef.current = engine;
    setPlaying(true);
    engine.play(fromIndex);
  }, [lines, toast, sceneOfLine, closeReadScene]);

  const pause = useCallback(() => {
    engineRef.current?.pause();
    const c = clock.current;
    if (c.since != null) { c.elapsed += (performance.now() - c.since) / 1000; c.since = null; }
    setPlaying(false);
  }, []);

  const resume = useCallback(() => {
    engineRef.current?.resume();
    clock.current.since = performance.now();
    setPlaying(true);
  }, []);

  const stop = useCallback(() => {
    engineRef.current?.stop();
    // A scene stopped half-way isn't a timing; the ones read in full are already saved.
    clock.current = freshClock();
    setPlaying(false);
    setLineIdx(null);
  }, []);

  useEffect(() => () => { engineRef.current?.stop(); }, []);

  // Switching scripts: no table read carries over. State resets as the new
  // script renders; the reading engine after.
  useOnChange(scriptId, () => { setPlaying(false); setLineIdx(null); });
  useEffect(() => {
    engineRef.current?.stop();
    clock.current = freshClock();
  }, [scriptId]);

  // The page follows the line being read.
  useEffect(() => {
    if (lineIdx == null || !textareaRef.current) return;
    const textarea = textareaRef.current;
    const lineHeight = 26;
    const targetScroll = (lineIdx * lineHeight) - (window.innerHeight * 0.3);
    textarea.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
  }, [lineIdx, textareaRef]);

  return { playing, lineIdx, start, pause, resume, stop };
}
