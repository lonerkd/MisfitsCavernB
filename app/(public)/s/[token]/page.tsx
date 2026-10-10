// A shared script (/s/<token>): read-only, for anyone holding the link.
// Server-rendered so link previews show the title and the writer. It reads
// only through get_shared_script — the exact token, while sharing is on — so
// turning sharing off or making a new link closes this one at once (nothing
// is cached). Nobody can list shared scripts or read one by id.

import type React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { publicClient } from '@/lib/supabase/public';
import { parseScript } from '@/lib/scriptos/parser';
import type { ScriptLine } from '@/lib/scriptos/types';

export const dynamic = 'force-dynamic';

interface SharedScript {
  title: string;
  content: string;
  format: string | null;
  updated_at: string | null;
  author_username: string | null;
  author_avatar_url: string | null;
  author_role: string | null;
}

async function load(token: string): Promise<SharedScript | null> {
  const db = publicClient();
  if (!db || !token) return null;
  const { data } = await db.rpc('get_shared_script', { p_token: token });
  return data?.[0] ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const script = await load(token);
  if (!script) return { title: 'The Cavern', robots: { index: false } };
  const description = `A script by ${script.author_username ?? 'a writer on The Cavern'}.`;
  return {
    title: `${script.title} — The Cavern`,
    description,
    // Shared by link: unlisted, never indexed.
    robots: { index: false, follow: false },
    openGraph: { title: script.title, description, type: 'article' },
    twitter: { card: 'summary', title: script.title, description },
  };
}

const PRINT_COLORS: Record<string, string> = {
  slug: '#000',
  character: '#000',
  dialogue: '#000',
  parenthetical: '#444',
  transition: '#000',
  action: '#000',
};

function ScriptLineView({ line, index }: { line: ScriptLine; index: number }) {
  const base: React.CSSProperties = {
    fontFamily: 'var(--script)',
    fontSize: 14,
    lineHeight: '1.7',
    color: PRINT_COLORS[line.type] || '#000',
    fontWeight: (line.type === 'slug' || line.type === 'character') ? 700 : 400,
    textTransform: (line.type === 'slug' || line.type === 'character' || line.type === 'transition') ? 'uppercase' : 'none',
    whiteSpace: 'pre-wrap',
  };

  if (line.type === 'empty') return <div style={{ height: 14 }} />;
  if (line.type === 'slug') {
    return <div style={{ ...base, marginTop: index > 0 ? 24 : 0, marginBottom: 8 }}>{line.text}</div>;
  }
  if (line.type === 'character') {
    return <div style={{ ...base, marginLeft: '22ch', marginTop: 16 }}>{line.text}{line.meta?.isContinued ? " (CONT'D)" : ''}</div>;
  }
  if (line.type === 'dialogue') {
    return <div style={{ ...base, marginLeft: '10ch', marginRight: '15ch', marginBottom: 12 }}>{line.text}</div>;
  }
  if (line.type === 'parenthetical') {
    return <div style={{ ...base, marginLeft: '16ch', marginRight: '20ch', fontStyle: 'italic' }}>{line.text}</div>;
  }
  if (line.type === 'transition') {
    return <div style={{ ...base, textAlign: 'right', marginTop: 16, marginBottom: 16 }}>{line.text}</div>;
  }
  return <div style={base}>{line.text}</div>;
}

export default async function PublicScriptPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const script = await load(token);
  const lines: ScriptLine[] = script ? parseScript(script.content).lines : [];

  if (!script) {
    return (
      <div data-theme="default" style={{
        minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 24, fontFamily: 'var(--mono)',
      }}>
        <div style={{ fontFamily: 'var(--display)', fontSize: 'clamp(3rem, 10vw, 7rem)', letterSpacing: 6, color: 'var(--accent)', lineHeight: 1 }}>404</div>
        <p style={{ fontSize: 13, letterSpacing: 2, color: 'var(--fg-dim)' }}>SCRIPT NOT FOUND</p>
        <p style={{ fontSize: 11, maxWidth: 320, textAlign: 'center', lineHeight: 1.7, color: 'var(--fg-dim)' }}>
          This link may have expired, or the author has turned off public sharing.
        </p>
        <Link href="/" style={{
          marginTop: 8, padding: '10px 28px', border: '1px solid rgba(var(--ink-rgb), 0.15)', color: 'var(--fg)',
          fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 2, textDecoration: 'none',
        }}>
          BACK TO HOME
        </Link>
      </div>
    );
  }

  return (
    <div data-theme="default" style={{ minHeight: '100vh', background: '#1a1a1a' }}>
      <header style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'var(--surface)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(var(--ink-rgb), 0.08)',
        padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontFamily: 'var(--display)', fontSize: '1.1rem', letterSpacing: 2, color: '#fff' }}>{script.title}</div>
          {script.author_username && (
            <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 1, color: 'var(--fg-dim)', marginTop: 2 }}>
              by {script.author_username}{script.author_role ? ` · ${script.author_role}` : ''}
            </div>
          )}
        </div>
        <Link href="/auth" style={{
          fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 2, color: 'var(--accent)', textDecoration: 'none',
        }}>
          CREATE YOUR OWN →
        </Link>
      </header>

      <div style={{ maxWidth: 'var(--w-reading)', margin: '40px auto 80px', padding: '0 16px' }}>
        <div style={{
          background: '#fdfcf8', color: '#000',
          padding: 'clamp(32px, 6vw, 72px) clamp(24px, 6vw, 64px)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
          borderRadius: 4,
        }}>
          {lines.length === 0 ? (
            <div style={{ fontFamily: 'var(--script)', fontSize: 13, textAlign: 'center', padding: 40, color: 'var(--fg-dim)' }}>
              This script is empty.
            </div>
          ) : (
            lines.map((line, i) => <ScriptLineView key={i} line={line} index={i} />)
          )}
        </div>
      </div>

      <footer style={{ textAlign: 'center', paddingBottom: 28 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 2, color: 'var(--fg-dim)' }}>
          POWERED BY{' '}
          <Link href="/auth" style={{ color: 'rgba(var(--ink-rgb), 0.6)', textDecoration: 'none', borderBottom: '1px solid rgba(var(--ink-rgb), 0.2)' }}>
            THE CAVERN
          </Link>
        </span>
      </footer>
    </div>
  );
}
