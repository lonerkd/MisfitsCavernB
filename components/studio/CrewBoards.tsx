'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/Toast';
import { useEscapeKey } from '@/lib/useEscapeKey';
import Avatar from '@/components/Avatar';
import { usePillZone } from '@/lib/context/PillContext';
import { searchProfiles, inviteToCrew } from '@/lib/supabase/profiles';
import { List as Share2, Trash2, Search } from 'lucide-react';

export function BeatCard({ beat, index, onDelete, onPush }: { beat: any; index: number; onDelete?: (id: string) => void; onPush?: (beat: any) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ delay: index * 0.05 }}
      style={{
        padding: 20,
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${beat.color || 'rgba(255,255,255,0.06)'}`,
        borderTop: `4px solid ${beat.color || 'var(--accent)'}`,
        borderRadius: 8,
        minHeight: 140,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        transition: 'box-shadow 0.3s',
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 12px 36px rgba(0,0,0,0.6), 0 0 24px ${beat.color || 'rgba(215, 52, 11,0.08)'}`)}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
    >
      <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 8 }}>
        {onPush && (
          <button
            onClick={() => onPush(beat)}
            style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer' }}
            title="Push to ScriptOS"
            onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
            onMouseLeave={e => e.currentTarget.style.color = '#444'}
          >
            <Share2 size={12} />
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(beat.id)}
            style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer' }}
            title="Delete Beat"
            onMouseEnter={e => e.currentTarget.style.color = '#ff4444'}
            onMouseLeave={e => e.currentTarget.style.color = '#444'}
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, color: beat.color }}>{beat.title}</div>
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.5, color: '#ccc' }}>{beat.content}</div>
      </div>
      <div style={{ fontSize: 9, color: 'var(--fg-subtle)', marginTop: 12, fontFamily: 'var(--mono)' }}>SEQ: {index + 1}</div>
    </motion.div>
  );
}

export function CrewMemberCard({ member, index, isOnline }: { member: any; index: number; isOnline?: boolean }) {
  const router = useRouter();

  const zoneHandlers = usePillZone(member.userId ? {
    module: 'studio',
    title: member.name,
    accent: isOnline ? '#10b981' : undefined,
    fields: [
      { label: 'Role', value: member.role || '—' },
      { label: 'Status', value: isOnline ? 'Online' : (member.status || 'pending'), color: isOnline ? '#10b981' : undefined },
    ],
    actions: [
      { id: 'message-crew', label: '→ Message in Lounge', onClick: () => router.push('/lounge') },
    ],
  } : null, 2);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ x: 2 }}
      transition={{ delay: index * 0.05 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: 16,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 12,
        transition: 'border-color 0.3s, box-shadow 0.3s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(215, 52, 11,0.25)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.5)'; zoneHandlers.onMouseEnter(); }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.boxShadow = 'none'; zoneHandlers.onMouseLeave(); }}
      onClick={zoneHandlers.onClick}
    >
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <Avatar src={member.avatar} name={member.name} size={44} />
        {isOnline && (
          <span title="Online now" style={{ position: 'absolute', bottom: 0, right: 0, width: 11, height: 11, borderRadius: '50%', background: '#10b981', border: '2px solid #0a0a0a', boxShadow: '0 0 6px rgba(16,185,129,0.8)' }} />
        )}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{member.name}</div>
        <div style={{ fontSize: 10, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: 1 }}>{member.role}</div>
      </div>
      <div style={{ fontSize: 9, padding: '4px 8px', background: member.status === 'confirmed' ? 'rgba(0,255,100,0.1)' : 'rgba(255,255,255,0.05)', color: member.status === 'confirmed' ? '#00cc66' : '#666', borderRadius: 4, textTransform: 'uppercase' }}>
        {member.status || 'pending'}
      </div>
    </motion.div>
  );
}

export function RecruitModal({ isOpen, onClose, projectId, onSuccess }: { isOpen: boolean; onClose: () => void; projectId: string; onSuccess: () => void }) {
  useEscapeKey(onClose, isOpen);
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [role, setRole] = useState('Production Assistant');

  const handleSearch = async () => {
    if (!query) return;
    setLoading(true);
    const users = await searchProfiles(query);
    setResults(users);
    setLoading(false);
  };

  const handleInvite = async () => {
    if (!selectedUser || !projectId) return;
    setLoading(true);
    try {
      await inviteToCrew(projectId, selectedUser.id, role);
      toast(`Invited ${selectedUser.username || 'member'} as ${role || 'crew'}`, 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast(err?.message || 'Failed to invite', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            style={{ width: 500, background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 32 }}
          >
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Recruit Talent</h2>
            <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 24 }}>Search the Misfits database for crew members and cast.</p>

            {!selectedUser ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ position: 'relative' }}>
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    placeholder="Search by username..."
                    style={{ width: '100%', background: '#0a0a0a', border: '1px solid #333', color: '#fff', padding: '12px 40px 12px 16px', borderRadius: 8, fontSize: 13 }}
                  />
                  <Search size={16} style={{ position: 'absolute', right: 14, top: 14, color: '#666' }} />
                </div>

                <div style={{ minHeight: 200, maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {loading ? <div style={{ textAlign: 'center', padding: 40, color: '#444' }}>Searching...</div> :
                   results.map(u => (
                    <div
                      key={u.id}
                      onClick={() => setSelectedUser(u)}
                      style={{ padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    >
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                        {u.username.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ fontSize: 14 }}>{u.username}</div>
                    </div>
                  ))}
                  {results.length === 0 && !loading && query && <div style={{ textAlign: 'center', padding: 40, color: '#444' }}>No results found.</div>}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 12 }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--accent)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700 }}>
                      {selectedUser.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700 }}>{selectedUser.username}</div>
                      <div style={{ fontSize: 12, color: 'var(--accent)' }}>Active Professional</div>
                    </div>
                 </div>

                 <div>
                   <label style={{ fontSize: 9, textTransform: 'uppercase', color: '#666', marginBottom: 6, display: 'block' }}>Assigned Role</label>
                   <select
                     value={role}
                     onChange={e => setRole(e.target.value)}
                     style={{ width: '100%', background: '#0a0a0a', border: '1px solid #333', color: '#fff', padding: 12, borderRadius: 8, fontSize: 13 }}
                   >
                     <option>Director</option>
                     <option>Director of Photography</option>
                     <option>Lead Actor</option>
                     <option>Sound Mixer</option>
                     <option>Editor</option>
                     <option>Production Assistant</option>
                   </select>
                 </div>

                 <div style={{ display: 'flex', gap: 12 }}>
                    <Button variant="outline" onClick={() => setSelectedUser(null)} style={{ flex: 1 }}>Back</Button>
                    <Button onClick={handleInvite} disabled={loading} isLoading={loading} style={{ flex: 2 }}>
                      Send Invitation
                    </Button>
                 </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
