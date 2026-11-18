import { describe, expect, it } from 'vitest';
import { SIGNING_TEMPLATES, signUrl, signingState } from './signing-templates';

const fill = { project: 'Harbour', signer: 'Maya Ortiz', role: 'Gaffer', rate: '$250 per day', dates: '1–3 Dec 2026' };

describe('signing templates', () => {
  it('fill in the production, the person, the part, the rate and the dates', () => {
    for (const t of SIGNING_TEMPLATES) {
      const body = t.body(fill);
      expect(body).toContain('Harbour');
      expect(body).toContain('Maya Ortiz');
      expect(t.title(fill).length).toBeGreaterThan(0);
      expect(body.length).toBeLessThan(20000);
    }
    expect(SIGNING_TEMPLATES.find((t) => t.id === 'crew-deal')!.body(fill)).toContain('$250 per day');
    expect(SIGNING_TEMPLATES.find((t) => t.id === 'location-release')!.body(fill)).toContain('"Gaffer"');
  });
  it('leave a visible blank where something is not known, never a silent gap', () => {
    const body = SIGNING_TEMPLATES.find((t) => t.id === 'crew-deal')!.body({ project: 'Harbour', signer: 'Maya Ortiz' });
    expect(body).toContain('[position]');
    expect(body).toContain('[rate]');
    expect(body).toContain('[dates]');
  });
  it('file under the right kind of paperwork', () => {
    expect(SIGNING_TEMPLATES.filter((t) => t.docKind === 'release').map((t) => t.id)).toEqual(['appearance-release', 'location-release']);
  });
  it('names the link and where a request stands', () => {
    expect(signUrl('abc', 'https://x.test')).toBe('https://x.test/sign/abc');
    const base = { expires_at: '2026-12-20T00:00:00Z', signed_name: null, signed_at: null };
    const now = new Date('2026-11-18T00:00:00Z');
    expect(signingState({ ...base, status: 'pending' }, now).tone).toBe('open');
    expect(signingState({ ...base, status: 'pending', expires_at: '2026-11-01T00:00:00Z' }, now)).toMatchObject({ tone: 'bad', label: 'Expired, never signed' });
    expect(signingState({ ...base, status: 'signed', signed_name: 'Maya Ortiz', signed_at: '2026-11-18T09:00:00Z' }, now).label).toBe('Signed by Maya Ortiz on 2026-11-18');
    expect(signingState({ ...base, status: 'declined' }, now).tone).toBe('bad');
    expect(signingState({ ...base, status: 'void' }, now).label).toBe('Withdrawn');
  });
});
