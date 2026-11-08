// What a person's portfolio share card says when they have no cover or avatar to lead with: their name, what they do, how much
// public work there is. Pure, so the image route and the tests read the same rules.
import { headerOf, type OwnerProfile } from './header';

export interface ShareCardText { name: string; line: string; count: string }

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

export function shareCardText(profile: OwnerProfile, pieces: number, credits: number): ShareCardText {
  const head = headerOf(profile);
  const bits = [pieces > 0 ? `${pieces} piece${pieces === 1 ? '' : 's'}` : null, credits > 0 ? `${credits} credit${credits === 1 ? '' : 's'}` : null].filter(Boolean);
  return { name: clip(head.name, 40), line: clip(head.line, 80), count: bits.join(' · ') };
}

/** The card's colours. An image is drawn outside the page (no theme, no CSS variables), so they are fixed: the suite's night ink and brand colours. */
export const SHARE_CARD_COLORS = { ink: '#040710', cream: '#e0ddae', ember: '#e8431a', dim: '#a8a68a' } as const;
