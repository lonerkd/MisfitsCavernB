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

  it('removeQuestion returns null on success', async () => {
    const mockDelete = vi.fn().mockImplementation(() => ({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }));
    const originalSupabase = await import('./client');
    (originalSupabase.supabase as any).from = vi.fn().mockImplementation((table) => {
      if (table === 'brief_questions') {
        return { delete: mockDelete };
      }
      return { select: vi.fn().mockResolvedValue({ count: 0, error: null }) };
    });

    removeQuestion = await import('./admin-brief').then(m => m.removeQuestion);
    const result = await removeQuestion('test');
    expect(result).toBeNull();
  });
});
