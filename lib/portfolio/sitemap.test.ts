import { describe, it, expect, vi } from 'vitest';
import { portfolioSitemap } from './sitemap';

describe('the portfolio sitemap', () => {
  it('lists the directory and each public page, paging through the directory', async () => {
    const list = vi.fn()
      .mockResolvedValueOnce(Array.from({ length: 49 }, (_, i) => ({ username: `p${i}` })))
      .mockResolvedValueOnce([{ username: 'maya k' }]);
    const out = await portfolioSitemap('https://x.test/', list);
    expect(out[0].url).toBe('https://x.test/portfolios');
    expect(out).toHaveLength(51);
    expect(out.at(-1)?.url).toBe('https://x.test/u/maya%20k');
    expect(list).toHaveBeenCalledTimes(2);
    expect(list).toHaveBeenNthCalledWith(2, { limit: 49, offset: 49 });
  });
  it('is just the directory when nothing is public', async () => {
    expect(await portfolioSitemap('https://x.test', vi.fn().mockResolvedValue([]))).toEqual([{ url: 'https://x.test/portfolios' }]);
  });
});
