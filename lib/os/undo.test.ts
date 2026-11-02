import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearUndo, peekUndo, pushUndo, scopeOf, subscribeUndo, undoDepth, undoLast } from './undo';

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
    pushUndo('one', () => { order.push('one'); }, 'studio');
    pushUndo('two', () => { order.push('two'); }, 'studio');
    expect(await undoLast('studio')).toEqual({ status: 'undone', label: 'two' });
    expect(await undoLast('studio')).toEqual({ status: 'undone', label: 'one' });
    expect(order).toEqual(['two', 'one']);
    expect(await undoLast('studio')).toEqual({ status: 'empty' });
  });

  it('never reverses another tool\'s action', async () => {
    const jobs = vi.fn();
    pushUndo('closed a job', jobs, 'jobs');
    pushUndo('moved a scene', () => {}, 'studio');
    expect(await undoLast('studio')).toMatchObject({ status: 'undone', label: 'moved a scene' });
    expect(await undoLast('studio')).toEqual({ status: 'empty' });
    expect(jobs).not.toHaveBeenCalled();
    expect(peekUndo('jobs')?.label).toBe('closed a job');
  });

  it('reports a failed undo and drops it, so the next one still works', async () => {
    pushUndo('ok', () => {}, 'studio');
    pushUndo('bad', () => { throw new Error('the row is gone'); }, 'studio');
    expect(await undoLast('studio')).toEqual({ status: 'failed', label: 'bad', message: 'the row is gone' });
    expect(await undoLast('studio')).toEqual({ status: 'undone', label: 'ok' });
  });

  it('awaits an async undo', async () => {
    let done = false;
    pushUndo('slow', async () => { await Promise.resolve(); done = true; }, 'studio');
    await undoLast('studio');
    expect(done).toBe(true);
  });

  it('keeps only the newest 50', () => {
    for (let i = 0; i < 60; i++) pushUndo(`a${i}`, () => {}, 'studio');
    expect(undoDepth('studio')).toBe(50);
    expect(peekUndo('studio')?.label).toBe('a59');
  });

  it('tells subscribers when the stack changes', async () => {
    const seen = vi.fn();
    const off = subscribeUndo(seen);
    pushUndo('x', () => {}, 'studio');
    await undoLast('studio');
    off();
    pushUndo('y', () => {}, 'studio');
    expect(seen).toHaveBeenCalledTimes(2); // one for the push, one for taking it off the stack
  });
});
