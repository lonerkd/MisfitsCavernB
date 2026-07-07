import { supabase } from './client';

export type AuditAction =
  | 'user_login'
  | 'user_logout'
  | 'user_created'
  | 'user_deleted'
  | 'role_changed'
  | 'project_created'
  | 'project_deleted'
  | 'project_updated'
  | 'script_created'
  | 'script_deleted'
  | 'script_updated'
  | 'crew_invited'
  | 'crew_removed'
  | 'crew_role_changed'
  | 'job_created'
  | 'job_closed'
  | 'admin_action';

export interface AuditLog {
  id: string;
  user_id: string;
  action: AuditAction;
  resource_type: string;
  resource_id?: string;
  details: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  username?: string;
}

/**
 * Log an action to the audit trail
 */
export async function logAuditAction(
  userId: string,
  action: AuditAction,
  resourceType: string,
  resourceId?: string,
  details?: Record<string, any>,
) {
  try {
    const { error } = await supabase.from('audit_logs').insert({
      user_id: userId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      details: details || {},
      ip_address: typeof window !== 'undefined' ? 'client' : 'server',
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
    });

    if (error) {
      console.error('Failed to log audit action:', error);
    }
  } catch (error) {
    console.error('Audit logging error:', error);
  }
}

/**
 * Get audit logs for admin dashboard
 */
export async function getAuditLogs(
  limit: number = 100,
  offset: number = 0,
  filters?: {
    userId?: string;
    action?: AuditAction;
    resourceType?: string;
    dateFrom?: string;
    dateTo?: string;
  },
) {
  try {
    let query = supabase
      .from('audit_logs')
      .select(`
        id,
        user_id,
        action,
        resource_type,
        resource_id,
        details,
        created_at,
        profiles:user_id(username)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }

    if (filters?.action) {
      query = query.eq('action', filters.action);
    }

    if (filters?.resourceType) {
      query = query.eq('resource_type', filters.resourceType);
    }

    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }

    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Failed to fetch audit logs:', error);
      return { logs: [], count: 0 };
    }

    return {
      logs: (data || []).map((log: any) => ({
        ...log,
        username: (log.profiles as any)?.username || 'Unknown',
      })),
      count: count || 0,
    };
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return { logs: [], count: 0 };
  }
}

/**
 * Get activity summary for admin dashboard
 */
export async function getActivitySummary() {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [logins1h, actions24h, projects24h] = await Promise.all([
      supabase
        .from('audit_logs')
        .select('id', { count: 'exact', head: true })
        .eq('action', 'user_login')
        .gte('created_at', oneHourAgo),
      supabase
        .from('audit_logs')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', oneDayAgo),
      supabase
        .from('audit_logs')
        .select('id', { count: 'exact', head: true })
        .eq('action', 'project_created')
        .gte('created_at', oneDayAgo),
    ]);

    return {
      loginsLastHour: logins1h.count || 0,
      actionsLast24h: actions24h.count || 0,
      projectsCreated24h: projects24h.count || 0,
    };
  } catch (error) {
    console.error('Error fetching activity summary:', error);
    return { loginsLastHour: 0, actionsLast24h: 0, projectsCreated24h: 0 };
  }
}

/**
 * Get most active users
 */
export async function getMostActiveUsers(limit: number = 10) {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('user_id, profiles:user_id(username, avatar_url)')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (error) {
      console.error('Failed to fetch active users:', error);
      return [];
    }

    // Group and count client-side
    const userCounts = new Map<string, { username: string; avatar?: string; count: number }>();

    (data || []).forEach((log: any) => {
      const userId = log.user_id;
      // profiles:user_id(...) is a single-row FK join, so Supabase/PostgREST
      // returns it as a plain object, not an array — the same shape
      // getAuditLogs above reads correctly via (log.profiles as any)?.username.
      // The array-indexed form here always missed, so this widget showed
      // "Unknown" for every user regardless of real activity.
      const username = log.profiles?.username || 'Unknown';
      const avatar = log.profiles?.avatar_url;

      if (userCounts.has(userId)) {
        const existing = userCounts.get(userId)!;
        userCounts.set(userId, { ...existing, count: existing.count + 1 });
      } else {
        userCounts.set(userId, { username, avatar, count: 1 });
      }
    });

    return Array.from(userCounts.entries())
      .map(([userId, data]) => ({
        userId,
        username: data.username,
        actionCount: data.count,
        avatar: data.avatar,
      }))
      .sort((a, b) => b.actionCount - a.actionCount)
      .slice(0, limit);
  } catch (error) {
    console.error('Error fetching active users:', error);
    return [];
  }
}
