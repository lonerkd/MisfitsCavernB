// A shared mood board: read-only, for anyone holding the link. Server-rendered so a link preview shows the board's
// name. What it shows comes from one SECURITY DEFINER function, get_shared_board(token), which resolves only for a
// board with a live link: the board, its cards and, for each library item, only what shows it. Images are signed
// here as the visitor (the storage "shared read" rule says yes only for a file on a board with a live link).
// Nothing is cached: closing the link stops the next load at once.

import type { Metadata } from 'next';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import GrainOverlay from '@/components/ui/GrainOverlay';
import { publicClient } from '@/lib/supabase/public';
import { createStudioApi } from '@/lib/studio/api';
import type { SharedBoard, SharedBoardItem } from '@/lib/studio/boards';
import { sharedSlides } from '@/lib/studio/board-slides';
import SharedSlideshow from './SharedSlideshow';
import s from './board.module.css';

export const dynamic = 'force-dynamic';

async function load(token: string): Promise<{ board: SharedBoard; urls: Record<string, string> } | null> {
  const db = publicClient();
  if (!db || !token) return null;
  const board = await createStudioApi(db).getSharedBoard(token).catch(() => null);
  if (!board) return null;
  const paths = board.items.map((i) => (i.media?.kind === 'image' ? i.media.storage_path : null)).filter((p): p is string => !!p);
  const urls: Record<string, string> = {};
  if (paths.length) {
    const { data } = await db.storage.from('project-media').createSignedUrls(paths, 3600);
    for (const row of data ?? []) if (row.path && row.signedUrl && !row.error) urls[row.path] = row.signedUrl;
  }
  return { board, urls };
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const data = await load(token);
  if (!data) return { title: 'The Cavern', robots: { index: false } };
  const { board } = data;
  const description = `A mood board from ${board.project_title}.`;
  return {
    title: `${board.name} — The Cavern`,
    description,
    // A link-shared board is unlisted.
    robots: { index: false, follow: false },
    openGraph: { title: board.name, description, type: 'website' },
    twitter: { card: 'summary', title: board.name, description },
  };
}

function hostOf(url: string | null) {
  try { return url ? new URL(url).hostname.replace(/^www\./, '') : ''; } catch { return ''; }
}

function Card({ item, urls }: { item: SharedBoardItem; urls: Record<string, string> }) {
  const m = item.media;
  let body: React.ReactNode = null;
  if (item.note) {
    body = <div className={s.note}>{item.note}</div>;
  } else if (m?.kind === 'image' && (m.storage_path ? urls[m.storage_path] : m.external_url)) {
    // eslint-disable-next-line @next/next/no-img-element -- a signed storage URL or an image from any host
    body = <img className={s.image} src={(m.storage_path ? urls[m.storage_path] : m.external_url) as string} alt={m.title} loading="lazy" referrerPolicy="no-referrer" />;
  } else if (m?.external_url) {
    body = (
      <a className={s.link} href={m.external_url} target="_blank" rel="noopener noreferrer nofollow">
        <ExternalLink size={14} aria-hidden /> <span>{m.title || hostOf(m.external_url) || 'Open link'}</span>
      </a>
    );
  } else {
    body = <div className={s.note}>{m?.title || 'An item that is not shown here'}</div>;
  }
  return (
    <div className={s.card} style={{ left: `${item.x}%`, top: `${item.y}%`, width: `${item.w}%`, zIndex: item.z + 1 }}>
      {body}
      {m && !item.note && m.title && <div className={s.caption}>{m.title}</div>}
    </div>
  );
}

export default async function SharedBoardPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await load(token);

  if (!data) {
    return (
      <div className={s.missing} data-theme="default">
        <GrainOverlay />
        <div className={s.wordmark}>CAVERN</div>
        <p className={s.eyebrow}>This board isn’t shared, or the link is wrong.</p>
        <Link href="/" className={s.back}>← The Cavern</Link>
      </div>
    );
  }

  const { board, urls } = data;
  return (
    <div className={s.main} data-theme="default">
      <GrainOverlay />
      <header className={s.hero}>
        <p className={s.eyebrow}>Mood board · {board.project_title}</p>
        <h1 className={s.title}>{board.name}</h1>
        <SharedSlideshow name={board.name} slides={sharedSlides(board, urls)} />
      </header>
      <div className={s.canvas} role="group" aria-label={`Mood board: ${board.name}`}>
        {board.items.length === 0 && <div className={s.empty}>Nothing on this board yet.</div>}
        {board.items.map((i) => <Card key={i.id} item={i} urls={urls} />)}
      </div>
      <footer className={s.footer}>Made in <Link href="/">The Cavern</Link></footer>
    </div>
  );
}
