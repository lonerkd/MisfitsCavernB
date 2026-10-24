'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useLoad } from '@/lib/hooks/useLoad';
import Link from 'next/link';
import { ArrowLeft, Filter, Download, Search, Clock, User, Zap } from 'lucide-react';
import { ProtectedPage } from '@/lib/os';
import { Input } from '@/components/ui/Input';
import { readable } from '@/lib/util/color';
import { actionTone, describeAction, describeDetails, resourceHref } from '@/lib/audit/describe';
import { getAuditLogs, getActivitySummary, getMostActiveUsers, type AuditAction } from '@/lib/supabase/audit';
import { auditLogsToCsv, downloadCsv, fetchAllAuditLogs } from '@/lib/audit/export';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';

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
  'admin_close_job',
  'admin_hide_message',
  'admin_unhide_message',
  'admin_suspend_user',
  'admin_unsuspend_user',
];

const NO_ACTIVITY = { loginsLastHour: 0, actionsLast24h: 0, projectsCreated24h: 0 };

export default function AuditLogsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<AuditAction | ''>('');
  const [page, setPage] = useState(0);
  const { toast } = useToast();

  const pageSize = 50;

  const fetched = useLoad(`${page}:${actionFilter}`, () => getAuditLogs(pageSize, page * pageSize, { action: actionFilter || undefined }));
  const loading = fetched.loading;
  const totalLogs = fetched.data?.count ?? 0;
  // The search narrows the page already loaded.
  const logs = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return (fetched.data?.logs ?? []).filter(
      log =>
        !term ||
        log.username?.toLowerCase().includes(term) ||
        log.resource_id?.toLowerCase().includes(term) ||
        log.action.toLowerCase().includes(term),
    );
  }, [fetched.data, searchTerm]);

  const summary = useLoad('summary', async () => ({ activity: await getActivitySummary(), users: await getMostActiveUsers(5) }));
  const activitySummary = summary.data?.activity ?? NO_ACTIVITY;
  const activeUsers: any[] = summary.data?.users ?? [];
  useEffect(() => { if (fetched.error) console.error('Failed to load audit logs:', fetched.error); }, [fetched.error]);
  useEffect(() => { if (summary.error) console.error('Failed to load activity summary:', summary.error); }, [summary.error]);

  const exportLogs = () => {
    downloadCsv(auditLogsToCsv(logs), `audit-logs-page-${page + 1}-${new Date().toISOString()}.csv`);
  };

  // Every row the action filter and the search match, read from the database in batches.
  const [exportingAll, setExportingAll] = useState(false);
  const exportAllMatches = async () => {
    setExportingAll(true);
    try {
      const all = await fetchAllAuditLogs(supabase, { action: actionFilter || undefined, search: searchTerm });
      if (all.length === 0) { toast('No logs match — nothing to export', 'info'); return; }
      downloadCsv(auditLogsToCsv(all), `audit-logs-all-${new Date().toISOString()}.csv`);
      toast(`Exported ${all.length} log${all.length === 1 ? '' : 's'}`, 'success');
    } catch (e) {
      toast(`Could not export: ${e instanceof Error ? e.message : String(e)}`, 'error');
    } finally {
      setExportingAll(false);
    }
  };

  const actionHex = actionTone;

  const totalPages = Math.ceil(totalLogs / pageSize);

  return (
    <ProtectedPage require="admin">
      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)' }}>
        <header
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: 60,
            background: 'var(--surface)',
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid rgba(var(--ink-rgb), 0.04)',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 100,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link href="/admin" aria-label="Back to admin" style={{ color: 'var(--fg)', textDecoration: 'none' }}>
              <ArrowLeft size={20} />
            </Link>
            <h1 style={{ fontFamily: 'var(--display)', fontSize: '1.2rem', letterSpacing: '-0.02em', margin: 0 }}>
              AUDIT LOGS
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { label: 'EXPORT PAGE', title: 'Download the rows shown on this page as CSV', onClick: exportLogs, busy: false },
              { label: exportingAll ? 'EXPORTING…' : 'EXPORT ALL MATCHES', title: 'Download every log the search and action filter match, across all pages, as CSV', onClick: exportAllMatches, busy: exportingAll },
            ].map(b => (
              <button
                key={b.title}
                onClick={b.onClick}
                disabled={b.busy}
                aria-busy={b.busy}
                title={b.title}
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
                  fontSize: 11,
                  cursor: b.busy ? 'wait' : 'pointer',
                  opacity: b.busy ? 0.6 : 1,
                }}
              >
                <Download size={14} /> {b.label}
              </button>
            ))}
          </div>
        </header>

        <div style={{ marginTop: 60, padding: '40px 24px', maxWidth: 1400, margin: '60px auto 0' }}>
          <div
            style={{
              display: 'flex',
              gap: 24,
              marginBottom: 40,
              borderBottom: '1px solid rgba(var(--ink-rgb), 0.1)',
              paddingBottom: 16,
            }}
          >
            <Link
              href="/admin"
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 11,
                letterSpacing: 'var(--caps-track)',
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
                letterSpacing: 'var(--caps-track)',
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
                letterSpacing: 'var(--caps-track)',
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
                letterSpacing: 'var(--caps-track)',
                color: 'var(--accent)',
                borderBottom: '2px solid var(--accent)',
                paddingBottom: 8,
              }}
            >
              AUDIT LOGS
            </span>
          </div>

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
                  background: 'rgba(232, 67, 26,0.05)',
                  border: '1px solid rgba(232, 67, 26,0.2)',
                  borderRadius: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <stat.icon size={14} style={{ color: 'var(--accent)' }} />
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)' }}>{stat.label}</span>
                </div>
                <div style={{ fontSize: '1.5rem', fontFamily: 'var(--display)', fontWeight: 700, color: 'var(--accent)' }}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <Input
                icon={<Search size={16} />}
                label="Search"
                placeholder="Search by user, action, or resource..."
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value);
                  setPage(0);
                }}
              />
            </div>
            <select
              aria-label="Filter by action"
              value={actionFilter}
              onChange={e => {
                setActionFilter(e.target.value as AuditAction | '');
                setPage(0);
              }}
              style={{
                padding: '10px 12px',
                background: 'rgba(var(--ink-rgb), 0.05)',
                border: '1px solid rgba(var(--ink-rgb), 0.1)',
                borderRadius: 4,
                fontFamily: 'var(--mono)',
                fontSize: 11,
                color: 'var(--fg)',
                outline: 'none',
              }}
            >
              <option value="">All Actions</option>
              {ACTIONS.map(action => (
                <option key={action} value={action}>
                  {describeAction(action)}
                </option>
              ))}
            </select>
          </div>

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
                <tr style={{ borderBottom: '1px solid rgba(var(--ink-rgb), 0.1)' }}>
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
                    <tr key={log.id} style={{ borderBottom: '1px solid rgba(var(--ink-rgb), 0.05)' }}>
                      <td style={{ padding: 12, opacity: 0.7 }}>
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td style={{ padding: 12 }}>
                        <span
                          style={{
                            background: 'rgba(0,153,255,0.1)',
                            padding: '2px 8px',
                            borderRadius: 4,
                            color: '#0099ff',
                          }}
                        >
                          {log.username || 'Deleted account'}
                        </span>
                      </td>
                      <td style={{ padding: 12 }}>
                        <span
                          style={{
                            background: `${actionHex(log.action)}20`,
                            padding: '2px 8px',
                            borderRadius: 4,
                            color: readable(actionHex(log.action)),
                          }}
                        >
                          {describeAction(log.action, log.resource_type)}
                        </span>
                      </td>
                      <td style={{ padding: 12, opacity: 0.7 }}>
                        {log.resource_type}
                        {log.resource_id && (resourceHref(log.resource_type, log.resource_id)
                          ? <> · <Link href={resourceHref(log.resource_type, log.resource_id)!} style={{ color: 'var(--accent)' }}>Look at it</Link></>
                          : ` (${log.resource_id})`)}
                      </td>
                      <td style={{ padding: 12, fontSize: 'max(9px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)' }}>
                        {describeDetails(log.details)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 24 }}>
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                style={{
                  padding: '8px 12px',
                  background: page === 0 ? 'rgba(var(--ink-rgb), 0.02)' : 'rgba(232, 67, 26,0.1)',
                  border: '1px solid rgba(232, 67, 26,0.2)',
                  color: page === 0 ? 'rgba(var(--ink-rgb), 0.3)' : 'var(--accent)',
                  borderRadius: 4,
                  fontFamily: 'var(--mono)',
                  fontSize: 11,
                  cursor: page === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                ← PREV
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px' }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-dim)' }}>
                  Page {page + 1} of {totalPages} ({totalLogs} total)
                </span>
              </div>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                style={{
                  padding: '8px 12px',
                  background: page >= totalPages - 1 ? 'rgba(var(--ink-rgb), 0.02)' : 'rgba(232, 67, 26,0.1)',
                  border: '1px solid rgba(232, 67, 26,0.2)',
                  color: page >= totalPages - 1 ? 'rgba(var(--ink-rgb), 0.3)' : 'var(--accent)',
                  borderRadius: 4,
                  fontFamily: 'var(--mono)',
                  fontSize: 11,
                  cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
                }}
              >
                NEXT →
              </button>
            </div>
          )}

          {activeUsers.length > 0 && (
            <div style={{ padding: 24, background: 'rgba(var(--ink-rgb), 0.02)', border: '1px solid rgba(var(--ink-rgb), 0.08)', borderRadius: 8 }}>
              <h2
                style={{
                  fontFamily: 'var(--display)',
                  fontSize: '1rem',
                  letterSpacing: '-0.02em',
                  marginBottom: 16,
                  marginTop: 0,
                }}
              >
                MOST ACTIVE USERS (7 DAYS)
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                {activeUsers.map(user => (
                  <div key={user.userId} style={{ padding: 12, background: 'rgba(0,153,255,0.05)', borderRadius: 4 }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 11, marginBottom: 4 }}>
                      {user.username}
                    </div>
                    <div style={{ fontFamily: 'var(--display)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent)' }}>
                      {user.actionCount}
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)' }}>actions</div>
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
