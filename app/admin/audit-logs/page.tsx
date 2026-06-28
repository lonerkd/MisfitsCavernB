'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Filter, Download, Search, Clock, User, Zap } from 'lucide-react';
import { ProtectedPage } from '@/lib/permissions/access-control';
import { getAuditLogs, getActivitySummary, getMostActiveUsers, type AuditLog, type AuditAction } from '@/lib/supabase/audit';

const ACTIONS: AuditAction[] = [
  'user_login',
  'user_logout',
  'user_created',
  'user_deleted',
  'role_changed',
  'project_created',
  'project_deleted',
  'project_updated',
  'script_created',
  'script_deleted',
  'script_updated',
  'crew_invited',
  'crew_removed',
  'crew_role_changed',
  'job_created',
  'job_closed',
  'admin_action',
];

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<AuditAction | ''>('');
  const [activitySummary, setActivitySummary] = useState({ loginsLastHour: 0, actionsLast24h: 0, projectsCreated24h: 0 });
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [totalLogs, setTotalLogs] = useState(0);

  const pageSize = 50;

  useEffect(() => {
    loadLogs();
    loadActivitySummary();
  }, [searchTerm, actionFilter, page]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const { logs: auditLogs, count } = await getAuditLogs(pageSize, page * pageSize, {
        action: actionFilter || undefined,
      });

      setLogs(
        auditLogs.filter(
          log =>
            !searchTerm ||
            log.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.resource_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.action.toLowerCase().includes(searchTerm.toLowerCase()),
        ),
      );
      setTotalLogs(count);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadActivitySummary = async () => {
    try {
      const summary = await getActivitySummary();
      setActivitySummary(summary);

      const users = await getMostActiveUsers(5);
      setActiveUsers(users);
    } catch (error) {
      console.error('Failed to load activity summary:', error);
    }
  };

  const exportLogs = () => {
    const csv = [
      ['Timestamp', 'User', 'Action', 'Resource Type', 'Resource ID', 'Details'],
      ...logs.map(log => [
        new Date(log.created_at).toLocaleString(),
        log.username || 'Unknown',
        log.action,
        log.resource_type,
        log.resource_id || '-',
        JSON.stringify(log.details),
      ]),
    ]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString()}.csv`;
    a.click();
  };

  const getActionColor = (action: AuditAction) => {
    if (action.includes('created') || action.includes('invited')) return '#10b981';
    if (action.includes('deleted') || action.includes('removed')) return '#ef4444';
    if (action.includes('changed') || action.includes('updated')) return '#f59e0b';
    if (action.includes('login') || action.includes('logout')) return '#6366f1';
    return '#0099ff';
  };

  const totalPages = Math.ceil(totalLogs / pageSize);

  return (
    <ProtectedPage requiredPermission="manage_users">
      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)' }}>
        {/* Header */}
        <header
          style={{
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
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link href="/admin" style={{ color: 'var(--fg)', textDecoration: 'none' }}>
              <ArrowLeft size={20} />
            </Link>
            <h1 style={{ fontFamily: 'var(--display)', fontSize: '1.2rem', letterSpacing: 4, margin: 0 }}>
              AUDIT LOGS
            </h1>
          </div>
          <button
            onClick={exportLogs}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              background: 'rgba(0,153,255,0.1)',
              border: '1px solid rgba(0,153,255,0.3)',
              color: '#0099ff',
              borderRadius: 4,
              fontFamily: 'var(--mono)',
              fontSize: 10,
              cursor: 'pointer',
            }}
          >
            <Download size={14} /> EXPORT
          </button>
        </header>

        {/* Content */}
        <div style={{ marginTop: 60, padding: '40px 24px', maxWidth: 1400, margin: '60px auto 0' }}>
          {/* Navigation */}
          <div
            style={{
              display: 'flex',
              gap: 24,
              marginBottom: 40,
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              paddingBottom: 16,
            }}
          >
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
            <Link
              href="/admin/users"
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 11,
                letterSpacing: 2,
                color: 'var(--fg-muted)',
                textDecoration: 'none',
              }}
            >
              USERS
            </Link>
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
            <span
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 11,
                letterSpacing: 2,
                color: 'var(--accent)',
                borderBottom: '2px solid var(--accent)',
                paddingBottom: 8,
              }}
            >
              AUDIT LOGS
            </span>
          </div>

          {/* Activity Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
            {[
              { label: 'Logins (1h)', value: activitySummary.loginsLastHour, icon: User },
              { label: 'Actions (24h)', value: activitySummary.actionsLast24h, icon: Zap },
              { label: 'Projects Created (24h)', value: activitySummary.projectsCreated24h, icon: Clock },
            ].map(stat => (
              <div
                key={stat.label}
                style={{
                  padding: 16,
                  background: 'rgba(255,60,0,0.05)',
                  border: '1px solid rgba(255,60,0,0.2)',
                  borderRadius: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <stat.icon size={14} style={{ color: 'var(--accent)' }} />
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 9, opacity: 0.6 }}>{stat.label}</span>
                </div>
                <div style={{ fontSize: '1.5rem', fontFamily: 'var(--display)', fontWeight: 700, color: 'var(--accent)' }}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div style={{ marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
              <input
                type="text"
                placeholder="Search by user, action, or resource..."
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value);
                  setPage(0);
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 40px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 4,
                  fontFamily: 'var(--mono)',
                  fontSize: 11,
                  color: 'var(--fg)',
                  outline: 'none',
                }}
              />
            </div>
            <select
              value={actionFilter}
              onChange={e => {
                setActionFilter(e.target.value as AuditAction | '');
                setPage(0);
              }}
              style={{
                padding: '10px 12px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 4,
                fontFamily: 'var(--mono)',
                fontSize: 10,
                color: 'var(--fg)',
                outline: 'none',
              }}
            >
              <option value="">All Actions</option>
              {ACTIONS.map(action => (
                <option key={action} value={action}>
                  {action.replace(/_/g, ' ').toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Logs Table */}
          <div style={{ overflowX: 'auto', marginBottom: 24 }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontFamily: 'var(--mono)',
                fontSize: 11,
              }}
            >
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: 12, textAlign: 'left', color: 'var(--fg-muted)', fontWeight: 600 }}>TIMESTAMP</th>
                  <th style={{ padding: 12, textAlign: 'left', color: 'var(--fg-muted)', fontWeight: 600 }}>USER</th>
                  <th style={{ padding: 12, textAlign: 'left', color: 'var(--fg-muted)', fontWeight: 600 }}>ACTION</th>
                  <th style={{ padding: 12, textAlign: 'left', color: 'var(--fg-muted)', fontWeight: 600 }}>RESOURCE</th>
                  <th style={{ padding: 12, textAlign: 'left', color: 'var(--fg-muted)', fontWeight: 600 }}>DETAILS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} style={{ padding: 24, textAlign: 'center', opacity: 0.5 }}>
                      LOADING...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: 24, textAlign: 'center', opacity: 0.5 }}>
                      NO LOGS FOUND
                    </td>
                  </tr>
                ) : (
                  logs.map(log => (
                    <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: 12, opacity: 0.7 }}>
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td style={{ padding: 12 }}>
                        <span
                          style={{
                            background: 'rgba(0,153,255,0.1)',
                            padding: '2px 8px',
                            borderRadius: 3,
                            color: '#0099ff',
                          }}
                        >
                          {log.username || 'Unknown'}
                        </span>
                      </td>
                      <td style={{ padding: 12 }}>
                        <span
                          style={{
                            background: `${getActionColor(log.action)}20`,
                            padding: '2px 8px',
                            borderRadius: 3,
                            color: getActionColor(log.action),
                          }}
                        >
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={{ padding: 12, opacity: 0.7 }}>
                        {log.resource_type}
                        {log.resource_id && ` (${log.resource_id})`}
                      </td>
                      <td style={{ padding: 12, opacity: 0.6, fontSize: 9 }}>
                        {Object.keys(log.details).length > 0
                          ? JSON.stringify(log.details).substring(0, 50) + '...'
                          : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 24 }}>
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                style={{
                  padding: '8px 12px',
                  background: page === 0 ? 'rgba(255,255,255,0.02)' : 'rgba(255,60,0,0.1)',
                  border: '1px solid rgba(255,60,0,0.2)',
                  color: page === 0 ? 'rgba(255,255,255,0.3)' : 'var(--accent)',
                  borderRadius: 4,
                  fontFamily: 'var(--mono)',
                  fontSize: 10,
                  cursor: page === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                ← PREV
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px' }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, opacity: 0.6 }}>
                  Page {page + 1} of {totalPages} ({totalLogs} total)
                </span>
              </div>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                style={{
                  padding: '8px 12px',
                  background: page >= totalPages - 1 ? 'rgba(255,255,255,0.02)' : 'rgba(255,60,0,0.1)',
                  border: '1px solid rgba(255,60,0,0.2)',
                  color: page >= totalPages - 1 ? 'rgba(255,255,255,0.3)' : 'var(--accent)',
                  borderRadius: 4,
                  fontFamily: 'var(--mono)',
                  fontSize: 10,
                  cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
                }}
              >
                NEXT →
              </button>
            </div>
          )}

          {/* Most Active Users */}
          {activeUsers.length > 0 && (
            <div style={{ padding: 24, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}>
              <h3
                style={{
                  fontFamily: 'var(--display)',
                  fontSize: '1rem',
                  letterSpacing: 2,
                  marginBottom: 16,
                  marginTop: 0,
                }}
              >
                MOST ACTIVE USERS (7 DAYS)
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                {activeUsers.map(user => (
                  <div key={user.userId} style={{ padding: 12, background: 'rgba(0,153,255,0.05)', borderRadius: 4 }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 10, marginBottom: 4 }}>
                      {user.username}
                    </div>
                    <div style={{ fontFamily: 'var(--display)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent)' }}>
                      {user.actionCount}
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 8, opacity: 0.5 }}>actions</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedPage>
  );
}
