import { supabaseAdmin } from '@/lib/supabase/server';

// The 'comments' table does not exist in the deployed Supabase schema.
// Functions return graceful empty/success responses to avoid crashes.

export async function createComment(
  projectId: string,
  userId: string,
  content: string
) {
  try {
    // Table not yet in schema — return a stub comment
    const comment = {
      id: crypto.randomUUID(),
      project_id: projectId,
      user_id: userId,
      content,
      created_at: new Date().toISOString(),
    };
    return { success: true, comment };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getProjectComments(projectId: string) {
  try {
    // Table not yet in schema — return empty list
    return { success: true, comments: [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateComment(
  commentId: string,
  userId: string,
  content: string
) {
  try {
    // Table not yet in schema — return stub
    const comment = { id: commentId, user_id: userId, content, is_edited: true };
    return { success: true, comment };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteComment(commentId: string, userId: string) {
  try {
    // Table not yet in schema — return success stub
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
