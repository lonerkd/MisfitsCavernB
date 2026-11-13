// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { CavernProvider, useCavern } from './CavernContext';

afterEach(cleanup);
const wrap = ({ children }: { children: ReactNode }) => <CavernProvider>{children}</CavernProvider>;

describe('the cavern’s place', () => {
  it('starts closed, opens full screen, shrinks to the corner and closes', () => {
    const { result } = renderHook(() => useCavern(), { wrapper: wrap });
    expect(result.current.mode).toBe('closed');
    act(() => result.current.open());
    expect(result.current.mode).toBe('full');
    act(() => result.current.minimise());
    expect(result.current.mode).toBe('mini');
    act(() => result.current.open());
    expect(result.current.mode).toBe('full');
    act(() => result.current.close());
    expect(result.current.mode).toBe('closed');
  });

  it('outside the provider (a split-screen pane) it is closed and asking does nothing', () => {
    const { result } = renderHook(() => useCavern());
    act(() => result.current.open());
    expect(result.current.mode).toBe('closed');
  });
});
