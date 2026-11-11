// Story interview: a guided, resumable path from idea to skeleton.
// Answers produce an ordered beat list and a scene skeleton (real rows,
// editable afterwards). Pure data + builder; persistence/RLS live in the
// caller.

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

export const INTERVIEW_QUESTIONS = [
  { id: 'premise', question: 'What is the premise in one sentence?' },
  { id: 'protagonistWant', question: "What does the protagonist want (external goal)?" },
  { id: 'protagonistNeed', question: "What do they need (internal change)?" },
  { id: 'centralConflict', question: 'What is the central conflict / antagonist?' },
  { id: 'theme', question: 'What is the theme (one phrase)?' },
  { id: 'ending', question: 'How does it end (triumph, tragedy, bittersweet)?' },
  { id: 'turningPoints', question: 'List the key turning points, in order.' },
] as const;

export function isComplete(a: Partial<InterviewAnswers>): a is InterviewAnswers {
  return Boolean(a.premise && a.protagonistWant && a.protagonistNeed && a.centralConflict && a.theme && a.ending && a.turningPoints && a.turningPoints.length > 0);
}

export function buildSkeleton(a: InterviewAnswers, structureBeats: { name: string; position: number }[]): SkeletonScene[] {
  const beats = structureBeats.length ? structureBeats : a.turningPoints.map((t, i) => ({ name: t, position: (i + 1) / (a.turningPoints.length + 1) }));
  // Map turning points onto beats in order; fall back to beat names.
  return beats.map((b, i) => {
    const tp = a.turningPoints[i] ?? b.name;
    return { title: tp || b.name, beat: b.name, position: b.position };
  });
}
