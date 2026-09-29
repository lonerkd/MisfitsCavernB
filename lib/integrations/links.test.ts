import { describe, it, expect } from 'vitest';
import { oembedEndpoint, pinterestBoardFeed, readOembed, readPinterestRss, MAX_PINS } from './links';

describe('oEmbed', () => {
  it('asks YouTube and Vimeo about their own videos, rebuilt from the id', () => {
    expect(oembedEndpoint('https://youtu.be/dQw4w9WgXcQ?t=3')).toBe('https://www.youtube.com/oembed?format=json&url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DdQw4w9WgXcQ');
    expect(oembedEndpoint('https://vimeo.com/76979871')).toBe('https://vimeo.com/api/oembed.json?url=https%3A%2F%2Fvimeo.com%2F76979871');
  });

  it('asks nobody about anything else', () => {
    for (const u of ['https://example.com/video', 'https://drive.google.com/file/d/abcdefghijk/view', 'http://169.254.169.254/latest', 'not a url']) {
      expect(oembedEndpoint(u)).toBeNull();
    }
  });

  it('keeps a real title, the channel, and only a provider thumbnail', () => {
    expect(readOembed({ title: '  Harbour   at night ', author_name: 'Lantern Films', thumbnail_url: 'https://i.ytimg.com/vi/x/hqdefault.jpg' }))
      .toEqual({ title: 'Harbour at night', author: 'Lantern Films', thumbnail: 'https://i.ytimg.com/vi/x/hqdefault.jpg' });
    expect(readOembed({ title: 'T', thumbnail_url: 'https://evil.example/x.jpg' })).toEqual({ title: 'T', author: null, thumbnail: null });
    expect(readOembed({ title: 'T', thumbnail_url: 'javascript:alert(1)' })?.thumbnail).toBeNull();
    expect(readOembed({ author_name: 'no title' })).toBeNull();
    expect(readOembed('nope')).toBeNull();
  });
});

describe('Pinterest boards', () => {
  it('finds the feed of a board, on any country domain', () => {
    expect(pinterestBoardFeed('https://www.pinterest.com/lanternfilms/harbour-night/')).toBe('https://www.pinterest.com/lanternfilms/harbour-night.rss');
    expect(pinterestBoardFeed('https://uk.pinterest.co.uk/lanternfilms/harbour-night')).toBe('https://www.pinterest.com/lanternfilms/harbour-night.rss');
    expect(pinterestBoardFeed('https://pinterest.fr/ana/lumi%C3%A8re/')).toBe('https://www.pinterest.com/ana/lumi%C3%A8re.rss');
  });

  it('is not fooled by pins, searches, other sites or odd paths', () => {
    for (const u of [
      'https://www.pinterest.com/pin/123456/', 'https://www.pinterest.com/search/pins/?q=x', 'https://www.pinterest.com/lanternfilms/',
      'https://www.pinterest.com/a/b/c/', 'https://pinterest.evil.com/a/b/', 'https://notpinterest.com/a/b/', 'ftp://pinterest.com/a/b/',
      'https://www.pinterest.com/a/b.rss', 'https://www.pinterest.com/a b/c/',
    ]) expect(pinterestBoardFeed(u), u).toBeNull();
  });

  const item = (title: string, link: string, img: string) =>
    `<item><title>${title}</title><link>${link}</link><description>&lt;a href="${link}"&gt;&lt;img src="${img}"&gt;&lt;/a&gt;${title}</description></item>`;

  it('reads each pin’s title, page and image', () => {
    const xml = `<rss><channel><title>Harbour &amp; night</title>${item('Sodium lights', 'https://www.pinterest.com/pin/1/', 'https://i.pinimg.com/236x/a.jpg')}${item('<![CDATA[Fog on the quay]]>', 'https://www.pinterest.com/pin/2/', 'https://i.pinimg.com/236x/b.jpg')}</channel></rss>`;
    expect(readPinterestRss(xml)).toEqual({
      board: 'Harbour & night',
      pins: [
        { title: 'Sodium lights', pinUrl: 'https://www.pinterest.com/pin/1/', imageUrl: 'https://i.pinimg.com/564x/a.jpg' },
        { title: 'Fog on the quay', pinUrl: 'https://www.pinterest.com/pin/2/', imageUrl: 'https://i.pinimg.com/564x/b.jpg' },
      ],
    });
  });

  it('drops pins with images or pages from anywhere else, and repeats; caps the count', () => {
    const bad = `<rss><channel><title>B</title>${item('x', 'https://www.pinterest.com/pin/1/', 'https://evil.example/a.jpg')}${item('y', 'https://evil.example/pin', 'https://i.pinimg.com/a.jpg')}${item('z', 'https://www.pinterest.com/pin/3/', 'https://i.pinimg.com/a.jpg')}${item('z again', 'https://www.pinterest.com/pin/4/', 'https://i.pinimg.com/a.jpg')}</channel></rss>`;
    expect(readPinterestRss(bad).pins.map((p) => p.title)).toEqual(['z']);
    const many = `<rss><channel><title>B</title>${Array.from({ length: 80 }, (_, i) => item(`p${i}`, `https://www.pinterest.com/pin/${i}/`, `https://i.pinimg.com/${i}.jpg`)).join('')}</channel></rss>`;
    expect(readPinterestRss(many).pins).toHaveLength(MAX_PINS);
  });
});
