'use client';

import dynamic from 'next/dynamic';
import { ScriptOSPreview, StudioPreview, LoungePreview, PortfolioPreview } from '@/components/landing/Previews';
import { ModuleTile } from '@/components/landing/ModuleTile';
import type { HomeWork, LiveData } from '@/components/home/useHomeData';

// The phone's picker loads only on a phone.
const ModulePicker = dynamic(() => import('@/components/home/ModulePicker').then((m) => m.ModulePicker), { loading: () => null });

/**
 * The suite's four doors, each with a live preview of what's inside: on a
 * phone the picker, on a wide screen the asymmetric tile grid (ScriptOS
 * large, Studio and the Lounge stacked, Portfolio across the bottom).
 */
export function ModuleGrid({
  loggedIn, phone, live, works,
}: {
  loggedIn: boolean;
  phone: boolean;
  live: LiveData;
  works: HomeWork[];
}) {
  return (
    <section aria-labelledby="home-parts" style={{ padding: loggedIn ? '8px 24px 80px' : '80px 24px 100px', maxWidth: 'var(--w-content)', margin: '0 auto' }}>
      <h2 id="home-parts" className="sr-only">{loggedIn ? 'Jump back in' : 'The parts of the suite'}</h2>
      {loggedIn && <p aria-hidden style={{ margin: '0 0 12px', fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)', color: 'var(--fg-muted)' }}>Jump back in</p>}
      {phone ? <ModulePicker loggedIn={loggedIn} data={{ scriptLines: live.scriptLines, assets: live.assets, messages: live.messages, works }} /> : (<>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>

        <ModuleTile
          title="ScriptOS"
          tag="Screenplay Editor"
          color="var(--accent)"
          href="/editor"
          index={0}
          preview={
            <div style={{ minHeight: 220 }}>
              <div style={{
                padding: '10px 16px',
                borderBottom: '1px solid rgba(var(--ink-rgb), 0.04)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                {['#ff5f57', '#febc2e', '#28c840'].map((c, i) => (
                  <div key={i} style={{ width: 9, height: 9, borderRadius: '50%', background: c, opacity: 0.7 }} />
                ))}
                <span style={{ fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)', color: 'var(--fg-dim)', marginLeft: 6 }}>{live.latestScriptTitle ?? 'ScriptOS'}</span>
              </div>
              <ScriptOSPreview lines={live.scriptLines} caption={loggedIn ? 'Your latest script appears here' : 'Screenplay formatting as you type'} />
            </div>
          }
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <ModuleTile
            title="Studio"
            tag="Asset Hub"
            color="var(--studio-color)"
            href="/studio"
            index={1}
            preview={<StudioPreview items={live.assets} caption={loggedIn ? 'Your references and media appear here' : 'Every reference, clip and track in one library'} />}
          />
          <ModuleTile
            title="Lounge"
            tag="Crew Collaboration"
            color="var(--ok)"
            href="/lounge"
            index={2}
            preview={<LoungePreview messages={live.messages} caption={loggedIn ? 'Your crew channels appear here' : 'Channels and calls with your crew'} />}
          />
        </div>
      </div>

      <ModuleTile
        title="Portfolio"
        tag="Cinematic Showcase"
        color="var(--warn)"
        href="/portfolio"
        index={3}
        preview={<PortfolioPreview works={works} />}
        style={{ minHeight: 0 }}
      />
      </>)}
    </section>
  );
}
