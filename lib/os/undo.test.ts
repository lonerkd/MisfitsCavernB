import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UndoRefused, clearUndo, peekUndo, pushUndo, scopeOf, setUndoContext, subscribeUndo, undoDepth, undoLast, undoOrigin } from './undo';

beforeEach(() => clearUndo());

describe('scopeOf', () => {
  it('is the first path segment', () => {
    expect(scopeOf('/studio?tab=scenes')).toBe('studio');
    expect(scopeOf('/projects/abc')).toBe('projects');
    expect(scopeOf('/')).toBe('');
  });
});

describe('the undo stack', () => {
  it('undoes the newest action first, one at a time', async () => {
    const order: string[] = [];
    pushUndo('one', () => { order.push('one'); }, { scope: 'studio' });
    pushUndo('two', () => { order.push('two'); }, { scope: 'studio' });
    expect(await undoLast('studio')).toEqual({ status: 'undone', label: 'two' });
    expect(await undoLast('studio')).toEqual({ status: 'undone', label: 'one' });
    expect(order).toEqual(['two', 'one']);
    expect(await undoLast('studio')).toEqual({ status: 'empty' });
  });

  it('never reverses another tool\'s action', async () => {
    const jobs = vi.fn();
    pushUndo('closed a job', jobs, { scope: 'jobs' });
    pushUndo('moved a scene', () => {}, { scope: 'studio' });
    expect(await undoLast('studio')).toMatchObject({ status: 'undone', label: 'moved a scene' });
    expect(await undoLast('studio')).toEqual({ status: 'empty' });
    expect(jobs).not.toHaveBeenCalled();
    expect(peekUndo('jobs')?.label).toBe('closed a job');
  });

  it('drops a refused undo for good, so the next one still works', async () => {
    pushUndo('ok', () => {}, { scope: 'studio' });
    pushUndo('bad', () => { throw new UndoRefused('changed since'); }, { scope: 'studio' });
    expect(await undoLast('studio')).toEqual({ status: 'failed', label: 'bad', message: 'changed since' });
    expect(await undoLast('studio')).toEqual({ status: 'undone', label: 'ok' });
  });

  it('keeps an undo that failed for a passing reason on top, so pressing again retries it before anything older', async () => {
    let attempts = 0;
    pushUndo('older', () => {}, { scope: 'studio' });
    pushUndo('flaky', () => { if (++attempts === 1) throw new Error('network down'); }, { scope: 'studio' });
    expect(await undoLast('studio')).toMatchObject({ status: 'failed', label: 'flaky' });
    expect(await undoLast('studio')).toEqual({ status: 'undone', label: 'flaky' });
    expect(await undoLast('studio')).toEqual({ status: 'undone', label: 'older' });
  });

  it('lets a twice-failing undo go, so it cannot block the older ones for ever', async () => {
    pushUndo('older', () => {}, { scope: 'studio' });
    pushUndo('broken', () => { throw new Error('still down'); }, { scope: 'studio' });
    await undoLast('studio');
    await undoLast('studio');
    expect(await undoLast('studio')).toEqual({ status: 'undone', label: 'older' });
  });

  it('awaits an async undo', async () => {
    let done = false;
    pushUndo('slow', async () => { await Promise.resolve(); done = true; }, { scope: 'studio' });
    await undoLast('studio');
    expect(done).toBe(true);
  });

  it('keeps only the newest 50 of a tool, and one tool never pushes another\'s out', () => {
    pushUndo('a studio action', () => {}, { scope: 'studio' });
    for (let i = 0; i < 60; i++) pushUndo(`a${i}`, () => {}, { scope: 'jobs' });
    expect(undoDepth('jobs')).toBe(50);
    expect(peekUndo('jobs')?.label).toBe('a59');
    expect(undoDepth('studio')).toBe(1);
  });

  it('hides the entries of another context (the Studio\'s other project) until you are back in it', async () => {
    setUndoContext('studio', 'project-a');
    pushUndo('moved in A', () => {}, undoOrigin('studio'));
    setUndoContext('studio', 'project-b');
    expect(peekUndo('studio')).toBeUndefined();
    expect(await undoLast('studio')).toEqual({ status: 'empty' });
    setUndoContext('studio', 'project-a');
    expect(peekUndo('studio')?.label).toBe('moved in A');
  });

  it('files an action under the origin captured before it started, not where the person is by the time it finishes', () => {
    setUndoContext('studio', 'project-a');
    const origin = undoOrigin('studio');
    setUndoContext('studio', 'project-b'); // the person switched project while the write was in flight
    pushUndo('moved in A', () => {}, origin);
    expect(peekUndo('studio')).toBeUndefined();
    setUndoContext('studio', 'project-a');
    expect(peekUndo('studio')?.label).toBe('moved in A');
  });

  it('runs two quick undos one after the other, newest first, never at once', async () => {
    const log: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    pushUndo('first', async () => { log.push('first:start'); await gate; log.push('first:end'); }, { scope: 'studio' });
    pushUndo('second', async () => { log.push('second:start'); await gate; log.push('second:end'); }, { scope: 'studio' });
    const a = undoLast('studio');
    const b = undoLast('studio');
    await Promise.resolve();
    expect(log).toEqual(['second:start']); // the first press is in flight; the second waits for it
    release();
    await Promise.all([a, b]);
    expect(log).toEqual(['second:start', 'second:end', 'first:start', 'first:end']);
  });

  it('forgets every action when cleared (the session ended) but keeps where the person is working', async () => {
    setUndoContext('studio', 'project-a');
    pushUndo('old session', () => {}, undoOrigin('studio'));
    clearUndo();
    expect(await undoLast('studio')).toEqual({ status: 'empty' });
    expect(undoOrigin('studio')).toEqual({ scope: 'studio', context: 'project-a' });
  });

  it('tells subscribers when the stack changes', async () => {
    const seen = vi.fn();
    const off = subscribeUndo(seen);
    pushUndo('x', () => {}, { scope: 'studio' });
    await undoLast('studio');
    off();
    pushUndo('y', () => {}, { scope: 'studio' });
    expect(seen).toHaveBeenCalledTimes(2); // one for the push, one for taking it off the stack
  });
});
