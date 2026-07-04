'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, User } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import EmptyState from '@/components/EmptyState';
import Avatar from '@/components/Avatar';
import { useOnlinePresence } from '@/lib/hooks/usePresence';
import type { Profile } from '@/lib/supabase/profiles';

const ROLES = ['All', 'Director', 'DP / Cinematographer', 'Editor', 'Writer', 'Sound Designer', 'Colorist', 'Producer', 'Actor'];

export default function CrewPage() {
  const [crew, setCrew] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [availFilter, setAvailFilter] = useState<'all' | 'OPEN' | 'BUSY'>('all');
  const [viewerId, setViewerId] = useState<string | null>(null);
  const onlineIds = useOnlinePresence(viewerId);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setViewerId(data.user?.id ?? null));
  }, []);

  // Debounce search to avoid hammering Supabase on every keystroke
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    loadCrew(debouncedSearch);
  }, [roleFilter, availFilter, debouncedSearch]);

  const loadCrew = async (searchTerm = debouncedSearch) => {
    setLoading(true);
    setLoadError(null);
    try {
      let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });

      if (searchTerm) {
        const clean = searchTerm.replace(/[(),.:\\]/g, ' ').trim();
        if (clean) query = query.or(`username.ilike.%${clean}%,bio.ilike.%${clean}%`);
      }

      if (roleFilter && roleFilter !== 'All') {
        query = query.eq('role', roleFilter);
      }

      if (availFilter !== 'all') {
        query = query.eq('status', availFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setCrew(data || []);
    } catch (error: any) {
      console.error(error);
      setLoadError(error?.message || 'Failed to load crew directory');
      setCrew([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)' }}>
      <header style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: 60,
        background: 'rgba(8, 8, 8, 0.95)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
        padding: '16px 24px', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', zIndex: 100
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--fg)', textDecoration: 'none' }}>
          <ArrowLeft size={20} />
          <h1 style={{ fontFamily: 'var(--display)', fontSize: '1.2rem', letterSpacing: 4, margin: 0 }}>CREW DIRECTORY</h1>
        </Link>
      </header>

      <div style={{ marginTop: 60, padding: 24, maxWidth: 1100, margin: '60px auto 0' }}>
        {/* Search + Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
            <input type="text" placeholder="Search by name, skill, bio..." value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '10px 12px 10px 36px', background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)', color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 11, boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['all', 'OPEN', 'BUSY'] as const).map(a => (
              <button key={a} onClick={() => setAvailFilter(a)}
                style={{ padding: '8px 12px', background: availFilter === a ? (a === 'OPEN' ? 'rgba(0,255,0,0.12)' : a === 'BUSY' ? 'rgba(215, 52, 11,0.12)' : 'rgba(255,255,255,0.08)') : 'transparent', border: `1px solid ${availFilter === a ? (a === 'OPEN' ? '#00ff00' : a === 'BUSY' ? 'var(--accent)' : 'rgba(255,255,255,0.3)') : 'rgba(255,255,255,0.1)'}`, color: availFilter === a ? (a === 'OPEN' ? '#00ff00' : a === 'BUSY' ? 'var(--accent)' : 'var(--fg)') : 'rgba(255,255,255,0.5)', fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {a === 'all' ? 'ALL' : a}
              </button>
            ))}
          </div>
        </div>
        <div className="filter-row" style={{ marginBottom: 24 }}>
          {ROLES.map(r => (
            <button key={r} onClick={() => setRoleFilter(r)}
              style={{
                padding: '8px 14px',
                background: roleFilter === r ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                color: roleFilter === r ? 'var(--bg)' : 'var(--fg)',
                border: roleFilter === r ? 'none' : '1px solid rgba(255,255,255,0.1)',
                fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1, cursor: 'pointer',
                whiteSpace: 'nowrap', flexShrink: 0,
              }}>
              {r}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {[0, 1, 2, 3, 4, 5].map(i => (
              <div key={i} className="skeleton" style={{ height: 140, borderRadius: 14 }} />
            ))}
          </div>
        ) : loadError ? (
          <EmptyState
            icon={<User size={28} />}
            title="Couldn't load the crew directory"
            subtitle={loadError}
            action={<button onClick={() => loadCrew()} style={{ marginTop: 16, padding: '8px 20px', background: 'var(--accent)', color: 'var(--bg)', border: 'none', borderRadius: 8, fontFamily: 'var(--mono)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Retry</button>}
          />
        ) : crew.length === 0 ? (
          <EmptyState
            icon={<User size={28} />}
            title="No crew members found"
            subtitle="Try adjusting your search or filters"
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {crew.map(member => (
              <Link key={member.id} href={`/crew/${member.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{
                padding: 24, background: '#0a0a0a',
                border: '1px solid rgba(255,255,255,0.06)', transition: 'all 0.2s', height: '100%',
                borderRadius: 14,
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'rgba(215, 52, 11,0.3)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.6), 0 0 28px rgba(215, 52, 11,0.06)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <Avatar src={member.avatar_url} name={member.username} size={44} />
                    {onlineIds.has(member.id) && (
                      <span title="Online now" style={{ position: 'absolute', bottom: 0, right: 0, width: 11, height: 11, borderRadius: '50%', background: '#10b981', border: '2px solid #050a14', boxShadow: '0 0 6px rgba(16,185,129,0.8)' }} />
                    )}
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 'bold' }}>{member.username}</div>
                    {member.role && <div style={{ fontSize: 9, color: 'var(--accent)', letterSpacing: 1, marginTop: 2 }}>{member.role.toUpperCase()}</div>}
                  </div>
                  <div style={{ marginLeft: 'auto' }}>
                    <span style={{
                      fontSize: 9, padding: '3px 8px',
                      border: `1px solid ${member.status === 'OPEN' ? '#00ff00' : '#666'}`,
                      color: member.status === 'OPEN' ? '#00ff00' : '#666',
                      fontFamily: 'var(--mono)'
                    }}>
                      {member.status}
                    </span>
                  </div>
                </div>

                {member.bio && (
                  <p style={{ fontSize: 12, lineHeight: 1.5, opacity: 0.6, marginBottom: 12 }}>{member.bio}</p>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                  {member.location && (
                    <div style={{ fontSize: 9, opacity: 0.4 }}>{member.location}</div>
                  )}
                  {member.discord_username && (
                    <div style={{ fontSize: 9, opacity: 0.5, fontFamily: 'var(--mono)' }}>
                      Discord: {member.discord_username}
                    </div>
                  )}
                </div>
              </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
