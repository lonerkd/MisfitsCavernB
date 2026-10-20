import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import type { AuditAction, AuditLog } from '@/lib/supabase/audit';

// Exporting the audit log. "Export all matches" reads every row the page's
// filters match — the action filter and the search — across all pages, from
// the database, as the signed-in admin (RLS: "Admins can view audit logs"; a
// non-admin reads nothing). The search runs in the query, not in the browser.

type Client = SupabaseClient<Database>;

export interface AuditExportFilters {
  action?: AuditAction;
  /** Matches the username, the resource id or the action, case-insensitively. */
  search?: string;
}

/** Rows per request. At or under PostgREST's max-rows (1000 on Supabase). */
export const EXPORT_BATCH = 1000;

const DELETED = 'Deleted account';
const COLUMNS = 'id, user_id, action, resource_type, resource_id, details, created_at';

/** `term` as a literal, case-insensitive "contains" LIKE pattern. */
export function containsPattern(term: string): string {
  return `%${term.replace(/[\\%_]/g, '\\$&')}%`;
}

/** A value inside a PostgREST `or=(…)` list, quoted so commas and brackets stay literal. */
function orValue(value: string): string {
  return `"${value.replace(/[\\"]/g, '\\$&')}"`;
}

type Row = Omit<AuditLog, 'username'> & { profiles: { username: string | null } | null };

/**
 * Reads one query to the end, `batch` rows at a time, until a batch comes back
 * empty — so a server row cap below `batch` cannot end it early. Ordered by
 * time then id, so pages are stable; rows logged mid-export only shift later
 * pages down, and the caller drops the repeats by id.
 */
async function readAll(page: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>, batch: number): Promise<Row[]> {
  const rows: Row[] = [];
  for (let from = 0; ; ) {
    const { data, error } = await page(from, from + batch - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return rows;
    rows.push(...(data as Row[]));
    from += data.length;
  }
}

/** Every audit log the filters match, newest first. Throws on a failed read. */
export async function fetchAllAuditLogs(client: Client, filters: AuditExportFilters = {}, batch = EXPORT_BATCH): Promise<AuditLog[]> {
  const term = filters.search?.trim() ?? '';

  const query = (embed: string) => {
    let q = client.from('audit_logs').select(`${COLUMNS}, ${embed}`);
    if (filters.action) q = q.eq('action', filters.action);
    return q;
  };
  const ordered = <Q extends ReturnType<typeof query>>(q: Q, from: number, to: number) =>
    q.order('created_at', { ascending: false, nullsFirst: false }).order('id', { ascending: false }).range(from, to);

  const reads: Promise<Row[]>[] = [];
  if (!term) {
    reads.push(readAll((from, to) => ordered(query('profiles:user_id(username)'), from, to), batch));
  } else {
    const pattern = containsPattern(term);
    // The action or the resource id (and, like the page, rows whose account is gone match "deleted account").
    const own = [`action.ilike.${orValue(pattern)}`, `resource_id.ilike.${orValue(pattern)}`];
    if (DELETED.toLowerCase().includes(term.toLowerCase())) own.push('user_id.is.null');
    reads.push(readAll((from, to) => ordered(query('profiles:user_id(username)').or(own.join(',')), from, to), batch));
    // The username — a join, so PostgREST filters it in the database.
    reads.push(readAll((from, to) => ordered(query('profiles:user_id!inner(username)').ilike('profiles.username', pattern), from, to), batch));
  }

  const byId = new Map<string, AuditLog>();
  for (const rows of await Promise.all(reads)) {
    for (const { profiles, ...log } of rows) byId.set(log.id, { ...log, username: profiles?.username || DELETED });
  }
  return [...byId.values()].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '') || b.id.localeCompare(a.id));
}

/** One CSV cell: quoted, quotes doubled, and a leading = + - @ defused so a spreadsheet won't run it. */
function cell(value: string): string {
  const safe = /^([=+@\t\r]|-.)/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

export const CSV_HEADER = ['Timestamp', 'User', 'Action', 'Resource Type', 'Resource ID', 'Details'];

/** The audit log as CSV (RFC 4180), times in ISO 8601 UTC. */
export function auditLogsToCsv(logs: AuditLog[]): string {
  const rows = logs.map(log => [
    log.created_at ? new Date(log.created_at).toISOString() : '',
    log.username || DELETED,
    log.action,
    log.resource_type,
    log.resource_id || '-',
    JSON.stringify(log.details ?? {}),
  ]);
  return [CSV_HEADER, ...rows].map(row => row.map(cell).join(',')).join('\r\n');
}

/** Hands the browser a CSV file to save. */
export function downloadCsv(csv: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
