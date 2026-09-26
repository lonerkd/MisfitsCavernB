// What kind of media a file or link is, and how to show it. Pure functions —
// shared by the Studio library, the editor's references panel and the share
// page, so every surface classifies and embeds media the same way.

export type MediaKind = 'image' | 'video' | 'audio' | 'document' | 'link';

/** Largest file the project-media bucket accepts (its file_size_limit). */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export const ACCEPTED_UPLOAD_TYPES = 'image/*,video/*,audio/*,application/pdf';

export function kindFromMime(mime: string | null | undefined): MediaKind | null {
  const m = String(mime || '').toLowerCase();
  if (m.startsWith('image/')) return 'image';
  if (m.startsWith('video/')) return 'video';
  if (m.startsWith('audio/')) return 'audio';
  if (m === 'application/pdf') return 'document';
  return null;
}

/** Why a file can't be uploaded, or null if it can. */
export function uploadProblem(file: { size: number; type: string; name: string }): string | null {
  if (!kindFromMime(file.type)) return `${file.name}: only images, video, audio and PDFs can be uploaded.`;
  if (file.size > MAX_UPLOAD_BYTES) return `${file.name} is ${(file.size / 1024 / 1024).toFixed(0)} MB — the limit is 50 MB. Link it from where it's hosted instead.`;
  if (file.size === 0) return `${file.name} is empty.`;
  return null;
}

/** A storage-safe file name that still reads like the original. */
export function safeFileName(name: string): string {
  const trimmed = String(name || '').split(/[\\/]/).pop()!.trim();
  const dot = trimmed.lastIndexOf('.');
  const base = dot > 0 ? trimmed.slice(0, dot) : trimmed;
  const ext = dot > 0 ? trimmed.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10) : '';
  const cleanBase = base.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^[-.]+|[-.]+$/g, '').slice(0, 100) || 'file';
  return ext ? `${cleanBase}.${ext}` : cleanBase;
}

/** A readable default title from a file name ("dusk_frame-02.jpg" → "dusk frame 02"). */
export function titleFromFileName(name: string): string {
  const dot = name.lastIndexOf('.');
  return (dot > 0 ? name.slice(0, dot) : name).replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200) || 'Untitled';
}

export interface Embed {
  provider: 'youtube' | 'vimeo';
  id: string;
  /** Privacy-friendly player URL for an iframe. */
  src: string;
  thumbnail: string | null;
}

export function videoEmbed(url: string | null | undefined): Embed | null {
  let u: URL;
  try { u = new URL(String(url)); } catch { return null; }
  const host = u.hostname.replace(/^www\.|^m\./, '');
  let yt: string | null = null;
  if (host === 'youtu.be') yt = u.pathname.slice(1).split('/')[0];
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (u.pathname === '/watch') yt = u.searchParams.get('v');
    else {
      const m = u.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?#]+)/);
      if (m) yt = m[1];
    }
  }
  if (yt && /^[A-Za-z0-9_-]{6,20}$/.test(yt)) {
    return { provider: 'youtube', id: yt, src: `https://www.youtube-nocookie.com/embed/${yt}`, thumbnail: `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` };
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const m = u.pathname.match(/\/(?:video\/)?(\d{5,12})(?:\/|$)/);
    if (m) return { provider: 'vimeo', id: m[1], src: `https://player.vimeo.com/video/${m[1]}`, thumbnail: null };
  }
  return null;
}

/** Classify an external link. Only http(s) URLs are accepted. */
export function classifyUrl(raw: string): { url: string; kind: MediaKind; title: string } | null {
  let u: URL;
  try { u = new URL(raw.trim()); } catch { return null; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  const url = u.toString();
  if (url.length > 2000) return null;
  const path = u.pathname.toLowerCase();
  const last = decodeURIComponent(u.pathname.split('/').filter(Boolean).pop() || '');
  const title = (last ? titleFromFileName(last) : u.hostname.replace(/^www\./, '')).slice(0, 200);
  if (videoEmbed(url)) return { url, kind: 'video', title: u.hostname.includes('vimeo') ? 'Vimeo video' : 'YouTube video' };
  if (/\.(png|jpe?g|gif|webp|avif|svg)$/.test(path)) return { url, kind: 'image', title };
  if (/\.(mp4|webm|mov|m4v)$/.test(path)) return { url, kind: 'video', title };
  if (/\.(mp3|wav|m4a|aac|ogg|flac)$/.test(path)) return { url, kind: 'audio', title };
  if (/\.pdf$/.test(path)) return { url, kind: 'document', title };
  return { url, kind: 'link', title };
}
