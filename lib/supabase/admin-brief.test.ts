import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { QuestionRow } from '@/lib/brief/check';

describe('admin-brief', () => {
  let addQuestion: typeof import('./admin-brief').addQuestion;
  let countAnswers: typeof import('./admin-brief').countAnswers;
  let removeQuestion: typeof import('./admin-brief').removeQuestion;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('addQuestion returns null on success', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    const originalSupabase = await import('./client');
    (originalSupabase.supabase as any).from = vi.fn().mockImplementation((table) => {
      if (table === 'brief_questions') {
        return { insert: mockInsert };
      }
      return { select: vi.fn().mockResolvedValue({ count: 0, error: null }) };
    });

    addQuestion = await import('./admin-brief').then(m => m.addQuestion);
    const q: QuestionRow = { key: 'test', label: 'Test question', phase: 'development', hint: '', kind: 'one', options: [], unit: null, min_value: null, max_value: null };
    const result = await addQuestion(q, 0);
    expect(result).toBeNull();
  });

  it('countAnswers returns a number', async () => {
    const mockSelect = vi.fn().mockImplementation(() => ({
      eq: vi.fn().mockResolvedValue({ count: 5, error: null }),
    }));
    const originalSupabase = await import('./client');
    (originalSupabase.supabase as any).from = vi.fn().mockImplementation((table) => {
      if (table === 'project_brief') {
        return { select: mockSelect };
      }
      return { delete: vi.fn().mockResolvedValue({ error: null }) };
    });

    countAnswers = await import('./admin-brief').then(m => m.countAnswers);
    const result = await countAnswers('test');
    expect(typeof result).toBe('number');
  });

  it('removeQuestion calls the audited function', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const originalSupabase = await import('./client');
    (originalSupabase.supabase as any).rpc = rpc;
    removeQuestion = await import('./admin-brief').then(m => m.removeQuestion);
    expect(await removeQuestion('test')).toBeNull();
    expect(rpc).toHaveBeenCalledWith('admin_remove_brief_question', { p_key: 'test' });
    rpc.mockResolvedValue({ error: { message: 'Only an admin can do this' } });
    expect(await removeQuestion('test')).toBe('Only an admin can do this');
  });

  it('moveQuestion sends the direction and reports a refusal', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const originalSupabase = await import('./client');
    (originalSupabase.supabase as any).rpc = rpc;
    const { moveQuestion } = await import('./admin-brief');
    expect(await moveQuestion('goal', -1)).toBeNull();
    expect(rpc).toHaveBeenCalledWith('admin_move_brief_question', { p_key: 'goal', p_direction: -1 });
    rpc.mockResolvedValue({ error: { message: 'nope' } });
    expect(await moveQuestion('goal', 1)).toBe('nope');
  });

  it('updateQuestion reports an error and a write that touched nothing', async () => {
    const originalSupabase = await import('./client');
    const chain = (result: unknown) => ({ update: () => ({ eq: () => ({ select: () => Promise.resolve(result) }) }) });
    const { updateQuestion } = await import('./admin-brief');
    (originalSupabase.supabase as any).from = () => chain({ data: [{ key: 'goal' }], error: null });
    expect(await updateQuestion('goal', { label: 'x' })).toBeNull();
    (originalSupabase.supabase as any).from = () => chain({ data: [], error: null });
    expect(await updateQuestion('goal', { label: 'x' })).toMatch(/Nothing was saved/);
    (originalSupabase.supabase as any).from = () => chain({ data: null, error: { message: 'boom' } });
    expect(await updateQuestion('goal', { label: 'x' })).toBe('boom');
  });
});
