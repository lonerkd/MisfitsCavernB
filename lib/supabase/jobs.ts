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
  /** A casting call: the character in the project this posting casts. */
  character_name?: string | null;
}

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
    .select('*, profiles(id, username, avatar_url, bio, role, location, status)')
    .eq('job_id', jobId);

  if (error) throw error;
  return data;
}

export interface ApplicationResponse { status: 'accepted' | 'rejected'; joined_crew: boolean; cast_as: string | null; closed: boolean }

/**
 * The poster accepts or turns down an application, in one step: an accepted
 * applicant joins the project's crew (and is cast, for a casting call), the
 * posting can close, and the applicant is told.
 */
export async function respondToApplication(applicationId: string, status: 'accepted' | 'rejected', closePosting = false): Promise<ApplicationResponse> {
  const { data, error } = await supabase.rpc('respond_to_application', { p_application: applicationId, p_status: status, p_close: closePosting });
  if (error) throw new Error(error.message || 'Could not update the application');
  return data as unknown as ApplicationResponse;
}
