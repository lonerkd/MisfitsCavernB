// A person's own portfolio page (/u/<username>): off until they publish it. The database decides who can read it
// (get_portfolio_page); this is the one place the three settings, their words, the link and the indexing rule live.
export type PagePublish = 'off' | 'unlisted' | 'public';

export const PAGE_SETTINGS: PagePublish[] = ['off', 'unlisted', 'public'];

export const PAGE_LABEL: Record<PagePublish, string> = { off: 'Off', unlisted: 'Link only', public: 'Public' };

export const PAGE_NOTE: Record<PagePublish, string> = {
  off: 'You have no page. Nobody can open your name as a link.',
  unlisted: 'Anyone with your page’s link can open it. It is not in the portfolio directory and search engines are told to skip it.',
  public: 'Your page is open to everyone, listed in the portfolio directory and findable. It shows your public pieces and credits only.',
};

export const isPageSetting = (v: unknown): v is PagePublish => v === 'off' || v === 'unlisted' || v === 'public';

/** What came back, never trusted: anything unknown is off. */
export const pageSettingOf = (v: unknown): PagePublish => (isPageSetting(v) ? v : 'off');

/** The page's address for a username (encoded: a username may hold spaces or symbols). */
export const pagePath = (username: string): string => `/u/${encodeURIComponent(username.trim())}`;

/** Only a public page may be indexed by search engines; a link-only page never is. */
export const pageIsIndexable = (page: PagePublish): boolean => page === 'public';
