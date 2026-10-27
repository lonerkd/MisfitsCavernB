export const DELIVERABLE_KINDS = {
  spot_30: { label: '30-second spot', max_chars: null, max_seconds: 30 },
  spot_15: { label: '15-second spot', max_chars: null, max_seconds: 15 },
  spot_6: { label: '6-second spot', max_chars: null, max_seconds: 6 },
  radio: { label: 'Radio', max_chars: null, max_seconds: 60 },
  poster: { label: 'Poster', max_chars: 200, max_seconds: null },
  banner: { label: 'Banner', max_chars: 100, max_seconds: null },
  headline: { label: 'Headline', max_chars: 60, max_seconds: null },
  social: { label: 'Social', max_chars: 280, max_seconds: null },
  other: { label: 'Other', max_chars: null, max_seconds: null },
} as const;

export type DeliverableKind = keyof typeof DELIVERABLE_KINDS;

export const DEFAULT_SPEECH_RATE = 2.5;

export function isDeliverableKind(value: unknown): value is DeliverableKind {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(DELIVERABLE_KINDS, value);
}
