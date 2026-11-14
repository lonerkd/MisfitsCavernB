/**
 * Persona test for role model step 3b: crew invite accept / decline.
 *
 * Sam (owner) invites Jordan (invitee). Jordan can accept or decline.
 * After declining, Jordan loses read access to the project (can_access_project
 * now filters project_crew to confirmed rows only).
 * Riley (outsider) cannot respond to any invitation.
 */

import { createClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const API_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

const admin = createClient(API_URL, SERVICE_KEY, { auth: { persistSession: false } });

async function anonAs(email: string, password: string) {
  const c = createClient(API_URL, ANON_KEY, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`signIn ${email}: ${error.message}`);
  return c;
}

// ── test state ────────────────────────────────────────────────────────────────
let samId: string, jordanId: string, rileyId: string;
let projectId: string;
const PASSWORD = 'Test1234!';

beforeAll(async () => {
  const mkUser = async (email: string) => {
    const { data, error } = await admin.auth.admin.createUser({
      email, password: PASSWORD, email_confirm: true,
    });
    if (error) throw new Error(`createUser ${email}: ${error.message}`);
    return data.user!.id;
  };

  samId = await mkUser('sam-ci-invite@example.com');
  jordanId = await mkUser('jordan-ci-invite@example.com');
  rileyId = await mkUser('riley-ci-invite@example.com');

  // Sam creates a non-private project.
  const samC = await anonAs('sam-ci-invite@example.com', PASSWORD);
  const { data: proj, error: pe } = await samC.from('projects').insert({
    title: 'Invite Test Film',
    creator_id: samId,
    status: 'development',
    visibility: 'team',
  }).select('id').single();
  if (pe || !proj) throw new Error(`create project: ${pe?.message}`);
  projectId = proj.id;

  // Sam invites Jordan (pending).
  const { error: ce } = await samC.from('project_crew').insert({
    project_id: projectId,
    user_id: jordanId,
    role: 'contributor',
    craft: 'Director of Photography',
    status: 'pending',
  });
  if (ce) throw new Error(`invite Jordan: ${ce.message}`);
});

afterAll(async () => {
  await admin.from('project_crew').delete().eq('project_id', projectId);
  await admin.from('projects').delete().eq('id', projectId);
  for (const id of [samId, jordanId, rileyId]) {
    await admin.auth.admin.deleteUser(id);
  }
});

// ── can_access_project: pending member cannot read the project ─────────────────
describe('pending member', () => {
  it('cannot read the project before responding', async () => {
    const jordanC = await anonAs('jordan-ci-invite@example.com', PASSWORD);
    const { data } = await jordanC.from('projects').select('id').eq('id', projectId);
    expect(data).toHaveLength(0);
  });
});

// ── respond_to_crew_invite RPC ─────────────────────────────────────────────────
describe('respond_to_crew_invite', () => {
  it('Jordan can accept the invitation', async () => {
    const jordanC = await anonAs('jordan-ci-invite@example.com', PASSWORD);
    const { error } = await (jordanC.rpc as any)('respond_to_crew_invite', {
      p_project_id: projectId,
      p_response: 'confirmed',
    });
    expect(error).toBeNull();
  });

  it('Jordan can read the project after accepting', async () => {
    const jordanC = await anonAs('jordan-ci-invite@example.com', PASSWORD);
    const { data } = await jordanC.from('projects').select('id').eq('id', projectId);
    expect(data).toHaveLength(1);
  });

  it('Jordan cannot respond again (no longer pending)', async () => {
    const jordanC = await anonAs('jordan-ci-invite@example.com', PASSWORD);
    const { error } = await (jordanC.rpc as any)('respond_to_crew_invite', {
      p_project_id: projectId,
      p_response: 'declined',
    });
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/no pending invitation/i);
  });

  it('Riley cannot respond to an invitation that is not theirs', async () => {
    const rileyC = await anonAs('riley-ci-invite@example.com', PASSWORD);
    const { error } = await (rileyC.rpc as any)('respond_to_crew_invite', {
      p_project_id: projectId,
      p_response: 'confirmed',
    });
    expect(error).not.toBeNull();
  });
});

// ── declining removes access ───────────────────────────────────────────────────
describe('declining', () => {
  let newProjectId: string;
  let newSamC: Awaited<ReturnType<typeof anonAs>>;

  beforeAll(async () => {
    newSamC = await anonAs('sam-ci-invite@example.com', PASSWORD);
    const { data: proj } = await newSamC.from('projects').insert({
      title: 'Decline Test Film',
      creator_id: samId,
      status: 'development',
      visibility: 'team',
    }).select('id').single();
    if (!proj) throw new Error('create second project');
    newProjectId = proj.id;

    await newSamC.from('project_crew').insert({
      project_id: newProjectId,
      user_id: jordanId,
      role: 'contributor',
      status: 'pending',
    });
  });

  afterAll(async () => {
    await admin.from('project_crew').delete().eq('project_id', newProjectId);
    await admin.from('projects').delete().eq('id', newProjectId);
  });

  it('Jordan declines the second invitation', async () => {
    const jordanC = await anonAs('jordan-ci-invite@example.com', PASSWORD);
    const { error } = await (jordanC.rpc as any)('respond_to_crew_invite', {
      p_project_id: newProjectId,
      p_response: 'declined',
    });
    expect(error).toBeNull();
  });

  it('Jordan cannot read the project after declining', async () => {
    const jordanC = await anonAs('jordan-ci-invite@example.com', PASSWORD);
    const { data } = await jordanC.from('projects').select('id').eq('id', newProjectId);
    expect(data).toHaveLength(0);
  });

  it('Riley still cannot read the project', async () => {
    const rileyC = await anonAs('riley-ci-invite@example.com', PASSWORD);
    const { data } = await rileyC.from('projects').select('id').eq('id', newProjectId);
    expect(data).toHaveLength(0);
  });
});
