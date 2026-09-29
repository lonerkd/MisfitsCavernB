// Paperwork: what each document is and where it stands, and what the
// production still needs — read from its locations, cast and crew. Pure.

export type DocKind = 'permit' | 'insurance' | 'release' | 'contract' | 'other';
export type DocStatus = 'needed' | 'pending' | 'done';

export const DOC_KINDS: { id: DocKind; label: string; plural: string }[] = [
  { id: 'permit', label: 'Permit', plural: 'Permits' },
  { id: 'insurance', label: 'Insurance', plural: 'Insurance' },
  { id: 'release', label: 'Release', plural: 'Releases' },
  { id: 'contract', label: 'Contract', plural: 'Contracts' },
  { id: 'other', label: 'Other', plural: 'Other' },
];

/** What "done" and "pending" mean for each kind. */
export const STATUS_LABEL: Record<DocKind, Record<DocStatus, string>> = {
  permit: { needed: 'Needed', pending: 'Applied for', done: 'Granted' },
  insurance: { needed: 'Needed', pending: 'Quoted', done: 'Active' },
  release: { needed: 'Needed', pending: 'Sent', done: 'Signed' },
  contract: { needed: 'Needed', pending: 'Sent', done: 'Signed' },
  other: { needed: 'Needed', pending: 'In progress', done: 'Done' },
};

export interface DocLike {
  id?: string;
  kind: string;
  title: string;
  status: string;
  person_id: string | null;
  location_id: string | null;
  expires_on: string | null;
}

/** Days until expiry (negative once expired), or null when it doesn't expire. */
export function daysLeft(expiresOn: string | null, today: string): number | null {
  if (!expiresOn) return null;
  return Math.round((Date.parse(`${expiresOn}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}

export type DocTone = 'done' | 'open' | 'warn' | 'bad';

export function docState(d: DocLike, today: string): { label: string; tone: DocTone } {
  const kind = (DOC_KINDS.some((k) => k.id === d.kind) ? d.kind : 'other') as DocKind;
  const status = (['needed', 'pending', 'done'].includes(d.status) ? d.status : 'needed') as DocStatus;
  const left = daysLeft(d.expires_on, today);
  if (left != null && left < 0) return { label: `Expired ${-left}d ago`, tone: 'bad' };
  const base = STATUS_LABEL[kind][status];
  if (left != null && left <= 14) return { label: `${base} · expires in ${left}d`, tone: 'warn' };
  return { label: base, tone: status === 'done' ? 'done' : status === 'pending' ? 'open' : 'warn' };
}

export interface PaperworkInput {
  docs: DocLike[];
  /** Locations the script uses, with their records' ids and permit state. */
  locations: { id: string; name: string; permit: string }[];
  /** Character → cast crew member. */
  castings: { character_name: string; crew_user_id: string }[];
  crew: { user_id: string; username: string; craft: string | null }[];
}

export interface PaperworkGap {
  key: string;
  kind: DocKind;
  title: string;
  why: string;
  person_id?: string;
  location_id?: string;
}

/**
 * What the production needs on paper and doesn't have yet: a permit for each
 * location that needs one, a release for everyone cast, a contract for each
 * crew member, and production insurance once there's a crew or a location.
 */
export function paperworkGaps({ docs, locations, castings, crew }: PaperworkInput): PaperworkGap[] {
  const gaps: PaperworkGap[] = [];
  const has = (kind: DocKind, pred: (d: DocLike) => boolean) => docs.some((d) => d.kind === kind && pred(d));
  const nameOf = new Map(crew.map((c) => [c.user_id, c.username]));

  if ((crew.length > 0 || locations.length > 0) && !has('insurance', () => true)) {
    gaps.push({ key: 'insurance', kind: 'insurance', title: 'Production insurance', why: 'Locations and crew usually require it (general liability, equipment).' });
  }
  for (const l of locations) {
    if ((l.permit === 'needed' || l.permit === 'applied') && !has('permit', (d) => d.location_id === l.id)) {
      gaps.push({ key: `permit:${l.id}`, kind: 'permit', title: `Filming permit — ${l.name}`, why: `${l.name} needs a permit.`, location_id: l.id });
    }
  }
  const castIds = new Map<string, string[]>();
  for (const c of castings) castIds.set(c.crew_user_id, [...(castIds.get(c.crew_user_id) ?? []), c.character_name]);
  for (const [uid, roles] of castIds) {
    if (!has('release', (d) => d.person_id === uid)) {
      const who = nameOf.get(uid) ?? 'Cast member';
      gaps.push({ key: `release:${uid}`, kind: 'release', title: `Appearance release — ${who}`, why: `Cast as ${roles.sort().join(', ')}.`, person_id: uid });
    }
  }
  for (const c of crew) {
    if (castIds.has(c.user_id)) continue;
    if (!has('contract', (d) => d.person_id === c.user_id)) {
      gaps.push({ key: `contract:${c.user_id}`, kind: 'contract', title: `Crew deal memo — ${c.username}`, why: c.craft ? `On the crew as ${c.craft}.` : 'On the crew.', person_id: c.user_id });
    }
  }
  return gaps;
}
