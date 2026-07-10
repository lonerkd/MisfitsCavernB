'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getProjectCrew, assignCrewMember, updateCrewMemberRole, removeCrewMember, type CrewRole } from '@/lib/supabase/crew-management';
import { searchProfiles } from '@/lib/supabase/profiles';
import { useToast } from './Toast';
import { ActionButton, IfAccess } from '@/lib/permissions/access-control';

interface CrewMember {
  id: string;
  project_id: string;
  user_id: string;
  role: CrewRole;
  joined_at: string;
  username?: string;
  avatar_url?: string;
}

const CREW_ROLES: { role: CrewRole; label: string; description: string }[] = [
  { role: 'owner', label: 'Owner', description: 'Full access, can manage crew' },
  { role: 'lead', label: 'Lead', description: 'Can edit project and manage crew' },
  { role: 'contributor', label: 'Contributor', description: 'Can edit project content' },
  { role: 'viewer', label: 'Viewer', description: 'Read-only access' },
];

interface Props {
  projectId: string;
  currentUserId: string;
  onClose: () => void;
}

export function CrewManagementModal({ projectId, currentUserId, onClose }: Props) {
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState<CrewRole>('contributor');
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);
  const { toast } = useToast();

  const loadCrew = useCallback(async () => {
    try {
      setLoading(true);
      const crewData = await getProjectCrew(projectId);
      setCrew(crewData);
    } catch (error) {
      console.error('Failed to load crew:', error);
      toast('Failed to load crew members', 'error');
    } finally {
      setLoading(false);
    }
  }, [projectId, toast]);

  const searchUsers = useCallback(async () => {
    try {
      const results = await searchProfiles(searchQuery);
      setSearchResults(results.filter(u => !crew.some(c => c.user_id === u.id)));
    } catch (error) {
      console.error('Failed to search users:', error);
    }
  }, [searchQuery, crew]);

  useEffect(() => {
    loadCrew();
  }, [loadCrew]);

  useEffect(() => {
    if (searchQuery.length > 2) {
      searchUsers();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, searchUsers]);

  const handleAddMember = async (userId: string) => {
    try {
      setSavingMemberId(userId);
      await assignCrewMember(projectId, userId, selectedRole, currentUserId);
      await loadCrew();
      setSearchQuery('');
      toast(`Member added as ${selectedRole}`, 'success');
    } catch (error) {
      console.error('Failed to add member:', error);
      toast('Failed to add member', 'error');
    } finally {
      setSavingMemberId(null);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: CrewRole) => {
    try {
      setSavingMemberId(userId);
      await updateCrewMemberRole(projectId, userId, newRole, currentUserId);
      await loadCrew();
      toast('Role updated', 'success');
    } catch (error) {
      console.error('Failed to update role:', error);
      toast('Failed to update role', 'error');
    } finally {
      setSavingMemberId(null);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Remove this crew member from the project?')) return;

    try {
      setSavingMemberId(userId);
      await removeCrewMember(projectId, userId, currentUserId);
      await loadCrew();
      toast('Member removed', 'success');
    } catch (error) {
      console.error('Failed to remove member:', error);
      toast('Failed to remove member', 'error');
    } finally {
      setSavingMemberId(null);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={e => e.stopPropagation()}
          style={{
            background: '#0a0a0a',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 16,
            padding: 32,
            width: '90vw',
            maxWidth: 600,
            maxHeight: '80vh',
            overflowY: 'auto',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h2 style={{ fontFamily: 'var(--display)', fontSize: '1.2rem', letterSpacing: 2, margin: 0 }}>
              MANAGE CREW
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--fg)',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Add Member Section */}
          <IfAccess permission="manage_crew">
            <div style={{ marginBottom: 24, padding: 16, background: 'rgba(215, 52, 11,0.05)', borderRadius: 8 }}>
              <h3 style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 2, margin: '0 0 12px 0', opacity: 0.7 }}>
                ADD NEW MEMBER
              </h3>

              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 4,
                      fontFamily: 'var(--mono)',
                      fontSize: 10,
                      color: 'var(--fg)',
                      outline: 'none',
                    }}
                  />
                  {searchResults.length > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: 4,
                        background: '#111',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 4,
                        zIndex: 10,
                      }}
                    >
                      {searchResults.map(user => (
                        <button
                          key={user.id}
                          onClick={() => {
                            setSearchQuery('');
                            handleAddMember(user.id);
                          }}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--fg)',
                            textAlign: 'left',
                            fontFamily: 'var(--mono)',
                            fontSize: 10,
                            cursor: 'pointer',
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                          }}
                        >
                          {user.username}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <select
                  value={selectedRole}
                  onChange={e => setSelectedRole(e.target.value as CrewRole)}
                  style={{
                    padding: '8px 12px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 4,
                    fontFamily: 'var(--mono)',
                    fontSize: 10,
                    color: 'var(--fg)',
                    outline: 'none',
                  }}
                >
                  {CREW_ROLES.map(r => (
                    <option key={r.role} value={r.role}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ fontFamily: 'var(--mono)', fontSize: 8, opacity: 0.5 }}>
                {CREW_ROLES.find(r => r.role === selectedRole)?.description}
              </div>
            </div>
          </IfAccess>

          {/* Current Crew */}
          <div>
            <h3 style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 2, margin: '0 0 12px 0', opacity: 0.7 }}>
              CURRENT CREW ({crew.length})
            </h3>

            {loading ? (
              <div style={{ padding: 24, textAlign: 'center', opacity: 0.5 }}>LOADING...</div>
            ) : crew.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', opacity: 0.5 }}>NO CREW MEMBERS YET</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {crew.map(member => (
                  <div
                    key={member.id}
                    style={{
                      padding: 12,
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 4,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, marginBottom: 4 }}>
                        {member.username || 'Unknown'}
                      </div>
                      {/* Same gate as the Remove button — without manage_crew
                          the dropdown was enabled but every change died at RLS */}
                      <IfAccess permission="manage_crew" fallback={
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: '#0099ff' }}>
                          {CREW_ROLES.find(r => r.role === member.role)?.label || member.role}
                        </span>
                      }>
                      <select
                        value={member.role}
                        onChange={e => handleUpdateRole(member.user_id, e.target.value as CrewRole)}
                        disabled={savingMemberId === member.user_id}
                        style={{
                          padding: '4px 8px',
                          background: 'rgba(0,153,255,0.1)',
                          border: '1px solid rgba(0,153,255,0.3)',
                          borderRadius: 3,
                          fontFamily: 'var(--mono)',
                          fontSize: 9,
                          color: '#0099ff',
                          cursor: 'pointer',
                          opacity: savingMemberId === member.user_id ? 0.5 : 1,
                        }}
                      >
                        {CREW_ROLES.map(r => (
                          <option key={r.role} value={r.role}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                      </IfAccess>
                    </div>

                    <IfAccess permission="manage_crew">
                      <button
                        onClick={() => handleRemoveMember(member.user_id)}
                        disabled={savingMemberId === member.user_id}
                        style={{
                          background: 'rgba(239,68,68,0.1)',
                          border: '1px solid rgba(239,68,68,0.3)',
                          color: '#ef4444',
                          padding: '6px 12px',
                          borderRadius: 4,
                          fontFamily: 'var(--mono)',
                          fontSize: 9,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          opacity: savingMemberId === member.user_id ? 0.5 : 1,
                        }}
                      >
                        <Trash2 size={12} /> REMOVE
                      </button>
                    </IfAccess>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Role Legend */}
          <div style={{ marginTop: 24, padding: 16, background: 'rgba(99,102,241,0.05)', borderRadius: 8 }}>
            <h3 style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1, margin: '0 0 8px 0', opacity: 0.7 }}>
              ROLE PERMISSIONS
            </h3>
            {CREW_ROLES.map(role => (
              <div key={role.role} style={{ fontFamily: 'var(--mono)', fontSize: 9, marginBottom: 6, opacity: 0.6 }}>
                <strong>{role.label}</strong>: {role.description}
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
