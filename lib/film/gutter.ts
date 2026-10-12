// The editor's left gutter: for each scene heading on the page, when it is in
// the story and (once scheduled) which shoot day. Read from the script's own
// headings by the same reading the Continuity view offers, and from the stored
// scene where a person has set it. Read only. Pure.

import { inferStory, type StoryScene } from './story';

export interface GutterScene { heading: string; startIndex: number }
/** The stored scene behind a heading (public.scenes), or null until it has synced. */
export interface GutterRow {
  time_of_day?: string | null;
  story_day: number | null;
  story_time: string | null;
  story_confirmed: boolean;
  shoot_day: number | null;
}

export interface GutterItem {
  /** The heading's line on the page. */
  line: number;
  day: number | null;
  time: string | null;
  shoot: number | null;
  /** True when the story day/time is read from the script rather than set by a person. */
  guessed: boolean;
}

/**
 * One item per scene that has something to show, in page order.
 * `datedDays` are the shoot days that have a date: a scene's shoot day shows
 * only when its day is dated, because every scene starts on day 1 and that
 * alone doesn't mean it has been scheduled.
 */
export function sceneGutter(scenes: GutterScene[], rows: (GutterRow | null)[], datedDays: ReadonlySet<number> = new Set()): GutterItem[] {
  const story: StoryScene[] = scenes.map((sc, i) => ({
    id: String(i),
    heading: sc.heading,
    time_of_day: rows[i]?.time_of_day ?? null,
    story_day: rows[i]?.story_day ?? null,
    story_time: rows[i]?.story_time ?? null,
    story_confirmed: rows[i]?.story_confirmed ?? false,
  }));
  const items: GutterItem[] = [];
  inferStory(story).forEach((g, i) => {
    const row = rows[i];
    const shoot = row?.shoot_day != null && datedDays.has(row.shoot_day) ? row.shoot_day : null;
    if (g.story_day == null && !g.story_time && shoot == null) return;
    items.push({ line: scenes[i].startIndex, day: g.story_day, time: g.story_time, shoot, guessed: !row?.story_confirmed });
  });
  return items;
}

/** The gutter's words for one item, as a screen reader gets them. */
export function gutterLabel(item: GutterItem): string {
  const parts = [
    item.day != null ? `story day ${item.day}` : '',
    item.time ?? '',
    item.shoot != null ? `shoot day ${item.shoot}` : '',
  ].filter(Boolean);
  return `${parts.join(', ')}${item.guessed && (item.day != null || item.time) ? ' (read from the script)' : ''}`;
}
