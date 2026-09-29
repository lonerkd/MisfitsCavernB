import { describe, expect, it } from 'vitest';
import { ago, placeFor, resumeOffer, toPlaces, worthSaving } from './places';

const P = { id: '11111111-2222-4333-8444-555555555555', title: 'Night Shift' };
const S = '99999999-8888-4777-8666-555555555555';
const q = (s: string) => new URLSearchParams(s);

describe('placeFor', () => {
  it('names the places worth coming back to', () => {
    expect(placeFor('/editor', q(`script=${S}`), P)).toEqual({ path: `/editor?script=${S}`, label: 'Night Shift — script', project: P.id });
    expect(placeFor('/studio', q('tab=library'), P)).toEqual({ path: '/studio?tab=library', label: 'Night Shift — Studio › Library', project: P.id });
    expect(placeFor('/studio', q('tab=production&view=onset'), P)?.label).toBe('Night Shift — On Set');
    expect(placeFor('/studio', q('tab=production'), P)?.path).toBe('/studio?tab=production&view=story');
    expect(placeFor(`/projects/${P.id}`, q(''), P)?.label).toBe('Night Shift — project page');
    expect(placeFor(`/projects/${P.id}/pitch`, q(''), null)?.label).toBe('pitch');
    expect(placeFor('/lounge', q(`channel=${S}`), null)?.path).toBe(`/lounge?channel=${S}`);
  });

  it('ignores the hub, lists, settings and anything malformed', () => {
    for (const path of ['/', '/today', '/projects', '/settings', '/jobs', '/lounge', '/crew/abc']) expect(placeFor(path, q(''), P)).toBeNull();
    expect(placeFor('/editor', q('script=../../x'), P)).toBeNull();
    expect(placeFor('/studio', q('tab=nope'), P)).toBeNull();
    expect(placeFor('/studio', q('tab=library'), null)).toBeNull();
    expect(placeFor('/studio', q('tab=production&view=<b>'), P)).toBeNull();
  });
});

describe('toPlaces', () => {
  it('keeps only well-formed places', () => {
    const good = { path: '/studio?tab=library', label: 'x', at: '2026-09-29T10:00:00.000Z', project: P.id };
    expect(toPlaces({ phone: good, desktop: { ...good, path: '//evil.com' } })).toEqual({ phone: good });
    expect(toPlaces({ desktop: { ...good, project: 'nope' } }).desktop?.project).toBeNull();
    expect(toPlaces(null)).toEqual({});
  });
});

describe('resumeOffer', () => {
  const now = new Date('2026-09-29T12:00:00Z');
  const desk = { path: `/editor?script=${S}`, label: 'Night Shift — script', at: '2026-09-29T11:40:00.000Z', project: P.id };

  it('offers the other device’s place', () => {
    expect(resumeOffer({ desktop: desk }, 'phone', now)).toEqual({ from: 'desktop', place: desk });
    expect(resumeOffer({ phone: desk }, 'desktop', now)?.from).toBe('phone');
  });

  it('not when it is old, already here, or already picked up', () => {
    expect(resumeOffer({ desktop: { ...desk, at: '2026-09-25T11:40:00.000Z' } }, 'phone', now)).toBeNull();
    expect(resumeOffer({ desktop: desk }, 'phone', now, desk.path)).toBeNull();
    expect(resumeOffer({ desktop: desk, phone: { ...desk, at: '2026-09-29T11:50:00.000Z' } }, 'phone', now)).toBeNull();
    expect(resumeOffer({ phone: desk }, 'phone', now)).toBeNull();
  });
});

describe('worthSaving', () => {
  const now = new Date('2026-09-29T12:00:00Z');
  const last = { path: '/studio?tab=library', label: 'x', at: '2026-09-29T11:58:00.000Z', project: P.id };
  it('saves a new page at once, the same page only now and then', () => {
    expect(worthSaving(null, last, now)).toBe(true);
    expect(worthSaving(last, { ...last, path: '/studio?tab=scenes' }, now)).toBe(true);
    expect(worthSaving(last, last, now)).toBe(false);
    expect(worthSaving(last, last, new Date('2026-09-29T12:10:00Z'))).toBe(true);
  });
});

describe('ago', () => {
  const now = new Date('2026-09-29T12:00:00Z');
  it('reads like a person', () => {
    expect(ago('2026-09-29T11:59:30Z', now)).toBe('just now');
    expect(ago('2026-09-29T11:40:00Z', now)).toBe('20 min ago');
    expect(ago('2026-09-29T09:00:00Z', now)).toBe('3 h ago');
    expect(ago('2026-09-28T10:00:00Z', now)).toBe('yesterday');
    expect(ago('2026-09-26T12:00:00Z', now)).toBe('3 days ago');
  });
});
