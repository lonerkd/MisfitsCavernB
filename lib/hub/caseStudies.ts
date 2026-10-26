// Case studies: hub posts about a production, shown only with its owner's
// consent (projects.case_study_ok; supabase/migrations/20261028000000_hub_case_studies.sql).

import { supabase } from '@/lib/supabase/client';

export interface ConsentingProject { id: string; title: string }
export interface CaseStudyProject { title: string; description: string | null }

/** Admin: the productions whose owners agreed to a case study. */
export async function listConsentingProjects(): Promise<ConsentingProject[]> {
  const { data, error } = await supabase.rpc('admin_case_study_projects');
  if (error) throw new Error(error.message);
  return (data ?? []) as ConsentingProject[];
}

/** The production a published case study is about (title and logline), if any. */
export async function getCaseStudyProject(postId: string): Promise<CaseStudyProject | null> {
  const { data, error } = await supabase.rpc('hub_case_study_project', { p_post: postId });
  if (error) throw new Error(error.message);
  return ((data ?? []) as CaseStudyProject[])[0] ?? null;
}

/** Whether this project's owner has agreed to a case study. */
export async function getConsent(projectId: string): Promise<boolean> {
  const { data, error } = await supabase.from('projects').select('case_study_ok').eq('id', projectId).maybeSingle();
  if (error) throw new Error(error.message);
  return data?.case_study_ok === true;
}

/** Owner: agree to, or withdraw from, a case study. Returns an error message, or null. */
export async function setConsent(projectId: string, ok: boolean): Promise<string | null> {
  const { error } = await supabase.from('projects').update({ case_study_ok: ok }).eq('id', projectId);
  return error ? error.message : null;
}
