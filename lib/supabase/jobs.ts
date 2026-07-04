import { supabase } from './client';

export interface DBJob {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  role: string;
  rate?: number;
  status: 'open' | 'in-progress' | 'closed';
  created_by: string;
  created_at: string;
  updated_at: string;
  budget_item_id?: string | null;
}

// Job as actually rendered in the UI: the raw row plus whichever relations
// the query joined in. app/jobs/page.tsx and app/jobs/[id]/page.tsx each
// hand-rolled a slightly different local `Job` interface before this
// consolidation — neither imported DBJob at all.
export interface JobWithRelations extends DBJob {
  profiles?: { username: string; role?: string; avatar_url?: string };
  projects?: { title: string };
  application_count?: number;
}

export async function createJob(projectId: string, userId: string, title: string, role: string, description = '', rate?: number, budgetItemId?: string) {
  const { data, error } = await supabase
    .from('jobs')
    .insert({
      project_id: projectId,
      title,
      description,
      role,
      rate,
      created_by: userId,
      status: 'open',
      budget_item_id: budgetItemId ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Which of this project's budget line items already have a job posted from
// them — lets the Budget panel show "Posted" instead of letting someone
// double-post the same line item by accident.
export async function getBudgetItemIdsWithJobs(projectId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('jobs')
    .select('budget_item_id')
    .eq('project_id', projectId)
    .not('budget_item_id', 'is', null);
  if (error) throw error;
  return new Set((data || []).map(j => j.budget_item_id as string));
}

export async function getOpenJobs(limit = 50) {
  const { data, error } = await supabase
    .from('jobs')
    .select('*, projects(title)')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function searchJobs(query: string, role?: string) {
  let qb = supabase
    .from('jobs')
    .select('*, projects(title)')
    .eq('status', 'open');

  if (query) {
    qb = qb.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
  }

  if (role) {
    qb = qb.eq('role', role);
  }

  const { data, error } = await qb;

  if (error) throw error;
  return data;
}

export async function applyForJob(jobId: string, userId: string) {
  const { data, error } = await supabase
    .from('job_applications')
    .insert({
      job_id: jobId,
      applicant_id: userId
    })
    .select();

  if (error) throw error;
  return data;
}

export async function getJobApplications(jobId: string) {
  const { data, error } = await supabase
    .from('job_applications')
    .select('*, profiles(*)')
    .eq('job_id', jobId);

  if (error) throw error;
  return data;
}

export async function respondToApplication(applicationId: string, status: 'accepted' | 'rejected') {
  const { data, error } = await supabase
    .from('job_applications')
    .update({ status })
    .eq('id', applicationId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
