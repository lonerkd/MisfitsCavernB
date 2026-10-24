// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import type { SyncStatus } from '@/lib/scriptos/storage';

const { state, syncNow } = vi.hoisted(() => ({
  state: { current: null as unknown as SyncStatus, listeners: new Set<() => void>() },
  syncNow: vi.fn(async () => {}),
}));

vi.mock('@/lib/scriptos/storage', () => ({
  getSyncStatus: () => state.current,
  subscribeSyncStatus: (l: () => void) => { state.listeners.add(l); return () => state.listeners.delete(l); },
  syncPendingScripts: syncNow,
}));

import { SyncStatusChip, describeSync, formatWait } from './SyncStatusChip';

const base: SyncStatus = { pending: 0, deletes: 0, syncing: false, nextRetryAt: null, attempts: 0, online: true };
const NOW = 1_000_000;

afterEach(() => { cleanup(); syncNow.mockClear(); state.listeners.clear(); });

describe('formatWait', () => {
  it('rounds up and switches to minutes', () => {
    expect(formatWait(400)).toBe('1 s');
    expect(formatWait(12_200)).toBe('13 s');
    expect(formatWait(59_000)).toBe('59 s');
    expect(formatWait(61_000)).toBe('2 min');
  });
});

describe('describeSync — wording per state', () => {
  it('says nothing when online with nothing queued', () => {
    expect(describeSync(base, NOW)).toBeNull();
  });

  it('offline with nothing queued', () => {
    expect(describeSync({ ...base, online: false }, NOW)).toMatchObject({ text: 'Offline — nothing waiting', canRetry: false });
  });

  it('offline with writing queued', () => {
    const v = describeSync({ ...base, online: false, pending: 2 }, NOW)!;
    expect(v.text).toBe('Offline — 2 scripts saved on this device, will sync on reconnect');
    expect(v.tone).toBe('warn');
    expect(v.canRetry).toBe(false);
  });

  it('syncing', () => {
    expect(describeSync({ ...base, pending: 1, syncing: true }, NOW)).toMatchObject({ text: 'Syncing 1 script…', tone: 'busy', canRetry: false });
  });

  it('queued with a retry countdown', () => {
    const v = describeSync({ ...base, pending: 1, nextRetryAt: NOW + 12_000 }, NOW)!;
    expect(v.text).toBe('1 script waiting to sync · retry in 12 s');
    expect(v.canRetry).toBe(true);
  });

  it('after failures: error tone, try count, deletes counted too', () => {
    const v = describeSync({ ...base, pending: 1, deletes: 2, attempts: 2, nextRetryAt: NOW + 90_000 }, NOW)!;
    expect(v.text).toBe('Can’t reach the server — 1 script + 2 deletes waiting · retry in 2 min (try 3)');
    expect(v.tone).toBe('error');
  });
});

describe('<SyncStatusChip>', () => {
  it('renders nothing when idle', () => {
    state.current = base;
    const { container } = render(<SyncStatusChip />);
    expect(container.innerHTML).toBe('');
  });

  it('shows the queue, "Sync now" triggers a pass, and it updates when the store changes', () => {
    state.current = { ...base, pending: 1, nextRetryAt: Date.now() + 15_000 };
    render(<SyncStatusChip />);
    expect(screen.getByRole('status').textContent).toContain('1 script waiting to sync · retry in');

    act(() => { screen.getByRole('button', { name: 'Sync now' }).click(); });
    expect(syncNow).toHaveBeenCalledTimes(1);

    act(() => {
      state.current = { ...base, pending: 1, syncing: true };
      state.listeners.forEach((l) => l());
    });
    expect(screen.getByRole('status').textContent).toContain('Syncing 1 script…');
    expect(screen.queryByRole('button', { name: 'Sync now' })).toBeNull();
  });
});
