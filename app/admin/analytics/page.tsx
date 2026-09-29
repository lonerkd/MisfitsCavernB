'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { getPlatformStats } from '@/lib/supabase/stats';
import { ProtectedPage } from '@/lib/os';
import { ArrowLeft, TrendingUp, Users, Zap, Clock } from 'lucide-react';

interface Analytics {
  totalUsers: number;
  activeUsers: number;
  totalProjects: number;
  completedProjects: number;
  totalScripts: number;
  totalJobs: number;
  avgProjectDuration: number | null;
}

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics>({
    totalUsers: 0,
    activeUsers: 0,
    totalProjects: 0,
    completedProjects: 0,
    totalScripts: 0,
    totalJobs: 0,
    avgProjectDuration: null,
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const platformStats = await getPlatformStats();

      const rangeStart = new Date();
      if (timeRange === 'week') rangeStart.setDate(rangeStart.getDate() - 7);
      else if (timeRange === 'month') rangeStart.setMonth(rangeStart.getMonth() - 1);
      else rangeStart.setFullYear(rangeStart.getFullYear() - 1);

      const { data: rows, error } = await supabase.rpc('admin_platform_analytics', { p_since: rangeStart.toISOString() });
      if (error) throw error;
      const row = rows?.[0];
      const activeUsers = Number(row?.active_users ?? 0);
      const completedProjects = Number(row?.completed_projects ?? 0);
      const avgProjectDuration = row?.avg_project_days ?? null;

      setAnalytics({
        totalUsers: platformStats.users,
        activeUsers,
        totalProjects: platformStats.projects,
        completedProjects,
        totalScripts: platformStats.scripts,
        totalJobs: platformStats.jobs,
        avgProjectDuration,
      });
      setLoadError(null);
    } catch (error: any) {
      setLoadError(error?.message || 'Could not load analytics');
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  return (
    <ProtectedPage requiredPermission="manage_users">
      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)' }}>
        <header style={{
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
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link href="/admin" aria-label="Back to admin" style={{ color: 'var(--fg)', textDecoration: 'none' }}>
              <ArrowLeft size={20} />
            </Link>
            <h1 style={{ fontFamily: 'var(--display)', fontSize: '1.2rem', letterSpacing: 4, margin: 0 }}>
              ANALYTICS
            </h1>
          </div>
          <Link href="/" style={{ color: 'var(--fg-muted)', textDecoration: 'none', fontSize: 11 }}>
            ← BACK TO HOME
          </Link>
        </header>

        <div style={{ marginTop: 60, padding: '40px 24px', maxWidth: 1200, margin: '60px auto 0' }}>
          {loadError && <div role="alert" style={{ color: 'var(--danger)', fontFamily: 'var(--mono)', fontSize: 11, marginBottom: 16 }}>⚠ {loadError}</div>}
          <div style={{ display: 'flex', gap: 24, marginBottom: 40, borderBottom: '1px solid rgba(var(--ink-rgb), 0.1)', paddingBottom: 16 }}>
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
            <span style={{
              fontFamily: 'var(--mono)',
              fontSize: 11,
              letterSpacing: 2,
              color: 'var(--accent)',
              borderBottom: '2px solid var(--accent)',
              paddingBottom: 8,
            }}>
              ANALYTICS
            </span>
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

          <div style={{ marginBottom: 32, display: 'flex', gap: 12 }}>
            {(['week', 'month', 'year'] as const).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                style={{
                  padding: '8px 16px',
                  background: timeRange === range ? 'var(--accent)' : 'rgba(var(--ink-rgb), 0.05)',
                  color: timeRange === range ? 'var(--bg)' : 'var(--fg)',
                  border: timeRange === range ? 'none' : '1px solid rgba(var(--ink-rgb), 0.1)',
                  borderRadius: 4,
                  fontFamily: 'var(--mono)',
                  fontSize: 10,
                  letterSpacing: 1,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                }}
              >
                Last {range === 'week' ? 'Week' : range === 'month' ? 'Month' : 'Year'}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 24, marginBottom: 40 }}>
            {[
              { label: 'Total Users', value: analytics.totalUsers, icon: Users },
              { label: `Active Users (${timeRange})`, value: analytics.activeUsers, icon: Zap },
              { label: 'Total Projects', value: analytics.totalProjects, icon: TrendingUp },
              { label: 'Completed', value: analytics.completedProjects, icon: Clock },
            ].map(stat => (
              <div
                key={stat.label}
                style={{
                  padding: 24,
                  background: 'rgba(232, 67, 26,0.05)',
                  border: '1px solid rgba(232, 67, 26,0.2)',
                  borderRadius: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <stat.icon size={16} style={{ color: 'var(--accent)' }} />
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--fg-dim)' }}>
                    {stat.label}
                  </span>
                </div>
                <div style={{ fontSize: '2rem', fontFamily: 'var(--display)', fontWeight: 700, color: 'var(--accent)' }}>
                  {loading ? '...' : stat.value}
                </div>
              </div>
            ))}
          </div>

          <div style={{ padding: 24, background: 'rgba(var(--ink-rgb), 0.02)', border: '1px solid rgba(var(--ink-rgb), 0.08)', borderRadius: 8 }}>
            <h2 style={{ fontFamily: 'var(--display)', fontSize: '1.2rem', letterSpacing: 2, marginBottom: 16 }}>
              DETAILED METRICS
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              {[
                { label: 'Total Scripts', value: analytics.totalScripts },
                { label: 'Total Jobs Posted', value: analytics.totalJobs },
                { label: 'Avg Project Duration', value: analytics.avgProjectDuration !== null ? `${analytics.avgProjectDuration} days` : '— (no completed project has both dates set)' },
                { label: 'Completion Rate', value: analytics.totalProjects > 0 ? `${Math.round((analytics.completedProjects / analytics.totalProjects) * 100)}%` : '—' },
              ].map(metric => (
                <div key={metric.label} style={{ padding: 16, background: 'rgba(0,153,255,0.05)', borderRadius: 4 }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', marginBottom: 8, color: 'var(--fg-dim)' }}>
                    {metric.label}
                  </div>
                  <div style={{ fontFamily: 'var(--display)', fontSize: '1.5rem', fontWeight: 700 }}>
                    {metric.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 24, padding: 16, background: 'rgba(0,153,255,0.05)', border: '1px solid rgba(0,153,255,0.2)', borderRadius: 4, fontSize: 11 }}>
            <p style={{ margin: 0, color: 'var(--fg-muted)' }}>
              Fetched on page load and whenever the time range above changes — not a live/streaming feed.
            </p>
          </div>
        </div>
      </div>
    </ProtectedPage>
  );
}
