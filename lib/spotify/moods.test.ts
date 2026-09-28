import { describe, it, expect } from 'vitest';
import { sceneMood, scriptMoods } from './moods';

describe('sceneMood', () => {
  it('the strongest thing the scene describes wins', () => {
    expect(sceneMood('She runs. Gunshots. He chases her down the alley, running.').mood).toBe('Action');
    expect(sceneMood('He cries at the funeral, alone, in tears.').mood).toBe('Grief');
  });
  it('nothing stands out: its time of day, else quiet', () => {
    expect(sceneMood('Sam sits.', 'NIGHT').mood).toBe('Night');
    expect(sceneMood('Sam sits.', 'DAY').mood).toBe('Quiet');
  });
});

describe('scriptMoods', () => {
  it('groups scenes by mood, most scenes first', () => {
    const text = [
      'INT. CAVE - NIGHT', '', 'Blood on the walls. A scream.', '',
      'EXT. RIDGE - DAWN', '', 'Maya sits.', '',
      'INT. CAVE - NIGHT', '', 'The body. The knife. Shadows.', '',
    ].join('\n');
    const groups = scriptMoods(text);
    expect(groups[0]).toMatchObject({ mood: 'Dread', scenes: [{ number: 1 }, { number: 3 }] });
    expect(groups[1]).toMatchObject({ mood: 'Dawn', scenes: [{ number: 2 }] });
  });
});
