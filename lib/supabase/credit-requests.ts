import { supabase } from './client';
import { notify } from './notifications';
import { logActivity } from './activity';
import { assignCrewMember, setCrewCraft } from './crew-management';

export type CreditRequestStatus = 'pending' | 'approved' | 'declined';
export interface CreditRequest {
  id: string;
  project_id: string;
  requester_id: string;
  craft: string;
  note: string | null;
  status: CreditRequestStatus;
  created_at: string;
  decided_at: string | null;
  username?: string;
}

/** A signed-in person left off a film's credits asks to be added. One pending ask per person per project (the database says so). */
export async function askToBeCredited(projectId: string, userId: string, craft: string, note: string): Promise<void> {
  const trimmed = craft.trim();
  if (!trimmed) throw new Error('Say what you did on the film.');
  const { error } = await supabase.from('credit_requests').insert({ project_id: projectId, requester_id: userId, craft: trimmed.slice(0, 60), note: note.trim() ? note.trim().slice(0, 500) : null });
  if (error) {
    if (error.code === '23505') throw new Error('You have already asked; the owner has not answered yet.');
    if (error.code === '42501' || error.code === '23514' || /row-level security/i.test(error.message)) throw new Error('You cannot ask to be credited on this film (you may already be on it, or it takes no requests).');
    throw error;
  }
}

/** The person's own latest request on a project (so the page can say "asked" or "declined"), or null. */
export async function myCreditRequest(projectId: string, userId: string): Promise<CreditRequest | null> {
  const { data, error } = await supabase.from('credit_requests').select('*').eq('project_id', projectId).eq('requester_id', userId).order('created_at', { ascending: false }).limit(1);
  if (error) throw error;
  return (data?.[0] as CreditRequest | undefined) ?? null;
}

/** Withdraw your own pending ask. */
export async function withdrawCreditRequest(id: string): Promise<void> {
  const { error } = await supabase.from('credit_requests').delete().eq('id', id);
  if (error) throw error;
}

/** The project's pending asks, for its owner. */
export async function listCreditRequests(projectId: string): Promise<CreditRequest[]> {
  const { data, error } = await supabase
    .from('credit_requests')
    .select('id, project_id, requester_id, craft, note, status, created_at, decided_at, profiles:requester_id(username)')
    .eq('project_id', projectId).eq('status', 'pending').order('created_at');
  if (error) throw error;
  return (data ?? []).map((r) => {
    const p = (r as { profiles?: { username?: string } | Array<{ username?: string }> | null }).profiles;
    const username = Array.isArray(p) ? p[0]?.username : p?.username;
    return { ...(r as unknown as CreditRequest), username };
  });
}

/**
 * The owner answers. Approving puts the person on the crew with the craft they named (a viewer's access, nothing more: a credit is
 * not a permission); someone already on the crew keeps their access and only gains the craft. The crew is changed first and the
 * answer saved second, so a failure never leaves an "approved" request that credits nobody (the worst case is a person credited
 * whose request still shows pending; answering again is harmless).
 */
export async function answerCreditRequest(req: CreditRequest, approve: boolean, ownerId: string): Promise<void> {
  if (approve) {
    const { data: existing, error: lookErr } = await supabase.from('project_crew').select('user_id').eq('project_id', req.project_id).eq('user_id', req.requester_id).maybeSingle();
    if (lookErr) throw lookErr;
    if (existing) await setCrewCraft(req.project_id, req.requester_id, req.craft, ownerId);
    else await assignCrewMember(req.project_id, req.requester_id, 'viewer', ownerId, req.craft);
  }
  const { data, error } = await supabase.from('credit_requests').update({ status: approve ? 'approved' : 'declined' }).eq('id', req.id).eq('status', 'pending').select('id');
  if (error) throw error;
  if (!data?.length) throw new Error('That request was already answered, or you cannot answer it.');
  void logActivity(approve ? 'added a person to the credits' : 'declined a credit request', 'project', req.project_id);
  await notify(
    req.requester_id,
    { type: 'crew', title: approve ? `You are credited as ${req.craft}` : 'Your credit request was declined', body: approve ? 'The project owner added you to the film.' : 'The project owner did not add the credit.', link: `/projects/${req.project_id}` },
    ownerId,
  );
}
