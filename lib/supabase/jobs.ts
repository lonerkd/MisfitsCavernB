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

export interface NewPosting {
  title: string;
  role: string;
  description: string;
  rate: number | null;
  projectId: string | null;
  /** A casting call: accepting an applicant casts them in this role of the project. */
  character: string | null;
  userId: string;
}

/** Posts a job from the Jobs board; returns the new posting's id. */
export async function postJob(p: NewPosting): Promise<string> {
  const { data, error } = await supabase.from('jobs').insert({
    title: p.title,
    description: p.description,
    role: p.role,
    rate: p.rate,
    project_id: p.projectId,
    character_name: p.character,
    created_by: p.userId,
    status: 'open',
  }).select('id').single();
  if (error) throw error;
  return data.id;
}

const BOARD_COLUMNS = '*, projects(title), profiles!jobs_created_by_fkey(username)';

/** Every open posting, newest first. */
export async function listOpenJobs(): Promise<JobWithRelations[]> {
  const { data, error } = await supabase
    .from('jobs')
    .select(BOARD_COLUMNS)
    .eq('status', 'open')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as unknown as JobWithRelations[]) ?? [];
}

/** The postings someone made, newest first, each with how many people applied. */
export async function listJobsPostedBy(userId: string): Promise<JobWithRelations[]> {
  const { data, error } = await supabase
    .from('jobs')
    .select(`${BOARD_COLUMNS}, job_applications(count)`)
    .eq('created_by', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as (JobWithRelations & { job_applications?: { count: number }[] })[])
    .map(({ job_applications, ...job }) => ({ ...job, application_count: job_applications?.[0]?.count ?? 0 }));
}

export interface MyApplication {
  status: string;
  applied_at: string | null;
  jobs: { id: string; title: string; role: string; status: string | null; projects: { title: string } | null } | null;
}

/** Someone's own applications, newest first, with the posting each is for. */
export async function listMyApplications(userId: string): Promise<MyApplication[]> {
  const { data, error } = await supabase
    .from('job_applications')
    .select('status, applied_at, jobs(id, title, role, status, projects(title))')
    .eq('applicant_id', userId)
    .order('applied_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as MyApplication[];
}

/** One posting, with who posted it and its project; null when it doesn't exist or can't be seen. */
export async function getJob(jobId: string): Promise<JobWithRelations | null> {
  const { data, error } = await supabase
    .from('jobs')
    .select('*, profiles!jobs_created_by_fkey(username, role), projects(title)')
    .eq('id', jobId)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as JobWithRelations | null;
}

/** Whether this person has already applied to the posting. */
export async function hasApplied(jobId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('job_applications')
    .select('id')
    .eq('job_id', jobId)
    .eq('applicant_id', userId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

export interface JobApplication {
  id: string;
  job_id: string;
  applicant_id: string;
  cover_note?: string;
  status: 'pending' | 'accepted' | 'rejected';
  applied_at: string;
  profiles?: { username: string; role: string; avatar_url?: string };
}

/** A posting's applications, newest first (the poster sees them; RLS hides them from anyone else). */
export async function listApplications(jobId: string): Promise<JobApplication[]> {
  const { data, error } = await supabase
    .from('job_applications')
    .select('*, profiles(username, role, avatar_url)')
    .eq('job_id', jobId)
    .order('applied_at', { ascending: false });
  if (error) throw error;
  return (data as unknown as JobApplication[]) ?? [];
}

/**
 * Applies to a posting with an optional note. 'duplicate' when this person
 * already applied (the unique key on job + applicant); throws on anything else.
 */
export async function applyToJob(jobId: string, userId: string, note: string): Promise<'sent' | 'duplicate'> {
  const { error } = await supabase
    .from('job_applications')
    .insert({ job_id: jobId, applicant_id: userId, cover_note: note.trim() || null });
  if (!error) return 'sent';
  if (error.code === '23505') return 'duplicate';
  throw error;
}

/** Closes a posting so it stops taking applications. */
export async function closeJob(jobId: string): Promise<void> {
  const { error } = await supabase.from('jobs').update({ status: 'closed' }).eq('id', jobId);
  if (error) throw error;
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
