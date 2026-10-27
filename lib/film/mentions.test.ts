import { describe, it, expect } from 'vitest';
import { activeQuery, diffMentions, insertMention, mentionedIds, plain, segments, token, tokenize } from './mentions';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';

describe('mentionedIds', () => {
  it('lists each mentioned entity once, in order', () => {
    expect(mentionedIds(`Check @[Kitchen](${A}) and @[Roof](${B}) then @[Kitchen again](${A})`)).toEqual([A, B]);
  });
  it('ignores things that only look like a token', () => {
    expect(mentionedIds('@[Kitchen](not-a-uuid) and @Kitchen and [x](' + A + ')')).toEqual([]);
  });
});

describe('segments and plain', () => {
  const text = `Book the van for @[Roof](${B}) soon`;
  it('splits plain runs from mentions', () => {
    expect(segments(text)).toEqual([
      { type: 'text', text: 'Book the van for ' },
      { type: 'mention', id: B, label: 'Roof' },
      { type: 'text', text: ' soon' },
    ]);
  });
  it('reads with the current label, falling back to the stored one', () => {
    expect(plain(text)).toBe('Book the van for @Roof soon');
    expect(plain(text, (id) => (id === B ? 'Rooftop' : undefined))).toBe('Book the van for @Rooftop soon');
  });
  it('plain text without tokens is one run; empty text is nothing', () => {
    expect(segments('just text')).toEqual([{ type: 'text', text: 'just text' }]);
    expect(segments('')).toEqual([]);
  });
});

describe('token', () => {
  it('is parsed back to the same id, and brackets in a label cannot break it', () => {
    const t = token(A, 'Scene [12]\nroof');
    expect(t).toBe(`@[Scene (12) roof](${A})`);
    expect(mentionedIds(t)).toEqual([A]);
  });
});

describe('activeQuery', () => {
  it('finds the @ being typed at the start or after a space', () => {
    expect(activeQuery('@kit', 4)).toEqual({ start: 0, query: 'kit' });
    expect(activeQuery('see @ro', 7)).toEqual({ start: 4, query: 'ro' });
    expect(activeQuery('see @', 5)).toEqual({ start: 4, query: '' });
  });
  it('is not an email, not a finished token, not after a line break, not too long', () => {
    expect(activeQuery('mail me@x', 9)).toBeNull();
    expect(activeQuery(`@[Roof](${B}) and`, 40)).toBeNull();
    expect(activeQuery('@a\nb', 4)).toBeNull();
    expect(activeQuery('@' + 'x'.repeat(41), 42)).toBeNull();
    expect(activeQuery('no at sign', 5)).toBeNull();
  });
});

describe('insertMention', () => {
  it('replaces the typed @query with the token and a space, moving the caret after it', () => {
    const r = insertMention('Prep @kit now', 9, A, 'Kitchen')!;
    expect(r.text).toBe(`Prep ${token(A, 'Kitchen')}  now`);
    expect(r.caret).toBe(`Prep ${token(A, 'Kitchen')} `.length);
  });
  it('does nothing when no mention is being typed', () => {
    expect(insertMention('plain', 5, A, 'Kitchen')).toBeNull();
  });
});

describe('diffMentions', () => {
  it('adds what is new and removes what is gone, ignoring case', () => {
    expect(diffMentions([A], [A, B])).toEqual({ add: [B], remove: [] });
    expect(diffMentions([A, B], [B])).toEqual({ add: [], remove: [A] });
    expect(diffMentions([A.toUpperCase()], [A])).toEqual({ add: [], remove: [] });
    expect(diffMentions([], [])).toEqual({ add: [], remove: [] });
  });
});

describe('tokenize', () => {
  it('turns picked @Labels back into tokens', () => {
    expect(tokenize('Book @Kitchen and @Roof', [{ id: A, label: 'Kitchen' }, { id: B, label: 'Roof' }]))
      .toBe(`Book ${token(A, 'Kitchen')} and ${token(B, 'Roof')}`);
  });
  it('matches the longer label first', () => {
    expect(tokenize('@Kitchen sink and @Kitchen', [{ id: A, label: 'Kitchen' }, { id: B, label: 'Kitchen sink' }]))
      .toBe(`${token(B, 'Kitchen sink')} and ${token(A, 'Kitchen')}`);
  });
  it('leaves text alone when the pick was edited away or nothing was picked', () => {
    expect(tokenize('Book the kitchen', [{ id: A, label: 'Kitchen' }])).toBe('Book the kitchen');
    expect(tokenize('plain', [])).toBe('plain');
  });
  it('round-trips through mentionedIds', () => {
    expect(mentionedIds(tokenize('See @Kitchen twice: @Kitchen', [{ id: A, label: 'Kitchen' }]))).toEqual([A]);
  });
});
