import { describe, it, expect } from 'vitest';
import { describeFailure, NOT_MIGRATED_MESSAGE } from './api';

describe('describeFailure', () => {
  it('says a database update is missing when the table or column is not there', () => {
    expect(describeFailure({ code: '42P01', message: 'relation "scene_states" does not exist' }, 'Could not load continuity')).toBe(NOT_MIGRATED_MESSAGE);
    expect(describeFailure({ code: '42703', message: 'column scenes.story_day does not exist' }, 'x')).toBe(NOT_MIGRATED_MESSAGE);
    expect(describeFailure({ code: 'PGRST205', message: "Could not find the table 'public.reading_corrections' in the schema cache" }, 'x')).toBe(NOT_MIGRATED_MESSAGE);
    expect(describeFailure({ message: 'Could not find a column in the schema cache' }, 'x')).toBe(NOT_MIGRATED_MESSAGE);
  });

  it('keeps the existing messages for everything else', () => {
    expect(describeFailure({ code: '23505', message: 'duplicate key value violates unique constraint' }, 'x')).toBe('That already exists.');
    expect(describeFailure({ message: 'syntax error at or near' }, 'Could not save')).toBe('Could not save');
    expect(describeFailure({ message: 'Only the owner can do that' }, 'x')).toBe('Only the owner can do that');
    expect(describeFailure(null, 'Could not save')).toBe('Could not save');
  });
});
