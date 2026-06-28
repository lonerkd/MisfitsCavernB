'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { ProtectedPage } from '@/lib/permissions/access-control';
import { useCurrentUser } from '@/lib/permissions/usePermissions';
import { BarChart3, Users, Settings, Activity } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  const { isAdmin } = useCurrentUser();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProjects: 0,
    totalScripts: 0,
    totalJobs: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [users, projects, scripts, jobs] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('projects').select('id', { count: 'exact', head: true }),
        supabase.from('scripts').select('id', { count: 'exact', head: true }),
        supabase.from('jobs').select('id', { count: 'exact', head: true }),
      ]);

      setStats({
        totalUsers: users.count || 0,
        totalProjects: projects.count || 0,
        totalScripts: scripts.count || 0,
        totalJobs: jobs.count || 0,
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedPage requiredPermission="manage_users">
      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)' }}>
        {/* Header */}
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
            <BarChart3 size={20} style={{ color: 'var(--accent)' }} />
            <h1 style={{ fontFamily: 'var(--display)', fontSize: '1.2rem', letterSpacing: 4, margin: 0 }}>
              ADMIN PANEL
            </h1>
          </div>
          <Link href="/" style={{ color: 'var(--fg-muted)', textDecoration: 'none', fontSize: 11 }}>
            ← BACK TO HOME
          </Link>
        </header>

        {/* Content */}
        <div style={{ marginTop: 60, padding: '40px 24px', maxWidth: 1200, margin: '60px auto 0' }}>
          {/* Navigation Tabs */}
          <div style={{ display: 'flex', gap: 24, marginBottom: 40, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 16 }}>
            <Link
              href="/admin"
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 11,
                letterSpacing: 2,
                color: 'var(--accent)',
                textDecoration: 'none',
                borderBottom: '2px solid var(--accent)',
                paddingBottom: 8,
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
          </div>

          {/* Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 24, marginBottom: 40 }}>
            {[
              { label: 'Total Users', value: stats.totalUsers, icon: Users },
              { label: 'Total Projects', value: stats.totalProjects, icon: Activity },
              { label: 'Total Scripts', value: stats.totalScripts, icon: Activity },
              { label: 'Total Jobs', value: stats.totalJobs, icon: Activity },
            ].map(stat => (
              <div
                key={stat.label}
                style={{
                  padding: 24,
                  background: 'rgba(255,60,0,0.05)',
                  border: '1px solid rgba(255,60,0,0.2)',
                  borderRadius: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <stat.icon size={16} style={{ color: 'var(--accent)' }} />
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, opacity: 0.6 }}>
                    {stat.label}
                  </span>
                </div>
                <div style={{ fontSize: '2rem', fontFamily: 'var(--display)', fontWeight: 700, color: 'var(--accent)' }}>
                  {loading ? '...' : stat.value}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div style={{ padding: 24, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}>
            <h2 style={{ fontFamily: 'var(--display)', fontSize: '1.2rem', letterSpacing: 2, marginBottom: 16 }}>
              QUICK ACTIONS
            </h2>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link
                href="/admin/users"
                style={{
                  padding: '12px 24px',
                  background: 'var(--accent)',
                  color: 'var(--bg)',
                  border: 'none',
                  borderRadius: 4,
                  fontFamily: 'var(--mono)',
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: 1,
                  cursor: 'pointer',
                  textDecoration: 'none',
                }}
              >
                Manage Users
              </Link>
              <Link
                href="/admin/analytics"
                style={{
                  padding: '12px 24px',
                  background: 'transparent',
                  color: 'var(--fg)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 4,
                  fontFamily: 'var(--mono)',
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: 1,
                  cursor: 'pointer',
                  textDecoration: 'none',
                }}
              >
                View Analytics
              </Link>
            </div>
          </div>

          {/* Info Section */}
          <div style={{ marginTop: 40, padding: 24, background: 'rgba(0,153,255,0.05)', border: '1px solid rgba(0,153,255,0.2)', borderRadius: 8 }}>
            <h3 style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 2, marginBottom: 12 }}>
              ADMIN FEATURES
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 12, lineHeight: 1.8 }}>
              <li>✓ View all users and their roles</li>
              <li>✓ Manage user permissions and roles</li>
              <li>✓ View platform analytics and statistics</li>
              <li>✓ Monitor project creation and usage</li>
              <li>✓ Access system logs and activity</li>
              <li>✓ Manage platform settings</li>
            </ul>
          </div>
        </div>
      </div>
    </ProtectedPage>
  );
}
