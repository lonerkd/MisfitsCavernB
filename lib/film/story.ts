// Story time: which day of the story a scene is on, and when in that day.
// Read from the headings — NEXT MORNING, LATER, DAY 3, a night followed by a
// morning — and shown for a person to confirm. A confirmed scene is never
// changed by a guess, and the running day carries on from it. Pure.

export interface StoryScene {
  id: string;
  heading: string | null;
  time_of_day: string | null;
  story_day: number | null;
  story_time: string | null;
  story_confirmed: boolean;
}
export interface StoryGuess { id: string; story_day: number | null; story_time: string | null }

const WORDS = ['two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const countOf = (w: string): number => (/^\d+$/.test(w) ? Number(w) : WORDS.indexOf(w.toLowerCase()) + 2);

// Parts of a day, in order. The first word of a heading's tail that matches wins.
const PARTS: [string, RegExp][] = [
  ['dawn', /\b(DAWN|SUNRISE|DAYBREAK|FIRST LIGHT)\b/],
  ['morning', /\bMORNING\b/],
  ['afternoon', /\bAFTERNOON\b/],
  ['evening', /\b(EVENING|SUNSET|MAGIC HOUR)\b/],
  ['dusk', /\b(DUSK|TWILIGHT)\b/],
  ['night', /\b(NIGHT|MIDNIGHT)\b/],
  ['day', /\b(DAY|NOON|MIDDAY)\b/],
];
const ORDER: Record<string, number> = { dawn: 0, morning: 1, day: 2, afternoon: 3, evening: 4, dusk: 5, night: 6 };

const SAME_DAY = /\b(CONTINUOUS|CONT'D|LATER|MOMENTS LATER|SAME|SECONDS LATER|MINUTES LATER|HOURS LATER|MEANWHILE)\b/;
const OUT_OF_ORDER = /\b(FLASHBACK|FLASH BACK|MEMORY|DREAM|FANTASY|FLASH FORWARD|FLASHFORWARD|MONTAGE|ARCHIVE|INTERCUT)\b/;

/** How many story days the heading moves on, or the day it names; null when it says neither. */
function dayShift(h: string): { advance: number } | { set: number } | null {
  const named = h.match(/\bDAY\s+(\d{1,3})\b/);
  if (named) return { set: Number(named[1]) };
  if (/\b(NEXT|FOLLOWING)\s+(DAY|MORNING|AFTERNOON|EVENING|NIGHT)\b/.test(h) || /\bTHE DAY AFTER\b/.test(h)) return { advance: 1 };
  const n = h.match(/\b(\d+|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN)\s+DAYS?\s+(LATER|AFTER)\b/i);
  if (n) return { advance: countOf(n[1]) };
  if (/\bA\s+WEEK\s+LATER\b/.test(h)) return { advance: 7 };
  if (/\bA\s+DAY\s+LATER\b/.test(h)) return { advance: 1 };
  return null;
}

/** The day has turned over: it was later in the day, and now it is morning (after a night, any daytime). */
function newMorning(prev: string, part: string): boolean {
  if (prev === 'night' && ORDER[part] < ORDER.evening) return true;
  return (part === 'dawn' || part === 'morning') && ORDER[prev] > ORDER[part];
}

/** "dawn" … "night", from the heading's tail (or the scene's own time of day); null when unclear. */
export function partOfDay(heading: string | null, timeOfDay: string | null): string | null {
  const tail = `${(heading ?? '').toUpperCase().split(/\s+-\s+|\s+—\s+/).slice(1).join(' ')} ${(timeOfDay ?? '').toUpperCase()}`;
  const text = tail.trim() ? tail : (heading ?? '').toUpperCase();
  for (const [name, re] of PARTS) if (re.test(text)) return name;
  return null;
}

/**
 * Guesses for every scene, in script order. A scene a person confirmed keeps
 * its day and time, and the count carries on from it. Flashbacks and dreams
 * have no story day (they aren't on the line).
 */
export function inferStory(scenes: StoryScene[]): StoryGuess[] {
  const out: StoryGuess[] = [];
  let day = 1;
  let prevPart: string | null = null;
  for (const sc of scenes) {
    if (sc.story_confirmed) {
      if (sc.story_day != null) day = sc.story_day;
      prevPart = sc.story_time && sc.story_time in ORDER ? sc.story_time : prevPart;
      out.push({ id: sc.id, story_day: sc.story_day, story_time: sc.story_time });
      continue;
    }
    const h = (sc.heading ?? '').toUpperCase();
    const part = partOfDay(sc.heading, sc.time_of_day);
    if (OUT_OF_ORDER.test(h)) { out.push({ id: sc.id, story_day: null, story_time: part }); continue; }
    const shift = dayShift(h);
    if (shift && 'set' in shift) day = shift.set;
    else if (shift) day += shift.advance;
    else if (!SAME_DAY.test(h) && part && prevPart && newMorning(prevPart, part)) day += 1;
    if (part) prevPart = part;
    out.push({ id: sc.id, story_day: day, story_time: part });
  }
  return out;
}

/** The scenes whose guess differs from what is saved, for the person to confirm. */
export function storyChanges(scenes: StoryScene[]): StoryGuess[] {
  const byId = new Map(scenes.map((s) => [s.id, s]));
  return inferStory(scenes).filter((g) => {
    const s = byId.get(g.id)!;
    return !s.story_confirmed && (g.story_day !== s.story_day || g.story_time !== s.story_time);
  });
}

/** "Day 3 · dawn", "Day 3", "dawn" or "" — one phrase for a scene's story time. */
export function storyLabel(day: number | null, time: string | null): string {
  return [day != null ? `Day ${day}` : '', time ?? ''].filter(Boolean).join(' · ');
}
