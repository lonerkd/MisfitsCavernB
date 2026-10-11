// Where a place is, from whatever a person has to hand: a pair of numbers, a
// compass reading off a phone, or a link copied from a maps app. No lookup
// service — an address alone can't be turned into coordinates here.

import { isCoordinate } from './daylight';

export interface Coordinates { latitude: number; longitude: number }

const NUM = '(-?\\d{1,3}(?:\\.\\d+)?)';

/** Patterns for the coordinates inside a maps link, most specific first. */
const IN_LINK = [
  new RegExp(`!3d${NUM}!4d${NUM}`),
  new RegExp(`@${NUM},${NUM}`),
  new RegExp(`[?&](?:q|ll|query|center|sll|daddr|destination)=${NUM}(?:,|%2C)${NUM}`, 'i'),
  new RegExp(`#map=\\d+(?:\\.\\d+)?/${NUM}/${NUM}`),
];

const PAIR = new RegExp(`^${NUM}\\s*(?:,|\\s)\\s*${NUM}$`);
const DMS = /(\d{1,3})\s*°\s*(\d{1,2})\s*['′]\s*(\d{1,2}(?:\.\d+)?)\s*["″]?\s*([NSEW])/gi;

function valid(latitude: number, longitude: number): Coordinates | null {
  return isCoordinate(latitude, longitude) ? { latitude, longitude } : null;
}

export function parseCoordinates(text: string): Coordinates | null {
  const t = text.trim();
  if (!t) return null;

  const dms = Array.from(t.matchAll(DMS));
  if (dms.length === 2) {
    const read = (m: RegExpMatchArray) => (Number(m[1]) + Number(m[2]) / 60 + Number(m[3]) / 3600) * (/[SW]/i.test(m[4]) ? -1 : 1);
    const lat = dms.find((m) => /[NS]/i.test(m[4]));
    const lng = dms.find((m) => /[EW]/i.test(m[4]));
    return lat && lng ? valid(read(lat), read(lng)) : null;
  }

  if (/^https?:\/\//i.test(t)) {
    for (const pattern of IN_LINK) {
      const m = t.match(pattern);
      if (m) return valid(Number(m[1]), Number(m[2]));
    }
    return null;
  }

  const pair = t.match(PAIR);
  return pair ? valid(Number(pair[1]), Number(pair[2])) : null;
}

/** Straight-line distance in kilometres (the road is always longer). */
export function distanceKm(a: Coordinates, b: Coordinates): number {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLng = (b.longitude - a.longitude) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}
