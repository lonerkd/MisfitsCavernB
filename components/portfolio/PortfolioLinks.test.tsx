// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

let setting = 'off';
vi.mock('@/lib/supabase/portfolio', () => ({
  getMyPortfolioPage: async () => setting,
  getPortfolioOwner: async () => ({ username: 'Maya Ruiz' }),
}));
import { PortfolioLinks } from './PortfolioLinks';

afterEach(() => { cleanup(); setting = 'off'; });

describe('PortfolioLinks', () => {
  it('always offers the directory; with the page off it offers to publish, never a link to a page that is not there', async () => {
    render(<PortfolioLinks userId="u1" />);
    expect((await screen.findByText('Publish your page →')).closest('a')?.getAttribute('href')).toBe('/portfolio/manage');
    expect(screen.getByText('Browse portfolios →').closest('a')?.getAttribute('href')).toBe('/portfolios');
    expect(screen.queryByText('Your public page →')).toBeNull();
  });

  it.each(['unlisted', 'public'])('with the page %s it links to the person’s own page (the encoded name)', async (value) => {
    setting = value;
    render(<PortfolioLinks userId="u1" />);
    expect((await screen.findByText('Your public page →')).closest('a')?.getAttribute('href')).toBe('/u/Maya%20Ruiz');
    expect(screen.queryByText('Publish your page →')).toBeNull();
  });
});
