'use client';

// Starting a project: create it, keep whatever the brief already knows, and
// open the tool for its first step — the phase engine decides which, so a
// project with a logline opens the script and one without opens its page at
// the logline.

import { createProject } from '@/lib/supabase/projects';
import { fetchProjectSignals } from '@/lib/supabase/progress';
import { computeProgress, placeHref } from '@/lib/os/progress';
import { saveAnswer, type Answers } from '@/lib/brief';
import { logActivity } from '@/lib/supabase/activity';

export async function firstStepHref(projectId: string): Promise<string> {
  try {
    const s = await fetchProjectSignals(projectId);
    const step = s ? computeProgress(s).nextSteps[0] : null;
    return step ? placeHref(step.place, projectId) : `/projects/${projectId}`;
  } catch {
    return `/projects/${projectId}`;
  }
}

export async function startProject(userId: string, o: { title: string; format: string; logline: string; answers?: Answers }) {
  const project = await createProject(userId, o.title, o.logline, o.format);
  // The brief is a head start, never a blocker: an answer that fails to save
  // can be given again on the project page.
  const answers = Object.entries(o.answers ?? {});
  const saved = await Promise.allSettled(answers.map(([q, v]) => saveAnswer(project.id, q, v)));
  void logActivity(`started project "${o.title}"`, 'project', project.id);
  return {
    project,
    unsaved: saved.filter((r) => r.status === 'rejected').length,
    href: await firstStepHref(project.id),
  };
}
