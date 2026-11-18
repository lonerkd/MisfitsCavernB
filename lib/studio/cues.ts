// The music cue sheet and licensing tracker: every piece of music in the film, where it plays, who owns it, and whether the
// production may use it. Pure: the view reads the rows, this does the arithmetic and says what is still open.

export const CUE_KINDS = ['score', 'source', 'needle drop', 'vocal', 'other'] as const;
export type CueKind = (typeof CUE_KINDS)[number];

/** How the music is heard, as a cue sheet reports it (the usual PRO usage types). */
export const CUE_USES = ['background instrumental', 'background vocal', 'visual vocal', 'visual instrumental', 'main title', 'end credits', 'logo'] as const;
export type CueUse = (typeof CUE_USES)[number];

export const LICENCE_STATUSES = ['needed', 'requested', 'negotiating', 'cleared', 'denied', 'original'] as const;
export type LicenceStatus = (typeof LICENCE_STATUSES)[number];
export const LICENCE_LABEL: Record<LicenceStatus, string> = {
  needed: 'Licence needed', requested: 'Requested', negotiating: 'Negotiating', cleared: 'Cleared', denied: 'Denied', original: 'Original (commissioned)',
};

export interface Cue {
  id: string;
  scene_ids?: string[];
  character_id?: string | null;
  scene: string;
  cue: string;
  title: string;
  kind: CueKind;
  use: CueUse;
  composer: string;
  publisher: string;
  pro: string;
  masterOwner: string;
  tcIn: string;
  tcOut: string;
  status: LicenceStatus;
  fee: number | null;
  territory: string;
  term: string;
  contact: string;
  notes: string;
}

/** "1:23" or "00:01:23" (or "1:23:04") as seconds; null when it is not a time. */
export function parseTc(tc: string): number | null {
  const m = tc.trim().match(/^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const [h, mi, s] = [Number(m[1] ?? 0), Number(m[2]), Number(m[3])];
  if (mi > 59 || s > 59) return null;
  return h * 3600 + mi * 60 + s;
}

/** Seconds as "m:ss", or "h:mm:ss" from an hour up. */
export function fmtDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`;
}

/** The cue's running time, or null when its in and out are not both times with the out after the in. */
export function cueSeconds(c: Pick<Cue, 'tcIn' | 'tcOut'>): number | null {
  const a = parseTc(c.tcIn);
  const b = parseTc(c.tcOut);
  return a != null && b != null && b > a ? b - a : null;
}

/** Whether the production may use this cue as the film stands. */
export const isUsable = (c: Pick<Cue, 'status'>) => c.status === 'cleared' || c.status === 'original';

export interface CueSummary {
  count: number;
  /** Cues still without permission (not cleared, not original, not denied: those are a different problem). */
  open: number;
  denied: number;
  /** Total of the agreed fees; cues without a fee are counted in `unpriced`. */
  fees: number;
  unpriced: number;
  /** Total music time, over the cues that have both timecodes; `untimed` cues are the rest. */
  seconds: number;
  untimed: number;
}

export function summarize(cues: readonly Cue[]): CueSummary {
  let open = 0, denied = 0, fees = 0, unpriced = 0, seconds = 0, untimed = 0;
  for (const c of cues) {
    if (c.status === 'denied') denied += 1;
    else if (!isUsable(c)) open += 1;
    if (c.fee != null && Number.isFinite(c.fee)) fees += c.fee; else if (c.status !== 'original') unpriced += 1;
    const d = cueSeconds(c);
    if (d == null) untimed += 1; else seconds += d;
  }
  return { count: cues.length, open, denied, fees, unpriced, seconds, untimed };
}

/** What blocks a cue from locking the picture, in words: the checks a music supervisor runs by hand. Empty when it is in good order. */
export function cueProblems(c: Cue, all: readonly Cue[] = []): string[] {
  const out: string[] = [];
  if (c.status === 'denied') out.push('Licence denied: replace or cut it');
  else if (!isUsable(c)) out.push('No licence yet');
  if (!c.composer.trim() && c.kind !== 'other') out.push('No composer');
  if (!c.publisher.trim() && c.kind !== 'score') out.push('No publisher');
  if (c.kind === 'needle drop' && !c.masterOwner.trim()) out.push('No master (recording) owner');
  if (c.tcIn.trim() || c.tcOut.trim()) { if (cueSeconds(c) == null) out.push('In and out are not a valid time range'); }
  else out.push('No timecode');
  if (c.status === 'cleared' && !c.territory.trim()) out.push('Cleared without a territory');
  if (c.status === 'cleared' && !c.term.trim()) out.push('Cleared without a term');
  // The same cue number twice is a typing slip: a cue sheet is read by cue number.
  if (c.cue.trim() && all.some((o) => o.id !== c.id && o.cue.trim().toLowerCase() === c.cue.trim().toLowerCase())) out.push('Duplicate cue number');
  return out;
}

/** The cue sheet itself: the columns a performing-rights society expects, in running order. */
export function cueSheetRows(cues: readonly Cue[]): Array<Record<string, string | number | null>> {
  // Numbered cues in number order (1M2 before 1M10); the ones with no number yet go last.
  const numbered = cues.filter((c) => c.cue.trim()).sort((a, b) => a.cue.localeCompare(b.cue, undefined, { numeric: true }));
  const order = [...numbered, ...cues.filter((c) => !c.cue.trim())];
  return order.map((c) => {
    const d = cueSeconds(c);
    return {
      cue: c.cue, title: c.title, kind: c.kind, use: c.use, composer: c.composer, publisher: c.publisher, pro: c.pro,
      master: c.masterOwner, tcIn: c.tcIn, tcOut: c.tcOut, duration: d == null ? null : fmtDuration(d),
    };
  });
}
