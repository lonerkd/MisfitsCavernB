import { describe, expect, it } from 'vitest';
import { inferStory, partOfDay, storyChanges, storyLabel, type StoryScene } from './story';

let n = 0;
const sc = (heading: string, extra: Partial<StoryScene> = {}): StoryScene => ({
  id: `s${++n}`, heading, time_of_day: null, story_day: null, story_time: null, story_confirmed: false, ...extra,
});
const days = (scenes: StoryScene[]) => inferStory(scenes).map((g) => g.story_day);

describe('partOfDay', () => {
  it.each([
    ['INT. KITCHEN - DAWN', 'dawn'], ['EXT. PIER - MORNING', 'morning'], ['INT. HOUSE - DAY', 'day'],
    ['EXT. ROAD - LATE AFTERNOON', 'afternoon'], ['EXT. BEACH - SUNSET', 'evening'], ['INT. BAR - NIGHT', 'night'],
    ['INT. BAR - DUSK', 'dusk'],
  ])('%s → %s', (heading, part) => expect(partOfDay(heading, null)).toBe(part));
  it('falls back on the scene’s own time of day, and is null when unclear', () => {
    expect(partOfDay('INT. ROOM', 'NIGHT')).toBe('night');
    expect(partOfDay('INT. ROOM - LATER', null)).toBeNull();
    expect(partOfDay(null, null)).toBeNull();
  });
});

describe('inferStory', () => {
  it('starts on day 1 and stays there through the same day', () => {
    expect(days([sc('INT. A - MORNING'), sc('EXT. B - DAY'), sc('INT. C - NIGHT')])).toEqual([1, 1, 1]);
  });
  it('turns the day over when a morning follows a night', () => {
    expect(days([sc('INT. A - NIGHT'), sc('INT. B - MORNING'), sc('INT. C - DAY')])).toEqual([1, 2, 2]);
  });
  it('turns the day over from daytime back to a morning', () => {
    expect(days([sc('INT. A - AFTERNOON'), sc('INT. B - DAWN')])).toEqual([1, 2]);
  });
  it('does not turn the day on LATER or CONTINUOUS', () => {
    expect(days([sc('INT. A - NIGHT'), sc('INT. B - MORNING LATER')])).toEqual([1, 1]);
    expect(days([sc('INT. A - NIGHT'), sc('INT. A - CONTINUOUS')])).toEqual([1, 1]);
  });
  it('reads explicit shifts: next day, N days later, a week later, DAY n', () => {
    expect(days([sc('INT. A - DAY'), sc('INT. B - NEXT MORNING')])).toEqual([1, 2]);
    expect(days([sc('INT. A - DAY'), sc('INT. B - THREE DAYS LATER')])).toEqual([1, 4]);
    expect(days([sc('INT. A - DAY'), sc('INT. B - A WEEK LATER')])).toEqual([1, 8]);
    expect(days([sc('INT. A - DAY'), sc('INT. B - DAY 12'), sc('INT. C - NIGHT')])).toEqual([1, 12, 12]);
  });
  it('puts flashbacks and dreams off the line without moving the day', () => {
    const g = inferStory([sc('INT. A - DAY'), sc('INT. B - FLASHBACK - NIGHT'), sc('INT. C - EVENING')]);
    expect(g.map((x) => x.story_day)).toEqual([1, null, 1]);
  });
  it('keeps a confirmed scene as it is and carries on from it', () => {
    const g = inferStory([sc('INT. A - DAY'), sc('INT. B - DAY', { story_confirmed: true, story_day: 5, story_time: 'day' }), sc('INT. C - EVENING')]);
    expect(g.map((x) => x.story_day)).toEqual([1, 5, 5]);
  });
  it('says nothing about time it cannot read, and never invents a part of day', () => {
    const g = inferStory([sc('INT. A')]);
    expect(g[0]).toMatchObject({ story_day: 1, story_time: null });
  });
});

describe('storyChanges', () => {
  it('lists only unconfirmed scenes whose guess differs from what is saved', () => {
    const a = sc('INT. A - NIGHT', { story_day: 1, story_time: 'night' });
    const b = sc('INT. B - MORNING');
    const c = sc('INT. C - DAY', { story_confirmed: true, story_day: 9, story_time: 'day' });
    expect(storyChanges([a, b, c]).map((x) => [x.id, x.story_day, x.story_time])).toEqual([[b.id, 2, 'morning']]);
  });
});

describe('storyLabel', () => {
  it('reads as one phrase', () => {
    expect(storyLabel(3, 'dawn')).toBe('Day 3 · dawn');
    expect(storyLabel(3, null)).toBe('Day 3');
    expect(storyLabel(null, 'night')).toBe('night');
    expect(storyLabel(null, null)).toBe('');
  });
});
