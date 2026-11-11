import { describe, it, expect } from 'vitest';
import { isComplete, buildSkeleton, INTERVIEW_QUESTIONS } from './interview';

describe('story interview', () => {
  it('has 7 questions', () => expect(INTERVIEW_QUESTIONS).toHaveLength(7));
  it('isComplete false when empty', () => expect(isComplete({} as any)).toBe(false));
  const full = { premise: 'p', protagonistWant: 'w', protagonistNeed: 'n', centralConflict: 'c', theme: 't', ending: 'e', turningPoints: ['a', 'b'] };
  it('isComplete true when full', () => expect(isComplete(full)).toBe(true));
  it('buildSkeleton uses structure beats', () => {
    const sk = buildSkeleton(full, [{ name: 'Inciting', position: 0.12 }, { name: 'Climax', position: 0.9 }]);
    expect(sk).toHaveLength(2);
    expect(sk[0].beat).toBe('Inciting');
    expect(sk[0].title).toBe('a');
  });
  it('buildSkeleton falls back to turning points when no structure', () => {
    const sk = buildSkeleton(full, []);
    expect(sk).toHaveLength(2);
    expect(sk[0].title).toBe('a');
  });
});
