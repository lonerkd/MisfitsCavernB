// What an issued call sheet sent out, and whether the draft has moved on
// since. Mirrors internal.call_sheet_snapshot() in the database, so the
// Studio can tell "changed since v2" without a round trip. Pure.

import type { Json } from '@/lib/supabase/database.types';

type SheetFields = {
  shoot_date: string | null; general_call: string | null; shooting_call: string | null; estimated_wrap: string | null;
  location_address: string | null; weather: string | null; notes: string | null;
};
type CallFields = { crew_user_id: string | null; character_name: string | null; call_time: string | null; remarks: string | null };

export interface CallEntry { call_time: string | null; remarks: string | null }
export interface CallSheetSnapshot extends SheetFields {
  calls: Record<string, CallEntry>;
  cast_calls: Record<string, CallEntry>;
}

const FIELDS: (keyof SheetFields)[] = ['shoot_date', 'general_call', 'shooting_call', 'estimated_wrap', 'location_address', 'weather', 'notes'];

export function snapshotOf(sheet: SheetFields, calls: CallFields[]): CallSheetSnapshot {
  const out = { calls: {}, cast_calls: {} } as CallSheetSnapshot;
  for (const k of FIELDS) out[k] = sheet[k] ?? null;
  for (const c of calls) {
    const entry = { call_time: c.call_time ?? null, remarks: c.remarks ?? null };
    if (c.crew_user_id) out.calls[c.crew_user_id] = entry;
    else if (c.character_name) out.cast_calls[c.character_name] = entry;
  }
  return out;
}

/** Reads the `issued` column; null when the sheet hasn't been issued. */
export function toSnapshot(raw: Json | null | undefined): CallSheetSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const out = { calls: {}, cast_calls: {} } as CallSheetSnapshot;
  for (const k of FIELDS) out[k] = typeof r[k] === 'string' ? (r[k] as string) : null;
  for (const key of ['calls', 'cast_calls'] as const) {
    const m = r[key];
    if (m && typeof m === 'object' && !Array.isArray(m)) {
      for (const [who, v] of Object.entries(m as Record<string, Record<string, unknown> | null>)) {
        out[key][who] = { call_time: typeof v?.call_time === 'string' ? v.call_time : null, remarks: typeof v?.remarks === 'string' ? v.remarks : null };
      }
    }
  }
  return out;
}

const canonical = (v: unknown): unknown =>
  v && typeof v === 'object' && !Array.isArray(v)
    ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canonical((v as Record<string, unknown>)[k])]))
    : v;

export function sameSnapshot(a: CallSheetSnapshot | null, b: CallSheetSnapshot | null): boolean {
  return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
}

/** What changed between two versions, in the words the crew get. */
export function changesBetween(prev: CallSheetSnapshot, next: CallSheetSnapshot): string[] {
  const labels: Record<keyof SheetFields, string> = {
    shoot_date: 'date', general_call: 'general call', shooting_call: 'shooting call', estimated_wrap: 'wrap',
    location_address: 'location', weather: 'weather', notes: 'notes',
  };
  const out = FIELDS.filter((k) => (prev[k] ?? null) !== (next[k] ?? null)).map((k) => labels[k]);
  const moved = (a: Record<string, CallEntry>, b: Record<string, CallEntry>) =>
    Array.from(new Set([...Object.keys(a), ...Object.keys(b)]))
      .filter((k) => a[k]?.call_time !== b[k]?.call_time || a[k]?.remarks !== b[k]?.remarks).length;
  const calls = moved(prev.calls, next.calls) + moved(prev.cast_calls, next.cast_calls);
  if (calls) out.push(`${calls} call${calls === 1 ? '' : 's'}`);
  return out;
}

export type IssueState =
  | { status: 'draft' }
  | { status: 'issued'; version: number }
  | { status: 'changed'; version: number; changes: string[] };

export function issueState(sheet: (SheetFields & { version: number; issued: Json | null }) | undefined, calls: CallFields[]): IssueState {
  if (!sheet || !sheet.version) return { status: 'draft' };
  const issued = toSnapshot(sheet.issued);
  const now = snapshotOf(sheet, calls);
  if (!issued || sameSnapshot(issued, now)) return { status: 'issued', version: sheet.version };
  return { status: 'changed', version: sheet.version, changes: changesBetween(issued, now) };
}

/** One person's call: their own, else the call of a role they're cast in. */
export function callFor(snap: CallSheetSnapshot, userId: string, castAs: string[]): (CallEntry & { as?: string }) | null {
  if (snap.calls[userId]) return snap.calls[userId];
  const role = [...castAs].sort().find((name) => snap.cast_calls[name]);
  return role ? { ...snap.cast_calls[role], as: role } : null;
}

export const hhmm = (t: string | null | undefined) => (t ? t.slice(0, 5) : '');
