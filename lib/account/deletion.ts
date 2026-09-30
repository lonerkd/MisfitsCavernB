import { supabase } from '@/lib/supabase/client';

// Leaving the suite (supabase/migrations/20260929090000_account_deletion.sql).
// The database decides what goes and what stays; files can only be removed
// through the Storage API, so the app clears the files of the projects that go
// before the account itself is deleted.

export interface CrewChoice { id: string; username: string; role: string }
export interface SharedProject { id: string; title: string; crew: CrewChoice[] }
export interface DeletionPlan {
  username: string;
  /** Projects other people work on — hand over (or delete) these first. */
  shared: SharedProject[];
  /** Projects that go with the account. */
  solo: { id: string; title: string }[];
  /** Stored files of the solo projects, by bucket. */
  files: Record<string, string[]>;
}

export async function getDeletionPlan(): Promise<DeletionPlan> {
  const { data, error } = await supabase.rpc('account_deletion_plan');
  if (error) throw new Error(error.message);
  return data as unknown as DeletionPlan;
}

export async function transferProject(projectId: string, toUserId: string): Promise<void> {
  const { error } = await supabase.rpc('transfer_project', { p_project: projectId, p_to: toUserId });
  if (error) throw new Error(error.message);
}

/** Paths in batches, so a big library doesn't become one huge request. */
export function batches<T>(items: T[], size = 100): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function removeFiles(bucket: string, paths: string[]) {
  for (const batch of batches(paths)) {
    const { error } = await supabase.storage.from(bucket).remove(batch);
    if (error) throw new Error(`Couldn't remove your files (${bucket}): ${error.message}`);
  }
}

/**
 * Delete the signed-in account for good. `confirm` is the username, typed.
 * Removes the solo projects' files and the account's own sound effects first,
 * then the account (which refuses while shared projects remain), then signs out.
 */
export async function deleteMyAccount(userId: string, confirm: string): Promise<void> {
  const plan = await getDeletionPlan();
  if (plan.shared.length) throw new Error('Hand over or delete the projects other people work on first.');
  if (confirm.trim() !== plan.username) throw new Error('Type your username to confirm.');

  for (const [bucket, paths] of Object.entries(plan.files)) await removeFiles(bucket, paths.filter(Boolean));
  const { data: sfx } = await supabase.storage.from('sfx_library').list(userId, { limit: 1000 });
  if (sfx?.length) await removeFiles('sfx_library', sfx.map((f) => `${userId}/${f.name}`));

  const { error } = await supabase.rpc('delete_my_account', { p_confirm: confirm.trim() });
  if (error) throw new Error(error.message);
  // The session belongs to an account that no longer exists.
  await supabase.auth.signOut({ scope: 'local' });
}
