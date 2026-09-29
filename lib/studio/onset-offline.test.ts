import { describe, it, expect } from 'vitest';
import { changes, enqueue, isNetworkError, replay, type OnSetOp } from './onset-offline';

const add = (id: string, body = 'note'): OnSetOp => ({ kind: 'log-add', entry: { id, project_id: 'p', kind: 'note', body } });

describe('the queue', () => {
  it('keeps only the last status of a shot or scene', () => {
    let q: OnSetOp[] = [];
    q = enqueue(q, { kind: 'shot', id: 's1', status: 'shot' });
    q = enqueue(q, { kind: 'scene', id: 'sc1', status: 'wrapped' });
    q = enqueue(q, { kind: 'shot', id: 's1', status: 'planned' });
    expect(q).toEqual([{ kind: 'scene', id: 'sc1', status: 'wrapped' }, { kind: 'shot', id: 's1', status: 'planned' }]);
  });

  it('folds edits into an entry not yet sent, and drops both if it is removed', () => {
    let q = enqueue([], add('n1'));
    q = enqueue(q, { kind: 'log-update', id: 'n1', patch: { at: '2026-10-01T09:00:00Z' } });
    expect(q).toEqual([{ kind: 'log-add', entry: { id: 'n1', project_id: 'p', kind: 'note', body: 'note', at: '2026-10-01T09:00:00Z' } }]);
    expect(enqueue(q, { kind: 'log-delete', id: 'n1' })).toEqual([]);
  });

  it('merges edits to a sent entry, and a delete replaces them', () => {
    let q = enqueue([], { kind: 'log-update', id: 'n2', patch: { at: 'a' } });
    q = enqueue(q, { kind: 'log-update', id: 'n2', patch: { body: 'b' } });
    expect(q).toEqual([{ kind: 'log-update', id: 'n2', patch: { at: 'a', body: 'b' } }]);
    expect(enqueue(q, { kind: 'log-delete', id: 'n2' })).toEqual([{ kind: 'log-delete', id: 'n2' }]);
  });
});

describe('telling no signal from a refusal', () => {
  it('reads the connection and the failure', () => {
    expect(isNetworkError(new Error('anything'), false)).toBe(true);
    expect(isNetworkError(new Error('TypeError: Failed to fetch'), true)).toBe(true);
    expect(isNetworkError(new Error('Load failed'), true)).toBe(true);
    expect(isNetworkError(new Error('You don’t have permission to do that.'), true)).toBe(false);
  });
});

describe('sending the queue', () => {
  const q: OnSetOp[] = [add('n1'), { kind: 'shot', id: 's1', status: 'shot' }, { kind: 'scene', id: 'sc1', status: 'wrapped' }];

  it('sends everything in order', async () => {
    const seen: string[] = [];
    const r = await replay(q, async (op) => { seen.push(op.kind); }, () => true);
    expect(seen).toEqual(['log-add', 'shot', 'scene']);
    expect(r).toEqual({ sent: 3, refused: [], rest: [] });
  });

  it('stops where the connection drops and keeps the rest', async () => {
    let n = 0;
    const r = await replay(q, async () => { if (++n === 2) throw new Error('Failed to fetch'); }, () => true);
    expect(r.sent).toBe(1);
    expect(r.rest).toEqual(q.slice(1));
  });

  it('drops what is refused, reports it, and goes on', async () => {
    const r = await replay(q, async (op) => { if (op.kind === 'shot') throw new Error('You don’t have permission to do that.'); }, () => true);
    expect(r.sent).toBe(2);
    expect(r.refused.map((x) => x.op.kind)).toEqual(['shot']);
    expect(r.rest).toEqual([]);
  });

  it('counts a resend of something already saved as sent', async () => {
    const dup = Object.assign(new Error('duplicate key value violates unique constraint'), { code: '23505' });
    const r = await replay([add('n1')], async () => { throw dup; }, () => true);
    expect(r).toEqual({ sent: 1, refused: [], rest: [] });
  });

  it('says how many', () => {
    expect(changes(1)).toBe('1 change');
    expect(changes(3)).toBe('3 changes');
  });
});
