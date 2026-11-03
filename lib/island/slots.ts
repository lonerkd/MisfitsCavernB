// Fixed keys by meaning. A page's action can name its slot (Create, Jump, Find, View, Share, People, Note, Live) and then
// has the same Caps Lock key on every page: Q creates, E finds, whatever the page. Actions without a slot fill the keys
// no slot has claimed, in order, as before. See `plans/2026-11-02-island-at-every-size.md` (the ten-slot fast path).

import { CONTROL_KEYS } from './routes';

export const SLOT_KEYS = {
  create: 'q',
  jump: 'w',
  find: 'e',
  view: 'r',
  share: 't',
  people: 'y',
  note: 'u',
  live: 'i',
} as const;

export type PillSlot = keyof typeof SLOT_KEYS;

/**
 * The deck key of each control, in the order given: a control with a slot takes its slot's key (the first to claim a key
 * keeps it; a second claimant falls back to the free keys), the rest fill the keys nobody claimed. Undefined when the keys
 * have run out: the control is still there to click, only without a key.
 */
export function assignKeys(items: ReadonlyArray<{ slot?: PillSlot }>): Array<string | undefined> {
  const out: Array<string | undefined> = new Array(items.length).fill(undefined);
  const claimed = new Set<string>();
  items.forEach((it, i) => {
    const k = it.slot ? SLOT_KEYS[it.slot] : undefined;
    if (k && !claimed.has(k)) { out[i] = k; claimed.add(k); }
  });
  const free = CONTROL_KEYS.filter((k) => !claimed.has(k));
  items.forEach((_, i) => { if (out[i] === undefined) out[i] = free.shift(); });
  return out;
}
