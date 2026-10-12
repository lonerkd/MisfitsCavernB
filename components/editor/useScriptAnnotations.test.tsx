// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';

const toast = vi.fn();
const confirm = vi.fn();
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/components/ui/Confirm', () => ({ useConfirm: () => confirm }));
const api = vi.hoisted(() => ({ listAnnotations: vi.fn(), addAnnotation: vi.fn(), deleteAnnotation: vi.fn() }));
vi.mock('@/lib/supabase/annotations', async (orig) => ({ ...(await orig<typeof import('@/lib/supabase/annotations')>()), ...api }));

import { useScriptAnnotations } from './useScriptAnnotations';

const note = (id: string, extra: Record<string, unknown> = {}) => ({ id, type: 'shot', text: 'x', line_index: 1, routed_table: null, ...extra });
const sceneAtLine = () => ({ ordinal: 0, heading: 'INT. ROOM - DAY' });

beforeEach(() => { vi.clearAllMocks(); api.listAnnotations.mockResolvedValue([note('n1')]); });
afterEach(cleanup);

describe('useScriptAnnotations', () => {
  it('loads a script’s notes, and none without a script', async () => {
    const { result, rerender } = renderHook(({ id }) => useScriptAnnotations(id, sceneAtLine), { initialProps: { id: 's1' as string | undefined } });
    await waitFor(() => expect(result.current.annotations).toHaveLength(1));
    expect(api.listAnnotations).toHaveBeenCalledWith('s1');
    rerender({ id: undefined });
    await waitFor(() => expect(result.current.annotations).toEqual([]));
  });

  it('a failed load shows no notes rather than failing', async () => {
    api.listAnnotations.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useScriptAnnotations('s1', sceneAtLine));
    await waitFor(() => expect(api.listAnnotations).toHaveBeenCalled());
    expect(result.current.annotations).toEqual([]);
  });

  it('adds a note at a line with its scene, reloads, closes the draft and says where it went', async () => {
    api.addAnnotation.mockResolvedValue({ type: 'shot', routed_table: 'shots' });
    const { result } = renderHook(() => useScriptAnnotations('s1', sceneAtLine));
    await waitFor(() => expect(result.current.annotations).toHaveLength(1));
    act(() => result.current.setAnnotationDraft({ line: 4, type: 'shot', text: '  Close on hands  ' }));
    await act(async () => { await result.current.submitAnnotation(); });
    expect(api.addAnnotation).toHaveBeenCalledWith({ scriptId: 's1', lineIndex: 4, type: 'shot', text: 'Close on hands', scene: { ordinal: 0, heading: 'INT. ROOM - DAY' } });
    expect(api.listAnnotations).toHaveBeenCalledTimes(2);
    expect(result.current.annotationDraft).toBeNull();
    expect(toast).toHaveBeenCalledWith(expect.stringMatching(/^Shot added to /), 'success');
  });

  it('ignores an empty note, and shows the reason when adding fails (database errors are plain objects)', async () => {
    const { result } = renderHook(() => useScriptAnnotations('s1', sceneAtLine));
    act(() => result.current.setAnnotationDraft({ line: 1, type: 'shot', text: '   ' }));
    await act(async () => { await result.current.submitAnnotation(); });
    expect(api.addAnnotation).not.toHaveBeenCalled();
    api.addAnnotation.mockRejectedValue({ message: 'permission denied' });
    act(() => result.current.setAnnotationDraft({ line: 1, type: 'shot', text: 'real' }));
    await act(async () => { await result.current.submitAnnotation(); });
    expect(toast).toHaveBeenCalledWith('permission denied', 'error');
    expect(result.current.annotationDraft).not.toBeNull();
  });

  it('removes a note after a confirm, at once, and keeps it when declined', async () => {
    const { result } = renderHook(() => useScriptAnnotations('s1', sceneAtLine));
    await waitFor(() => expect(result.current.annotations).toHaveLength(1));
    confirm.mockResolvedValueOnce(false);
    await act(async () => { await result.current.removeAnnotation('n1'); });
    expect(api.deleteAnnotation).not.toHaveBeenCalled();
    expect(result.current.annotations).toHaveLength(1);
    confirm.mockResolvedValueOnce(true);
    api.deleteAnnotation.mockResolvedValue(undefined);
    await act(async () => { await result.current.removeAnnotation('n1'); });
    expect(api.deleteAnnotation).toHaveBeenCalledWith('n1');
    expect(result.current.annotations).toEqual([]);
  });

  it('says what a removed routed note leaves behind, and brings the note back if removal fails', async () => {
    api.listAnnotations.mockResolvedValue([note('n1', { type: 'shot', routed_table: 'shots' })]);
    const { result } = renderHook(() => useScriptAnnotations('s1', sceneAtLine));
    await waitFor(() => expect(result.current.annotations).toHaveLength(1));
    confirm.mockResolvedValueOnce(true);
    api.deleteAnnotation.mockRejectedValue({ message: 'nope' });
    await act(async () => { await result.current.removeAnnotation('n1'); });
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('it created stays'));
    expect(toast).toHaveBeenCalledWith('nope', 'error');
    await waitFor(() => expect(result.current.annotations).toHaveLength(1));
  });
});
