import { describe, expect, it } from 'vitest';
import { firstName, hereLine, othersInTool } from './tool-presence';

const u = (userId: string, email: string, tool: string | null) => ({ userId, email, tool });

describe('tool presence', () => {
  it('names someone from their email', () => {
    expect(firstName('dev@x.com')).toBe('Dev');
    expect(firstName('')).toBe('Someone');
    expect(firstName(null)).toBe('Someone');
  });
  it('lists the others in this tool once each, never me, never another tool', () => {
    const users = [u('1', 'maya@x.com', 'production:safety'), u('2', 'dev@x.com', 'production:safety'), u('3', 'ben@x.com', 'production:money'), u('2', 'dev@x.com', 'production:safety'), u('me', 'me@x.com', 'production:safety')];
    expect(othersInTool(users, 'production:safety', 'me').map((x) => x.userId)).toEqual(['2', '1']);
    expect(othersInTool(users, 'production:schedule', 'me')).toEqual([]);
  });
  it('says it plainly, for one, two and more', () => {
    expect(hereLine([])).toBeNull();
    expect(hereLine([u('1', 'dev@x.com', 't')])).toBe('Dev is here too');
    expect(hereLine([u('1', 'dev@x.com', 't'), u('2', 'maya@x.com', 't')])).toBe('Dev and Maya are here too');
    expect(hereLine([u('1', 'dev@x.com', 't'), u('2', 'maya@x.com', 't'), u('3', 'ben@x.com', 't')])).toBe('Dev, Maya and 1 other are here too');
    expect(hereLine([u('1', 'a@x', 't'), u('2', 'b@x', 't'), u('3', 'c@x', 't'), u('4', 'd@x', 't')])).toBe('A, B and 2 others are here too');
  });
});
