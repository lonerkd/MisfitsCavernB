// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

const calls: string[] = [];
vi.mock('@/lib/island/useSyncActivity', () => ({ useSyncActivity: () => { calls.push('sync'); } }));
vi.mock('@/lib/island/useCallActivity', () => ({ useCallActivity: () => { calls.push('call'); } }));
vi.mock('@/lib/island/useMusicActivity', () => ({ useMusicActivity: () => { calls.push('music'); } }));
import { ActivityBridges } from './ActivityBridges';

describe('ActivityBridges', () => {
  it('watches the queue, the call and the music, and draws nothing itself', () => {
    const { container } = render(<ActivityBridges />);
    expect(container.innerHTML).toBe('');
    expect(calls).toEqual(['sync', 'call', 'music']);
  });
});
