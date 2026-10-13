import { describe, expect, it } from 'vitest';
import { announcementNotice } from './announcements';

describe('announcementNotice', () => {
  it('names the project and carries the text on one line', () => {
    expect(announcementNotice('Breakwater', '  Call is\nmoved   to 6am.  ')).toEqual({ type: 'announcement', title: 'Announcement · Breakwater', body: 'Call is moved to 6am.' });
  });
  it('shortens a long announcement', () => {
    const n = announcementNotice('X', 'a'.repeat(500));
    expect(n.body).toHaveLength(198);
    expect(n.body.endsWith('…')).toBe(true);
  });
});
