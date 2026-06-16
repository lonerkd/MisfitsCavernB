// Live end-to-end persistence test against Supabase.
// Proves: signup -> profile auto-created -> authenticated script insert/select/update round-trips with RLS on.
import { createClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !ANON || !SERVICE) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });
const anon = createClient(URL, ANON, { auth: { persistSession: false } });

const email = `roundtrip_${Date.now()}@misfitstest.dev`;
const password = 'TestPass12345!';
let userId;

function ok(label, cond, extra='') { console.log(`${cond ? '✅' : '❌'} ${label}${extra ? ' — ' + extra : ''}`); if (!cond) process.exitCode = 1; }

try {
  // 1. Create a confirmed user (admin)
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { username: 'roundtripper' }
  });
  ok('Create confirmed user', !cErr && !!created.user, cErr?.message);
  userId = created.user.id;

  // 2. Profile auto-created by trigger?
  await new Promise(r => setTimeout(r, 600));
  const { data: prof } = await admin.from('profiles').select('*').eq('id', userId).single();
  ok('Profile auto-created by trigger', !!prof, prof ? `username=${prof.username}` : 'missing');

  // 3. Sign in as the user (anon client, real session => RLS applies)
  const { data: signIn, error: sErr } = await anon.auth.signInWithPassword({ email, password });
  ok('Sign in returns session', !sErr && !!signIn.session, sErr?.message);

  // 4. Insert a script as the authenticated user (mirrors saveScript)
  const { data: ins, error: iErr } = await anon.from('scripts').insert([{
    title: 'Roundtrip Screenplay', content: 'FADE IN:', last_edited_by: userId
  }]).select().single();
  ok('Insert script (RLS INSERT)', !iErr && !!ins, iErr?.message);
  const scriptId = ins?.id;

  // 5. Read it back (mirrors getAllScripts)
  const { data: list, error: lErr } = await anon.from('scripts').select('*').eq('last_edited_by', userId);
  ok('Read back own scripts (RLS SELECT)', !lErr && list?.length === 1, lErr?.message || `count=${list?.length}`);

  // 6. Update it (mirrors saveScript update path)
  const { data: upd, error: uErr } = await anon.from('scripts')
    .update({ content: 'FADE IN:\n\nINT. CAVERN - NIGHT' }).eq('id', scriptId).select().single();
  ok('Update script (RLS UPDATE)', !uErr && upd?.content.includes('CAVERN'), uErr?.message);

  // 7. Confirm persistence survives a fresh client (no in-memory state)
  const fresh = createClient(URL, ANON, { auth: { persistSession: false } });
  await fresh.auth.signInWithPassword({ email, password });
  const { data: reload } = await fresh.from('scripts').select('content').eq('id', scriptId).single();
  ok('Persists across fresh session (reload)', reload?.content.includes('CAVERN'), reload?.content?.slice(0,30));

} finally {
  // Cleanup
  if (userId) {
    await admin.from('scripts').delete().eq('last_edited_by', userId);
    await admin.auth.admin.deleteUser(userId);
    console.log('🧹 cleaned up test user + scripts');
  }
}
