import { redirect } from 'next/navigation';

// Today is the first section of Community now. A share (the phone's share sheet
// lands here with ?title=&text=&url=) keeps its query string.
export default async function TodayPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) for (const x of Array.isArray(v) ? v : v === undefined ? [] : [v]) q.append(k, x);
  const s = q.toString();
  redirect(s ? `/community?${s}` : '/community');
}
