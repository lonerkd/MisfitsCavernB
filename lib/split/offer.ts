// The "Two panes" offer on a project page: shown once per project on a wide screen, remembered on this device (a device preference, not an account one).
export const OFFER_MIN_WIDTH = 1280;
const key = (projectId: string) => `mc_pair_offer_${projectId}`;

export type OfferAnswer = 'accepted' | 'declined';

export function readOffer(projectId: string): OfferAnswer | null {
  try { const v = localStorage.getItem(key(projectId)); return v === 'accepted' || v === 'declined' ? v : null; } catch { return null; }
}
export function writeOffer(projectId: string, answer: OfferAnswer): void {
  try { localStorage.setItem(key(projectId), answer); } catch { /* blocked: the offer shows again, which is harmless */ }
}
/** Whether to offer: a wide screen, not already in a pane, and not answered yet. */
export function shouldOffer(width: number, inPane: boolean, answer: OfferAnswer | null): boolean {
  return !inPane && width >= OFFER_MIN_WIDTH && answer === null;
}
