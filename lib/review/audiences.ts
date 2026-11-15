// Who a review link is for, and what each audience may do. Pure data: the review page, the link maker and the tests read this one
// place, and the database enforces the same rules in `add_review_comment` and `decide_review` (migration 20261115000400), so a
// link can never do more than its audience may.

export const REVIEW_AUDIENCES = {
  guest: { label: 'Client', blurb: 'Reads, comments, and approves or asks for changes.', canComment: true, canDecide: true, crafts: ['Client'] },
  investor: { label: 'Investor', blurb: 'Reads and comments. Cannot approve: that is the client’s call.', canComment: true, canDecide: false, crafts: ['Investor'] },
  distributor: { label: 'Distributor or festival', blurb: 'Reads and comments. Cannot approve.', canComment: true, canDecide: false, crafts: ['Distributor or festival guest'] },
  press: { label: 'Press', blurb: 'Reads only: no comments, no decisions.', canComment: false, canDecide: false, crafts: ['Press'] },
} as const satisfies Record<string, { label: string; blurb: string; canComment: boolean; canDecide: boolean; crafts: readonly string[] }>;

export type ReviewLayer = keyof typeof REVIEW_AUDIENCES;
export const REVIEW_LAYERS = Object.keys(REVIEW_AUDIENCES) as ReviewLayer[];

export function isReviewLayer(value: unknown): value is ReviewLayer {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(REVIEW_AUDIENCES, value);
}

/** What a link of this layer may do; an unknown layer gets the least (read only). */
export function audienceOf(layer: unknown): (typeof REVIEW_AUDIENCES)[ReviewLayer] {
  return isReviewLayer(layer) ? REVIEW_AUDIENCES[layer] : REVIEW_AUDIENCES.press;
}

/** The link audience a crew craft (an outside role) reads through. */
export function layerForCraft(craft: string | null | undefined): ReviewLayer | null {
  return REVIEW_LAYERS.find((l) => (REVIEW_AUDIENCES[l].crafts as readonly string[]).includes(craft ?? '')) ?? null;
}
