import { describe, it, expect } from 'vitest';
import { oneSheet } from './one-sheet';
import { printHtml } from '@/lib/print/kit';
import type { PortfolioPageData } from '@/lib/supabase/public';

const data = (over: Partial<PortfolioPageData> = {}): PortfolioPageData => ({
  page: 'public',
  profile: { username: 'maya', role: 'Director', location: 'Lisbon', bio: 'Makes small films about big rooms.', avatar_url: null, status: 'OPEN' },
  pieces: [{ title: 'The Pier', year: 2026, role: 'Director', category: 'Short', description: 'A tide, a ferry.', cover_url: null, accent_color: null, share_token: 't1', laurels: [{ name: 'Local Night', kind: 'screening', year: 2026 }] }],
  credits: [{ title: 'Salt', year: 2025, project_type: 'short', accent_color: null, share_token: 's1', kind: 'crew', credit: 'Editor', character_name: null }],
  verified_laurels: [{ film: 'Salt', share_token: 's1', name: 'Rotterdam' }],
  ...over,
});

describe('the portfolio one-sheet', () => {
  it('is the person, their best work with their own laurels, the film-verified festivals, the credits and the page address', () => {
    const doc = oneSheet(data(), 'https://x.test/u/maya', '8 Nov 2026');
    expect(doc).toMatchObject({ title: 'maya', kind: 'Portfolio', subtitle: 'Director · Lisbon', footer: 'https://x.test/u/maya' });
    const html = printHtml(doc);
    for (const s of ['Makes small films about big rooms.', 'The Pier', 'Screening · Local Night · 2026', 'Rotterdam — Salt', 'Editor', 'https://x.test/u/maya', 'Open to work']) expect(html).toContain(s);
    expect(html).toContain('recorded by the film’s own team');
  });

  it('leaves out what a person has none of, and caps a long list with a note', () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ title: `P${i}`, year: 2020 + i, role: null, category: null, description: null, cover_url: null, accent_color: null, share_token: `t${i}`, laurels: [] }));
    const html = printHtml(oneSheet(data({ pieces: many, credits: [], verified_laurels: [], profile: { username: 'x', role: null, location: null, bio: null, avatar_url: null, status: null } }), 'https://x.test/u/x', 'd'));
    expect(html).toContain('3 more at the page below.');
    expect(html).not.toContain('P6');
    expect(html).not.toContain('>Credits<');
    expect(html).not.toContain('recorded by the film');
    expect(html).not.toContain('Open to work');
  });
});
