import { describe, it, expect } from 'vitest';
import { isComplete, isAnswered, firstUnanswered, answeredCount, buildSkeleton, skeletonFountain, INTERVIEW_QUESTIONS } from './interview';
import { parseScript } from '@/lib/scriptos/parser';

const full = { premise: 'p', protagonistWant: 'w', protagonistNeed: 'n', centralConflict: 'c', theme: 't', ending: 'e', turningPoints: ['a', 'b'] };

describe('story interview', () => {
  it('has 7 questions, each with a reason', () => {
    expect(INTERVIEW_QUESTIONS).toHaveLength(7);
    for (const q of INTERVIEW_QUESTIONS) expect(q.why.length).toBeGreaterThan(20);
  });
  it('isComplete false when empty or blank, true when full', () => {
    expect(isComplete({})).toBe(false);
    expect(isComplete({ ...full, premise: '   ' })).toBe(false);
    expect(isComplete(full)).toBe(true);
  });
  it('resumes at the first unanswered question', () => {
    expect(firstUnanswered({})).toBe(0);
    expect(firstUnanswered({ premise: 'x', protagonistWant: 'y' })).toBe(2);
    expect(firstUnanswered(full)).toBe(7);
    expect(answeredCount({ premise: 'x', turningPoints: ['', ' '] })).toBe(1);
    expect(isAnswered({ turningPoints: ['x'] }, 'turningPoints')).toBe(true);
  });
  it('buildSkeleton uses structure beats, ignoring blank turning points', () => {
    const sk = buildSkeleton({ ...full, turningPoints: ['a', '', 'b'] }, [{ name: 'Inciting', position: 0.12 }, { name: 'Climax', position: 0.9 }]);
    expect(sk).toEqual([{ title: 'a', beat: 'Inciting', position: 0.12 }, { title: 'b', beat: 'Climax', position: 0.9 }]);
  });
  it('buildSkeleton falls back to turning points when no structure', () => {
    expect(buildSkeleton(full, []).map((s) => s.title)).toEqual(['a', 'b']);
  });
});

describe('skeletonFountain', () => {
  const sk = buildSkeleton(full, [{ name: 'Inciting incident', position: 0.12 }, { name: 'Climax', position: 0.9 }]);
  it('writes a real heading, a synopsis and a beat note per scene, and the reader finds two scenes', () => {
    const { text, added } = skeletonFountain(sk, '');
    expect(added).toBe(2);
    const { lines, scenes } = parseScript(text);
    expect(scenes).toHaveLength(2);
    expect(lines.some((l) => l.type === 'synopsis')).toBe(true);
    expect(lines.some((l) => l.type === 'note')).toBe(true);
  });
  it('is idempotent: applying twice adds nothing the second time', () => {
    const once = skeletonFountain(sk, '').text;
    const again = skeletonFountain(sk, once);
    expect(again).toEqual({ text: '', added: 0, skipped: 2 });
  });
  it('only adds the beats the script lacks', () => {
    const once = skeletonFountain([sk[0]], '').text;
    const next = skeletonFountain(sk, once);
    expect(next.added).toBe(1);
    expect(next.text).toContain('Climax');
  });
});
