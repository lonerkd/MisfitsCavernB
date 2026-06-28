import { NextRequest, NextResponse } from 'next/server';
import { createScript } from '@/lib/scripts';
import { getAuthenticatedUser, verifyUserOwnership } from '@/lib/api-auth';

function validateScriptPayload(data: any): { valid: boolean; error?: string } {
  if (typeof data.userId !== 'string' || !data.userId.trim()) {
    return { valid: false, error: 'userId must be a non-empty string' };
  }
  if (typeof data.title !== 'string' || !data.title.trim()) {
    return { valid: false, error: 'title must be a non-empty string' };
  }
  if (data.title.length > 255) {
    return { valid: false, error: 'title must not exceed 255 characters' };
  }
  if (typeof data.content !== 'string') {
    return { valid: false, error: 'content must be a string' };
  }
  if (data.content.length > 1024 * 1024) {
    return { valid: false, error: 'content must not exceed 1MB' };
  }
  if (data.projectId !== undefined && typeof data.projectId !== 'string') {
    return { valid: false, error: 'projectId must be a string if provided' };
  }
  const allowedFields = ['userId', 'title', 'content', 'projectId'];
  for (const key in data) {
    if (!allowedFields.includes(key)) {
      return { valid: false, error: `Unknown field: ${key}` };
    }
  }
  return { valid: true };
}

export async function POST(req: NextRequest) {
  try {
    const authenticatedUser = await getAuthenticatedUser(req);
    if (!authenticatedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const validation = validateScriptPayload(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { userId, title, content, projectId } = body;

    if (!verifyUserOwnership(userId, authenticatedUser.id)) {
      return NextResponse.json({ error: 'Forbidden: cannot create scripts for other users' }, { status: 403 });
    }

    const result = await createScript(userId, title, content, projectId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.script, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
