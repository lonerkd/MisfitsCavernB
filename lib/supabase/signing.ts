import { supabase } from './client';
import type { Tables } from './database.types';

// Signable paperwork (`signing_requests`): the production's side. The signer's side is the public /sign/<token> page, which
// reads and signs only through the get_signing / sign_document / decline_signing functions with the exact token.

export type SigningRequest = Tables<'signing_requests'>;

/** The production's requests for a project, newest first. */
export async function listSigningRequests(projectId: string): Promise<SigningRequest[]> {
  const { data, error } = await supabase.from('signing_requests').select('*').eq('project_id', projectId).order('created_at', { ascending: false });
  if (error) throw new Error('Could not load the signature requests');
  return data ?? [];
}

export async function createSigningRequest(input: { projectId: string; userId: string; documentId: string | null; title: string; body: string; signerLabel: string | null }): Promise<SigningRequest> {
  const { data, error } = await supabase.from('signing_requests').insert({
    project_id: input.projectId, document_id: input.documentId, title: input.title, body: input.body, signer_label: input.signerLabel, created_by: input.userId,
  }).select('*').single();
  if (error || !data) throw new Error('Could not make the signature link');
  // The paperwork row now reads "Sent".
  if (input.documentId) {
    const { error: e2 } = await supabase.from('project_documents').update({ status: 'pending' }).eq('id', input.documentId).neq('status', 'done');
    if (e2) throw new Error('The link was made, but the paperwork row could not be marked as sent');
  }
  return data;
}

export async function voidSigningRequest(id: string): Promise<void> {
  const { data, error } = await supabase.rpc('void_signing', { p_id: id });
  if (error || !data) throw new Error('Could not withdraw the request (it may already be signed or closed)');
}

/** The signer's side: no account, only the link's token. Each returns whether it took (false: already closed, expired or invalid). */
export async function guestSign(token: string, name: string, agree: boolean): Promise<boolean> {
  const { data, error } = await supabase.rpc('sign_document', { p_token: token, p_name: name, p_agree: agree });
  if (error) throw new Error('Could not sign right now. Try again in a moment.');
  return !!data;
}

export async function guestDecline(token: string, reason: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('decline_signing', { p_token: token, p_reason: reason });
  if (error) throw new Error('Could not send that right now. Try again in a moment.');
  return !!data;
}
