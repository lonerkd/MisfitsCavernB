// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

const online: Array<{ userId: string; email: string; color: string; sceneIdx: null; tool: string | null; lastActive: string }> = [];
const update = vi.fn();
vi.mock('@/lib/os/PresenceContext', () => ({ usePresence: () => ({ onlineUsers: online, updateScenePresence: () => {}, updateToolPresence: update }) }));
vi.mock('@/lib/os', () => ({ useCurrentUser: () => ({ user: { id: 'me' } }) }));

import { HereLine } from './HereLine';

afterEach(() => { cleanup(); online.length = 0; update.mockClear(); });

describe('HereLine', () => {
  it('names the page in the room, and clears it when the page closes', () => {
    const { unmount } = render(<HereLine tool="soundtrack" />);
    expect(update).toHaveBeenLastCalledWith('soundtrack');
    unmount();
    expect(update).toHaveBeenLastCalledWith(null);
  });
  it('says who else is on this page, not me and not another page', () => {
    online.push(
      { userId: 'u1', email: 'dev@x.com', color: 'red', sceneIdx: null, tool: 'soundtrack', lastActive: '' },
      { userId: 'u2', email: 'maya@x.com', color: 'green', sceneIdx: null, tool: 'project', lastActive: '' },
      { userId: 'me', email: 'me@x.com', color: 'blue', sceneIdx: null, tool: 'soundtrack', lastActive: '' },
    );
    render(<HereLine tool="soundtrack" />);
    expect(screen.getByRole('status').textContent).toBe('Dev is here too');
  });
  it('shows nothing when nobody else is', () => {
    render(<HereLine tool="project" />);
    expect(screen.queryByRole('status')).toBeNull();
  });
});
