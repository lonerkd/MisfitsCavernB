import { describe, it, expect } from 'vitest';
import { audienceLabel, audienceOptions, defaultPostPolicy, groupChannels } from './audience';

describe('channel audiences', () => {
  it('offers the right choices per scope', () => {
    expect(audienceOptions('community').map((o) => o.id)).toEqual(['users', 'admins']);
    expect(audienceOptions('project').map((o) => o.id)).toEqual(['team', 'owners', 'above', 'below', 'guests', 'public']);
    expect(audienceLabel('above')).toBe('Above the line');
    expect(defaultPostPolicy('public')).toBe('managers');
    expect(defaultPostPolicy('team')).toBe('viewers');
  });

  it('groups the sidebar: guides, this project, community, other productions’ public channels', () => {
    const ch = (id: string, project_id: string | null, type = 'text', audience = 'team', position = 0) => ({ id, name: id, project_id, type, audience, position });
    const g = groupChannels([
      ch('general', null, 'text', 'users', 2), ch('faq', null, 'guide', 'users', 1), ch('start', null, 'guide', 'users', 0),
      ch('crew', 'p1'), ch('updates', 'p2', 'text', 'public'), ch('secret', 'p2', 'text', 'owners'),
    ], 'p1');
    expect(g.guides.map((c) => c.id)).toEqual(['start', 'faq']);
    expect(g.project.map((c) => c.id)).toEqual(['crew']);
    expect(g.community.map((c) => c.id)).toEqual(['general']);
    expect(g.open.map((c) => c.id)).toEqual(['updates']);
  });
});
