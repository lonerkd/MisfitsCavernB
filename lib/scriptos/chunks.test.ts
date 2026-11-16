import { describe, expect, it } from 'vitest';
import { ChunkReassembler, MAX_CHUNK_CHARS, toWirePayloads } from './chunks';

const big = (n: number) => 'ab'.repeat(n / 2);

describe('chunking Yjs payloads', () => {
  it('leaves a small payload in today\'s exact shape', () => {
    expect(toWirePayloads('hello')).toEqual([{ update: 'hello' }]);
    const exact = big(MAX_CHUNK_CHARS);
    expect(toWirePayloads(exact)).toEqual([{ update: exact }]);
    expect(new ChunkReassembler().accept({ update: 'hello' })).toBe('hello');
  });

  it('splits a large payload into parts under the limit and reassembles it', () => {
    const encoded = big(MAX_CHUNK_CHARS * 3 + 11);
    const parts = toWirePayloads(encoded, 'x');
    expect(parts).toHaveLength(4);
    for (const p of parts) expect('chunk' in p && p.chunk.part.length <= MAX_CHUNK_CHARS).toBe(true);
    const r = new ChunkReassembler();
    const results = parts.map((p) => r.accept(p));
    expect(results.slice(0, 3)).toEqual([null, null, null]);
    expect(results[3]).toBe(encoded);
    expect(r.pending).toBe(0);
  });

  it('reassembles parts that arrive out of order and interleaved sets', () => {
    const a = big(1000) + 'A';
    const b = big(1000) + 'B';
    const pa = toWirePayloads(a, 'a', 300);
    const pb = toWirePayloads(b, 'b', 300);
    const r = new ChunkReassembler();
    const order = [pa[2], pb[0], pa[0], pb[3], pa[3], pb[1], pb[2], pa[1]];
    const done = order.map((p) => r.accept(p)).filter((v) => v !== null);
    expect(done.sort()).toEqual([a, b].sort());
  });

  it('drops a partial set after the timeout and never applies it', () => {
    let t = 0;
    const r = new ChunkReassembler(() => t, 1000);
    const parts = toWirePayloads(big(900), 'lost', 300);
    r.accept(parts[0]);
    r.accept(parts[1]);
    expect(r.pending).toBe(1);
    t = 5000;
    expect(r.pending).toBe(0);
    expect(r.accept(parts[2])).toBeNull();
  });

  it('ignores malformed chunks', () => {
    const r = new ChunkReassembler();
    expect(r.accept({ chunk: { id: 'x', i: 5, n: 2, part: 'p' } })).toBeNull();
    expect(r.accept({ chunk: { id: 'x', i: 0, n: 1000, part: 'p' } })).toBeNull();
    expect(r.accept({ chunk: 'nope' })).toBeNull();
    expect(r.accept({})).toBeNull();
    expect(r.accept(undefined)).toBeNull();
  });
});
