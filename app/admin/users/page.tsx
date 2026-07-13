'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { ProtectedPage } from '@/lib/os';
import { ArrowLeft, Shield, Edit2, Trash2 } from 'lucide-react';
import { ActionButton, IfAccess } from '@/lib/os';

interface UserRow {
  id: string;
  username: string;
  email?: string;
  role: string;
  status: 'OPEN' | 'BUSY';
  is_admin?: boolean;
  created_at: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setUsers(data as UserRow[]);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAdminRole = async (userId: string, currentAdmin: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_admin: !currentAdmin })
        .eq('id', userId);

      if (!error) {
        setUsers(users.map(u => u.id === userId ? { ...u, is_admin: !currentAdmin } : u));
      }
    } catch (error) {
      console.error('Failed to update user role:', error);
    }
  };

  return (
    <ProtectedPage requiredPermission="manage_users">
      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)' }}>
        <header style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: 60,
          background: 'rgba(8,8,8,0.95)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 100,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link href="/admin" style={{ color: 'var(--fg)', textDecoration: 'none' }}>
              <ArrowLeft size={20} />
            </Link>
            <h1 style={{ fontFamily: 'var(--display)', fontSize: '1.2rem', letterSpacing: 4, margin: 0 }}>
              USER MANAGEMENT
            </h1>
          </div>
          <Link href="/" style={{ color: 'var(--fg-muted)', textDecoration: 'none', fontSize: 11 }}>
            ← BACK TO HOME
          </Link>
        </header>

        <div style={{ marginTop: 60, padding: '40px 24px', maxWidth: 1200, margin: '60px auto 0' }}>
          <div style={{ display: 'flex', gap: 24, marginBottom: 40, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 16 }}>
            <Link
              href="/admin"
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 11,
                letterSpacing: 2,
                color: 'var(--fg-muted)',
                textDecoration: 'none',
              }}
            >
              DASHBOARD
            </Link>
            <span style={{
              fontFamily: 'var(--mono)',
              fontSize: 11,
              letterSpacing: 2,
              color: 'var(--accent)',
              borderBottom: '2px solid var(--accent)',
              paddingBottom: 8,
            }}>
              USERS
            </span>
            <Link
              href="/admin/analytics"
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 11,
                letterSpacing: 2,
                color: 'var(--fg-muted)',
                textDecoration: 'none',
              }}
            >
              ANALYTICS
            </Link>
            <Link
              href="/admin/audit-logs"
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 11,
                letterSpacing: 2,
                color: 'var(--fg-muted)',
                textDecoration: 'none',
              }}
            >
              AUDIT LOGS
            </Link>
          </div>

          <div style={{
            overflowX: 'auto',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8,
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontFamily: 'var(--mono)',
              fontSize: 11,
            }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: 16, textAlign: 'left', color: 'var(--fg-muted)', fontWeight: 600 }}>
                    USERNAME
                  </th>
                  <th style={{ padding: 16, textAlign: 'left', color: 'var(--fg-muted)', fontWeight: 600 }}>
                    ROLE
                  </th>
                  <th style={{ padding: 16, textAlign: 'left', color: 'var(--fg-muted)', fontWeight: 600 }}>
                    STATUS
                  </th>
                  <th style={{ padding: 16, textAlign: 'left', color: 'var(--fg-muted)', fontWeight: 600 }}>
                    JOINED
                  </th>
                  <th style={{ padding: 16, textAlign: 'left', color: 'var(--fg-muted)', fontWeight: 600 }}>
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} style={{ padding: 24, textAlign: 'center', opacity: 0.5 }}>
                      LOADING...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: 24, textAlign: 'center', opacity: 0.5 }}>
                      NO USERS FOUND
                    </td>
                  </tr>
                ) : (
                  users.map(user => (
                    <tr
                      key={user.id}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        background: selectedUser === user.id ? 'rgba(215, 52, 11,0.05)' : undefined,
                      }}
                      onClick={() => setSelectedUser(selectedUser === user.id ? null : user.id)}
                    >
                      <td style={{ padding: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {user.is_admin && <Shield size={12} style={{ color: 'var(--accent)' }} />}
                          {user.username}
                        </div>
                      </td>
                      <td style={{ padding: 16 }}>
                        <span style={{
                          padding: '4px 8px',
                          background: user.is_admin ? 'rgba(215, 52, 11,0.1)' : 'rgba(0,153,255,0.1)',
                          border: `1px solid ${user.is_admin ? 'var(--accent)' : 'rgba(0,153,255,0.3)'}`,
                          borderRadius: 4,
                          color: user.is_admin ? 'var(--accent)' : '#0099ff',
                        }}>
                          {user.is_admin ? 'ADMIN' : 'USER'}
                        </span>
                      </td>
                      <td style={{ padding: 16 }}>
                        <span style={{
                          color: user.status === 'OPEN' ? '#00cc66' : '#ff9500',
                        }}>
                          {user.status}
                        </span>
                      </td>
                      <td style={{ padding: 16, opacity: 0.6 }}>
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: 16 }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <ActionButton
                            permission="manage_users"
                            onClick={() => toggleAdminRole(user.id, user.is_admin || false)}
                            style={{
                              display: 'flex',
                              gap: 4,
                              alignItems: 'center',
                              padding: '6px 12px',
                              background: 'transparent',
                              border: '1px solid rgba(215, 52, 11,0.3)',
                              color: 'var(--accent)',
                              borderRadius: 4,
                              fontSize: 10,
                              fontFamily: 'var(--mono)',
                            }}
                            title={user.is_admin ? 'Remove admin' : 'Make admin'}
                            disabledTooltip="Only admins can manage user roles"
                          >
                            <Shield size={10} />
                          </ActionButton>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 24, padding: 16, background: 'rgba(0,153,255,0.05)', border: '1px solid rgba(0,153,255,0.2)', borderRadius: 4, fontSize: 11 }}>
            <p style={{ margin: 0, opacity: 0.7 }}>
              <strong>Total Users:</strong> {users.length}
              {' | '}
              <strong>Admins:</strong> {users.filter(u => u.is_admin).length}
            </p>
          </div>
        </div>
      </div>
    </ProtectedPage>
  );
}
