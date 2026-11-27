import { redirect } from 'next/navigation';

// Community and the home page were two pages for the same things. There is one now: "/" (signed out: the front page;
// signed in: your day, what is new, crew, music). Old links, bookmarks and the phone's share sheet still arrive here and
// keep their query string.
export default async function CommunityPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) for (const x of Array.isArray(v) ? v : v === undefined ? [] : [v]) q.append(k, x);
  const s = q.toString();
  redirect(s ? `/?${s}` : '/');
}
