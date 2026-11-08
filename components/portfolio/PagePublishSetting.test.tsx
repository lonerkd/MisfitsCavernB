// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const toast = vi.fn();
let current = 'off';
const set = vi.fn(async (_id: string, v: string) => { current = v; });
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/lib/supabase/portfolio', () => ({
  getMyPortfolioPage: async () => current,
  getPortfolioOwner: async () => ({ username: 'Maya Ruiz' }),
  setMyPortfolioPage: (...a: [string, string]) => set(...a),
}));
import { PagePublishSetting } from './PagePublishSetting';

afterEach(() => { cleanup(); vi.clearAllMocks(); current = 'off'; });

describe('PagePublishSetting', () => {
  it('starts off, with no link, and says what off means', async () => {
    render(<PagePublishSetting userId="u1" />);
    expect(await screen.findByText(/nobody can open your name/i)).toBeTruthy();
    expect(screen.queryByLabelText('Copy page link')).toBeNull();
  });

  it('turning it on saves, tells the person what it means, and shows the page link (the encoded username)', async () => {
    render(<PagePublishSetting userId="u1" />);
    const select = await screen.findByLabelText('Your page');
    fireEvent.change(select, { target: { value: 'public' } });
    await waitFor(() => expect(set).toHaveBeenCalledWith('u1', 'public'));
    expect(toast).toHaveBeenCalledWith(expect.stringMatching(/^Public:/), 'success');
    expect((await screen.findByText(/\/u\/Maya%20Ruiz$/)).getAttribute('href')).toMatch(/\/u\/Maya%20Ruiz$/);
  });

  it('a refused change says so and keeps the old setting', async () => {
    set.mockRejectedValueOnce(new Error('permission denied'));
    render(<PagePublishSetting userId="u1" />);
    fireEvent.change(await screen.findByLabelText('Your page'), { target: { value: 'unlisted' } });
    await waitFor(() => expect(toast).toHaveBeenCalledWith('permission denied', 'error'));
    expect((screen.getByLabelText('Your page') as HTMLSelectElement).value).toBe('off');
  });
});
