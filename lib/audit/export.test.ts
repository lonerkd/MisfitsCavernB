import { describe, expect, it } from 'vitest';
import { auditLogsToCsv, containsPattern, CSV_HEADER } from './export';
import type { AuditLog } from '@/lib/supabase/audit';

const log = (over: Partial<AuditLog> = {}): AuditLog => ({
  id: 'a1',
  user_id: 'u1',
  action: 'job_closed',
  resource_type: 'job',
  resource_id: 'j1',
  details: {},
  created_at: '2026-10-18T12:00:00.000Z',
  username: 'sam',
  ...over,
});

describe('containsPattern', () => {
  it('wraps the term as a "contains" match', () => {
    expect(containsPattern('sam')).toBe('%sam%');
  });
  it('takes LIKE wildcards and backslashes literally', () => {
    expect(containsPattern('50%_off\\')).toBe('%50\\%\\_off\\\\%');
  });
});

describe('auditLogsToCsv', () => {
  it('has a header and one line per log, times in UTC', () => {
    const csv = auditLogsToCsv([log()]);
    const [header, row] = csv.split('\r\n');
    expect(header).toBe(CSV_HEADER.map(h => `"${h}"`).join(','));
    expect(row).toBe('"2026-10-18T12:00:00.000Z","sam","job_closed","job","j1","{}"');
  });

  it('doubles quotes, so JSON details stay one cell', () => {
    const row = auditLogsToCsv([log({ details: { reason: 'spam, "obvious"' } })]).split('\r\n')[1];
    expect(row.endsWith('"{""reason"":""spam, \\""obvious\\""""}"')).toBe(true);
  });

  it('defuses cells a spreadsheet would run as a formula', () => {
    const row = auditLogsToCsv([log({ username: '=HYPERLINK("x")', resource_id: '-1' })]).split('\r\n')[1];
    expect(row).toContain(`"'=HYPERLINK(""x"")"`);
    expect(row).toContain(`"'-1"`);
  });

  it('names a deleted account and a missing resource', () => {
    const row = auditLogsToCsv([log({ username: undefined, resource_id: undefined })]).split('\r\n')[1];
    expect(row).toContain('"Deleted account"');
    expect(row).toContain('"job","-"');
  });

  it('is only the header when nothing matched', () => {
    expect(auditLogsToCsv([]).split('\r\n')).toHaveLength(1);
  });
});
