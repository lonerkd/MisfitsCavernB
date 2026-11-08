// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { activitySignature, activityStore, createActivityStore, KIND_PRIORITY, rankActivities, useActivities, useActivity, type Activity } from './activities';

const a = (over: Partial<Activity> & Pick<Activity, 'id' | 'kind'>): Activity => ({ title: over.id, ...over });

describe('rankActivities', () => {
  it('puts the person\'s voice and data before the clock and the music', () => {
    const order = rankActivities([a({ id: 'music', kind: 'music' }), a({ id: 'sprint', kind: 'timer' }), a({ id: 'queue', kind: 'sync' }), a({ id: 'call', kind: 'call' })]);
    expect(order.map((x) => x.id)).toEqual(['call', 'queue', 'sprint', 'music']);
  });

  it('lets an activity set its own priority', () => {
    const order = rankActivities([a({ id: 'call', kind: 'call' }), a({ id: 'urgent', kind: 'notice', priority: KIND_PRIORITY.call + 1 })]);
    expect(order[0].id).toBe('urgent');
  });

  it('breaks ties by id, so the order never flickers', () => {
    const order = rankActivities([a({ id: 'b', kind: 'timer' }), a({ id: 'a', kind: 'timer' })]);
    expect(order.map((x) => x.id)).toEqual(['a', 'b']);
  });

  it('does not reorder the list it was given', () => {
    const input = [a({ id: 'm', kind: 'music' }), a({ id: 'c', kind: 'call' })];
    rankActivities(input);
    expect(input.map((x) => x.id)).toEqual(['m', 'c']);
  });
});

describe('the activity store', () => {
  it('holds what is registered, ranked, and lets it go', () => {
    const store = createActivityStore();
    store.set(a({ id: 'music', kind: 'music' }));
    store.set(a({ id: 'call', kind: 'call' }));
    expect(store.getSnapshot().map((x) => x.id)).toEqual(['call', 'music']);
    store.clear('call');
    expect(store.getSnapshot().map((x) => x.id)).toEqual(['music']);
  });

  it('replaces an activity registered again under the same id', () => {
    const store = createActivityStore();
    store.set(a({ id: 'sprint', kind: 'timer', title: 'Sprint 05:00' }));
    store.set(a({ id: 'sprint', kind: 'timer', title: 'Sprint 04:59' }));
    expect(store.getSnapshot()).toHaveLength(1);
    expect(store.getSnapshot()[0].title).toBe('Sprint 04:59');
  });

  it('hands back the same array until something changes, and tells listeners when it does', () => {
    const store = createActivityStore();
    const listener = vi.fn();
    const off = store.subscribe(listener);
    store.set(a({ id: 'x', kind: 'sync' }));
    const first = store.getSnapshot();
    expect(store.getSnapshot()).toBe(first);
    store.clear('nothing-here'); // no change, no noise
    expect(listener).toHaveBeenCalledTimes(1);
    off();
    store.set(a({ id: 'y', kind: 'sync' }));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('keeps progress between 0 and 1 and drops what is not a number', () => {
    const store = createActivityStore();
    store.set(a({ id: 'up', kind: 'upload', progress: 1.7 }));
    store.set(a({ id: 'down', kind: 'upload', progress: -3 }));
    store.set(a({ id: 'nan', kind: 'upload', progress: Number.NaN }));
    const byId = Object.fromEntries(store.getSnapshot().map((x) => [x.id, x.progress]));
    expect(byId).toEqual({ up: 1, down: 0, nan: undefined });
  });
});

describe('activitySignature', () => {
  const base = a({ id: 's', kind: 'sync', title: 't', controls: [{ id: 'go', label: 'Go', run: () => {} }] });

  it('changes when what is shown changes', () => {
    expect(activitySignature({ ...base, title: 'u' })).not.toBe(activitySignature(base));
    expect(activitySignature({ ...base, progress: 0.5 })).not.toBe(activitySignature(base));
    expect(activitySignature({ ...base, controls: [{ id: 'go', label: 'Go now', run: () => {} }] })).not.toBe(activitySignature(base));
  });

  it('does not change for a new function with the same buttons', () => {
    expect(activitySignature({ ...base, controls: [{ id: 'go', label: 'Go', run: () => 1 }] })).toBe(activitySignature(base));
  });
});

describe('useActivity', () => {
  afterEach(() => { cleanup(); for (const x of activityStore.getSnapshot()) activityStore.clear(x.id); });

  it('holds an activity while the component has one, and lets go when it turns null', () => {
    const { rerender } = renderHook(({ activity }: { activity: Activity | null }) => useActivity(activity), { initialProps: { activity: a({ id: 'sprint', kind: 'timer' }) as Activity | null } });
    expect(activityStore.getSnapshot().map((x) => x.id)).toEqual(['sprint']);
    rerender({ activity: null });
    expect(activityStore.getSnapshot()).toEqual([]);
  });

  it('lets go when the component goes away', () => {
    const { unmount } = renderHook(() => useActivity(a({ id: 'sprint', kind: 'timer' })));
    expect(activityStore.getSnapshot()).toHaveLength(1);
    unmount();
    expect(activityStore.getSnapshot()).toEqual([]);
  });

  it('shows the new title as the owner updates it, without clearing in between', () => {
    const seen: string[][] = [];
    const off = activityStore.subscribe(() => seen.push(activityStore.getSnapshot().map((x) => x.title)));
    const { rerender } = renderHook(({ title }: { title: string }) => useActivity(a({ id: 'sprint', kind: 'timer', title })), { initialProps: { title: 'Sprint 05:00' } });
    rerender({ title: 'Sprint 04:59' });
    off();
    expect(seen).toEqual([['Sprint 05:00'], ['Sprint 04:59']]);
  });

  it('calls the latest run from a button, even though the activity was registered with an older one', () => {
    const first = vi.fn();
    const second = vi.fn();
    const make = (run: () => void) => a({ id: 'q', kind: 'sync', controls: [{ id: 'go', label: 'Go', run }] });
    const { rerender } = renderHook(({ run }: { run: () => void }) => useActivity(make(run)), { initialProps: { run: first } });
    rerender({ run: second });
    activityStore.getSnapshot()[0].controls![0].run();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});

describe('useActivities', () => {
  afterEach(() => { cleanup(); for (const x of activityStore.getSnapshot()) activityStore.clear(x.id); });

  it('follows the store', () => {
    const { result } = renderHook(() => useActivities());
    expect(result.current).toEqual([]);
    act(() => activityStore.set(a({ id: 'call', kind: 'call' })));
    expect(result.current.map((x) => x.id)).toEqual(['call']);
    act(() => activityStore.clear('call'));
    expect(result.current).toEqual([]);
  });
});
