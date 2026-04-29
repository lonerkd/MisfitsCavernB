'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, User } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
  bio?: string;
  role?: string;
  location?: string;
  status: 'OPEN' | 'BUSY';
  discord_username?: string;
}

const ROLES = ['All', 'Director', 'DP / Cinematographer', 'Editor', 'Writer', 'Sound Designer', 'Colorist', 'Producer', 'Actor'];

export default function CrewPage() {
  const [crew, setCrew] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  useEffect(() => {
    loadCrew();
  }, []);

  const loadCrew = async () => {
    setLoading(true);
    try {
      let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });

      if (search) {
        query = query.or(`username.ilike.%${search}%,bio.ilike.%${search}%`);
      }

      if (roleFilter && roleFilter !== 'All') {
        query = query.eq('role', roleFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setCrew(data || []);
    } catch (error) {
      console.error(error);
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
        {/* Search + Role Filter */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
            <input type="text" placeholder="Search by name, skill, bio..." value={search}
              onChange={e => { setSearch(e.target.value); loadCrew(); }}
              style={{ width: '100%', padding: '10px 12px 10px 36px', background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)', color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 11 }} />
          </div>
          <div className="filter-row">
            {ROLES.map(r => (
              <button key={r} onClick={() => { setRoleFilter(r); loadCrew(); }}
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
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, opacity: 0.5, fontFamily: 'var(--mono)', fontSize: 11 }}>Loading crew...</div>
        ) : crew.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, opacity: 0.4 }}>
            <User size={32} style={{ margin: '0 auto 16px' }} />
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>No crew members found.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {crew.map(member => (
              <Link key={member.id} href={`/crew/${member.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{
                padding: 24, background: '#0a0a0a',
                border: '1px solid rgba(255,255,255,0.06)', transition: 'all 0.2s', height: '100%'
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,60,0,0.3)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                  {member.avatar_url ? (
                    <img src={member.avatar_url} alt={member.username}
                      style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%',
                      background: 'var(--accent)', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontFamily: 'var(--display)', fontSize: '1.1rem',
                      color: 'var(--bg)'
                    }}>
                      {member.username[0].toUpperCase()}
                    </div>
                  )}
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
