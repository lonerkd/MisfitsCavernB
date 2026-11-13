// The Sound page's Library: everything the project owns in sound, as one list. Saved songs (Spotify references), uploaded sound
// files saved to the project, and the project's own sound-effect uploads, filterable by kind, role, scene and tag. Pure: the
// page loads the rows, this decides what to show.
import type { AudioReference, SfxAsset } from '@/lib/supabase/audio';

export type LibraryKind = 'song' | 'sound';

export interface LibraryItem {
  /** `ref:<id>` for a saved reference, `sfx:<id>` for an upload not saved as a reference. */
  key: string;
  /** The reference's id when it is one (only references can be tagged or removed here). */
  refId: string | null;
  kind: LibraryKind;
  title: string;
  subtitle: string;
  /** A Spotify URI for a song, a file URL (or storage path) for a sound. */
  uri: string;
  role: string | null;
  tags: string[];
  sceneId: string | null;
}

export interface LibraryFilter {
  kind: LibraryKind | 'all';
  role: string | 'all' | 'none';
  /** A scene id, `all`, or `none` for tracks not placed in a scene. */
  scene: string | 'all' | 'none';
  tag: string | null;
  text: string;
}

export const NO_FILTER: LibraryFilter = { kind: 'all', role: 'all', scene: 'all', tag: null, text: '' };

const fileName = (uri: string) => decodeURIComponent(uri.split('?')[0].split('/').pop() ?? uri);

/** References first (they carry the tags), then uploads that are not saved as a reference yet; newest first within each. */
export function buildLibrary(refs: AudioReference[], sfx: SfxAsset[]): LibraryItem[] {
  const fromRefs: LibraryItem[] = refs.map((r) => ({
    key: `ref:${r.id}`,
    refId: r.id,
    kind: r.reference_type === 'spotify' ? 'song' : 'sound',
    title: r.title || (r.reference_type === 'spotify' ? 'Untitled song' : fileName(r.uri)),
    subtitle: r.description ?? '',
    uri: r.uri,
    role: r.role ?? null,
    tags: r.tags ?? [],
    sceneId: r.for_scene ?? null,
  }));
  const saved = new Set(refs.filter((r) => r.reference_type !== 'spotify').map((r) => r.uri));
  const fromSfx: LibraryItem[] = sfx
    .filter((a) => !saved.has(a.audio_url))
    .map((a) => ({
      key: `sfx:${a.id}`,
      refId: null,
      kind: 'sound' as const,
      title: a.title,
      subtitle: a.tags?.[0] ?? 'Sound effect',
      uri: a.audio_url,
      role: null,
      tags: [],
      sceneId: null,
    }));
  return [...fromRefs, ...fromSfx];
}

export function filterLibrary(items: LibraryItem[], f: LibraryFilter): LibraryItem[] {
  const text = f.text.trim().toLowerCase();
  return items.filter((i) => {
    if (f.kind !== 'all' && i.kind !== f.kind) return false;
    if (f.role === 'none' ? i.role : f.role !== 'all' && i.role !== f.role) return false;
    if (f.scene === 'none' ? i.sceneId : f.scene !== 'all' && i.sceneId !== f.scene) return false;
    if (f.tag && !i.tags.some((t) => t.toLowerCase() === f.tag!.toLowerCase())) return false;
    if (text && !`${i.title} ${i.subtitle} ${i.tags.join(' ')}`.toLowerCase().includes(text)) return false;
    return true;
  });
}

/** Every tag in use, most used first, then alphabetical (case-insensitive; the first spelling seen is shown). */
export function allTags(items: LibraryItem[]): string[] {
  const count = new Map<string, { label: string; n: number }>();
  for (const i of items) for (const t of i.tags) {
    const k = t.toLowerCase();
    const c = count.get(k);
    if (c) c.n += 1; else count.set(k, { label: t, n: 1 });
  }
  return [...count.values()].sort((a, b) => b.n - a.n || a.label.localeCompare(b.label)).map((c) => c.label);
}
