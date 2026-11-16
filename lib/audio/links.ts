/** Links between the editor and the Sound page. The editor already opens a scene from `?script=<id>&scene=<id>`. */

export const SOUND_TABS = ['search', 'scenes', 'library'] as const;
export type SoundTab = (typeof SOUND_TABS)[number];

/** The editor, at a scene of a script (the format the Studio uses too). Without a script id there is nowhere to go: null. */
export function editorSceneHref(scriptId: string | null | undefined, sceneId: string | null | undefined): string | null {
  if (!scriptId) return null;
  return `/editor?script=${encodeURIComponent(scriptId)}${sceneId ? `&scene=${encodeURIComponent(sceneId)}` : ''}`;
}

/** A tab of the Sound page. */
export const soundHref = (tab: SoundTab): string => `/soundtrack?tab=${tab}`;

/** The tab a `?tab=` value names, or the fallback when it names none. */
export function parseSoundTab(value: string | null | undefined, fallback: SoundTab = 'search'): SoundTab {
  return (SOUND_TABS as readonly string[]).includes(value ?? '') ? (value as SoundTab) : fallback;
}
