import { describe, expect, it } from 'vitest';
import type { BriefQuestion } from '@/lib/brief';
import { splitAnswers } from './answers';

const q = (key: string, label: string) => ({ key, label }) as BriefQuestion;

describe('splitAnswers', () => {
  const catalogue = [q('a', 'Budget'), q('b', 'Runtime'), q('c', 'Cast size')];

  it('keeps answers to asked questions and reports the rest by label', () => {
    const { kept, dropped } = splitAnswers({ a: 'low', b: 90 }, [catalogue[0]], catalogue);
    expect(kept).toEqual({ a: 'low' });
    expect(dropped).toEqual([{ key: 'b', label: 'Runtime' }]);
  });

  it('falls back to the key for a question the catalogue does not know', () => {
    expect(splitAnswers({ zz: 1 }, [], catalogue).dropped).toEqual([{ key: 'zz', label: 'zz' }]);
  });

  it('drops nothing when every answer is still asked', () => {
    expect(splitAnswers({ a: 'x' }, [catalogue[0]], catalogue).dropped).toEqual([]);
  });
});
