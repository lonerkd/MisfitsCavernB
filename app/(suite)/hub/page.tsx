import { redirect } from 'next/navigation';

// The hub's feed is the updates section of the home page now; posts keep
// /hub/<id> and Help keeps /hub/help. Land on the section itself, not the
// top of home (owner, Nov 26).
export default async function HubPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) for (const x of Array.isArray(v) ? v : v === undefined ? [] : [v]) q.append(k, x);
  const s = q.toString();
  redirect(s ? `/?${s}#updates` : '/#updates');
}
