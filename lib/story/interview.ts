// Story interview: a guided, resumable path from idea to skeleton.
// Answers produce an ordered beat list and a scene skeleton (real rows,
// editable afterwards). Pure data + builders; persistence/RLS live in
// lib/supabase/story.ts and the story_interviews table.

export type InterviewAnswers = {
  premise: string;
  protagonistWant: string;
  protagonistNeed: string;
  centralConflict: string;
  theme: string;
  ending: string;
  turningPoints: string[]; // key beats in order
};

export type SkeletonScene = { title: string; beat: string; position: number };

export type InterviewQuestion = {
  id: keyof InterviewAnswers;
  question: string;
  /** Why this is asked: the interview teaches the craft as it goes. */
  why: string;
  placeholder: string;
};

export const INTERVIEW_QUESTIONS: readonly InterviewQuestion[] = [
  { id: 'premise', question: 'What is the premise in one sentence?', why: 'If you can say the story in one line, every scene can be tested against it. Who, what happens to them, and what is at stake.', placeholder: 'A lighthouse keeper loses the sea he has watched for thirty years.' },
  { id: 'protagonistWant', question: 'What does the protagonist want (the outer goal)?', why: 'A want is what the audience can watch them chase. It gives the story its line: scenes either bring them closer or push them away.', placeholder: 'To keep the lighthouse running after the town votes to switch it off.' },
  { id: 'protagonistNeed', question: 'What do they need (the inner change)?', why: 'The need is what they must learn to be whole, usually the opposite of what they believe. The gap between want and need is where character lives.', placeholder: 'To let go of the past and let someone in.' },
  { id: 'centralConflict', question: 'What stands in the way: the central conflict or antagonist?', why: 'Without a force pushing back there is no story, only events. Name the person, system or flaw that makes the want hard.', placeholder: 'The harbour board, and his own refusal to ask for help.' },
  { id: 'theme', question: 'What is the theme, in one phrase?', why: 'Theme is what the story argues. It is not a scene, but it tells you what each scene is for.', placeholder: 'Duty can become a way of hiding.' },
  { id: 'ending', question: 'How does it end: triumph, tragedy or bittersweet?', why: 'Knowing the ending first lets you plant it. You can write toward a place you have already seen.', placeholder: 'Bittersweet: the light goes out, and he is not alone in the dark.' },
  { id: 'turningPoints', question: 'List the key turning points, in order, one per line.', why: 'Turning points are where the story changes direction. Each one becomes a scene in the skeleton, matched to a beat of the structure you chose.', placeholder: 'The vote\nThe storm\nThe boat he cannot reach\nThe light goes out' },
] as const;

/** Whether every question has an answer. */
export function isComplete(a: Partial<InterviewAnswers>): a is InterviewAnswers {
  return Boolean(a.premise?.trim() && a.protagonistWant?.trim() && a.protagonistNeed?.trim() && a.centralConflict?.trim() && a.theme?.trim() && a.ending?.trim() && a.turningPoints && a.turningPoints.some((t) => t.trim()));
}

/** Whether a question has an answer. */
export function isAnswered(a: Partial<InterviewAnswers>, id: InterviewQuestion['id']): boolean {
  if (id === 'turningPoints') return (a.turningPoints ?? []).some((t) => t.trim());
  return Boolean(((a[id] as string | undefined) ?? '').trim());
}

/** The first unanswered question (where a resumed interview picks up), or the count when all are answered. */
export function firstUnanswered(a: Partial<InterviewAnswers>): number {
  const i = INTERVIEW_QUESTIONS.findIndex((q) => !isAnswered(a, q.id));
  return i === -1 ? INTERVIEW_QUESTIONS.length : i;
}

export function answeredCount(a: Partial<InterviewAnswers>): number {
  return INTERVIEW_QUESTIONS.filter((q) => isAnswered(a, q.id)).length;
}

export function buildSkeleton(a: InterviewAnswers, structureBeats: { name: string; position: number }[]): SkeletonScene[] {
  const points = a.turningPoints.map((t) => t.trim()).filter(Boolean);
  const beats = structureBeats.length ? structureBeats : points.map((t, i) => ({ name: t, position: (i + 1) / (points.length + 1) }));
  // Map turning points onto beats in order; fall back to beat names.
  return beats.map((b, i) => {
    const tp = points[i] ?? b.name;
    return { title: tp || b.name, beat: b.name, position: b.position };
  });
}

const beatMarker = (beat: string) => `[[Beat: ${beat}`;
const oneLine = (s: string) => s.replace(/[\r\n]+/g, ' ').replace(/\]+/g, ' ').trim();

/**
 * The Fountain a skeleton adds to a script. Each scene is a real heading (its place is
 * "TBD" until the writer chooses one), a synopsis line and a note naming the beat. Beats
 * already in the script are skipped, so applying twice never doubles it.
 */
export function skeletonFountain(skeleton: SkeletonScene[], existing: string): { text: string; added: number; skipped: number } {
  const fresh = skeleton.filter((s) => !existing.includes(beatMarker(oneLine(s.beat))));
  const text = fresh
    .map((s) => `INT. TBD - DAY\n\n= ${oneLine(s.title)}\n\n${beatMarker(oneLine(s.beat))}. Change this heading to the real place.]]`)
    .join('\n\n');
  return { text, added: fresh.length, skipped: skeleton.length - fresh.length };
}
