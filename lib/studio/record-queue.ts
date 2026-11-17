// Saves a record tool could not send because the connection was down, kept on this device and sent when it is back (the
// script editor works the same way: write locally, sync after). Each record is its own row, so a queued change is one row's
// write or delete; for one row the newest change wins. Storage and the writer are passed in, so the rules are tested alone.

export interface QueuedChange {
  projectId: string;
  kind: string;
  id: string;
  /** The record to write, or null to remove it. */
  record: Record<string, unknown> | null;
  at: number;
}

export const QUEUE_KEY = 'mc_record_queue';
type Store = Pick<Storage, 'getItem' | 'setItem'>;
const defaultStore = (): Store | null => { try { return typeof window !== 'undefined' ? window.localStorage : null; } catch { return null; } };

export function readQueue(store: Store | null = defaultStore()): QueuedChange[] {
  try {
    const raw = store?.getItem(QUEUE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((c): c is QueuedChange => !!c && typeof c === 'object' && typeof (c as QueuedChange).id === 'string' && typeof (c as QueuedChange).kind === 'string') : [];
  } catch { return []; }
}

function writeQueue(list: QueuedChange[], store: Store | null): boolean {
  try { store?.setItem(QUEUE_KEY, JSON.stringify(list)); return !!store; } catch { return false; }
}

/** Queue writes and removals; a newer change to the same record replaces the older one. False when the device cannot keep them. */
export function enqueue(projectId: string, kind: string, upserts: Array<{ id: string } & Record<string, unknown>>, deletes: string[], now = Date.now(), store: Store | null = defaultStore()): boolean {
  const incoming: QueuedChange[] = [
    ...upserts.map((r) => ({ projectId, kind, id: r.id, record: r as Record<string, unknown>, at: now })),
    ...deletes.map((id) => ({ projectId, kind, id, record: null, at: now })),
  ];
  const same = (a: QueuedChange, b: QueuedChange) => a.projectId === b.projectId && a.kind === b.kind && a.id === b.id;
  const kept = readQueue(store).filter((old) => !incoming.some((n) => same(old, n)));
  return writeQueue([...kept, ...incoming], store);
}

export function pendingCount(projectId?: string, kind?: string, store: Store | null = defaultStore()): number {
  return readQueue(store).filter((c) => (!projectId || c.projectId === projectId) && (!kind || c.kind === kind)).length;
}

export interface FlushWriter {
  upsert: (projectId: string, kind: string, records: Array<Record<string, unknown>>) => Promise<unknown>;
  remove: (projectId: string, kind: string, ids: string[]) => Promise<unknown>;
}
export interface FlushResult { sent: number; kept: number; refused: Array<{ change: QueuedChange; message: string }> }

/** True for a failure of the connection itself (not a refusal by the database), where retrying later can work. */
export function isNetworkFailure(e: unknown, online: boolean = typeof navigator === 'undefined' ? true : navigator.onLine): boolean {
  if (!online) return true;
  const err = (e ?? {}) as { message?: unknown; code?: unknown; name?: unknown };
  if (typeof err.code === 'string' && err.code.length > 0 && !/^(ECONN|ETIMEDOUT|ENOTFOUND)/.test(err.code)) return false;
  const message = typeof err.message === 'string' ? err.message : typeof e === 'string' ? e : '';
  return err.name === 'TypeError' || /failed to fetch|networkerror|network request failed|load failed|offline|timeout/i.test(message);
}

/** Send what is queued, oldest first. Stops at the first connection failure (the rest stay); a refusal is dropped and reported. */
export async function flushQueue(writer: FlushWriter, store: Store | null = defaultStore(), online?: boolean): Promise<FlushResult> {
  const queue = readQueue(store).sort((a, b) => a.at - b.at);
  const result: FlushResult = { sent: 0, kept: 0, refused: [] };
  const left: QueuedChange[] = [];
  let stopped = false;
  for (const c of queue) {
    if (stopped) { left.push(c); continue; }
    try {
      if (c.record) await writer.upsert(c.projectId, c.kind, [c.record]); else await writer.remove(c.projectId, c.kind, [c.id]);
      result.sent++;
    } catch (e) {
      if (isNetworkFailure(e, online)) { stopped = true; left.push(c); } else result.refused.push({ change: c, message: e instanceof Error ? e.message : (e as { message?: string } | null)?.message ?? 'refused' });
    }
  }
  result.kept = left.length;
  writeQueue(left, store);
  return result;
}
