import { redirect } from 'next/navigation';

// The hub's feed is a section of Community now; posts keep /hub/<id> and Help keeps /hub/help.
export default async function HubPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) for (const x of Array.isArray(v) ? v : v === undefined ? [] : [v]) q.append(k, x);
  const s = q.toString();
  redirect(s ? `/community?${s}` : '/community');
}
