// Knowing more about a pasted link, from public sources that need no keys:
//
// - YouTube and Vimeo answer oEmbed with the video's real title, channel and
//   thumbnail, so a library item reads "Harbour at night — Lantern Films"
//   instead of "YouTube video".
// - A public Pinterest board has an RSS feed of its latest pins, so a
//   moodboard can come into the library pin by pin.
//
// Pure: builds the upstream address from a checked URL (never fetches the
// pasted address itself) and reads what comes back. app/api/links does the
// fetching, only ever to these hosts.

import { videoEmbed } from '@/lib/studio/media-kind';

export interface LinkDetails {
  title: string;
  author: string | null;
  thumbnail: string | null;
}

export interface Pin {
  title: string;
  pinUrl: string;
  imageUrl: string;
}

export const MAX_PINS = 50;

/** The oEmbed endpoint for a YouTube or Vimeo address; null for anything else. */
export function oembedEndpoint(raw: string): string | null {
  const embed = videoEmbed(raw);
  if (!embed) return null;
  if (embed.provider === 'youtube') return `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${embed.id}`)}`;
  if (embed.provider === 'vimeo') return `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(`https://vimeo.com/${embed.id}`)}`;
  return null;
}

const httpsOn = (value: unknown, hosts: RegExp): string | null => {
  if (typeof value !== 'string' || value.length > 2000) return null;
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && hosts.test(u.hostname) ? u.toString() : null;
  } catch { return null; }
};

const clip = (v: unknown, n: number): string | null => {
  if (typeof v !== 'string') return null;
  const s = v.replace(/\s+/g, ' ').trim();
  return s ? s.slice(0, n) : null;
};

/** What an oEmbed answer says, kept only if it looks right. */
export function readOembed(json: unknown): LinkDetails | null {
  if (!json || typeof json !== 'object') return null;
  const o = json as Record<string, unknown>;
  const title = clip(o.title, 200);
  if (!title) return null;
  return {
    title,
    author: clip(o.author_name, 100),
    thumbnail: httpsOn(o.thumbnail_url, /(^|\.)(ytimg\.com|vimeocdn\.com)$/),
  };
}

// Pinterest paths that are not boards.
const NOT_BOARDS = new Set(['pin', 'pins', 'search', 'ideas', 'today', 'business', 'settings', 'categories', 'topics', 'explore', 'login', 'about', '_']);

/**
 * The RSS feed of a public Pinterest board ("pinterest.com/<user>/<board>/"),
 * or null when the address isn't a board. Any country domain works.
 */
export function pinterestBoardFeed(raw: string): string | null {
  let u: URL;
  try { u = new URL(raw.trim()); } catch { return null; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  if (!/^([a-z]{2,3}\.)?pinterest\.[a-z.]{2,6}$/.test(u.hostname.replace(/^www\./, ''))) return null;
  const parts = u.pathname.split('/').filter(Boolean);
  if (parts.length !== 2) return null;
  const [user, board] = parts.map((p) => decodeURIComponent(p));
  if (NOT_BOARDS.has(user.toLowerCase()) || board.toLowerCase().endsWith('.rss')) return null;
  if (!/^[A-Za-z0-9_.-]{1,60}$/.test(user) || !/^[\p{L}\p{N}_.%-]{1,120}$/u.test(board)) return null;
  return `https://www.pinterest.com/${encodeURIComponent(user)}/${encodeURIComponent(board)}.rss`;
}

const unescape = (s: string) => s
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&amp;/g, '&');

const tag = (xml: string, name: string) => xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1] ?? null;

/** The pins in a board's RSS feed: each one's title, its page and its image. */
export function readPinterestRss(xml: string): { board: string | null; pins: Pin[] } {
  const channel = xml.split('<item>')[0];
  const board = clip(unescape(tag(channel, 'title') ?? ''), 60);
  const pins: Pin[] = [];
  const seen = new Set<string>();
  for (const chunk of xml.split('<item>').slice(1)) {
    const item = chunk.split('</item>')[0];
    const pinUrl = httpsOn(unescape(tag(item, 'link') ?? '').trim(), /(^|\.)pinterest\.[a-z.]{2,6}$/);
    const desc = unescape(tag(item, 'description') ?? '');
    // The feed carries 236px thumbnails; the 564px size is the pin as Pinterest shows it.
    const imageUrl = httpsOn(desc.match(/<img[^>]+src="([^"]+)"/)?.[1] ?? null, /^i\.pinimg\.com$/)?.replace(/^(https:\/\/i\.pinimg\.com)\/\d+x\//, '$1/564x/') ?? null;
    if (!pinUrl || !imageUrl || seen.has(imageUrl)) continue;
    seen.add(imageUrl);
    const text = clip(unescape(tag(item, 'title') ?? ''), 200) ?? clip(desc.replace(/<[^>]+>/g, ' '), 200);
    pins.push({ title: text ?? 'Pin', pinUrl, imageUrl });
    if (pins.length >= MAX_PINS) break;
  }
  return { board, pins };
}
