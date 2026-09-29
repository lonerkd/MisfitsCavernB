// On set without signal. Sets are basements, fields and car parks: the day
// has to keep working when the connection drops. What's done on set while
// offline — a shot got or dropped, a scene wrapped, a stamp, a note — shows at
// once and waits in a queue on this device; when the connection is back the
// queue is sent in order. The last copy of the day seen online is kept too, so
// the view can open without signal.
//
// Pure except for the localStorage helpers at the bottom (which never throw).

import type { SetLogEntry, SetLogRow } from './api';

type ShotStatus = 'planned' | 'shot' | 'omitted';
type SceneStatus = 'planned' | 'shot' | 'wrapped';
export interface LogPatch { at?: string; body?: string | null; take?: number | null }

export type OnSetOp =
  | { kind: 'shot'; id: string; status: ShotStatus }
  | { kind: 'scene'; id: string; status: SceneStatus }
  /** A new log entry, with an id made here so it can be sent (and resent) safely. */
  | { kind: 'log-add'; entry: SetLogEntry & { id: string } }
  | { kind: 'log-update'; id: string; patch: LogPatch }
  | { kind: 'log-delete'; id: string };

/**
 * Add an op, folding it into what's already waiting: only the last status of
 * a shot or scene matters, an edit to an entry not yet sent goes into the
 * entry, and removing an entry not yet sent means neither is sent.
 */
export function enqueue(queue: OnSetOp[], op: OnSetOp): OnSetOp[] {
  if (op.kind === 'shot' || op.kind === 'scene') {
    return [...queue.filter((q) => !(q.kind === op.kind && q.id === op.id)), op];
  }
  if (op.kind === 'log-update') {
    const i = queue.findIndex((q) => q.kind === 'log-add' && q.entry.id === op.id);
    if (i !== -1) {
      const add = queue[i] as Extract<OnSetOp, { kind: 'log-add' }>;
      const next = [...queue];
      next[i] = { kind: 'log-add', entry: { ...add.entry, ...op.patch } };
      return next;
    }
    const j = queue.findIndex((q) => q.kind === 'log-update' && q.id === op.id);
    if (j !== -1) {
      const prev = queue[j] as Extract<OnSetOp, { kind: 'log-update' }>;
      const next = [...queue];
      next[j] = { kind: 'log-update', id: op.id, patch: { ...prev.patch, ...op.patch } };
      return next;
    }
    return [...queue, op];
  }
  if (op.kind === 'log-delete') {
    const unsent = queue.some((q) => q.kind === 'log-add' && q.entry.id === op.id);
    const rest = queue.filter((q) => !((q.kind === 'log-add' && q.entry.id === op.id) || (q.kind === 'log-update' && q.id === op.id)));
    return unsent ? rest : [...rest, op];
  }
  return [...queue, op];
}

/** Whether a failure means "no connection" (so the op should wait) rather than "refused". */
export function isNetworkError(e: unknown, online: boolean): boolean {
  if (!online) return true;
  const msg = e instanceof Error ? e.message : typeof e === 'string' ? e : '';
  return /failed to fetch|networkerror|network request failed|load failed|fetch failed/i.test(msg);
}

/** A write already made (a resend after a lost reply) counts as sent. */
export const isAlreadyDone = (e: unknown) => {
  const code = (e as { code?: string } | null)?.code;
  const msg = e instanceof Error ? e.message : '';
  return code === '23505' || /duplicate key/i.test(msg);
};

export interface ReplayResult { sent: number; refused: Array<{ op: OnSetOp; message: string }>; rest: OnSetOp[] }

/**
 * Send the queue in order. A lost connection stops it and keeps what's left;
 * anything refused (no longer allowed, gone) is dropped and reported.
 */
export async function replay(queue: OnSetOp[], send: (op: OnSetOp) => Promise<void>, online: () => boolean): Promise<ReplayResult> {
  let sent = 0;
  const refused: ReplayResult['refused'] = [];
  for (let i = 0; i < queue.length; i++) {
    try {
      await send(queue[i]);
      sent++;
    } catch (e) {
      if (isNetworkError(e, online())) return { sent, refused, rest: queue.slice(i) };
      if (isAlreadyDone(e)) { sent++; continue; }
      refused.push({ op: queue[i], message: e instanceof Error ? e.message : 'Refused' });
    }
  }
  return { sent, refused, rest: [] };
}

/** A new log entry as the view shows it before the database has it. */
export function draftLogRow(entry: SetLogEntry & { id: string }, userId: string, now = new Date().toISOString()): SetLogRow {
  return {
    id: entry.id, project_id: entry.project_id, kind: entry.kind, at: entry.at ?? now, created_at: now, created_by: userId,
    call_sheet_id: entry.call_sheet_id ?? null, scene_id: entry.scene_id ?? null, shot_id: entry.shot_id ?? null,
    take: entry.take ?? null, body: entry.body ?? null, media_id: entry.media_id ?? null,
  };
}

/** "3 changes", "1 change". */
export const changes = (n: number) => `${n} change${n === 1 ? '' : 's'}`;

// ── On this device ───────────────────────────────────────────────

const QUEUE = (projectId: string) => `mc:onset-queue:${projectId}`;
const SNAPSHOT = (projectId: string) => `mc:onset-day:${projectId}`;

function read<T>(key: string): T | null {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : null; } catch { return null; }
}
function write(key: string, value: unknown) {
  try { if (value == null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(value)); } catch { /* full or blocked: the live view still works */ }
}

export const loadQueue = (projectId: string): OnSetOp[] => read<OnSetOp[]>(QUEUE(projectId)) ?? [];
export const saveQueue = (projectId: string, q: OnSetOp[]) => write(QUEUE(projectId), q.length ? q : null);

export interface DaySnapshot<Sheet, Call, Log, Scene, Shot> { savedAt: string; sheets: Sheet[]; calls: Call[]; log: Log[]; scenes: Scene[]; shots: Shot[] }
export const loadSnapshot = <S, C, L, Sc, Sh>(projectId: string) => read<DaySnapshot<S, C, L, Sc, Sh>>(SNAPSHOT(projectId));
export const saveSnapshot = (projectId: string, snap: DaySnapshot<unknown, unknown, unknown, unknown, unknown>) => write(SNAPSHOT(projectId), snap);
