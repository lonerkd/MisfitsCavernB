// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';

const toast = vi.fn();
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast }) }));

// A fake engine the test drives by hand: it records the handlers it was given.
interface FakeEngine {
  opts: { onLineStart?: (i: number) => void; onComplete?: () => void };
  play: ReturnType<typeof vi.fn>; pause: ReturnType<typeof vi.fn>; resume: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>;
}
const engines = vi.hoisted(() => [] as FakeEngine[]);
const supported = vi.hoisted(() => ({ value: true }));
vi.mock('@/lib/scriptos/tableRead', () => ({
  isTableReadSupported: () => supported.value,
  getTableReadEngine: (_lines: unknown, opts: FakeEngine['opts']) => {
    const e: FakeEngine = { opts, play: vi.fn(), pause: vi.fn(), resume: vi.fn(), stop: vi.fn() };
    engines.push(e);
    return e;
  },
}));

import { useTableRead } from './useTableRead';
import type { ScriptLine } from '@/lib/scriptos/types';

const line = (type: ScriptLine['type'], index: number): ScriptLine => ({ id: String(index), index, text: type, type, confidence: 1 });
// scene 0: heading (0), dialogue (1); scene 1: heading (2), dialogue (3)
const LINES = [line('slug', 0), line('dialogue', 1), line('slug', 2), line('dialogue', 3)];

let now = 0;
beforeEach(() => { vi.clearAllMocks(); engines.length = 0; supported.value = true; now = 0; vi.spyOn(performance, 'now').mockImplementation(() => now); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function setup() {
  const saved: Array<[number, number]> = [];
  const saveReadRef = { current: (i: number, s: number) => { saved.push([i, s]); } };
  const textarea = document.createElement('textarea');
  textarea.scrollTo = vi.fn() as unknown as typeof textarea.scrollTo;
  const textareaRef = { current: textarea };
  const hook = renderHook(({ scriptId }) => useTableRead({ lines: LINES, scriptId, saveReadRef, textareaRef }), { initialProps: { scriptId: 's1' as string | undefined } });
  return { ...hook, saved, textarea };
}

describe('useTableRead', () => {
  it('says so, and starts nothing, where the browser can’t read aloud', () => {
    supported.value = false;
    const { result } = setup();
    act(() => result.current.start());
    expect(toast).toHaveBeenCalledWith('Table read isn’t supported in this browser', 'error');
    expect(engines).toHaveLength(0);
    expect(result.current.playing).toBe(false);
  });

  it('plays from a line and follows the line being read', () => {
    const { result, textarea } = setup();
    act(() => result.current.start(2));
    expect(engines[0].play).toHaveBeenCalledWith(2);
    expect(result.current.playing).toBe(true);
    act(() => engines[0].opts.onLineStart?.(2));
    expect(result.current.lineIdx).toBe(2);
    expect(textarea.scrollTo).toHaveBeenCalled();
  });

  it('times each scene read in full, from its heading, and reports the total when done', () => {
    const { result, saved } = setup();
    act(() => result.current.start());
    act(() => { now = 0; engines[0].opts.onLineStart?.(0); });
    act(() => { now = 1000; engines[0].opts.onLineStart?.(1); });
    act(() => { now = 4000; engines[0].opts.onLineStart?.(2); }); // scene 0 read for 4 s
    act(() => { now = 9000; engines[0].opts.onComplete?.(); });    // scene 1 for 5 s
    expect(saved).toEqual([[0, 4], [1, 5]]);
    expect(toast).toHaveBeenCalledWith(expect.stringContaining('Table read timed 2 scenes'), 'success');
    expect(result.current.playing).toBe(false);
    expect(result.current.lineIdx).toBeNull();
  });

  it('does not time a scene that was entered part-way, or read for under a second', () => {
    const { result, saved } = setup();
    act(() => result.current.start(1));
    act(() => { now = 0; engines[0].opts.onLineStart?.(1); });   // mid-scene: not from its heading
    act(() => { now = 5000; engines[0].opts.onLineStart?.(2); });
    act(() => { now = 5400; engines[0].opts.onComplete?.(); });  // 0.4 s
    expect(saved).toEqual([]);
    expect(toast).not.toHaveBeenCalled();
  });

  it('leaves out the time a read was paused', () => {
    const { result, saved } = setup();
    act(() => result.current.start());
    act(() => { now = 0; engines[0].opts.onLineStart?.(0); });
    act(() => { now = 2000; result.current.pause(); });
    expect(engines[0].pause).toHaveBeenCalled();
    expect(result.current.playing).toBe(false);
    act(() => { now = 10_000; result.current.resume(); });
    expect(engines[0].resume).toHaveBeenCalled();
    act(() => { now = 13_000; engines[0].opts.onLineStart?.(2); });
    expect(saved).toEqual([[0, 5]]); // 2 s + 3 s, not 13 s
  });

  it('stop discards the scene it was part-way through', () => {
    const { result, saved } = setup();
    act(() => result.current.start());
    act(() => { now = 0; engines[0].opts.onLineStart?.(0); });
    act(() => { now = 4000; result.current.stop(); });
    expect(engines[0].stop).toHaveBeenCalled();
    expect(saved).toEqual([]);
    expect(result.current.playing).toBe(false);
    expect(result.current.lineIdx).toBeNull();
  });

  it('stops the read when the script changes, and when the editor goes away', () => {
    const { result, rerender, unmount } = setup();
    act(() => result.current.start());
    act(() => engines[0].opts.onLineStart?.(0));
    rerender({ scriptId: 's2' });
    expect(engines[0].stop).toHaveBeenCalled();
    expect(result.current.playing).toBe(false);
    expect(result.current.lineIdx).toBeNull();
    act(() => result.current.start());
    unmount();
    expect(engines[1].stop).toHaveBeenCalled();
  });
});
