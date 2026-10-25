import { describe, it, expect, vi } from 'vitest';
import type { QuestionRow } from '@/lib/brief/check';

describe('admin-brief', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('addQuestion returns null on success', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null, data: null }),
      }),
    };
    vi.doMock('./client', () => ({ supabase: mockSupabase }));

    const question: QuestionRow = { key: 'test-key', text: 'Test question' };

    const result = await import('./admin-brief').then(m => m.addQuestion(question, 0));
    expect(result).toBeNull();
  });

  it('addQuestion returns error message on failure', async () => {
    const mockSupabaseError = {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: { message: 'Constraint failed' }, data: null }),
      }),
    };
    vi.doMock('./client', () => ({ supabase: mockSupabaseError }));

    const question: QuestionRow = { key: 'test-key', text: 'Test question' };

    const result = await import('./admin-brief').then(m => m.addQuestion(question, 0));
    expect(result).toBe('Constraint failed');
  });

  it('countAnswers returns count when query succeeds', async () => {
    const mockSupabaseCountSuccess = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ count: 5, error: null }),
      }),
    };
    vi.doMock('./client', () => ({ supabase: mockSupabaseCountSuccess }));

    const result = await import('./admin-brief').then(m => m.countAnswers('test-key'));
    expect(result).toBe(5);
  });

  it('countAnswers returns 0 when query has no results', async () => {
    const mockSupabaseCountZero = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ count: 0, error: null }),
      }),
    };
    vi.doMock('./client', () => ({ supabase: mockSupabaseCountZero }));

    const result = await import('./admin-brief').then(m => m.countAnswers('test-key'));
    expect(result).toBe(0);
  });

  it('countAnswers returns null on database error', async () => {
    const mockSupabaseCountError = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ error: new Error('DB error') }),
      }),
    };
    vi.doMock('./client', () => ({ supabase: mockSupabaseCountError }));

    const result = await import('./admin-brief').then(m => m.countAnswers('test-key'));
    expect(result).toBeNull();
  });

  it('removeQuestion returns null on success', async () => {
    const mockSupabaseRemoveSuccess = {
      from: vi.fn().mockReturnValue({
        delete: vi.fn().mockResolvedValue({ error: null, data: null }),
      }),
    };
    vi.doMock('./client', () => ({ supabase: mockSupabaseRemoveSuccess }));

    const result = await import('./admin-brief').then(m => m.removeQuestion('test-key'));
    expect(result).toBeNull();
  });

  it('removeQuestion returns error message on failure', async () => {
    const mockSupabaseRemoveError = {
      from: vi.fn().mockReturnValue({
        delete: vi.fn().mockResolvedValue({ error: { message: 'Cannot delete referenced question' }, data: null }),
      }),
    };
    vi.doMock('./client', () => ({ supabase: mockSupabaseRemoveError }));

    const result = await import('./admin-brief').then(m => m.removeQuestion('test-key'));
    expect(result).toBe('Cannot delete referenced question');
  });
});
