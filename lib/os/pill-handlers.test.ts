import { describe, it, expect, vi } from 'vitest';
import { withLiveHandlers, type PillDescriptor } from './PillContext';

describe('withLiveHandlers', () => {
  it('a published action calls the newest render\'s handler, not the one it was published with', () => {
    const first = vi.fn();
    const second = vi.fn();
    const published: PillDescriptor = { module: 'x', actions: [{ id: 'a', label: 'Go', onClick: first }] };
    let current: PillDescriptor | null = published;
    const wrapped = withLiveHandlers(published, () => current)!;
    current = { module: 'x', actions: [{ id: 'a', label: 'Go', onClick: second }] };
    wrapped.actions![0].onClick();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
  it('toggles are live too, and an action that has gone falls back to the published handler', () => {
    const toggle = vi.fn();
    const gone = vi.fn();
    const published: PillDescriptor = { module: 'x', toggles: [{ id: 't', label: 'T', active: false, onToggle: toggle }], actions: [{ id: 'g', label: 'G', onClick: gone }] };
    const wrapped = withLiveHandlers(published, () => ({ module: 'x', toggles: [{ id: 't', label: 'T', active: false, onToggle: toggle }] }))!;
    wrapped.toggles![0].onToggle();
    wrapped.actions![0].onClick();
    expect(toggle).toHaveBeenCalledTimes(1);
    expect(gone).toHaveBeenCalledTimes(1);
  });
  it('null stays null', () => { expect(withLiveHandlers(null, () => null)).toBeNull(); });
});
