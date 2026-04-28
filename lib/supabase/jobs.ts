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
}

export async function createJob(projectId: string, userId: string, title: string, role: string, description = '', rate?: number) {
  const { data, error } = await supabase
    .from('jobs')
    .insert({
      project_id: projectId,
      title,
      description,
      role,
      rate,
      created_by: userId,
      status: 'open'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
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
