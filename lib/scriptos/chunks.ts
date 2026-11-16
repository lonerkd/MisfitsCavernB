/**
 * Chunking for Yjs payloads sent over the script's Realtime channel (`script_<id>`), which refuses a broadcast
 * over about 250 KB. A payload that fits keeps today's exact shape, `{ update }`, so an older open tab still reads
 * it. A larger one is split into `{ chunk: { id, i, n, part } }` payloads sent under the same event names; an
 * older tab ignores those (it finds no `update`), a current one reassembles them. Pure: no channel, no timers.
 */

/** Characters of base64 per part: well under the limit once the envelope and the chunk header are added. */
export const MAX_CHUNK_CHARS = 150_000;
/** A part set that has not completed after this long is dropped. */
export const CHUNK_TIMEOUT_MS = 30_000;
/** The most parts one payload may have (about 9.6 MB of base64), so a sender cannot make a receiver hoard. */
export const MAX_CHUNKS = 64;
/** The most partial payloads held at once. */
const MAX_PENDING_SETS = 16;

export interface ChunkEnvelope { id: string; i: number; n: number; part: string }
export type WirePayload = { update: string } | { chunk: ChunkEnvelope };

let counter = 0;
/** A unique id for one payload (per sender; combined with a random part so two senders do not collide). */
export function newChunkId(): string {
  counter = (counter + 1) % 1_000_000_000;
  return `${Math.random().toString(36).slice(2, 10)}${counter.toString(36)}`;
}

/** The payloads to send for one encoded update: itself if it fits, otherwise numbered chunks. */
export function toWirePayloads(encoded: string, id: string = newChunkId(), maxChars: number = MAX_CHUNK_CHARS): WirePayload[] {
  if (encoded.length <= maxChars) return [{ update: encoded }];
  const n = Math.ceil(encoded.length / maxChars);
  const out: WirePayload[] = [];
  for (let i = 0; i < n; i++) out.push({ chunk: { id, i, n, part: encoded.slice(i * maxChars, (i + 1) * maxChars) } });
  return out;
}

function readChunk(payload: unknown): ChunkEnvelope | null {
  const chunk = (payload as { chunk?: unknown } | null | undefined)?.chunk as Partial<ChunkEnvelope> | undefined;
  if (!chunk || typeof chunk.id !== 'string' || typeof chunk.part !== 'string') return null;
  const { i, n } = chunk;
  if (!Number.isInteger(i) || !Number.isInteger(n) || (n as number) < 2 || (n as number) > MAX_CHUNKS) return null;
  if ((i as number) < 0 || (i as number) >= (n as number)) return null;
  return { id: chunk.id, i: i as number, n: n as number, part: chunk.part };
}

interface PendingSet { n: number; parts: Map<number, string>; started: number }

/** Collects the parts of chunked payloads. One per channel. */
export class ChunkReassembler {
  private sets = new Map<string, PendingSet>();
  constructor(private readonly now: () => number = Date.now, private readonly timeoutMs: number = CHUNK_TIMEOUT_MS) {}

  /** Partial payloads still waiting for parts (after dropping the timed-out ones). */
  get pending(): number { this.sweep(); return this.sets.size; }

  private sweep() {
    const t = this.now();
    for (const [id, set] of this.sets) if (t - set.started > this.timeoutMs) this.sets.delete(id);
  }

  /**
   * Take one received payload. Returns the whole encoded update when this payload is a plain `{ update }` or
   * completes a chunk set; null when it is a part still waiting for others, or is not readable.
   */
  accept(payload: unknown): string | null {
    const plain = (payload as { update?: unknown } | null | undefined)?.update;
    if (typeof plain === 'string') return plain;
    const chunk = readChunk(payload);
    if (!chunk) return null;
    this.sweep();
    let set = this.sets.get(chunk.id);
    if (!set) {
      if (this.sets.size >= MAX_PENDING_SETS) {
        const oldest = this.sets.keys().next().value;
        if (oldest !== undefined) this.sets.delete(oldest);
      }
      set = { n: chunk.n, parts: new Map(), started: this.now() };
      this.sets.set(chunk.id, set);
    }
    if (set.n !== chunk.n) { this.sets.delete(chunk.id); return null; }
    set.parts.set(chunk.i, chunk.part);
    if (set.parts.size < set.n) return null;
    this.sets.delete(chunk.id);
    let whole = '';
    for (let i = 0; i < set.n; i++) whole += set.parts.get(i) ?? '';
    return whole;
  }
}
