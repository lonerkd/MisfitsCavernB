import { describe, expect, it } from 'vitest';
import { addQuestion, countAnswers, removeQuestion } from './admin-brief';

describe('admin-brief', () => {
  it('addQuestion returns null on success', async () => {
    const result = await addQuestion({ key: 'test_key', phase: 'development', label: 'Test Question', hint: '', kind: 'one', options: [{ id: 'opt1', label: 'Option 1' }, { id: 'opt2', label: 'Option 2' }], unit: null, min_value: null, max_value: null }, 0);
    expect(result).toBeNull();
  });

  it('countAnswers returns a number', async () => {
    const result = await countAnswers('test_key');
    expect(typeof result).toBe('number');
  });

  it('removeQuestion returns null on success', async () => {
    const result = await removeQuestion('test_key');
    expect(result).toBeNull();
  });
});
