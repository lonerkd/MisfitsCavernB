'use client';

// "Your page": whether the person has a public portfolio page at /u/<username>, off until they publish it. The database enforces it
// (get_portfolio_page); this changes the setting, says what each choice means and gives the link once there is one.
import React, { useEffect, useState } from 'react';
import { Copy } from 'lucide-react';
import { getMyPortfolioPage, getPortfolioOwner, setMyPortfolioPage } from '@/lib/supabase/portfolio';
import { PAGE_LABEL, PAGE_NOTE, PAGE_SETTINGS, pagePath, type PagePublish } from '@/lib/portfolio/page-setting';
import { useToast } from '@/components/ui/Toast';

export function PagePublishSetting({ userId }: { userId: string }) {
  const { toast } = useToast();
  const [setting, setSetting] = useState<PagePublish | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let live = true;
    void Promise.all([getMyPortfolioPage(), getPortfolioOwner(userId).catch(() => null)]).then(([page, owner]) => {
      if (!live) return;
      setSetting(page);
      setUsername(owner?.username ?? null);
    });
    return () => { live = false; };
  }, [userId]);

  const change = async (next: PagePublish) => {
    if (saving || next === setting) return;
    setSaving(true);
    try {
      await setMyPortfolioPage(userId, next);
      setSetting(next);
      toast(`${PAGE_LABEL[next]}: ${PAGE_NOTE[next]}`, 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not change your page', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (setting === null) return null;
  const url = username && setting !== 'off' ? `${window.location.origin}${pagePath(username)}` : null;

  return (
    <section aria-label="Your portfolio page" style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16, marginBottom: 32, display: 'grid', gap: 10 }}>
      <div style={{ display: 'grid', gap: 4 }}>
        <label htmlFor="portfolio-page-setting" style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-dim)' }}>Your page</label>
        <select id="portfolio-page-setting" value={setting} disabled={saving} onChange={(e) => void change(e.target.value as PagePublish)}
          style={{ padding: '8px 10px', background: 'var(--bg-2)', color: 'var(--fg)', border: '1px solid var(--border-2)', borderRadius: 4, cursor: 'pointer' }}>
          {PAGE_SETTINGS.map((s) => <option key={s} value={s}>{PAGE_LABEL[s]}</option>)}
        </select>
      </div>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-dim)' }}>{PAGE_NOTE[setting]}</p>
      {url && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <a href={url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', fontFamily: 'var(--mono)', fontSize: 12, wordBreak: 'break-all' }}>{url}</a>
          <button type="button" aria-label="Copy page link" onClick={() => { void navigator.clipboard.writeText(url); toast('Page link copied', 'success'); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', background: 'transparent', color: 'var(--fg)', border: '1px solid var(--border-2)', borderRadius: 4, cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 11 }}>
            <Copy size={11} /> Copy
          </button>
        </div>
      )}
    </section>
  );
}
