'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { parseScript } from '@/lib/scriptos/parser';
import type { ScriptLine } from '@/types/screenplay';
import type { PublicProfile } from '@/lib/supabase/profiles';

interface SharedScript {
  id: string;
  title: string;
  content: string;
  updated_at: string;
  created_by: string | null;
  profile: PublicProfile | null;
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
    fontFamily: 'Courier Prime, Courier, monospace',
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

export default function PublicScriptPage({ params }: { params: { token: string } }) {
  const [script, setScript] = useState<SharedScript | null>(null);
  const [lines, setLines] = useState<ScriptLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchScript = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('scripts')
        .select('id, title, content, updated_at, shared, created_by')
        .eq('share_token', params.token)
        .eq('shared', true)
        .single();

      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      let profile: PublicProfile | null = null;
      if (data.created_by) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('username, role, avatar_url')
          .eq('id', data.created_by)
          .single();
        profile = profileData ? { username: profileData.username, role: profileData.role ?? undefined, avatar_url: profileData.avatar_url ?? undefined } : null;
      }

      setScript({ ...data, content: data.content ?? '', updated_at: data.updated_at ?? '', profile });
      setLines(parseScript(data.content || '').lines);
      setLoading(false);
    };

    fetchScript();
  }, [params.token]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 3, color: 'var(--fg)', opacity: 0.3, animation: 'pulse 1.6s ease-in-out infinite' }}>
          LOADING
        </div>
        <style>{`@keyframes pulse { 0%,100%{opacity:.15} 50%{opacity:.5} }`}</style>
      </div>
    );
  }

  if (notFound || !script) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 24, fontFamily: 'var(--mono)',
      }}>
        <div style={{ fontFamily: 'var(--display)', fontSize: 'clamp(3rem, 10vw, 7rem)', letterSpacing: 6, color: 'var(--accent)', lineHeight: 1 }}>404</div>
        <p style={{ fontSize: 13, letterSpacing: 2, opacity: 0.5 }}>SCRIPT NOT FOUND</p>
        <p style={{ fontSize: 11, opacity: 0.3, maxWidth: 320, textAlign: 'center', lineHeight: 1.7 }}>
          This link may have expired, or the author has turned off public sharing.
        </p>
        <Link href="/" style={{
          marginTop: 8, padding: '10px 28px', border: '1px solid rgba(255,255,255,0.15)', color: 'var(--fg)',
          fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 2, textDecoration: 'none',
        }}>
          BACK TO HOME
        </Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#1a1a1a' }}>
      <header style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(8,8,8,0.95)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontFamily: 'var(--display)', fontSize: '1.1rem', letterSpacing: 2, color: '#fff' }}>{script.title}</div>
          {script.profile && (
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
              by {script.profile.username}{script.profile.role ? ` · ${script.profile.role}` : ''}
            </div>
          )}
        </div>
        <Link href="/auth" style={{
          fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2, color: 'var(--accent)', textDecoration: 'none',
        }}>
          CREATE YOUR OWN →
        </Link>
      </header>

      <div style={{ maxWidth: 720, margin: '40px auto 80px', padding: '0 16px' }}>
        <div style={{
          background: '#fdfcf8', color: '#000',
          padding: 'clamp(32px, 6vw, 72px) clamp(24px, 6vw, 64px)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
          borderRadius: 2,
        }}>
          {lines.length === 0 ? (
            <div style={{ fontFamily: 'Courier Prime, monospace', fontSize: 13, opacity: 0.4, textAlign: 'center', padding: 40 }}>
              This script is empty.
            </div>
          ) : (
            lines.map((line, i) => <ScriptLineView key={i} line={line} index={i} />)
          )}
        </div>
      </div>

      <footer style={{ textAlign: 'center', paddingBottom: 28 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2, color: 'rgba(255,255,255,0.25)' }}>
          POWERED BY{' '}
          <Link href="/auth" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
            MISFITS CAVERN
          </Link>
        </span>
      </footer>
    </div>
  );
}
