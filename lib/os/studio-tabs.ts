import type { ProjectProgress, StudioTab } from '@/lib/os/progress';

/** The Studio tabs, in order. */
export const STUDIO_TAB_IDS: readonly StudioTab[] = ['overview', 'library', 'scenes', 'production', 'post', 'promos', 'pitch', 'share'];

/** What a notes-and-storage project (a format with no phases) keeps: its files, links and boards, and sharing. */
const NOTES_TABS: ReadonlySet<StudioTab> = new Set<StudioTab>(['overview', 'library', 'share']);

/**
 * The Studio tabs a project shows. Keyed on whether the project's format has
 * phases, never on the format's name: a project with no phases keeps only the
 * notes tabs; every other project (and one whose progress has not loaded yet)
 * keeps all of them, Promos only when its distribution module is on.
 */
export function visibleStudioTabs(progress: Pick<ProjectProgress, 'phased'> | null, opts: { distribution?: boolean } = {}): StudioTab[] {
  if (progress && progress.phased === false) return STUDIO_TAB_IDS.filter((t) => NOTES_TABS.has(t));
  const distribution = opts.distribution ?? true;
  return STUDIO_TAB_IDS.filter((t) => t !== 'promos' || distribution);
}

/** The tab a link lands on: the one asked for if it is shown, else the Overview. */
export function resolveStudioTab(asked: string | null | undefined, visible: readonly StudioTab[]): StudioTab {
  return asked && (visible as readonly string[]).includes(asked) ? (asked as StudioTab) : 'overview';
}
