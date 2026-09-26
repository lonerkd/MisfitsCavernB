// The share link: a read-only lookbook anyone holding the link can open.
// Server-rendered so link previews (iMessage, Slack, social) show the title,
// logline and lead image. Everything shown comes from two SECURITY DEFINER
// RPCs that resolve only for link/public projects with the exact token:
//   get_shared_project  — title, logline, status, creator
//   get_shared_lookbook — media the owner published, grouped by scene
// Nothing is cached: switching the project to Team/Private closes it at once.

import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { ExternalLink, FileText } from 'lucide-react';
import GrainOverlay from '@/components/GrainOverlay';
import { publicClient } from '@/lib/supabase/public';
import { createStudioApi, type Lookbook, type LookbookMedia } from '@/lib/studio/api';
import { videoEmbed } from '@/lib/studio/media-kind';
import s from './shared.module.css';

export const dynamic = 'force-dynamic';

interface SharedProject {
  title: string;
  description: string | null;
  status: string;
  accent_color: string | null;
  visibility: string;
  creator_username: string | null;
}

async function load(token: string): Promise<{ project: SharedProject; lookbook: Lookbook } | null> {
  const db = publicClient();
  if (!db || !token) return null;
  const [{ data }, lookbook] = await Promise.all([
    db.rpc('get_shared_project', { p_token: token }),
    createStudioApi(db).getLookbook(token).catch(() => null),
  ]);
  const project = data?.[0];
  if (!project) return null;
  return { project, lookbook: lookbook ?? { media: [], scenes: [] } };
}

/** Where a published item is served from: our permalink for files, the link otherwise. */
const srcOf = (m: LookbookMedia) => (m.storage_path ? `/m/${m.id}` : m.external_url);

async function origin() {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const proto = h.get('x-forwarded-proto') ?? 'https';
  return host ? `${proto}://${host}` : '';
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const data = await load(token);
  if (!data) return { title: 'Misfits Cavern', robots: { index: false } };
  const { project, lookbook } = data;
  const lead = lookbook.media.find((m) => m.kind === 'image');
  const leadSrc = lead ? srcOf(lead) : null;
  const base = await origin();
  const image = leadSrc ? (leadSrc.startsWith('/') ? `${base}${leadSrc}` : leadSrc) : undefined;
  const description = project.description || `A project by ${project.creator_username ?? 'a Misfits Cavern filmmaker'}.`;
  return {
    title: `${project.title} — Misfits Cavern`,
    description,
    // Link-shared projects are unlisted: keep them out of search engines.
    robots: { index: project.visibility === 'public', follow: false },
    openGraph: { title: project.title, description, type: 'website', images: image ? [{ url: image }] : undefined },
    twitter: { card: image ? 'summary_large_image' : 'summary', title: project.title, description, images: image ? [image] : undefined },
  };
}

function hostOf(url: string | null) {
  try { return url ? new URL(url).hostname.replace(/^www\./, '') : ''; } catch { return ''; }
}

function MediaItem({ m }: { m: LookbookMedia }) {
  const src = srcOf(m);
  const embed = m.kind === 'video' ? videoEmbed(m.external_url) : null;
  let body: React.ReactNode = null;
  if (embed) {
    body = (
      <div className={s.embed}>
        <iframe src={embed.src} title={m.title || 'Video'} loading="lazy" allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
      </div>
    );
  } else if (m.kind === 'image' && src) {
    // eslint-disable-next-line @next/next/no-img-element -- permalinks and images from any host
    body = <img className={s.image} src={src} alt={m.title} loading="lazy" referrerPolicy="no-referrer" width={m.width ?? undefined} height={m.height ?? undefined} />;
  } else if (m.kind === 'video' && src) {
    body = <video className={s.video} src={src} controls playsInline preload="metadata" />;
  } else if (m.kind === 'audio' && src) {
    body = <div className={s.audio}><audio src={src} controls preload="none" /></div>;
  } else if (src) {
    body = (
      <a className={s.linkCard} href={src} target="_blank" rel="noopener noreferrer nofollow">
        {m.kind === 'document' ? <FileText size={18} /> : <ExternalLink size={18} />}
        <span>{m.kind === 'document' ? 'Open PDF' : hostOf(m.external_url) || 'Open link'}</span>
      </a>
    );
  }
  return (
    <figure className={s.item}>
      {body}
      {m.title && <figcaption className={s.caption}>{m.title}</figcaption>}
    </figure>
  );
}

export default async function SharedProjectPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await load(token);

  if (!data) {
    return (
      <main className={s.missing}>
        <GrainOverlay />
        <div className={s.wordmark}>CAVERN</div>
        <p className={s.eyebrow}>This project isn’t shared, or the link is wrong.</p>
        <Link href="/" className={s.back}>← Misfits Cavern</Link>
      </main>
    );
  }

  const { project, lookbook } = data;
  const accent = project.accent_color || '#d7340b';
  const byId = new Map(lookbook.media.map((m) => [m.id, m]));
  const inScenes = new Set(lookbook.scenes.flatMap((sc) => sc.media_ids));
  const more = lookbook.media.filter((m) => !inScenes.has(m.id));

  return (
    <main className={s.main} style={{ ['--share-accent' as string]: accent }}>
      <GrainOverlay />
      <div className={s.glow} aria-hidden />
      <header className={s.hero}>
        <div className={s.eyebrow}>{project.visibility === 'public' ? 'Public project' : 'Shared with you'} · Misfits Cavern</div>
        <h1 className={s.title}>{project.title}</h1>
        {project.creator_username && <div className={s.byline}>by {project.creator_username}</div>}
        {project.description && <p className={s.logline}>{project.description}</p>}
      </header>

      {lookbook.scenes.length > 0 && (
        <section className={s.section} aria-label="Scenes">
          {lookbook.scenes.map((sc) => (
            <article key={sc.id} className={s.scene}>
              <h2 className={s.sceneHeading}><span className={s.sceneNum}>{sc.scene_number}</span>{sc.heading}</h2>
              <div className={s.grid}>
                {sc.media_ids.map((id) => byId.get(id)).filter(Boolean).map((m) => <MediaItem key={m!.id} m={m!} />)}
              </div>
            </article>
          ))}
        </section>
      )}

      {more.length > 0 && (
        <section className={s.section} aria-label={lookbook.scenes.length ? 'More references' : 'References'}>
          {lookbook.scenes.length > 0 && <h2 className={s.sectionTitle}>More references</h2>}
          <div className={s.grid}>
            {more.map((m) => <MediaItem key={m.id} m={m} />)}
          </div>
        </section>
      )}

      <footer className={s.footer}>
        <span>Made in Misfits Cavern — the production suite for indie filmmakers.</span>
        <Link href="/auth" className={s.cta}>Join the Cavern</Link>
      </footer>
    </main>
  );
}
