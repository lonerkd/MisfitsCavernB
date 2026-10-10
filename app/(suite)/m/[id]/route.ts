import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/supabase/public';

// Stable link to a published file: /m/<media id> → a fresh, short-lived signed
// URL. Works only while the owner publishes the item and the project is link-
// or public-shared (get_published_media + the "shared read" storage policy),
// so it can go in a portfolio or a printed deck without expiring.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
// Images load once; video and audio keep making range requests while they
// play, so their URLs must outlive a viewing.
const ttlFor = (kind: string) => (kind === 'video' || kind === 'audio' ? 3600 : 300);

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = publicClient();
  if (!UUID.test(id) || !db) return new NextResponse('Not found', { status: 404 });

  const { data } = await db.rpc('get_published_media', { p_media_id: id });
  const row = data?.[0];
  if (!row?.storage_path) return new NextResponse('Not found', { status: 404 });

  const { data: signed, error } = await db.storage.from('project-media').createSignedUrl(row.storage_path, ttlFor(row.kind));
  if (error || !signed) return new NextResponse('Not found', { status: 404 });

  // Never cached: unpublishing or un-sharing must stop new loads at once.
  return NextResponse.redirect(signed.signedUrl, { status: 302, headers: { 'Cache-Control': 'no-store' } });
}
